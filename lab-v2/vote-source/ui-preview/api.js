// Only the isolated preview Vite config aliases server APIs to this module.
// Production routes continue to use their existing authenticated server APIs.
const copy = (value) => structuredClone(value);
const polls = new Map();
let latest = "preview-weekend";
polls.set(latest, {
  id: latest,
  question: "这周末，我们去哪儿？",
  description: "留一点时间给彼此，选一个最想一起去的地方。",
  options: ["山野徒步", "海边日落", "城市漫游"].map((label, i) => ({
    id: `option-${i}`,
    label,
    votes: [28, 19, 11][i],
    isWriteIn: false,
    notes: [],
    writeIns: [],
  })),
  total: 58,
  votedId: null,
  votedIds: [],
  maxChoices: 1,
  creatorId: "preview-host",
  closed: false,
  voterNoteLabel: "",
  myNote: null,
  myWriteIn: null,
  closesAt: null,
  deadlinePassed: false,
});
export const effectiveMaxChoices = (max, count) => (max <= 0 ? count : Math.min(max, count));
export async function fetchLivePoll() {
  return copy(polls.get(latest));
}
export async function fetchPollById({ data }) {
  return copy(polls.get(data.pollId) || null);
}
export async function fetchPollList() {
  return [...polls.values()].reverse().map((p) => ({ ...copy(p), createdAtMs: 1790913600000 }));
}
export async function castVote({ data }) {
  const p = polls.get(data.pollId || latest);
  if (!p || p.closed || (p.closesAt && Date.now() >= p.closesAt)) throw Error("活动已结束");
  if (p.votedIds.length) throw Error("你已经参与过这次投票");
  const ids = [...new Set(data.optionIds)];
  if (
    !ids.length ||
    ids.length > effectiveMaxChoices(p.maxChoices, p.options.length) ||
    ids.some((id) => !p.options.some((o) => o.id === id))
  )
    throw Error("请选择有效的选项");
  if (p.voterNoteLabel && !data.note?.trim()) throw Error("请先填写参与信息");
  if (p.roster?.length && !p.roster.includes(data.note.trim())) throw Error("名字不在参与名单中");
  if (p.options.some((o) => ids.includes(o.id) && o.isWriteIn) && !data.writeInText?.trim())
    throw Error("请填写其他选项");
  p.votedIds = ids;
  p.votedId = ids[0];
  p.myNote = data.note || null;
  p.myWriteIn = data.writeInText || null;
  for (const o of p.options)
    if (ids.includes(o.id)) {
      o.votes++;
      if (data.note) o.notes.push(data.note);
      if (o.isWriteIn) o.writeIns.push(data.writeInText);
    }
  p.total += ids.length;
  return copy(p);
}
export async function createLivePoll({ data }) {
  latest = `preview-${crypto.randomUUID()}`;
  const p = {
    ...copy(polls.values().next().value),
    ...data,
    id: latest,
    total: 0,
    votedId: null,
    votedIds: [],
    myNote: null,
    myWriteIn: null,
    closed: false,
    closesAt: data.closesAtISO ? new Date(data.closesAtISO).getTime() : null,
  };
  p.options = data.options.map((label, i) => ({
    id: `${latest}-${i}`,
    label,
    votes: 0,
    isWriteIn: false,
    notes: [],
    writeIns: [],
  }));
  if (data.writeInLabel)
    p.options.push({
      id: `${latest}-other`,
      label: data.writeInLabel,
      votes: 0,
      isWriteIn: true,
      notes: [],
      writeIns: [],
    });
  polls.set(latest, p);
  return copy(p);
}
export async function fetchVoteDetails() {
  return [];
}
export async function fetchRosterStatus() {
  return { hasRoster: false, entries: [], doneCount: 0, total: 0 };
}
export async function listVoterProfiles() {
  return [];
}
export async function closeLivePoll({ data }) {
  const p = polls.get(data.pollId);
  if (p) p.closed = true;
  return copy(p);
}
let draw = {
  id: "preview-draw",
  title: "给今天，一点小幸运。",
  description: "一份小小的随机惊喜，送给认真生活的你。",
  blind: true,
  slots: ["一杯好喝的咖啡", "一场日落散步", "一段自由时间"].map((label, i) => ({
    id: `slot-${i}`,
    label,
  })),
  myDraw: null,
  totalTaken: null,
  closed: false,
  allTaken: false,
  creatorId: "another-preview-host",
  voterNoteLabel: "",
  myNote: null,
  revealModes: ["flip", "scratch", "grid"],
  resultsPublic: false,
};
export const getPreviewDraw = () => copy(draw);
export async function fetchDrawById() {
  return copy(draw);
}
export async function drawLiveOnce() {
  if (draw.myDraw) return copy(draw);
  const index = crypto.getRandomValues(new Uint32Array(1))[0] % draw.slots.length;
  const slot = draw.slots[index];
  draw = {
    ...draw,
    blind: false,
    slots: draw.slots.map((s, i) => ({
      ...s,
      count: 12,
      taken: i === index ? 1 : 0,
      remaining: i === index ? 11 : 12,
    })),
    myDraw: { slotId: slot.id, label: slot.label },
    totalTaken: 1,
  };
  return copy(draw);
}
export async function fetchDrawAdmin() {
  return null;
}
export async function fetchPublicClaims() {
  return [];
}
export async function listDrawClaims() {
  return [];
}
export async function setDrawResultsPublic() {
  throw Error("视觉预览不发布真实抽签结果");
}
