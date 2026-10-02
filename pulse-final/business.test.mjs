import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoApi } from './pulse-demo.js';
import { pollUnavailable } from './pulse-business.js';
test('deadline boundary stops the confirmation even without a fresh fetch', () => {
  assert.equal(pollUnavailable({ closesAt: 2000 }, 1999), false);
  assert.equal(pollUnavailable({ closesAt: 2000 }, 2000), true);
});
test('preview enforces a single vote and rejects invalid choices without mutation', async () => {
  const api = createDemoApi(), { poll } = await api.initial();
  await assert.rejects(api.vote({ pollId: poll.id, optionIds: ['missing'] }));
  assert.equal((await api.getPoll(poll.id)).total, 0);
  await api.vote({ pollId: poll.id, optionIds: [poll.options[0].id] });
  await assert.rejects(api.vote({ pollId: poll.id, optionIds: [poll.options[1].id] }));
  assert.equal((await api.getPoll(poll.id)).total, 1);
});
test('draw remains blind before participating and repeated requests keep the same result', async () => {
  const api = createDemoApi(), { draw } = await api.initial();
  assert.equal(draw.blind, true); assert.equal(draw.totalTaken, null); assert.equal(draw.slots[0].count, undefined);
  const first = await api.draw({ pollId: draw.id }), second = await api.draw({ pollId: draw.id });
  assert.deepEqual(second.myDraw, first.myDraw); assert.equal(second.totalTaken, 1);
});
test('closed polls and roster restrictions cannot mutate an activity', async () => {
  const api = createDemoApi();
  const poll = await api.createPoll({ question: 'Test', options: ['A', 'B'], maxChoices: 1, roster: ['Test guest'] });
  await assert.rejects(api.vote({ pollId: poll.id, optionIds: [poll.options[0].id], note: 'Unknown' }));
  await api.close(poll.id);
  await assert.rejects(api.vote({ pollId: poll.id, optionIds: [poll.options[0].id], note: 'Test guest' }));
  assert.equal((await api.getPoll(poll.id)).total, 0);
});
