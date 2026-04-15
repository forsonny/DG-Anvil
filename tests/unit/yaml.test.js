'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const yaml = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'yaml.js'));

test('parse block mapping of scalars', () => {
  const r = yaml.parse('a: 1\nb: hello\nc: true\nd: null\n');
  assert.strictEqual(r.a, 1);
  assert.strictEqual(r.b, 'hello');
  assert.strictEqual(r.c, true);
  assert.strictEqual(r.d, null);
});

test('parse nested mapping', () => {
  const r = yaml.parse('outer:\n  inner: 42\n');
  assert.deepStrictEqual(r, { outer: { inner: 42 } });
});

test('parse block sequence of scalars', () => {
  const r = yaml.parse('items:\n  - one\n  - two\n  - 3\n');
  assert.deepStrictEqual(r.items, ['one', 'two', 3]);
});

test('parse sequence of mappings', () => {
  const r = yaml.parse('people:\n  - name: A\n    age: 1\n  - name: B\n    age: 2\n');
  assert.strictEqual(r.people.length, 2);
  assert.strictEqual(r.people[0].name, 'A');
  assert.strictEqual(r.people[1].age, 2);
});

test('parse single-line double-quoted string', () => {
  const r = yaml.parse('s: "hello world"\n');
  assert.strictEqual(r.s, 'hello world');
});

test('parse comments ignored', () => {
  const r = yaml.parse('# comment\na: 1\n# another comment\nb: 2\n');
  assert.deepStrictEqual(r, { a: 1, b: 2 });
});

test('parse integer/boolean/null scalars', () => {
  const r = yaml.parse('i: -42\nb1: true\nb2: false\nn: null\n');
  assert.strictEqual(r.i, -42);
  assert.strictEqual(r.b1, true);
  assert.strictEqual(r.b2, false);
  assert.strictEqual(r.n, null);
});

test('parse triple-quoted string', () => {
  const src = 'body: """\nline1\nline2\n"""\n';
  const r = yaml.parse(src);
  assert.strictEqual(r.body, 'line1\nline2');
});

test('parseFrontmatter splits frontmatter from body', () => {
  const src = '---\na: 1\n---\nbody text\n';
  const r = yaml.parseFrontmatter(src);
  assert.strictEqual(r.frontmatter.a, 1);
  assert.ok(r.body.includes('body text'));
});

test('parseFrontmatter skips leading comments before delimiter', () => {
  const src = '# meta\n---\na: 1\n---\n';
  const r = yaml.parseFrontmatter(src);
  assert.strictEqual(r.frontmatter.a, 1);
});

test('anchor throws E_INVALID_YAML', () => {
  try { yaml.parse('a: &x 1\n'); assert.fail('should throw'); }
  catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_YAML');
    assert.strictEqual(typeof err.details.line, 'number');
    assert.strictEqual(typeof err.details.column, 'number');
  }
});

test('flow-style mapping throws E_INVALID_YAML', () => {
  try { yaml.parse('a: {b: 1}\n'); assert.fail('should throw'); }
  catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_YAML');
    assert.strictEqual(err.details.feature, 'flow-style');
    assert.strictEqual(typeof err.details.line, 'number');
    assert.strictEqual(typeof err.details.column, 'number');
  }
});

test('flow-style sequence throws E_INVALID_YAML', () => {
  try { yaml.parse('a: [1, 2]\n'); assert.fail('should throw'); }
  catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_YAML');
    assert.strictEqual(err.details.feature, 'flow-style');
  }
});

test('non-implicit tag throws E_INVALID_YAML', () => {
  try { yaml.parse('a: !!map\n'); assert.fail('should throw'); }
  catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_YAML');
    assert.strictEqual(err.details.feature, 'tags-beyond-implicit-scalars');
  }
});

test('SUPPORTED_SUBSET and UNSUPPORTED constants present', () => {
  assert.ok(Array.isArray(yaml.SUPPORTED_SUBSET));
  assert.ok(Array.isArray(yaml.UNSUPPORTED));
  assert.ok(yaml.UNSUPPORTED.includes('anchors'));
  assert.ok(yaml.UNSUPPORTED.includes('flow-style'));
});
