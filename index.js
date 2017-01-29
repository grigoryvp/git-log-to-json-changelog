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
      .then((v) => resolve(v))
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
  }
}


function commitsToMetaAsync(commitList) {
  return new Promise((resolve, reject) => {

    const metaList = [];
    const next = () => { let v = new Meta(); metaList.push(v); return v; }
    const cur = () => commitList.slice(-1)[0] || next();

    const State = {
      IDLE: 1,
      KEY: 2,
    };
    let state = State.IDLE;

    for (commit of commitList) {
      for (var i = 0; i < commit.msg.length; i ++) {
        const char = commit.msg[i];
        pmatch(char, [
          ['{', () => {
            pmatch(state, [
              [State.IDLE, () => {
                state = State.KEY;
                next();
              }],
              [null, () => { throw new Error("'{' outside of IDLE"); }],
            ]);
          }],
          ['}', () => {
            pmatch(state, [
              [State.KEY, () => state = State.IDLE],
            ]);
          }],
          [null, () => {
            pmatch(state, [
              [State.KEY, (v) => cur().key += v],
            ]);
          }],
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


function pmatch(tomatch, pairs) {
  let defaultHandler = null;
  for ([matchwith, handler] of pairs) {
    if (typeof(matchwith) === 'string' || typeof(matchwith) === 'number') {
      if (matchwith === tomatch) return handler(tomatch);
    }
    else if (!matchwith) {
      defaultHandler = handler;
    }
    else {
      const match = tomatch.match(matchwith);
      if (match) return handler(...match.slice(1));
    }
  }
  if (defaultHandler) return defaultHandler(tomatch);
}

