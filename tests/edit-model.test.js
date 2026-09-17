import assert from 'node:assert/strict'; import test from 'node:test'; import { buildCutPlan } from '../extension/edit-model.js';
test('merges overlapping enabled cuts and applies trim', () => { const plan = buildCutPlan([{start:2,end:4},{start:3,end:6},{start:8,end:9,enabled:false}], {start:1,end:9}, 10); assert.deepEqual(plan.cuts,[{start:2,end:6}]); assert.equal(plan.remainingSeconds,4); });
test('rejects invalid trim and ignores disabled cuts', () => { assert.throws(() => buildCutPlan([], {start:4,end:2}, 5)); assert.equal(buildCutPlan([{start:1,end:2,enabled:false}], {}, 4).removedSeconds,0); });
test('rejects invalid enabled removals and whole-video deletion', () => {
  for (const cut of [{start:4,end:2},{start:-1,end:2},{start:1,end:11},{start:NaN,end:2},{start:0,end:10}]) assert.throws(() => buildCutPlan([cut], {}, 10));
});
test('keeps exactly six seconds for trim one to nine with removal two to four', () => {
  const plan = buildCutPlan([{start:2,end:4}], {start:1,end:9}, 10);
  assert.equal(plan.remainingSeconds, 6);
  assert.deepEqual(plan.cuts, [{start:2,end:4}]);
});
