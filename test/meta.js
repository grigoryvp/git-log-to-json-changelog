const expect = require('chai').expect;
const readMetaAsync = require('./../index.js').debug.readMetaAsync;
const Commit = require('./../index.js').debug.Commit;


describe("commit message parser", () => {

  it("should parse key-value", (next) => {
    const test = `{foo:bar}`;
    readMetaAsync([new Commit({msg: test})]).then((commitList) => {
      expect(commitList).not.empty;
      const meta = commitList[0].metaList[0];
      expect(meta).to.have.property('key').equal('foo');
      expect(meta).to.have.property('val').equal('bar');
      next();
    });
  });

  it("should parse quotes and escapes", (next) => {
    const test = `{"{\\":\\';\\\\="}`;
    readMetaAsync([new Commit({msg: test})]).then((commitList) => {
      expect(commitList).not.empty;
      const meta = commitList[0].metaList[0];
      expect(meta).to.have.property('key').equal(`{":';\\=`);
      next();
    });
  });
});

