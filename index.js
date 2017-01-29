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
      patternmatch(line, [
        [/^commit ([a-z0-9]+)$/, (hash) => (next().hash = hash)],
        [/^    (.*)$/, (line) => cur().addMsgLine(line)],
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
    Object.assign(this, options);
  }
}


function commitsToMetaAsync(commitList) {
  return new Promise((resolve, reject) => {

    let seq = 0;
    const metaList = [];
    const add = (array, v) => { array.push(v); return v; }
    const next = (options) => add(metaList, new Meta(options));
    const cur = () => metaList.slice(-1)[0] || next();

    const State = {
      IDLE: 1,
      KEY: 2,
      VAL: 3,
    };
    let state = State.IDLE;

    for (commit of commitList) {
      for (var i = 0; i < commit.msg.length; i ++) {
        const hash = commit.hash;
        patternmatch([commit.msg[i], state], [
          [['{', State.IDLE], () => {
            state = State.KEY;
            next({hash, seq: (seq += 1)});
          }],
          [[';', [State.KEY, State.VAL]], () => {
            state = State.KEY;
            next({hash, seq})
          }],
          [['}', [State.KEY, State.VAL]], () => state = State.IDLE],
          [[':', State.KEY], () => state = State.VAL],
          [[null, [State.KEY, State.VAL]], (v) => cur().key += v],
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
function patternmatch(rightSeq, pairs) {
  for ([leftSeq, next] of pairs) {
    leftSeq = [].concat(leftSeq);
    rightSeq = [].concat(rightSeq);
    const res = [];
    const compare = (left, right) => {
      //  If test case not specified it's "don't care, match anything".
      if (left === null || left === undefined) return res.push(right), true;
      //  Test case can be an array.
      if (left.some) return left.some((v) => compare(v, right));
      if (!left[Symbol.match]) return left === right;
      const match = left[Symbol.match](right);
      if (!match) return false;
      return res.push(...match.slice(1)), true;
    };
    if (leftSeq.every((v, i) => compare(v, rightSeq[i]))) return next(...res);
  }
}

