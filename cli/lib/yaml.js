'use strict';

const { makeError } = require('./errors.js');

const SUPPORTED_SUBSET = Object.freeze([
  'block-mapping',
  'block-sequence',
  'scalar-string',
  'scalar-integer',
  'scalar-boolean',
  'scalar-null',
  'frontmatter',
  'triple-quoted-string',
  'single-line-string',
  'comments'
]);

const UNSUPPORTED = Object.freeze([
  'anchors',
  'flow-style',
  'tags-beyond-implicit-scalars'
]);

function yamlError(line, column, feature, message) {
  return makeError('E_INVALID_YAML', message, { line, column, feature });
}

function parseScalar(raw, line, column) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return n;
  }
  if (/^-?\d+\.\d+$/.test(s)) {
    const f = parseFloat(s);
    if (!Number.isNaN(f)) return f;
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s.startsWith('{') || s.startsWith('[')) {
    throw yamlError(line, column, 'flow-style', 'flow-style collections are not supported');
  }
  if (s.startsWith('&') || s.startsWith('*')) {
    throw yamlError(line, column, 'anchors', 'YAML anchors and aliases are not supported');
  }
  if (s.startsWith('!') && !s.startsWith('!!str')) {
    throw yamlError(line, column, 'tags-beyond-implicit-scalars', 'non-implicit YAML tags are not supported');
  }
  return s;
}

function checkUnsupported(rawLine, lineNum) {
  const trimmed = rawLine.trim();
  if (trimmed.length === 0 || trimmed.startsWith('#')) return;
  const scanString = (function stripQuotedRegions(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '"' || c === "'") {
        out += ' ';
        i++;
        while (i < text.length && text[i] !== c) {
          if (text[i] === '\\' && i + 1 < text.length) { out += '  '; i += 2; continue; }
          out += ' ';
          i++;
        }
        out += ' ';
        i++;
        continue;
      }
      if (c === '#') break;
      out += c;
      i++;
    }
    return out;
  })(rawLine);
  const anchorIdx = scanString.search(/(?:^|[\s:])[&*][A-Za-z0-9_-]/);
  if (anchorIdx !== -1) {
    throw yamlError(lineNum + 1, anchorIdx + 1, 'anchors', 'YAML anchors/aliases are not supported');
  }
  const flowMapIdx = scanString.indexOf('{');
  if (flowMapIdx !== -1) {
    throw yamlError(lineNum + 1, flowMapIdx + 1, 'flow-style', 'flow-style mappings are not supported');
  }
  const flowSeqIdx = scanString.indexOf('[');
  if (flowSeqIdx !== -1) {
    throw yamlError(lineNum + 1, flowSeqIdx + 1, 'flow-style', 'flow-style sequences are not supported');
  }
  const tagMatch = scanString.match(/(^|\s)!![A-Za-z0-9_-]+/);
  if (tagMatch) {
    const idx = scanString.indexOf('!!');
    throw yamlError(lineNum + 1, idx + 1, 'tags-beyond-implicit-scalars', 'non-implicit YAML tags are not supported');
  }
}

function splitLines(source) {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function indentOf(line) {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

function collapseBlockScalar(lines, startIdx, baseIndent) {
  const parts = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().length === 0) {
      parts.push('');
      i++;
      continue;
    }
    const ind = indentOf(line);
    if (ind <= baseIndent) break;
    parts.push(line.slice(baseIndent + 2));
    i++;
  }
  return { value: parts.join('\n').replace(/\s+$/, ''), next: i };
}

function parseBlock(lines, startIdx, indent) {
  let i = startIdx;
  while (i < lines.length && (lines[i].trim().length === 0 || lines[i].trim().startsWith('#'))) i++;
  if (i >= lines.length) return { value: null, next: i };

  let line = lines[i];
  let ind = indentOf(line);
  if (ind < indent) return { value: null, next: i };

  const trimmed = line.trim();
  checkUnsupported(line, i);

  if (trimmed.startsWith('- ') || trimmed === '-') {
    const arr = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim().length === 0) { i++; continue; }
      if (cur.trim().startsWith('#')) { i++; continue; }
      const curInd = indentOf(cur);
      if (curInd < indent) break;
      if (curInd > indent) break;
      const rest = cur.trim();
      if (!rest.startsWith('-')) break;
      checkUnsupported(cur, i);
      const afterDash = rest === '-' ? '' : rest.slice(2);
      if (afterDash.length === 0) {
        const sub = parseBlock(lines, i + 1, indent + 2);
        arr.push(sub.value === null ? {} : sub.value);
        i = sub.next;
      } else if (/^[A-Za-z0-9_"'][^:]*:\s*($|[^\n])/.test(afterDash) && afterDash.includes(':')) {
        const syntheticLine = ' '.repeat(indent + 2) + afterDash;
        const replaced = lines.slice();
        replaced[i] = syntheticLine;
        const sub = parseBlock(replaced, i, indent + 2);
        arr.push(sub.value);
        i = sub.next;
      } else {
        arr.push(parseScalar(afterDash, i + 1, indent + 1));
        i++;
      }
    }
    return { value: arr, next: i };
  }

  const obj = {};
  while (i < lines.length) {
    const cur = lines[i];
    if (cur.trim().length === 0) { i++; continue; }
    if (cur.trim().startsWith('#')) { i++; continue; }
    const curInd = indentOf(cur);
    if (curInd < indent) break;
    if (curInd > indent) break;
    checkUnsupported(cur, i);
    const t = cur.trim();
    const colonIdx = findKeyColon(t);
    if (colonIdx === -1) break;
    const key = t.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
    const afterColon = t.slice(colonIdx + 1).trim();
    if (afterColon.length === 0) {
      const sub = parseBlock(lines, i + 1, indent + 2);
      obj[key] = sub.value === null ? null : sub.value;
      i = sub.next;
    } else if (afterColon === '|' || afterColon === '>') {
      const block = collapseBlockScalar(lines, i + 1, indent);
      obj[key] = block.value;
      i = block.next;
    } else if (afterColon === '"""' || afterColon === "'''") {
      const delim = afterColon;
      const parts = [];
      i++;
      while (i < lines.length && lines[i].trim() !== delim) {
        parts.push(lines[i]);
        i++;
      }
      if (i >= lines.length) throw yamlError(i + 1, 1, 'triple-quoted-string', 'unterminated triple-quoted string');
      obj[key] = parts.join('\n');
      i++;
    } else {
      obj[key] = parseScalar(afterColon, i + 1, indent + 1);
      i++;
    }
  }
  return { value: obj, next: i };
}

function findKeyColon(line) {
  let inStr = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === inStr && line[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '#') break;
    if (c === ':') return i;
  }
  return -1;
}

function parse(source) {
  if (typeof source !== 'string') throw makeError('E_INVALID_YAML', 'yaml.parse expected a string', { line: 1, column: 1, feature: 'input-type' });
  if (source.length === 0) return {};
  const lines = splitLines(source);
  let i = 0;
  while (i < lines.length && (lines[i].trim().length === 0 || lines[i].trim().startsWith('#'))) i++;
  if (i >= lines.length) return {};
  const startIndent = indentOf(lines[i]);
  const parsed = parseBlock(lines, i, startIndent);
  return parsed.value === null ? {} : parsed.value;
}

function parseFrontmatter(source) {
  if (typeof source !== 'string') throw makeError('E_INVALID_YAML', 'parseFrontmatter expected a string', { line: 1, column: 1, feature: 'input-type' });
  const lines = splitLines(source);
  let start = 0;
  while (start < lines.length) {
    const t = lines[start].trim();
    if (t.length === 0 || t.startsWith('#')) { start++; continue; }
    break;
  }
  if (start >= lines.length || lines[start].trim() !== '---') {
    return { frontmatter: {}, body: source };
  }
  let end = -1;
  for (let j = start + 1; j < lines.length; j++) {
    if (lines[j].trim() === '---') { end = j; break; }
  }
  if (end === -1) {
    return { frontmatter: parse(lines.slice(start + 1).join('\n')), body: '' };
  }
  const fmText = lines.slice(start + 1, end).join('\n');
  const bodyText = lines.slice(end + 1).join('\n');
  return { frontmatter: parse(fmText), body: bodyText };
}

module.exports = { parse, parseFrontmatter, SUPPORTED_SUBSET, UNSUPPORTED };
