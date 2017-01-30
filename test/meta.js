const expect = require('chai').expect;
const commitsToMetaAsync = require('./../index.js').debug.commitsToMetaAsync;
const Commit = require('./../index.js').debug.Commit;


describe("commit message parser", () => {

  it("should parse key-value", (next) => {
    const test = `{foo:bar}`;
    commitsToMetaAsync([new Commit({msg: test})]).then((metaList) => {
      expect(metaList).not.empty;
      const meta = metaList[0];
      expect(meta).to.have.property('key').equal('foo');
      expect(meta).to.have.property('val').equal('bar');
      next();
    });
  });

  it("should parse quotes and escapes", (next) => {
    const test = `{"{\\":\\';\\\\="}`;
    commitsToMetaAsync([new Commit({msg: test})]).then((metaList) => {
      expect(metaList).not.empty;
      const meta = metaList[0];
      expect(meta).to.have.property('key').equal(`{":';\\=`);
      next();
    });
  });
});

