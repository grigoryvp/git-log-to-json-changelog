const expect = require('chai').expect;
const readMetaAsync = require('./../index.js').debug.readMetaAsync;
const Commit = require('./../index.js').debug.Commit;


describe("commit message parser", () => {

  it("should parse key-value", (next) => {
    const test = `{foo:bar}`;
    readMetaAsync([new Commit({msg: test})]).then((commitList) => {
      expect(commitList).not.empty;
      expect(commitList[0].metaList).to.have.length(1);
      const meta = commitList[0].metaList[0];
      expect(meta).to.have.property('key').equal('foo');
      expect(meta).to.have.property('val').equal('bar');
      next();
    }).catch((err) => {
      next(new Error(err));
    });
  });

  it("should parse quotes and escapes", (next) => {
    const test = `{"{\\":\\';\\\\="}`;
    readMetaAsync([new Commit({msg: test})]).then((commitList) => {
      expect(commitList).not.empty;
      expect(commitList[0].metaList).to.have.length(1);
      const meta = commitList[0].metaList[0];
      expect(meta).to.have.property('key').equal(`{":';\\=`);
      next();
    }).catch((err) => {
      next(new Error(err));
    });
  });

  it("should trim keys", (next) => {
    const test = `{ foo : "foo"; bar : "bar"}`;
    readMetaAsync([new Commit({msg: test})]).then((commitList) => {
      console.log(JSON.stringify(commitList));
      expect(commitList).not.empty;
      expect(commitList[0].metaList).to.have.length(2);
      expect(commitList[0].metaList[0]).to.have.property('key').equal('foo');
      expect(commitList[0].metaList[1]).to.have.property('key').equal('bar');
      next();
    }).catch((err) => {
      next(new Error(err));
    });
  });
});

