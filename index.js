const spawn = require('child_process').spawn;
const Promise = require('promise');


module.exports = function(...args) {
  const {options, next} = getOptions(args);
  const promised = new Promise((resolve, reject) => {
    getLogTextAsync()
      .then((v) => logTextToCommitsAsync(v))
      .then((v) => commitsToMetaAsync(v))
      .then((v) => applyAmendAsync(v))
      .then((v) => metaToJsonAsync(v))
      .then((v) => resolve(JSON.stringify(v)))
      .catch((v) => reject(v));
  });
  if (next) return promised.then((v) => next(null, v), (v) => next(v));
  return promised;
}


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
  constructor() {
    this.hash = '';
    this.msg = '';
  }
  addMsgLine(line) { this.msg += this.msg.length ? "\n" + line : line; }
}


function logTextToCommitsAsync(text) {
  return new Promise((resolve, reject) => {

    const commitList = [];
    const next = () => { let v = new Commit(); commitList.push(v); return v; }
    const cur = () => commitList.slice(-1)[0] || next();

    for(line of text.split(/\r*\n+/)) {
      pmatch(line, [
        [/^commit ([a-z0-9]+)$/, (hash) => (next().hash = hash)],
        [/^    (.*)$/, (line) => cur().addMsgLine(line)],
      ]);
    }
    resolve(commitList);
  });
}


class Meta {
  constructor() {
    this.hash = '';
    this.key = '';
    //  Where can be multiple chunks of meta information inside '{}', for
    //  example "{amend:'1';msg:'foo'} some text "{amend:'2';msg:'bar'".
    //  Chunks inside '{}' has same sequence number, so they can be
    //  grouped later with hash and sequence.
    this.seq = 0;
  }
}


function commitsToMetaAsync(commitList) {
  return new Promise((resolve, reject) => {

    let seq = 0;
    const metaList = [];
    const next = () => { let v = new Meta(); metaList.push(v); return v; }
    const cur = () => metaList.slice(-1)[0] || next();

    const State = {
      IDLE: 1,
      KEY: 2,
    };
    let state = State.IDLE;

    for (commit of commitList) {
      for (var i = 0; i < commit.msg.length; i ++) {
        const char = commit.msg[i];
        pmatch([char, state], [
          [['{', State.IDLE], () => {
            state = State.KEY;
            seq += 1;
            next().seq = seq;
          }],
          [['}', State.KEY], () => state = State.IDLE],
          [[null, State.KEY], () => cur().key += char],
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
//  'null'/'undefined' matches anything.
function pmatch(rightSeq, pairs) {
  for ([leftSeq, handler] of pairs) {
    leftSeq = [].concat(leftSeq);
    rightSeq = [].concat(rightSeq);
    const res = [];
    const compare = (left, right) => {
      if (left === null || left === undefined) return true;
      if (!left[Symbol.match]) return left === right;
      const match = left[Symbol.match](right);
      if (!match) return false;
      return res.push(...match.slice(1)), true;
    };
    if (leftSeq.every((v, i) => compare(v, rightSeq[i]))) return handler(res);
  }
}

