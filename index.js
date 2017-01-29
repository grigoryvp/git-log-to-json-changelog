const spawn = require('child_process').spawn;
const Promise = require('promise');


module.exports = function(...args) {
  const {options, next} = getOptions(args);
  const promised = new Promise((resolve, reject) => {
    getLogTextAsync()
      .then((v) => logTextToCommitsAsync(v))
      //  Git displays commits from last to first.
      .then((v) => commitsToMetaAsync(v.reverse()))
      .then((v) => applyAmendAsync(v))
      .then((v) => metaToJsonAsync(v))
      .then((v) => resolve(JSON.stringify(v)))
      .catch((v) => reject(v));
  });
  if (next) return promised.then((v) => next(null, v), (v) => next(v));
  return promised;
}
module.exports.debug = {};


function getOptions(args) {
  let first = args.shift() || {};
  if (typeof(first) === 'function') return {options: {}, next: first};
  return {options: first, next: args.shift()};
}


function getLogTextAsync() {
  return new Promise((resolve, reject) => {
    const stdio = ['ignore', 'pipe', process.stderr];
    const task = spawn('git', ['log', '--format=raw'], {stdio});
    let data = '';
    task.stdout.on('data', (v) => data += v);
    task.on('error', (v) => reject(v));
    task.on('close', (code) => {
      if (code !== 0) return reject(`git failed with code ${code}`);
      resolve(data);
    });
  });
}


class Commit {
  constructor(options) {
    this.hash = '';
    this.msg = '';
    Object.assign(this, options);
  }
  addMsgLine(line) { this.msg += this.msg.length ? "\n" + line : line; }
}
module.exports.debug.Commit = Commit;


function logTextToCommitsAsync(text) {
  return new Promise((resolve, reject) => {

    const commitList = [];
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


class Meta {
  constructor(options) {
    this.hash = '';
    this.key = '';
    this.val = '';
    //  Where can be multiple chunks of meta information inside '{}', for
    //  example "{amend:'1';msg:'foo'} some text "{amend:'2';msg:'bar'".
    //  Chunks inside '{}' has same sequence number, so they can be
    //  grouped later with hash and sequence.
    this.seq = 0;
    //  ':' or '=' was found, now reading value.
    this._separated = false;
    Object.assign(this, options);
  }


  add(char) { this._separated ? this.val += char : this.key += char; }
  separate() { this._separated = true; }
}


module.exports.debug.commitsToMetaAsync = commitsToMetaAsync;
function commitsToMetaAsync(commitList) {
  return new Promise((resolve, reject) => {

    let seq = 0;
    let prevState = 0;
    const metaList = [];
    const addToken = (array, v) => { array.push(v); return v; };
    const nextToken = (options) => addToken(metaList, new Meta(options));
    const curToken = () => metaList.slice(-1)[0] || nextToken();
    const pushState = (v) => { prevState = state; state = v; };
    const popState = () => state = prevState;

    const S = {
      IDLE: 1,
      TOKEN: 2,
      SINGLE: 3,
      DOUBLE: 4,
      ESCAPE: 5,
    }

    let state = S.IDLE;
    S.STRING = [S.SINGLE, S.DOUBLE];
    for (const commit of commitList) {
      for (var i = 0; i < commit.msg.length; i ++) {
        const hash = commit.hash;
        patternmatch([commit.msg[i], state], [
          [['{', S.IDLE], () => {
            pushState(S.TOKEN);
            nextToken({hash, seq: (seq += 1)});
          }],
          [[';', S.TOKEN], () => nextToken({hash, seq})],
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
    resolve(metaList);
  });
}


function applyAmendAsync(metaList) {
  return new Promise((resolve, reject) => {
    resolve(metaList);
  });
}


function metaToJsonAsync(metaList) {
  return new Promise((resolve, reject) => {
    resolve(metaList);
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

