const gitLogToJsonChangelog = require('./index.js');


console.assert(gitLogToJsonChangelog);
gitLogToJsonChangelog().then(log => {
  console.log(`received: ${log}`);
}).catch(v => console.log(`error: ${v}`));

