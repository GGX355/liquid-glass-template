// Public preview only. No credentials, network writes or persistent storage.
import { pollUnavailable } from './pulse-business.js';
export function createDemoApi() {
  const polls = new Map(), draws = new Map(), rosters = new Map();
  const copy = value => structuredClone(value);
  function makePoll(data, id = crypto.randomUUID()) {
    const options = data.options.map((label, i) => ({ id: `${id}-${i}`, label, votes: 0, isWriteIn: false, notes: [], writeIns: [] }));
    if (data.writeInLabel) options.push({ id: `${id}-write`, label: data.writeInLabel, votes: 0, isWriteIn: true, notes: [], writeIns: [] });
    if (options.length < 2 || options.length > 8) throw new Error('请填写 2–8 个选项（含补充选项）。');
    const closesAt = data.closesAtISO ? Date.parse(data.closesAtISO) : null;
    if (closesAt != null && (!Number.isFinite(closesAt) || closesAt <= Date.now())) throw new Error('请选择未来的截止时间。');
    const poll = { id, question: data.question, options, total: 0, votedId: null, votedIds: [], maxChoices: data.maxChoices, creatorId: 'sample', closed: false, voterNoteLabel: data.voterNoteLabel || (data.roster?.length ? '姓名' : ''), myNote: null, myWriteIn: null, description: data.description || '', closesAt, deadlinePassed: false };
    polls.set(id, poll); rosters.set(id, data.roster || []); return copy(poll);
  }
  function makeDraw(data, id = crypto.randomUUID()) {
    if (!data.slots.length || data.slots.length > 12) throw new Error('请填写 1–12 种签项。');
    if (!data.revealModes?.length) throw new Error('至少保留一种揭晓方式。');
    const slots = data.slots.map((slot, i) => ({ id: `${id}-${i}`, ...slot, taken: 0, remaining: slot.count }));
    if (data.blankMode !== 'none') slots.push({ id: `${id}-blank`, label: data.blankLabel, count: data.blankMode === 'count' ? data.blankCount : null, remaining: data.blankMode === 'count' ? data.blankCount : null, taken: 0 });
    const draw = { id, title: data.title, slots, creatorId: 'sample', closed: false, allTaken: false, voterNoteLabel: data.voterNoteLabel || (data.roster?.length ? '姓名' : ''), myNote: null, myDraw: null, totalTaken: 0, description: data.description || '', resultsPublic: data.resultsPublic || false, revealModes: data.revealModes, blind: true };
    draws.set(id, draw); rosters.set(id, data.roster || []); return copy(draw);
  }
  makePoll({ question: '这周末，我们去哪儿？', options: ['山野徒步', '海边日落', '城市漫游'], maxChoices: 1 }, 'weekend');
  ['去绿色里，深呼吸。', '等一场，橘色的浪漫。', '在熟悉的街，偶遇新鲜。'].forEach((description, i) => { polls.get('weekend').options[i].description = description; });
  makeDraw({ title: '给今天，一点未知的惊喜。', slots: [{ label: '把今天，过成小假期。', count: 5 }, { label: '你值得，一点小奖励。', count: 5 }, { label: '下一站，遇见好心情。', count: 5 }], blankMode: 'none', revealModes: ['flip', 'scratch', 'grid'] }, 'little-luck');
  function noteFor(activity, note = '') {
    if (activity.voterNoteLabel && !note.trim()) throw new Error(`请填写${activity.voterNoteLabel}。`);
    const names = rosters.get(activity.id); if (names.length && !names.includes(note.trim())) throw new Error('这个名字不在参与名单中。');
  }
  const view = draw => draw ? draw.blind ? { ...copy(draw), totalTaken: null, slots: draw.slots.map(({ id, label }) => ({ id, label })) } : copy(draw) : null;
  return {
    demo: true,
    async initial() { return { poll: copy(polls.get('weekend')), draw: view(draws.get('little-luck')) }; },
    async getPoll(id) { return copy(polls.get(id) || null); },
    async getDraw(id) { return view(draws.get(id)); },
    async vote({ pollId, optionIds, note, writeInText }) {
      const poll = polls.get(pollId); if (pollUnavailable(poll)) throw new Error('投票已结束。');
      if (poll.votedIds.length) throw new Error('你已经投过票了。');
      if (!optionIds.length || new Set(optionIds).size !== optionIds.length || (poll.maxChoices > 0 && optionIds.length > poll.maxChoices) || optionIds.some(id => !poll.options.some(option => option.id === id))) throw new Error('请检查所选选项和数量。');
      noteFor(poll, note); const chosen = poll.options.filter(option => optionIds.includes(option.id));
      if (chosen.some(option => option.isWriteIn) && !writeInText?.trim()) throw new Error('请填写补充选项。');
      poll.votedIds = [...optionIds]; poll.votedId = optionIds[0]; poll.myNote = note || null; poll.myWriteIn = writeInText || null; poll.total++;
      for (const option of chosen) { option.votes++; if (note) option.notes.push(note); if (option.isWriteIn) option.writeIns.push(writeInText); }
      return copy(poll);
    },
    async draw({ pollId, note }) {
      const draw = draws.get(pollId); if (!draw) throw new Error('活动不存在。');
      if (draw.myDraw) return view(draw);
      if (draw.closed || draw.allTaken) throw new Error('抽签已结束。'); noteFor(draw, note);
      const available = draw.slots.filter(slot => slot.remaining === null || slot.remaining > 0);
      const total = available.reduce((sum, slot) => sum + (slot.remaining ?? 1), 0);
      let ticket = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * total;
      const slot = available.find(slot => (ticket -= slot.remaining ?? 1) < 0) || available.at(-1);
      slot.taken++; if (slot.remaining !== null) slot.remaining--;
      draw.totalTaken++; draw.blind = false; draw.myDraw = { slotId: slot.id, label: slot.label }; draw.myNote = note || null; draw.allTaken = draw.slots.every(slot => slot.remaining === 0);
      return view(draw);
    },
    async list() { return [...polls.values()].map(p => ({ id: p.id, question: p.question, kind: 'poll', closed: p.closed })).concat([...draws.values()].map(d => ({ id: d.id, title: d.title, kind: 'draw', closed: d.closed }))).reverse(); },
    async createPoll(data) { return makePoll(data); }, async createDraw(data) { return makeDraw(data); },
    async session() { return { id: 'sample', name: '示例发起人' }; },
    async close(id) { const activity = polls.get(id) || draws.get(id); if (!activity) throw new Error('活动不存在。'); activity.closed = true; },
    async setResultsPublic(id, value) { draws.get(id).resultsPublic = value; },
  };
}
