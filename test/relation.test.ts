import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRelation } from '../src/relation.ts';

const L = '[[Deep Work]]';

test('empty values become the link', () => {
    for (const v of [undefined, null, '']) assert.equal(mergeRelation(v, L), L);
});
test('same link is not duplicated', () => {
    assert.equal(mergeRelation(L, L), L);
    assert.deepEqual(mergeRelation([L], L), [L]);
});
test('a different existing value becomes a list', () => {
    assert.deepEqual(mergeRelation('[[Other]]', L), ['[[Other]]', L]);
    assert.deepEqual(mergeRelation(['[[Other]]'], L), ['[[Other]]', L]);
});
test('non-string values are replaced by the link', () => {
    assert.equal(mergeRelation(3, L), L);
});
