import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCsv, escapeCsvField } from './csv-writer.js'

test('quotes a field containing the delimiter', () => {
  assert.equal(escapeCsvField('a;b', ';'), '"a;b"')
})

test('leaves a field alone when it contains the other delimiter', () => {
  assert.equal(escapeCsvField('a,b', ';'), 'a,b')
})

test('doubles internal quotes and wraps the field', () => {
  assert.equal(escapeCsvField('say "hi"', ';'), '"say ""hi"""')
})

test('quotes a field containing a newline', () => {
  assert.equal(escapeCsvField('line1\nline2', ';'), '"line1\nline2"')
})

test('quotes a field containing a carriage return', () => {
  assert.equal(escapeCsvField('line1\rline2', ';'), '"line1\rline2"')
})

test('prefixes a formula-injection field with a single quote', () => {
  assert.equal(escapeCsvField('=SUM(A1)', ';'), "'=SUM(A1)")
  assert.equal(escapeCsvField('+1', ';'), "'+1")
  assert.equal(escapeCsvField('-1', ';'), "'-1")
  assert.equal(escapeCsvField('@cmd', ';'), "'@cmd")
})

test('leaves a plain field untouched', () => {
  assert.equal(escapeCsvField('CONTACT', ';'), 'CONTACT')
})

test('buildCsv prefixes a UTF-8 BOM and joins rows with CRLF', () => {
  const csv = buildCsv(['a', 'b'], [['1', '2']], ';')
  assert.ok(csv.startsWith('\uFEFF'))
  assert.equal(csv, '\uFEFFa;b\r\n1;2')
})
