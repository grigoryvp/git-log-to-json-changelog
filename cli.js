#!/usr/bin/env node

const loader = require('./index.js');


loader().then(json => {
  //process.stdout.write(JSON.stringify(json));
}).catch(v => {
  process.stderr.write(`error\n`);
  process.stderr.write(`${v}\n`);
  process.stderr.write(`${v.stack}\n`);
  process.exit(1);
});

