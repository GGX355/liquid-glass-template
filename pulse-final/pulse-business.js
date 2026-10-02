// UI owned by pulse-final. The adapter owns persistence, identity and rules.
// No old application component or stylesheet is loaded into this frontend.
export function pollUnavailable(poll, now = Date.now()) {
  return !poll || poll.closed || poll.deadlinePassed || (poll.closesAt != null && now >= poll.closesAt);
}
export function bindPulseBusiness({ api, showDialog, modalMotion, panels, setMode, signal, refreshGlass }) {
  const $ = selector => document.querySelector(selector);
  const on = (element, event, callback) => element.addEventListener(event, callback, { signal });
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; };
  const box = () => node('div', null, 'business-content');
  let poll = null, draw = null, voting = false, drawing = false, loading = true, request = 0, stopped = false;
  let pollTimer, refreshTimer, errorMessage = '', currentResult = false;
  const announce = message => { $('#announcement').textContent = message; };
  const fail = error => { if (!stopped) showDialog({ kicker: 'PULSE / PLEASE TRY AGAIN', title: '还差一点，就好了。', description: error.message || '暂时无法完成，请稍后重试。', detail: '', action: '知道了' }); };
  const run = task => Promise.resolve().then(task).catch(fail);
  function field(parent, title, { type = 'text', value = '', required = false, multiline = false, min, max, placeholder = '' } = {}) {
    const label = node('label', title), input = node(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = type;
    input.value = value; input.required = required; input.placeholder = placeholder;
    if (min != null) input.min = min; if (max != null) input.max = max;
    label.append(input); parent.append(label); return input;
  }
  function choice(parent, title, options, value) {
    const label = node('label', title), select = node('select');
    for (const [key, text] of options) { const option = node('option', text); option.value = key; select.append(option); }
    select.value = value; label.append(select); parent.append(label); return select;
  }
  function check(parent, title, checked = false) {
    const label = node('label', null, 'business-check'), input = node('input'); input.type = 'checkbox'; input.checked = checked;
    label.append(input, node('span', title)); parent.append(label); return input;
  }
  function button(parent, text, callback) {
    const el = node('button', text, 'glass-control'); el.type = 'button'; on(el, 'click', () => run(callback)); parent.append(el); return el;
  }
  function valid(container) { for (const input of container.querySelectorAll('input,textarea,select')) if (!input.reportValidity()) return false; return true; }
  const splitLines = value => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  function modal(title, description, content, action, callback) { showDialog({ kicker: api.demo ? 'PULSE / SAMPLE ACTIVITY' : 'PULSE / SHARED MOMENTS', title, description, content, action, callback }); }
  const selectedIds = () => [...$('#poll-form').querySelectorAll('input:checked')].map(input => input.value);
  function voteState() {
    const ids = selectedIds(), blocked = pollUnavailable(poll);
    $('#vote-button').disabled = loading || voting || blocked || ids.length === 0 || Boolean(poll?.votedIds?.length) || (poll?.maxChoices > 0 && ids.length > poll.maxChoices);
    $('#vote-button').querySelector('span').textContent = loading ? '正在读取活动…' : errorMessage ? '活动暂不可用' : !poll ? '暂无投票活动' : blocked ? '本次投票已结束' : poll.votedIds?.length ? '已投出这一票' : '选好，投出这一票';
  }
  function renderPoll(next) {
    poll = next; errorMessage = ''; currentResult = Boolean(poll?.votedIds?.length);
    const fieldset = $('#poll-form fieldset'); fieldset.replaceChildren(node('legend', poll?.question || '选择投票选项', 'sr-only'));
    $('#poll-form-state h3').textContent = poll?.question || '还没有开始的投票。';
    $('#poll-form-state .card-subtitle').textContent = poll ? poll.description || (poll.maxChoices === 1 ? '选一个此刻最想去的地方。' : poll.maxChoices ? `最多选择 ${poll.maxChoices} 项。` : '选择所有你喜欢的选项。') : '可以在活动列表中查看，或发起一个新活动。';
    for (const [index, option] of (poll?.options || []).entries()) {
      const label = node('label', null, 'poll-option glass-control'), input = node('input');
      input.type = poll.maxChoices === 1 ? 'radio' : 'checkbox'; input.name = 'destination'; input.value = option.id; input.checked = poll.votedIds?.includes(option.id) || false;
      const copy = node('span', null, 'option-copy'); copy.append(node('b', option.label));
      if (option.description) copy.append(node('small', option.description));
      const dot = node('span', null, 'choice-dot'); dot.setAttribute('aria-hidden', 'true');
      label.append(input, node('span', String(index + 1).padStart(2, '0'), 'option-number'), copy, dot); fieldset.append(label);
    }
    $('#chosen-destination').textContent = poll?.options.filter(option => poll.votedIds?.includes(option.id)).map(option => option.isWriteIn ? poll.myWriteIn || option.label : option.label).join('、') || '';
    $('#poll-result .result-fine').textContent = api.demo ? '本页示例记录 · 刷新后重置。' : '你的选择已记录，感谢参与。';
    $('#reset-poll').textContent = '看看大家的选择 ↗';
    $('#poll-panel .card-bottom span').textContent = poll?.closesAt ? `截止 ${new Date(poll.closesAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '一人一份心意';
    panels.setResult(currentResult, false); voteState(); refreshGlass();
  }
  function renderDraw(next) {
    draw = next;
    $('#draw-panel h3').textContent = draw?.title || '好运，还在准备中。';
    $('#draw-panel .card-subtitle').textContent = draw?.description || (draw ? '不用想太多，好运就在下一次轻触。' : '可以在活动列表中查看，或发起一个新活动。');
    $('#draw-button').disabled = !draw || drawing || (!draw.myDraw && (draw.closed || draw.allTaken));
    $('#draw-button').textContent = draw?.myDraw ? '看看我的小幸运 ↗' : draw?.closed ? '本次抽签已结束' : draw?.allTaken ? '所有签已被领取' : '接住我的小幸运 ↗';
  }
  function showResults() {
    if (!poll) return;
    const content = box();
    content.append(node('p', `${poll.total} 人已参与`, 'business-hint'));
    for (const option of poll.options) {
      const row = node('div', null, 'business-result'), line = node('div', null, 'business-row');
      line.append(node('b', option.label), node('span', `${option.votes} 票`));
      const bar = node('progress'); bar.max = Math.max(1, poll.total); bar.value = option.votes; bar.setAttribute('aria-label', `${option.label}：${option.votes} 票`);
      row.append(line, bar); content.append(row);
    }
    button(content, '刷新结果 ↻', async () => { const next = await api.getPoll(poll.id); if (!stopped) { renderPoll(next); showResults(); } });
    modal('每个选择，都被看见。', poll.question, content, '收起结果');
  }
  on($('#poll-form'), 'change', voteState);
  on($('#poll-form'), 'submit', event => {
    event.preventDefault(); if ($('#vote-button').disabled) return;
    const original = poll, ids = selectedIds(), options = poll.options.filter(option => ids.includes(option.id));
    const content = box(); let note, writeIn;
    if (poll.voterNoteLabel) note = field(content, poll.voterNoteLabel, { required: true, value: poll.myNote || '' });
    if (options.some(option => option.isWriteIn)) writeIn = field(content, '你的补充选项', { required: true });
    content.append(node('p', api.demo ? '示例投票，仅在当前页面记录。' : '确认后不可重复投票。', 'business-hint'));
    modal(`这一票，给${options.map(option => option.label).join('、')}。`, '确认此刻的心意。', content, '确认我的选择 ↗', async () => {
      if (!valid(content) || voting) return;
      if (pollUnavailable(original)) throw new Error('投票已截止，请查看结果。');
      voting = true; voteState();
      try {
        const next = await api.vote({ pollId: original.id, optionIds: ids, note: note?.value.trim() || undefined, writeInText: writeIn?.value.trim() || undefined });
        if (stopped) return;
        renderPoll(next); modalMotion.close(() => { panels.setResult(true); announce('投票成功，你的心意已点亮。'); });
      } finally { voting = false; if (!stopped) voteState(); }
    });
  });
  on($('#reset-poll'), 'click', () => run(showResults));
  function revealDraw(result) {
    const content = box();
    content.append(node('div', result.myDraw.label, 'business-ticket glass-control'));
    content.append(node('p', api.demo ? '示例抽签结果 · 刷新页面后重置。' : '这份结果已为你保留，再次打开也会看见它。', 'business-hint'));
    modal('这份小幸运，属于你。', result.title, content, '收下这份小幸运 ✳');
  }
  on($('#draw-button'), 'click', () => {
    if (!draw || drawing) return;
    if (draw.myDraw) { revealDraw(draw); return; }
    const original = draw, content = box(); let note;
    if (draw.voterNoteLabel) note = field(content, draw.voterNoteLabel, { required: true, value: draw.myNote || '' });
    const methods = draw.revealModes?.length ? draw.revealModes : ['flip'];
    const method = methods.length > 1 ? choice(content, '揭晓方式', methods.map(name => [name, { flip: '翻开好运', scratch: '刮开好运', grid: '选一格好运' }[name]]), methods[0]) : null;
    content.append(node('p', '每人一份心意。确认后，结果就会为你保留。', 'business-hint'));
    modal('准备好，遇见一点好运。', draw.title, content, '领取我的小幸运 ↗', async () => {
      if (!valid(content) || drawing) return;
      drawing = true; $('#draw-button').disabled = true;
      try {
        const next = await api.draw({ pollId: original.id, note: note?.value.trim() || undefined });
        if (stopped) return;
        renderDraw(next); if ($('#activity-dialog').open) showReveal(next, method?.value || methods[0]);
      } finally { drawing = false; if (!stopped) renderDraw(draw); }
    });
  });
  function showReveal(result, method) {
    const content = box(); let revealed = false;
    const finish = () => { if (revealed || stopped) return; revealed = true; revealDraw(result); };
    if (method === 'grid') {
      content.classList.add('business-luck-grid');
      for (let i = 0; i < 6; i++) button(content, `好运 ${String(i + 1).padStart(2, '0')} ✳`, finish);
    } else if (method === 'scratch') {
      const card = button(content, result.myDraw.label, () => {}); card.classList.add('business-ticket', 'business-scratch'); card.setAttribute('aria-label', '按住滑动，刮开这份好运');
      const canvas = node('canvas'); canvas.width = 600; canvas.height = 200; canvas.setAttribute('aria-hidden', 'true'); card.append(canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const fill = ctx.createLinearGradient(0, 0, 600, 200); fill.addColorStop(0, '#79a99f'); fill.addColorStop(.5, '#386f70'); fill.addColorStop(1, '#819bac');
        ctx.fillStyle = fill; ctx.fillRect(0, 0, 600, 200); ctx.fillStyle = '#fff'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('轻轻刮开，遇见好运 ✳', 300, 108);
      }
      let last = null;
      const erase = event => {
        if (!ctx || !last) return; const rect = canvas.getBoundingClientRect();
        const point = { x: (event.clientX - rect.left) / rect.width * 600, y: (event.clientY - rect.top) / rect.height * 200 };
        ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 48; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(point.x, point.y); ctx.stroke(); last = point;
      };
      on(card, 'pointerdown', event => { card.setPointerCapture(event.pointerId); const rect = canvas.getBoundingClientRect(); last = { x: (event.clientX - rect.left) / rect.width * 600, y: (event.clientY - rect.top) / rect.height * 200 }; erase(event); });
      on(card, 'pointermove', event => { if (event.buttons) erase(event); });
      on(card, 'pointerup', () => { last = null; if (!ctx) return; const pixels = ctx.getImageData(0, 0, 600, 200).data; let clear = 0; for (let i = 3; i < pixels.length; i += 64) if (pixels[i] < 64) clear++; if (clear / (pixels.length / 64) > .32) finish(); });
      on(card, 'pointercancel', () => { last = null; }); on(card, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); finish(); } });
      content.append(node('p', '也可以轻点或按回车揭晓。', 'business-hint'));
    } else button(content, '翻开我的小幸运 ✳', finish).classList.add('business-ticket');
    modal('心意已选好，等你揭晓。', result.title, content, '直接查看结果 ↗', finish);
  }
  async function load(kind, id) {
    const ticket = ++request;
    const next = kind === 'poll' ? await api.getPoll(id) : await api.getDraw(id);
    if (stopped || ticket !== request) return;
    if (!next) throw new Error('这个活动不存在，或已被移除。');
    if (kind === 'poll') renderPoll(next); else renderDraw(next);
    setMode(kind); api.select?.(kind, next.id);
    modalMotion.close(); $('#pulse-stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function history() {
    const entries = await api.list(); if (stopped) return;
    const content = box();
    if (!entries.length) content.append(node('p', '还没有活动。发起一个，让大家聚在一起。'));
    for (const entry of entries) button(content, `${entry.kind === 'draw' ? '✳' : '◉'} ${entry.question || entry.title} · ${entry.closed ? '已结束' : '查看活动'} ↗`, () => load(entry.kind === 'draw' ? 'draw' : 'poll', entry.id));
    modal('每一次相遇，都在这里。', api.demo ? '本页示例活动' : '选择一个活动继续参与。', content, '收起列表');
  }
  async function ensureHost(next) {
    const user = await api.session();
    if (user) return next();
    const content = box(), email = field(content, '邮箱', { type: 'email', required: true }), password = field(content, '密码', { type: 'password', required: true });
    password.autocomplete = 'current-password'; email.autocomplete = 'email';
    if (api.signup) button(content, '第一次来？创建账号 ↗', () => {
      const form = box(), name = field(form, '称呼', { required: true }), mail = field(form, '邮箱', { type: 'email', required: true }), pass = field(form, '密码（至少 8 位）', { type: 'password', required: true });
      pass.minLength = 8; pass.autocomplete = 'new-password';
      modal('让下一次相遇，从这里开始。', '创建账号后可以发起和管理活动。', form, '创建账号并继续 ↗', async () => { if (!valid(form)) return; await api.signup({ name: name.value.trim(), email: mail.value.trim(), password: pass.value }); pass.value = ''; await next(); });
    });
    modal('欢迎回来。', '登录后可以发起和管理活动。', content, '登录并继续 ↗', async () => {
      if (!valid(content)) return;
      await api.login({ email: email.value.trim(), password: password.value }); password.value = '';
      await next();
    });
  }
  async function createActivity(kind = 'poll') {
    return ensureHost(() => {
      const content = box();
      const kindSelect = choice(content, '活动类型', [['poll', '一起投票'], ['draw', '遇见好运']], kind);
      on(kindSelect, 'change', () => run(() => createActivity(kindSelect.value)));
      const title = field(content, kind === 'poll' ? '投票题目' : '抽签标题', { required: true });
      const description = field(content, '活动说明（选填）', { multiline: true });
      const options = field(content, kind === 'poll' ? '投票选项（每行一个，2–8 项）' : '签项（每行：名称 | 数量）', { multiline: true, required: true, placeholder: kind === 'poll' ? '山野徒步\n海边日落\n城市漫游' : '一杯咖啡 | 3\n一段假期 | 2' });
      let maximum, deadline, writeIn, blankMode, blankCount, blankLabel, resultsPublic;
      const reveal = [];
      if (kind === 'poll') {
        maximum = field(content, '每人最多选几项（0 表示不限）', { type: 'number', value: '1', min: 0, max: 8, required: true });
        writeIn = field(content, '允许补充选项（选填，填写名称即开启）');
        deadline = field(content, '截止时间（选填）', { type: 'datetime-local' });
      } else {
        blankMode = choice(content, '空白签', [['none', '不加入'], ['count', '固定数量'], ['unlimited', '不限数量']], 'none');
        blankCount = field(content, '空白签数量', { type: 'number', min: 1, max: 99999, value: '1' });
        blankLabel = field(content, '空白签文案', { value: '好运正在路上' });
        resultsPublic = check(content, '公开领取结果');
        for (const [name, label] of [['flip', '翻开好运'], ['scratch', '刮开好运'], ['grid', '选一格好运']]) reveal.push([name, check(content, label, true)]);
      }
      const noteLabel = field(content, '参与者登记信息名称（选填）', { placeholder: '例如：昵称' });
      const roster = field(content, '限定参与名单（选填，每行一个）', { multiline: true });
      if (api.demo) content.append(node('p', '这是示例模式：新活动仅在当前页面存在，不会发布真实活动。', 'business-hint'));
      modal(kind === 'poll' ? '一起，做个决定。' : '为日常，准备一点惊喜。', '填写活动内容，其他的交给心意。', content, api.demo ? '创建示例活动 ↗' : '创建活动 ↗', async () => {
        if (!valid(content)) return;
        const common = { description: description.value.trim() || undefined, voterNoteLabel: noteLabel.value.trim(), roster: splitLines(roster.value) };
        if (kind === 'poll') {
          const created = await api.createPoll({ ...common, question: title.value.trim(), options: splitLines(options.value), maxChoices: Number(maximum.value), writeInLabel: writeIn.value.trim(), closesAtISO: deadline.value ? new Date(deadline.value).toISOString() : undefined });
          await load('poll', created.id);
        } else {
          const slots = splitLines(options.value).map(line => { const [label, count] = line.split('|'); return { label: label.trim(), count: Number(count?.trim()) }; });
          if (slots.some(slot => !slot.label || !Number.isInteger(slot.count) || slot.count < 1)) throw new Error('请按“名称 | 数量”填写，每项数量必须为正整数。');
          const created = await api.createDraw({ ...common, title: title.value.trim(), slots, blankMode: blankMode.value, blankLabel: blankLabel.value.trim(), blankCount: Number(blankCount.value), resultsPublic: resultsPublic.checked, revealModes: reveal.filter(([, input]) => input.checked).map(([name]) => name) });
          await load('draw', created.id);
        }
        announce('活动已创建。');
      });
    });
  }
  async function manage() {
    return ensureHost(async () => {
      const user = await api.session(), mode = $('#pulse-stage').dataset.view;
      const activity = mode === 'draw' ? draw : poll;
      const content = box(); button(content, '发起新投票 ↗', () => createActivity('poll')); button(content, '发起新抽签 ↗', () => createActivity('draw'));
      if (activity && (api.demo || activity.creatorId === user.id)) {
        if (api.details) button(content, '查看当前活动明细 ↗', async () => {
          const records = await api.details(mode === 'draw' ? 'draw' : 'poll', activity.id), rows = Array.isArray(records) ? records : records.votes || records.claims || [];
          const detail = box(); detail.append(node('p', `${rows.length} 条参与记录`, 'business-hint'));
          for (const row of rows) detail.append(node('p', [row.name || row.voterName || row.note || row.voterMasked, row.choice || row.label, row.optionLabels?.join('、'), row.writeInText].filter(Boolean).join(' · ') || '匿名参与记录'));
          button(detail, '导出活动明细', () => api.exportDetails(mode === 'draw' ? 'draw' : 'poll', activity.id));
          modal('每一份参与，都有回响。', activity.question || activity.title, detail, '收起明细');
        });
        if (!activity.closed) button(content, '结束当前活动', () => {
          modal('结束这次活动？', '结束后将不能继续参与，已有结果会保留。', box(), '确认结束', async () => { await api.close(activity.id); await load(mode === 'draw' ? 'draw' : 'poll', activity.id); });
        });
        if (mode === 'draw' && api.setResultsPublic) button(content, activity.resultsPublic ? '设为不公开领取结果' : '公开领取结果', async () => { await api.setResultsPublic(activity.id, !activity.resultsPublic); renderDraw(await api.getDraw(activity.id)); await manage(); });
      }
      if (!api.demo) button(content, '退出登录', () => api.logout());
      modal('把心意，聚在一起。', api.demo ? '示例管理 · 刷新后重置' : `你好，${user.name || '活动发起人'}。`, content, '收起管理');
    });
  }
  const toolbar = node('div', null, 'business-tools'); toolbar.setAttribute('aria-label', '活动功能');
  button(toolbar, '活动列表 ↗', history); button(toolbar, '发起活动 ＋', () => createActivity()); button(toolbar, '我的管理 ◉', manage);
  button(toolbar, '查看结果 ◉', async () => {
    if ($('#pulse-stage').dataset.view !== 'draw') { if (!poll) throw new Error('暂无投票活动。'); showResults(); return; }
    if (!draw) throw new Error('暂无抽签活动。');
    if (draw.myDraw) { revealDraw(draw); return; }
    if (draw.resultsPublic && api.publicClaims) {
      const claims = await api.publicClaims(draw.id), content = box();
      for (const claim of claims) content.append(node('p', `${claim.voterName || claim.voterMasked} · ${claim.label}`));
      if (!claims.length) content.append(node('p', '还没有领取记录。'));
      modal('好运的回响。', draw.title, content, '收起结果');
    } else modal('留一点期待。', '参与后可以查看自己的结果。', box(), '知道了');
  });
  if (!api.demo) button(toolbar, '分享活动 ↗', () => {
    const kind = $('#pulse-stage').dataset.view === 'draw' ? 'draw' : 'poll', activity = kind === 'draw' ? draw : poll;
    if (!activity) throw new Error('请先选择一个活动。');
    const content = box(), link = field(content, '活动链接', { value: `${location.origin}/${kind}/${encodeURIComponent(activity.id)}` }); link.readOnly = true;
    modal('邀请大家，一起参与。', activity.question || activity.title, content, '复制链接 ↗', async () => { await navigator.clipboard.writeText(link.value); announce('活动链接已复制。'); modalMotion.close(); });
  });
  $('#pulse-stage').after(toolbar);
  const tag = $('.preview-tag'); tag.textContent = api.demo ? '功能体验版 · 示例活动' : '一起投票 · 遇见好运';
  $('.footer-links > span').textContent = api.demo ? '示例活动仅在当前页面记录。\n刷新后，体验记录会重置。' : '每一份心意，都会被认真记录。';
  const homeBrand = $('.pulse-brand'); homeBrand.href = api.demo ? './' : '/';
  refreshGlass(); voteState(); $('#draw-button').disabled = true;
  async function init() {
    try {
      const initial = await api.initial(); if (stopped) return;
      loading = false; renderPoll(initial.poll); renderDraw(initial.draw);
      if (initial.mode) setMode(initial.mode);
      if (initial.action === 'new') await createActivity(); else if (initial.action === 'history') await history(); else if (initial.action === 'login') await manage();
    } catch (error) {
      if (stopped) return; loading = false; errorMessage = error.message;
      $('#poll-form-state h3').textContent = '活动暂时没有加载好。'; $('#poll-form-state .card-subtitle').textContent = error.message || '请刷新页面后重试。';
      $('#poll-form fieldset').replaceChildren(); voteState(); renderDraw(null); announce('活动加载失败，请刷新重试。');
    }
  }
  init(); pollTimer = setInterval(voteState, 1000);
  if (!api.demo) refreshTimer = setInterval(async () => {
    if (stopped || loading || voting || drawing || document.hidden || $('#activity-dialog').open) return;
    const previous = poll, previousDraw = draw;
    try {
      const [next, nextDraw] = await Promise.all([previous ? api.getPoll(previous.id) : null, previousDraw ? api.getDraw(previousDraw.id) : null]);
      if (stopped || voting || drawing || poll !== previous || draw !== previousDraw || $('#activity-dialog').open) return;
      if (next && JSON.stringify(next) !== JSON.stringify(previous)) {
        const selected = selectedIds(); renderPoll(next);
        if (!next.votedIds.length) { for (const input of $('#poll-form').querySelectorAll('input')) input.checked = selected.includes(input.value); voteState(); }
      }
      if (nextDraw && JSON.stringify(nextDraw) !== JSON.stringify(previousDraw)) renderDraw(nextDraw);
    } catch { /* Retain usable content; explicit refresh reports request failures. */ }
  }, 10000);
  return { destroy() { stopped = true; ++request; clearInterval(pollTimer); clearInterval(refreshTimer); toolbar.remove(); } };
}
