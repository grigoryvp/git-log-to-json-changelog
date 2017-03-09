const expect = require('chai').expect;
const assert = require('chai').assert;
const metaToJsonAsync = require('./../index.js').debug.metaToJsonAsync;
const Commit = require('./../index.js').debug.Commit;
const Meta = require('./../index.js').debug.Meta;


describe("json generator", () => {

  it("should user last of multiple messages per commit", (next) => {
    const commitList = [
      new Commit({hash: '123', metaList: [
        new Meta({hash: '123', key: 'msg', val: 'foo', seq: 1}),
        new Meta({hash: '123', key: 'msg', val: 'bar', seq: 2}),
      ]}),
    ];
    metaToJsonAsync(commitList, {}).then((releaseList) => {
      expect(releaseList).not.empty;
      const release = releaseList[0];
      expect(release).to.have.property('msgList').with.length(1);
      expect(release.msgList[0]).to.equal('bar');
      next();
    }).catch((err) => {
      next(new Error(err));
    });
  });
});

