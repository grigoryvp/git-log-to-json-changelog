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
    const patternmatch = (string, pairs) => {
      for ([regexp, handler] of pairs) {
        const match = string.match(regexp);
        if (match) return handler(...match.slice(1));
      }
    };

    for(line of text.split(/\r*\n+/)) {
      patternmatch(line, [
        [/^commit ([a-z0-9]+)$/, (hash) => (next().hash = hash)],
        [/^    (.*)$/, (line) => cur().addMsgLine(line)],
      ]);
    }
    resolve(commitList);
  });
}


function commitsToMetaAsync(commitList) {
  return new Promise((resolve, reject) => {
    const metaList = [];
    for (commit of commitList) {
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

