#!/usr/bin/env node

const loader = require('./index.js');


loader().then(json => {
  console.log(JSON.stringify(json));
}).catch(v => {
  console.log(`error: ${v}, ${v.stack}`);
  process.exit(1);
});

