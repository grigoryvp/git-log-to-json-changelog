const expect = require('chai').expect;
const applyAmendAsync = require('./../index.js').debug.applyAmendAsync;
const Commit = require('./../index.js').debug.Commit;
const Meta = require('./../index.js').debug.Meta;


describe("amend meta", () => {

  it("should amend single meta", (next) => {
    const commitList = [
      new Commit({hash: '123', metaList: [
        new Meta({hash: '123', key: 'foo', val: 'bar', seq: 1}),
      ]}),
      new Commit({hash: '124', metaList: [
        new Meta({hash: '124', key: 'amend', val: '123', seq: 0}),
        new Meta({hash: '124', key: 'foo', val: 'baz', seq: 0}),
      ]}),
    ];
    applyAmendAsync(commitList).then((commitList) => {
      expect(commitList).not.empty;
      const meta = commitList[0].metaList[0];
      expect(meta).to.have.property('key').equal('foo');
      expect(meta).to.have.property('val').equal('baz');
      next();
    }).catch((err) => {
      next(new Error(err));
    });
  });
});

