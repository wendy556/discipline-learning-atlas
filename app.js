'use strict';
const data = window.ATLAS;
const byId = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const disciplines = new Map(data.disciplines.map(d => [d.id, d]));
const categories = new Map(data.categories.map(c => [c.id, c]));
const stages = ['未开始', '试学', '已打基础', '已通过目标深度验收'];
const experiences = new Map([['stats',StatsExperience],['philosophy',PhilosophyExperience]]);
const notesKey = 'discipline-atlas-v1';
const empty = () => ({
  version:1, active:'philosophy', progress:{}, notes:[], learning:Course.normalize(),
  quick:StatsExperience.normalize(), philosophyQuick:PhilosophyExperience.normalize()
});
const quickStateKey = id => id === 'stats' ? 'quick' : 'philosophyQuick';
let state = empty();
let storageIssue = false;
try {
  const saved = localStorage.getItem(notesKey);
  if (saved) state = normalize(JSON.parse(saved));
} catch {
  storageIssue = true;
}

function normalize(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.notes) || typeof input.progress !== 'object' || !input.progress) throw new TypeError('无效的备份格式');
  const clean = empty();
  clean.learning = Course.normalize(input.learning);
  for (const [id,experience] of experiences) {
    const key = quickStateKey(id);
    clean[key] = experience.normalize(input[key]);
  }
  clean.active = disciplines.has(input.active) ? input.active : clean.active;
  for (const [id, record] of Object.entries(input.progress)) {
    if (disciplines.has(id) && Number.isInteger(record?.stage) && record.stage >= 0 && record.stage < stages.length) {
      clean.progress[id] = {stage: record.stage, updated: typeof record.updated === 'string' ? record.updated : ''};
    }
  }
  for (const note of input.notes) {
    if (!note || typeof note.id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(note.id) || typeof note.title !== 'string' || typeof note.body !== 'string') continue;
    clean.notes.push({
      id: note.id, title: note.title.slice(0,120), body: note.body.slice(0,50000),
      discipline: disciplines.has(note.discipline) ? note.discipline : '',
      type: ['观察', '假设', '证据', '下一步'].includes(note.type) ? note.type : '观察',
      source: typeof note.source === 'string' ? note.source.slice(0,600) : '',
      updated: typeof note.updated === 'string' ? note.updated : ''
    });
  }
  clean.notes = [...new Map(clean.notes.map(note => [note.id, note])).values()];
  return clean;
}
function save() {
  try {
    localStorage.setItem(notesKey, JSON.stringify(state));
    storageIssue = false;
    return true;
  } catch {
    storageIssue = true;
    return false;
  }
}
let toastTimer;
function notice(message) {
  byId('toast').textContent = message;
  byId('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { byId('toast').hidden = true; }, 3500);
}
function saveWithNotice(message) {
  notice(save() ? message : '浏览器保存失败。请打开学习记录导出备份。');
}
function resources(list) {
  return list.map(item => '<li><a target="_blank" rel="noopener noreferrer" href="' + escapeHTML(item.url) + '">' + escapeHTML(item.label) + '</a></li>').join('');
}
const nodes = new Map();
let showLinks = true;
let showCurrentNode = true;
const stageFor = id => {
  const experience = experiences.get(id);
  const started = experience?.hasStarted(state[quickStateKey(id)]);
  const originalStats = id === 'stats' && Course.summary(state.learning).started;
  return started || originalStats || Course.diagnosticPassed(state.learning,id) ? 1 : 0;
};
function courseInfo(id) {
  const legacy = (state.progress[id]?.stage ?? 0) > 0
    ? '<p class="course-meta">旧版自记进度：' + escapeHTML(stages[state.progress[id].stage]) + '</p>' : '';
  const experience = experiences.get(id);
  if (experience) {
    const title = disciplines.get(id).name;
    return '<div class="node-course-info"><span class="stage-pill">' + stages[stageFor(id)] +
      '</span><p>从生活里的三个判断开始，再沿全图深入。</p>' + legacy +
      '<div class="course-links"><a class="primary course-entry" href="' + experience.url('overview') + '">' + escapeHTML(title) + '课程</a>' +
      '<a class="text-button" href="' + experience.url('map') + '">查看完整能力地图</a></div></div>';
  }
  const hasTest = Course.isDiagnostic(id);
  const next = hasTest ? (Course.diagnosticPassed(state.learning,id) ? '自测已通过 · 下一步可做实作' : '下一步 · 独立自测') : '下一步 · 起点自测待开放';
  return '<div class="node-course-info"><span class="stage-pill">' + (hasTest && stageFor(id) ? '试学 · 已过自测' : '课程规划') +
    '</span><p>' + next + '</p>' + legacy +
    '<a class="primary course-entry" href="' + Course.courseURL(id) + '">' + (hasTest ? '课程路线与自测' : '查看课程路线') + '</a></div>';
}
const colorStyle = c => '--accent:' + c.color + ';--pale:' + c.pale;
function initMap() {
  for (const category of data.categories) {
    const group = document.createElement('section');
    group.className = 'group';
    group.setAttribute('style', colorStyle(category));
    const title = document.createElement('h2');
    title.className = 'group-title';
    title.textContent = category.name;
    const list = document.createElement('div');
    list.className = 'node-list';
    for (const d of data.disciplines.filter(item => item.category === category.id)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'node';
      button.dataset.discipline = d.id;
      const label = document.createElement('span');
      label.textContent = d.name;
      const dot = document.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      button.append(label, dot);
      button.addEventListener('click', () => selectDiscipline(d.id, true));
      list.append(button);
      nodes.set(d.id, button);
    }
    group.append(title, list);
    byId('groups').append(group);
  }
  byId('map-sources').innerHTML = resources(data.sources);
  byId('map-search').addEventListener('input', renderNodes);
  byId('link-toggle').addEventListener('click', event => {
    showLinks = !showLinks;
    event.currentTarget.setAttribute('aria-pressed', String(showLinks));
    scheduleGraph();
  });
  new ResizeObserver(scheduleGraph).observe(byId('graph'));
}
function renderPhilosophyHome() {
  const quick = state.philosophyQuick;
  const units = window.PHILOSOPHY_QUICK;
  const next = PhilosophyExperience.suggested(quick,state.learning);
  const startLink = byId('atlas-start');
  startLink.href = PhilosophyExperience.url('experience',next.id);
  startLink.textContent = PhilosophyExperience.hasStarted(quick) ? '继续学哲学' : '开始哲学第一课';
  const marks = ['≠','◇','∥'];
  byId('atlas-philosophy-lessons').innerHTML = units.map((unit,index) => {
    const progress = PhilosophyExperience.progress(unit,quick,state.learning);
    return '<a class="atlas-lesson-card" href="' + PhilosophyExperience.url('experience',unit.id) + '">' +
      '<span class="atlas-lesson-mark" aria-hidden="true">' + marks[index] + '</span>' +
      '<div class="atlas-lesson-copy"><h3>' + escapeHTML(unit.title) + '</h3><p>' + escapeHTML(unit.hook) + '</p></div>' +
      '<div class="atlas-lesson-foot"><span>' + unit.minutes + ' 分钟' +
      (progress === '待开始' ? '' : ' · ' + escapeHTML(progress)) + '</span><span aria-hidden="true">＋</span></div></a>';
  }).join('');
}
function renderOverview() {
  renderPhilosophyHome();
  const started = data.disciplines.filter(d => stageFor(d.id) > 0).length;
  const completed = data.disciplines.filter(d => stageFor(d.id) === 3).length;
  const count = data.disciplines.length;
  byId('overview').innerHTML = '<div class="progress-label"><span>已开始</span><strong>' + started + ' / ' + count + ' 门</strong></div><progress aria-label="已开始的学科" max="' + count + '" value="' + started + '"></progress><div class="progress-label"><span>达到目标深度</span><strong>' + completed + ' 门</strong></div>';
}
function linkedTo(id) {
  return data.links.filter(link => link.from === id || link.to === id).map(link => ({id: link.from === id ? link.to : link.from, label: link.label}));
}
function renderNodes() {
  const terms = byId('map-search').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let displayed = 0;
  const linked = new Set(linkedTo(state.active).map(d => d.id));
  for (const d of data.disciplines) {
    const node = nodes.get(d.id);
    const haystack = [d.name, categories.get(d.category).name, d.question, d.methods, d.transfer].join(' ').toLowerCase();
    node.hidden = !terms.every(term => haystack.includes(term));
    if (!node.hidden) displayed++;
    node.setAttribute('aria-pressed', String(state.active === d.id));
    node.classList.toggle('selected-link', linked.has(d.id));
    node.setAttribute('aria-label', d.name + '，' + stages[stageFor(d.id)]);
    node.lastElementChild.className = 'step-dot ' + ['', 'started', 'foundation', 'done'][stageFor(d.id)];
  }
  for (const group of document.querySelectorAll('.group')) group.classList.toggle('no-results', !group.querySelector('.node:not([hidden])'));
  showCurrentNode = !nodes.get(state.active).hidden;
  byId('map-status').textContent = terms.length ? '找到 ' + displayed + ' 门学科。选择节点查看详情。' : data.categories.length + ' 个知识领域 · ' + displayed + ' 个学习入口。选择节点查看方法与跨学科联系。';
  scheduleGraph();
}
function selectDiscipline(id, reveal = false, clearSearch = false) {
  if (!disciplines.has(id)) return;
  if (clearSearch) byId('map-search').value = '';
  state.active = id;
  save();
  renderNodes();
  renderDetail();
  if (reveal && matchMedia('(max-width: 58rem)').matches) byId('detail').scrollIntoView({block:'start'});
}
function renderDetail() {
  const d = disciplines.get(state.active);
  const c = categories.get(d.category);
  const pairings = linkedTo(d.id);
  const sections = [['核心方法', d.methods], ['看什么证据', d.evidence], ['适用边界', d.limits], ['迁移练习', d.transfer], ['学到什么算过关', d.milestone]];
  byId('detail').innerHTML = '<div class="detail-top"><h2>' + escapeHTML(d.name) + '</h2><span class="category-label">' + escapeHTML(c.short) + '</span></div>' +
    '<p class="detail-question">' + escapeHTML(d.question) + '</p>' +
    courseInfo(d.id) +
    '<dl>' + sections.map(([title, value]) => '<div><dt>' + title + '</dt><dd>' + escapeHTML(value) + '</dd></div>').join('') + '</dl>' +
    (pairings.length ? '<div class="connections"><h3>跨学科联系</h3><div class="connection-set">' + pairings.map(pair => '<button type="button" class="text-button" data-target="' + escapeHTML(pair.id) + '">' + escapeHTML(disciplines.get(pair.id).name + ' · ' + pair.label) + '</button>').join('') + '</div></div>' : '') +
    '<div class="detail-resources"><h3>课程或教材</h3><ul>' + resources(d.resources) + '</ul><button class="soft" type="button" id="from-discipline">记录这个学科</button></div>';
  byId('detail').setAttribute('style', colorStyle(c));
  byId('detail').querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => {
    selectDiscipline(button.dataset.target, false, true);
    byId('detail').querySelector('h2').setAttribute('tabindex','-1');
    byId('detail').querySelector('h2').focus({preventScroll: true});
  }));
  byId('from-discipline').addEventListener('click', () => newNote(d.id));
}
let frame;
function scheduleGraph() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(drawGraph);
}
function drawGraph() {
  const graph = byId('graph');
  const box = graph.getBoundingClientRect();
  const canvas = byId('lines');
  if (!box.width || !box.height || getComputedStyle(canvas).display === 'none') return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.width * ratio);
  canvas.height = Math.round(box.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  const midpoint = (element, side) => {
    const b = element.getBoundingClientRect();
    return [b.left + b.width / 2 - box.left, (side === 'top' ? b.top : side === 'bottom' ? b.bottom : b.top + b.height / 2) - box.top];
  };
  function link(a, b, color, width, dashed) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [4, 5] : []);
    const bend = (a[1] + b[1]) / 2;
    ctx.moveTo(a[0], a[1]);
    ctx.bezierCurveTo(a[0], bend, b[0], bend, b[0], b[1]);
    ctx.stroke();
  }
  if (!showLinks) return;
  const center = [box.width / 2, box.height / 2];
  document.querySelectorAll('.group:not(.no-results)').forEach(group => {
    const top = group.getBoundingClientRect().top - box.top < center[1];
    link(midpoint(group, top ? 'bottom' : 'top'), center, '#acb9cf', 1.2, true);
  });
  if (!showCurrentNode) return;
  const selected = nodes.get(state.active);
  const start = midpoint(selected);
  for (const connection of linkedTo(state.active)) {
    const other = nodes.get(connection.id);
    if (!other.hidden) link(start, midpoint(other), '#5185d2', 1.75, false);
  }
}
function renderRoute() {
  const section = byId('route-content');
  section.innerHTML = PhilosophyExperience.entry(state.philosophyQuick,state.learning,true) +
    '<section class="atlas-section atlas-route-stats"><div class="atlas-section-heading"><h2>继续探索</h2><a class="soft" href="#course/stats/overview">打开统计与因果推断</a></div></section>' +
    '<details class="stats-scope"><summary>统计进阶 · 企鹅数据项目和原有课程</summary><div class="roadmap-grid">' + data.roadmap.map((item, i) =>
    '<article class="card' + (i === 0 ? ' highlight' : '') + '"><h3>' + escapeHTML(item.title) + '</h3><p class="timing">' + escapeHTML(item.timing) + '</p><p>' + escapeHTML(item.description) + '</p><ul>' + item.items.map(text => '<li>' + escapeHTML(text) + '</li>').join('') + '</ul>' +
    (i === 0 ? '<p><button type="button" class="soft" id="start-trial">查看原有课程与项目</button></p>' : '') + '</article>').join('') + '</div></details>' +
    '<h2 class="section-title">起点校准</h2><div class="card-stack">' + data.diagnostic.map(entry =>
      '<article class="card"><h3>' + escapeHTML(entry.title) + '</h3><p>' + escapeHTML(entry.question) + '</p></article>').join('') + '</div>' +
    '<h2 class="section-title">迁移练习 · AI 功能复访偏低</h2><div class="card-stack">' + data.cases.map(entry =>
      '<article class="card"><h3>' + escapeHTML(entry.title) + '</h3><p>' + escapeHTML(entry.description) + '</p></article>').join('') +
    '<article class="card"><h3>提交自己的判断</h3><p>先独立写下你的解释、区分解释的证据和决策。然后让 AI 指出最薄弱的一条假设，最后独立完成一道陌生案例。</p><p><button type="button" class="soft" id="case-note">记下我的判断</button></p></article></div>';
  byId('start-trial').addEventListener('click', () => { location.hash = Course.courseURL('stats','series'); });
  byId('case-note').addEventListener('click', () => newNote('stats', 'AI 功能复访练习', '假设'));
}
const aiTasks = [
  ['跨学科 · 讲解和练习', '换一种解释，出同难度新题，给单步提示。', '流畅的解答可能掩盖错误。先独立作答，核对教材，合上 AI 做陌生题。', '课堂场景证据', 'https://www.pnas.org/doi/10.1073/pnas.2422633122'],
  ['计算机 · 写代码', '写可测试的初稿、补边界用例、解释运行结果。', '用自己保留的独立测试检验。记录运行环境和失败用例。', 'Terminal-Bench 4.0', 'https://www.vals.ai/benchmarks/terminal-bench-4'],
  ['统计、经济、理工 · 数据分析', '写查询、整理数据、复算指标和探索异常。', '手算样本，核对分母、缺失值和分组。相关性需要额外证据才能落到因果。', 'AA-AnalystAgent', 'https://artificialanalysis.ai/evaluations/aa-analyst-agent'],
  ['数学 · 验证候选解', '提出证明思路、找反例、尝试形式化。', '自己核对前提与命题。形式化时检查通过验证的定理是否就是原题。', 'FrontierMath Erdős', 'https://epoch.ai/benchmarks/frontiermath-erdos'],
  ['社科、人文 · 解释和研究', '生成竞争假设、访谈草案和反方论证。', '回读史料、原论文或原话。用数据或观察区分解释，记录还缺哪些证据。', 'Epoch AI 的开放工作评测', 'https://epoch.ai/publications/how-good-are-fable-5-2-and-gpt-6-2-astra-at-real-work']
];
function renderAI() {
  const ai = byId('ai-content');
  ai.innerHTML = '<div class="card table-wrap"><table><thead><tr><th scope="col">学科和任务</th><th scope="col">适合交给 AI</th><th scope="col">你来核验</th><th scope="col">参照</th></tr></thead><tbody>' +
    aiTasks.map(([name, use, verify, label, url]) => '<tr><th scope="row">' + name + '</th><td>' + use + '</td><td>' + verify + '</td><td><a target="_blank" rel="noopener noreferrer" href="' + url + '">' + label + '</a></td></tr>').join('') +
    '</tbody></table></div><h2 class="section-title">如何读这些评测</h2>' +
    '<div class="card-stack"><article class="card"><h3>代码与数学 · 可检查的结果</h3><p>Vals AI 2026 年 11 月 19 日更新的 Terminal-Bench 4.0 中，Claude Fable 5.2 和 Claude Opus 5.5 在同一脚手架上均为 65.15%。测试包括软件、科学和运维等复杂终端任务。Epoch AI 对 2026 年 8 月未解决的 68 道 Erdős 问题做评测，GPT‑6.2 Astra 在每题一次、最多 72 小时的条件下给出 7 份通过 Lean 验证的解。两项结果各自对应题集和工具条件。</p></article>' +
    '<article class="card"><h3>数据与研究 · 检查现实条件</h3><p>截至 2026 年 11 月 23 日，AA-AnalystAgent 的 80 道题涵盖 14 个领域。GPT‑6.2 Astra（Max）在其中 62.5% 的题上五次都答对。Epoch AI 2026 年 11 月对团队真实开放工作做人工评价，GPT‑6.2 Astra 平均得分 65%。开放研究仍需自己核验实验设计、原始证据和结论。</p></article>' +
    '<article class="card"><h3>把独立测验留给自己</h3><p>2025 年发表的一项高中数学随机实验中，普通 GPT‑4 帮助学生提高了练习表现，随后撤去工具的考试却低于对照组。适合采用先做、再求提示、最后独立换题的顺序。</p></article></div>';
}
let selectedNote = '';
const noteTypes = ['观察', '假设', '证据', '下一步'];
const dateText = date => Number.isNaN(Date.parse(date)) ? '日期未知' : new Date(date).toLocaleDateString('zh-CN');
function renderNoteList() {
  const search = byId('note-search').value.trim().toLowerCase();
  const results = [...state.notes].sort((a,b) => b.updated.localeCompare(a.updated)).filter(note =>
    [note.title, note.body, note.source, note.type, disciplines.get(note.discipline)?.name].join(' ').toLowerCase().includes(search));
  const list = byId('note-list');
  list.replaceChildren();
  if (!results.length) {
    const emptyList = document.createElement('p');
    emptyList.className = 'card';
    emptyList.textContent = search ? '没有匹配的记录。' : '这里会显示你保存的记录。';
    list.append(emptyList);
    return;
  }
  for (const note of results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-link';
    button.setAttribute('aria-pressed', String(note.id === selectedNote));
    const title = document.createElement('strong');
    title.textContent = note.title.trim() || '无标题记录';
    const subtitle = document.createElement('small');
    subtitle.textContent = [note.type, disciplines.get(note.discipline)?.name, dateText(note.updated)].filter(Boolean).join(' · ');
    button.append(title, subtitle);
    button.addEventListener('click', () => { selectedNote = note.id; renderNotes(); byId('note-title')?.focus(); });
    list.append(button);
  }
}
function renderNotes() {
  renderNoteList();
  const editor = byId('note-editor');
  const note = state.notes.find(entry => entry.id === selectedNote);
  if (!note) {
    editor.innerHTML = '<div class="card"><h3>选择一条记录</h3><p>也可以新建一条，记下一个问题、证据或准备验证的假设。</p></div>';
    return;
  }
  editor.innerHTML = '<form class="card note-form"><label>标题<input id="note-title" maxlength="120" placeholder="给这条记录起个名字"></label>' +
    '<div class="note-row"><label>关联学科<select id="note-discipline"><option value="">通用</option>' +
    data.disciplines.map(d => '<option value="' + d.id + '">' + escapeHTML(d.name) + '</option>').join('') +
    '</select></label><label>类型<select id="note-type">' + noteTypes.map(t => '<option>' + t + '</option>').join('') + '</select></label></div>' +
    '<label>内容<textarea id="note-body" maxlength="50000" placeholder="写下具体观察、你的解释或下一步验证。"></textarea></label>' +
    '<label>来源或链接<input id="note-source" maxlength="600" placeholder="例如课程章节、原始资料或网址"></label>' +
    '<div class="note-actions"><span id="save-status" class="save-status" role="status"></span><button id="delete-note" class="text-button danger" type="button">删除记录</button></div></form>';
  const fields = {title: 'note-title', discipline: 'note-discipline', type: 'note-type', body: 'note-body', source: 'note-source'};
  byId('save-status').textContent = storageIssue ? '当前无法保存在浏览器，请导出备份。' : '已保存到当前浏览器';
  editor.querySelector('form').addEventListener('submit', event => event.preventDefault());
  for (const [field, id] of Object.entries(fields)) {
    const input = byId(id);
    input.value = note[field];
    input.addEventListener('input', () => {
      note[field] = input.value;
      note.updated = new Date().toISOString();
      byId('save-status').textContent = save() ? '已保存到当前浏览器' : '保存失败，请导出备份。';
      renderNoteList();
    });
  }
  byId('delete-note').addEventListener('click', () => {
    if (!window.confirm('删除这条记录？')) return;
    state.notes = state.notes.filter(entry => entry.id !== note.id);
    selectedNote = '';
    saveWithNotice('已删除记录');
    renderNotes();
  });
}
function noteId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
function newNote(discipline = '', title = '', type = '观察', source = '') {
  const note = {id: noteId(), title, discipline, type, body: '', source, updated: new Date().toISOString()};
  state.notes.push(note);
  selectedNote = note.id;
  byId('note-search').value = '';
  saveWithNotice('已新建记录');
  location.hash = 'notes';
  renderNotes();
  requestAnimationFrame(() => byId('note-title')?.focus());
}
function initNotes() {
  byId('new-note').addEventListener('click', () => newNote());
  byId('note-search').addEventListener('input', renderNoteList);
  byId('export').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = '学科地图备份-' + new Date().toISOString().slice(0,10) + '.json';
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}));
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notice('已导出笔记、进度和答题记录');
  });
  byId('import').addEventListener('click', () => byId('backup-file').click());
  byId('backup-file').addEventListener('change', async event => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error();
      const incoming = normalize(JSON.parse(await file.text()));
      const signatures = new Set(state.notes.map(signature));
      const ids = new Set(state.notes.map(n => n.id));
      for (const note of incoming.notes) {
        const key = signature(note);
        if (signatures.has(key)) continue;
        signatures.add(key);
        state.notes.push(ids.has(note.id) ? {...note, id: noteId()} : note);
        ids.add(note.id);
      }
      for (const [id, progress] of Object.entries(incoming.progress)) {
        if (!state.progress[id] || progress.updated > state.progress[id].updated) state.progress[id] = progress;
      }
      state.learning = Course.merge(state.learning,incoming.learning);
      for (const [id,experience] of experiences) {
        const key = quickStateKey(id);
        state[key] = experience.merge(state[key],incoming[key]);
      }
      saveWithNotice('已合并笔记、进度和答题记录');
      renderNotes();
      renderOverview();
      renderNodes();
      renderDetail();
    } catch {
      notice('无法导入。请选择从学科地图导出的 JSON 备份。');
    }
  });
}
function signature(note) {
  return JSON.stringify([note.title, note.body, note.discipline, note.type, note.source, note.updated]);
}
function switchView() {
  const views = ['map', 'route', 'course', 'ai', 'notes'];
  const hash = location.hash.slice(1);
  const [page, discipline, step, item] = hash.split('/');
  const active = views.includes(page) ? page : 'map';
  for (const view of views) byId('page-' + view).hidden = view !== active;
  document.querySelectorAll('nav [data-view]').forEach(link => {
    if (link.dataset.view === active) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  if (active === 'notes') {
    renderNotes();
    if (selectedNote && !document.activeElement?.closest('.note-form')) byId('note-title')?.focus({preventScroll:true});
  }
  if (hash !== 'main') window.scrollTo(0,0);
  if (active === 'course') {
    const subject = discipline || 'philosophy';
    const experience = experiences.get(subject);
    if (experience && (!step || experience.views.includes(step))) experience.render(step ?? 'overview',item);
    else Course.render(subject,step);
  }
  if (active === 'route') renderRoute();
  if (active === 'map') {
    scheduleGraph();
    if (discipline === 'disciplines') {
      const heading = byId('disciplines-heading');
      heading.focus({preventScroll:true});
      heading.scrollIntoView({block:'start'});
    }
  }
}
function commitLearning(message) {
  saveWithNotice(message);
  renderOverview();
  renderNodes();
  renderDetail();
  for (const experience of experiences.values()) experience.updateProgress();
}
Course.configure(byId('page-course'),{
  model:() => state.learning,
  extraReport:() => [...experiences].flatMap(([id,experience]) => experience.report(state[quickStateKey(id)])),
  save,
  commit:commitLearning
});
for (const [id,experience] of experiences) {
  experience.configure(byId('page-course'),{
    model:() => state[quickStateKey(id)],
    learning:() => state.learning,
    commit:commitLearning,
    note:(title,href) => newNote(id,'生活应用 · ' + title,'下一步',new URL(href,location.href).href)
  });
}
initMap();
initNotes();
renderOverview();
renderNodes();
renderDetail();
renderRoute();
renderAI();
switchView();
window.addEventListener('hashchange', switchView);
