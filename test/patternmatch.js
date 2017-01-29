const expect = require('chai').expect;
const assert = require('chai').assert;
const patternmatch = require('./../index.js').debug.patternmatch;


describe("patternmatch number", () => {

  it("matches single case, one sample, equal", () => {
    patternmatch(1, [
      [1, (v) => expect(v).to.equal(1)],
    ]);
  });

  it("matches single case, one sample, not equal", () => {
    patternmatch(1, [
      [2, (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, one sample, equal", () => {
    patternmatch(1, [
      [1, (v) => expect(v).to.equal(1)],
      [2, (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, one sample, not equal", () => {
    patternmatch(1, [
      [2, (v) => assert(false)],
      [3, (v) => assert(false)],
    ]);
  });

  it("matches single case, multiple sample, equal", () => {
    patternmatch(1, [
      [[1, 2], (v) => expect(v).to.equal(1)],
    ]);
  });

  it("matches single case, multiple sample, not equal", () => {
    patternmatch(1, [
      [[2, 3], (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, multiple sample, equal", () => {
    patternmatch(1, [
      [[1, 2], (v) => expect(v).to.equal(1)],
      [[3, 4], (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, multiple sample, not equal", () => {
    patternmatch(1, [
      [[2, 3], (v) => assert(false)],
      [[4, 5], (v) => assert(false)],
    ]);
  });
});


describe("patternmatch regexp", function() {

  it("matches single case, one sample, equal", () => {
    patternmatch('foo', [
      [/(foo)/, (v) => expect(v).to.equal('foo')],
    ]);
  });

  it("matches single case, one sample, not equal", () => {
    patternmatch('foo', [
      [/(bar)/, (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, one sample, equal", () => {
    patternmatch('foo', [
      [/(foo)/, (v) => expect(v).to.equal('foo')],
      [/bar/, (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, one sample, not equal", () => {
    patternmatch('foo', [
      [/(bar)/, (v) => assert(false)],
      [/baz/, (v) => assert(false)],
    ]);
  });

  it("matches single case, multiple sample, equal", () => {
    patternmatch('foo', [
      [[true, /(foo)/], (v) => expect(v).to.equal('foo')],
    ]);
  });

  it("matches single case, multiple sample, not equal", () => {
    patternmatch('foo', [
      [[true, /(bar)/], (v) => assert(false)],
    ]);
  });

  it("matches multiple cases, multiple sample, equal", () => {
    patternmatch('foo', [
      [[false, 0], (v) => assert(false)],
      [[true, 1, /(foo)/], (v) => expect(v).to.equal('foo')],
    ]);
  });

  it("matches multiple cases, multiple sample, not equal", () => {
    patternmatch('foo', [
      [[false, 0], (v) => assert(false)],
      [[true, 1, /(bar)/], (v) => assert(false)],
    ]);
  });
});

describe("patternmatch 'anything'", function() {

  it("matches single case, one sample", () => {
    patternmatch('foo', [
      [null, (v) => expect(v).to.equal('foo')],
    ]);
  });

  it("matches multiple cases, one sample, equal", () => {
    patternmatch(1, [
      [undefined, (v) => expect(v).to.equal(1)],
      [/bar/, (v) => assert(false)],
    ]);
  });

  it("matches single case, multiple sample, equal", () => {
    patternmatch('foo', [
      [[true, null], (v) => expect(v).to.equal('foo')],
    ]);
  });

  it("matches multiple cases, multiple sample, equal", () => {
    patternmatch('foo', [
      [[false, 0], (v) => assert(false)],
      [[true, undefined], (v) => expect(v).to.equal('foo')],
    ]);
  });
});

