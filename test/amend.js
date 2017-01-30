const expect = require('chai').expect;
const applyAmendAsync = require('./../index.js').debug.applyAmendAsync;
const Meta = require('./../index.js').debug.Meta;


describe("amend meta", () => {

  it("should amend single meta", (next) => {
    const metaList = [
      new Meta({hash: '123', key: 'foo', val: 'bar', sib: 0}),
      new Meta({hash: '124', key: 'amend', val: '123', sib: 0}),
      new Meta({hash: '124', key: 'foo', val: 'baz', sib: 1}),
    ]
    applyAmendAsync(metaList).then((resultList) => {
      next();
    });
  });
});

