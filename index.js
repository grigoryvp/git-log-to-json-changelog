//  Thing in curly braces is called meta, ex git log message
//  "foo {bar:1} {baz:2}" has two meta's and "foo {bar:1;baz:2}" has a
//  compound meta. Individual metas in compound meta affects each over, ex
//  'amend' will amend only key-values from compound meta it is in.
//
//  The only implementation challenge is 'amend' logic. What to do if
//  specified commit does not have a meta with specified key, or does not
//  have any meta at all? If we want an ability to add something via
//  'amend' AND an ability to keep a sequence order of commits (and we
//  want in order to track releases) when we need to keep a list of all
//  commits with attached metas instead of just list of metas.

const spawn = require('child_process').spawn;
const Promise = require('promise');


module.exports = function(...args) {
  const {options, next} = getOptions(args);
  const promised = new Promise((resolve, reject) => {
    return Promise.all([
      getLogTextAsync(),
      getTagTextAsync(),
      getTagHashesAsync(),
    ]).then(([log, tags, tagsToHashes]) => {
      return new Promise.resolve([])
        .then((v) => addLogToCommits(v, log))
        .then((v) => addTagsToCommits(v, tags, tagsToHashes))
        //  Git displays commits from last to first.
        .then((v) => readMetaAsync(v.reverse()))
        .then((v) => applyAmendAsync(v))
        .then((v) => metaToJsonAsync(v, options))
        .then((v) => resolve(v))
    }).catch((v) => reject(v));
  });
  if (next) return promised.then((v) => next(null, v), (v) => next(v));
  return promised;
}
module.exports.debug = {};


function getOptions(args) {
  let first = args.shift() || {};
  let options = {
    fromOldToNew: true,
  };
  if (typeof(first) === 'function') return {options, next: first};
  options = Object.assign({}, options, first);
  return {options, next: args.shift()};
}


function getLogTextAsync() {
  return new Promise((resolve, reject) => {
    const stdio = ['ignore', 'pipe', process.stderr];
    const task = spawn('git', ['log', '--format=raw'], {stdio});
    let data = '';
    task.stdout.on('data', (v) => data += v);
    task.on('error', (v) => reject(v));
    task.on('close', (code) => {
      if (code !== 0) return reject(`git log failed with code ${code}`);
      resolve(data);
    });
  });
}


function getTagTextAsync() {
  return new Promise((resolve, reject) => {
    const stdio = ['ignore', 'pipe', process.stderr];
    const task = spawn('git', ['tag', '-n999'], {stdio});
    let data = '';
    task.stdout.on('data', (v) => data += v);
    task.on('error', (v) => reject(v));
    task.on('close', (code) => {
      if (code !== 0) return reject(`git tag failed with code ${code}`);
      resolve(data);
    });
  });
}


function getTagHashesAsync() {
  return new Promise((resolve, reject) => {
    const stdio = ['ignore', 'pipe', process.stderr];
    const task = spawn('git', ['show-ref', '--tags', '-d'], {stdio});
    let data = '';
    task.stdout.on('data', (v) => data += v);
    task.on('error', (v) => reject(v));
    task.on('close', (code) => {
      //! Will exit(1) if no tags exist.
      if (code !== 0) return resolve('');
      resolve(data);
    });
  });
}


function addLogToCommits(commitList, text) {
  return new Promise((resolve, reject) => {

    const addToken = (array, v) => { array.push(v); return v; };
    const nextToken = (options) => addToken(commitList, new Commit(options));
    const curToken = () => commitList.slice(-1)[0] || nextToken();

    for(line of text.split(/\r*\n+/)) {
      patternmatch(line, [
        [/^commit ([a-z0-9]+)$/, (hash) => nextToken({hash})],
        [/^    (.*)$/, (line) => curToken().addMsgLine(line)],
      ]);
    }
    resolve(commitList);
  });
}


function addTagsToCommits(commitList, tags, tagsToHashes) {
  return new Promise((resolve, reject) => {

    hashForTag = {};
    for(line of tagsToHashes.split(/\r*\n+/)) {
      patternmatch(line, [
        [/^([a-z0-9]+) refs\/tags\/([^ ]+)\^\{\}$/, (hash, tag) => {
          hashForTag[tag] = hash
        }],
      ]);
    }

    curCommit = null;
    for(line of tags.split(/\r*\n+/)) {
      patternmatch(line, [
        [/^([^ ]+)\s+(.*)$/, (tag, msg) => {
          const hash = hashForTag[tag];
          curCommit = commitList.filter((v) => v.hash === hash)[0];
          if (curCommit) curCommit.tag = msg;
        }],
        [/^\s+(.*)$/, (msg) => {
          if (curCommit) curCommit.tag += "\n" + msg;
        }],
      ]);
    }

    resolve(commitList);
  });
}


module.exports.debug.readMetaAsync = readMetaAsync;
function readMetaAsync(commitList) {
  return new Promise((resolve, reject) => {

    let seq = 0;
    let prevState = 0;

    const S = {
      IDLE: 1,
      TOKEN: 2,
      SINGLE: 3,
      DOUBLE: 4,
      ESCAPE: 5,
    }

    S.STRING = [S.SINGLE, S.DOUBLE];
    for (const commit of commitList) {
      seq ++;

      let state = S.IDLE;

      const addToken = (array, v) => { array.push(v); return v; };
      const nextToken = (v) => addToken(commit.metaList, new Meta(v));
      const curToken = () => commit.metaList.slice(-1)[0] || nextToken();
      const pushState = (v) => { prevState = state; state = v; };
      const popState = () => state = prevState;

      function strToMeta(options) {
        for (var i = 0; i < options.str.length; i ++) {
          const {hash, isFromTag} = options;
          patternmatch([options.str[i], state], [
            [['{', S.IDLE], () => {
              pushState(S.TOKEN);
              nextToken({hash, seq: (seq += 1), isFromTag});
            }],
            [[';', S.TOKEN], () => nextToken({hash, seq, isFromTag})],
            [['}', S.TOKEN], () => pushState(S.IDLE)],
            [[[':', '='], S.TOKEN], () => curToken().separate()],
            [["\'", S.TOKEN], () => pushState(S.SINGLE)],
            [["\'", S.SINGLE], () => pushState(S.TOKEN)],
            [["\"", S.TOKEN], () => pushState(S.DOUBLE)],
            [["\"", S.DOUBLE], () => pushState(S.TOKEN)],
            [["\\", S.STRING], () => pushState(S.ESCAPE)],
            [[null, S.ESCAPE], (char) => {
              curToken().add(char)
              popState();
            }],
            [[null, [S.TOKEN, S.STRING]], (char) => curToken().add(char)],
          ]);
        }
      }

      strToMeta({str: commit.msg, hash: commit.hash, isFromTag: false});
      strToMeta({str: commit.tag, hash: commit.hash, isFromTag: true});
    }
    resolve(commitList);
  });
}


module.exports.debug.applyAmendAsync = applyAmendAsync;
function applyAmendAsync(commitList) {
  return new Promise((resolve, reject) => {

    for (const commit of commitList) {
      for (const meta of commit.metaList) {
        if (meta.key === 'amend') {
          for (const subMeta of commit.metaList) {
            if (subMeta.key === 'amend') continue;
            if (subMeta.seq !== meta.seq) continue;
            const hashToAmend = meta.val;
            amend(commitList, hashToAmend, subMeta.key, subMeta.val);
          }
        }
      }
    }

    resolve(commitList);
  });
}


//  In given commit list find all commit with the given hash and for all
//  metas of such commits replace val of metas with specified key.
function amend(commitList, hash, key, val) {
  for (const commit of commitList.filter((v) => v.hash === hash)) {
    let maxSeq = 0;
    let isAmended = false;
    for (const meta of commit.metaList) {
      if (meta.seq > 0) maxSeq = meta.seq;
      //  Amend by modifying existing meta.
      if (meta.key === key) {
        meta.val = val;
        isAmended = true;
      }
    }
    if (!isAmended) {
      //  Amend by adding a new meta.
      commit.metaList.push(new Meta({seq: maxSeq + 1, hash, key, val}));
    }
  }
}


module.exports.debug.metaToJsonAsync = metaToJsonAsync;
function metaToJsonAsync(commitList, options) {
  return new Promise((resolve, reject) => {

    const releases = [];
    let _curRelease = null;
    const curRelease = () => {
      if (!_curRelease) {
        _curRelease = {isNamed: false, msgList: []}
        releases.push(_curRelease);
      }
      return _curRelease;
    };
    const sealCurRelease = () => _curRelease = null;

    for (const commit of commitList) {
      let msg = null;
      let release = null;
      let isAmend = false;
      let isReleaseFromTag = false;
      for (const meta of commit.metaList) {
        switch (meta.key) {
          case 'msg':
            //! If commit has multiple {msg:...}, which is meaningless,
            //  use last one.
            msg = meta.val;
            break;
          case 'release':
            release = meta.val
            isReleaseFromTag = meta.isFromTag;
            break;
          case 'amend':
            isAmend = true;
            break;
        }
      }

      if (msg) {
        if (!isAmend) {
          curRelease().msgList.push(msg);
        }
      }
      if (release) {
        if (!isAmend || isReleaseFromTag) {
          curRelease().isNamed = true;
          curRelease().name = release;
          sealCurRelease();
        }
      }
    }

    if (!options.fromOldToNew) releases.reverse();
    resolve(releases);
  });
}


//  Pattern-matching with regexp positional matches passed to handlers.
module.exports.debug.patternmatch = patternmatch;
function patternmatch(rightSeq, pairs) {
  for (let [leftSeq, next] of pairs) {
    leftSeq = [].concat(leftSeq);
    rightSeq = [].concat(rightSeq);
    const res = [];
    const compare = (left, right) => {
      //  If test case not specified it's "don't care, match anything".
      if (left === null || left === undefined) return res.push(right), true;
      //  Test case can be an array.
      if (left.some) return left.some((v) => compare(v, right));
      if (!left[Symbol.match]) {
        if (left !== right) return false;
        return res.push(right), true;
      }
      const match = left[Symbol.match](right);
      if (!match) return false;
      return res.push(...match.slice(1)), true;
    };
    if (leftSeq.every((v, i) => compare(v, rightSeq[i]))) return next(...res);
  }
}


class Commit {
  constructor(options) {
    this.hash = '';
    this.msg = '';
    this.tag = '';
    this.metaList = [];
    Object.assign(this, options);
  }
  addMsgLine(line) { this.msg += this.msg.length ? "\n" + line : line; }
}
module.exports.debug.Commit = Commit;


class Meta {
  constructor(options) {
    this.hash = '';
    this.key = '';
    this.val = '';
    //  Submetas in compound meta has same sequence number.
    this.seq = 0;
    //  ':' or '=' was found, now reading value.
    this._separated = false;
    //  'true' if was created from tag, so can be safely processed even
    //  if attached to commits with 'amend'.
    this.isFromTag = false;
    Object.assign(this, options);
    //! Keys are compared to each other, so ignore space chars.
    this.key = this.key.trim();
  }


  add(char) { this._separated ? this.val += char : this.key += char; }
  separate() { this._separated = true; this.key = this.key.trim(); }
}
module.exports.debug.Meta = Meta;

