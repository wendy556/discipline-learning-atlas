'use strict';
window.StatsExperience = (() => {
  const units = window.STATS_QUICK;
  const atlas = window.STATS_MAP;
  const modules = new Map(atlas.modules.map(module => [module.id, module]));
  const byUnit = new Map(units.map(unit => [unit.id, unit]));
  const labels = {learn:'站内体验', external:'可做外部练习', planned:'已规划'};
  const base = '#course/stats/';
  const taskId = id => 'quick-' + id;
  const benchmarkId = kind => 'benchmark-' + kind;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const encode = id => encodeURIComponent(id);
  const url = (section, id = '') => base + section + (id ? '/' + encode(id) : '');
  const dateKey = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
  const timeLabel = value => value ? new Date(value).toLocaleString('zh-CN', {dateStyle:'short',timeStyle:'short'}) : '时间未知';
  const empty = () => ({choices:{}});
  let el;
  let adapter;
  const selectedExperiments = new Map();
  const openHistory = new Set();
  const model = () => adapter.model();
  const learning = () => adapter.learning();

  function normalize(value) {
    const cleaned = empty();
    for (const unit of units) {
      const entries = value?.choices?.[unit.id];
      if (!Array.isArray(entries)) continue;
      const ids = new Set(unit.question.choices.map(choice => choice.id));
      const valid = entries.filter(item => item && typeof item.id === 'string' &&
        /^[a-zA-Z0-9-]{1,80}$/.test(item.id) && ids.has(item.choice)).map(item =>
        ({id:item.id, choice:item.choice, at:dateKey(item.at)}));
      cleaned.choices[unit.id] = [...new Map(valid.map(item => [item.id,item])).values()].sort((a,b) => a.at.localeCompare(b.at));
    }
    return cleaned;
  }
  function merge(current,incoming) {
    const a = normalize(current);
    const b = normalize(incoming);
    for (const unit of units) {
      if (!b.choices[unit.id]?.length) continue;
      a.choices[unit.id] = b.choices[unit.id].concat(a.choices[unit.id] || []);
    }
    return normalize(a);
  }
  const hasStarted = state => units.some(unit => (state.choices[unit.id]?.length ?? 0) > 0);
  function progress(unit, state, learner) {
    if (Course.hasPassed(learner,taskId(unit.id),true)) return '能独立迁移';
    if (Course.hasPassed(learner,taskId(unit.id))) return '能解释';
    const attempts = state.choices[unit.id] || [];
    if (attempts.some(attempt => attempt.choice === unit.question.correct)) return '识别了';
    return attempts.length ? '已尝试' : '待开始';
  }
  function suggested(state, learner) {
    return units.find(unit => progress(unit,state,learner) !== '能独立迁移') ?? units[0];
  }
  function recognizedCount(state, learner) {
    return units.filter(unit => ['识别了','能解释','能独立迁移'].includes(progress(unit,state,learner))).length;
  }
  const chip = id => '<a class="stats-chip" href="' + url('map',id) + '">' + safe(modules.get(id).title) + '</a>';
  const anchors = list => list.map(item => '<li><a target="_blank" rel="noopener noreferrer" href="' +
    safe(item.url) + '">' + safe(item.label) + '</a></li>').join('');
  const stageTag = text => '<span class="stats-tag">' + safe(text) + '</span>';

  function entry(state, learner, compact = false) {
    const next = suggested(state,learner);
    return '<div class="stats-hero"><div class="stats-hero-copy"><p class="stats-stage">统计与因果推断 · ' +
      next.minutes + ' 分钟</p><h2>' + (compact ? '今天学一个思维' : '从生活问题学统计') + '</h2><p>' +
      safe(next.title) + ' · ' + safe(next.hook) + '</p></div><div class="stats-hero-actions">' +
      '<a class="primary" href="' + url('experience',next.id) + '">开始快速体验</a>' +
      '<a class="soft" href="' + url('map') + '">查看完整能力地图</a></div></div>';
  }

  function configure(target, callbacks) {
    el = target;
    adapter = callbacks;
  }
  function header(title, description) {
    return '<div class="intro"><div><a class="plan-link" href="#map">学科地图</a><h1 id="course-heading">' +
      safe(title) + '</h1><p>' + safe(description) + '</p></div></div>';
  }
  function courseNav(active) {
    const pages = [['overview','统计课程首页'],['map','完整能力地图'],['benchmarks','专业验收'],['series','原有课程与项目']];
    return '<nav class="stats-course-nav" aria-label="统计课程导航">' + pages.map(([key,title]) =>
      '<a href="' + url(key) + '"' + (active === key ? ' aria-current="page"' : '') + '>' + title + '</a>').join('') + '</nav>';
  }
  function launcher() {
    const count = recognizedCount(model(),learning());
    return '<section class="stats-section" aria-labelledby="stats-experience-title"><div class="stats-section-header">' +
      '<div><h2 id="stats-experience-title">快速体验</h2><p>每节只练一种判断，做完就能试着用到今天的生活里。</p></div>' +
      stageTag('已识别 ' + count + ' / ' + units.length) + '</div><div class="stats-launcher">' +
      units.map(unit => '<a class="stats-launch-card" href="' + url('experience',unit.id) + '"><div class="stats-launch-card-meta">' +
        '<span>' + unit.minutes + ' 分钟</span>' + stageTag(progress(unit,model(),learning())) +
        '</div><h3>' + safe(unit.title) + '</h3><p>' + safe(unit.hook) + '</p></a>').join('') + '</div></section>';
  }
  function dependencyTrail(module, successors) {
    const groups = [
      ['先修',module.prerequisites.length ? module.prerequisites.map(chip).join('') : '<span>可直接开始</span>'],
      ['当前能力','<strong>' + safe(module.title) + '</strong>'],
      ['之后可学',successors.length ? successors.map(item => chip(item.id)).join('') : '<span>进入综合验收</span>']
    ];
    return '<ol class="stats-dependency-map" aria-label="当前模块的先修和后续能力">' +
      groups.map(([label,body]) => '<li><span class="stats-stage">' + label + '</span><div class="stats-prereqs">' + body +
        '</div></li>').join('') + '</ol>';
  }

  function mapSection(selected) {
    const chosen = modules.get(selected);
    const successors = chosen ? atlas.modules.filter(module => module.prerequisites.includes(chosen.id)) : [];
    const related = new Set(chosen ? [...chosen.prerequisites,...successors.map(module => module.id)] : []);
    return '<section class="stats-section" aria-labelledby="stats-map-title"><div class="stats-section-header"><div>' +
      '<h2 id="stats-map-title">统计与因果推断能力全图</h2><p>' + safe(atlas.scope) + '</p></div>' +
      stageTag(atlas.modules.length + ' 个能力模块') + '</div><div class="stats-map-layout"><div class="stats-map-grid">' +
      atlas.modules.map(module => '<article class="stats-map-card' + (related.has(module.id) ? ' is-related' : '') +
        (module.id === selected ? ' is-active' : '') + '"><div class="stats-launch-card-meta">' +
        stageTag(labels[module.availability]) + (module.experience ? stageTag(progress(byUnit.get(module.experience),model(),learning())) : '') +
        '</div><h3 class="stats-map-card-title"><a href="' + url('map',module.id) + '"' +
        (module.id === selected ? ' aria-current="location"' : '') + '>' + safe(module.title) + '</a></h3><p>' + safe(module.question) +
        '</p><div class="stats-prereqs"><strong>' + (module.prerequisites.length ? '先学' : '起点 · 可直接开始') + '</strong>' +
        module.prerequisites.map(chip).join('') + '</div></article>').join('') + '</div>' +
      (chosen ? '<aside class="stats-map-detail" aria-label="模块详情"><h3 id="stats-module-title" tabindex="-1">' + safe(chosen.title) +
        '</h3><p>' + safe(chosen.question) + '</p>' + dependencyTrail(chosen,successors) + '<dl>' +
        [['常用方法',chosen.methods],['证据标准',chosen.evidence],['适用边界',chosen.limits],['代表任务',chosen.task],['怎么验收',chosen.assessment]]
          .map(([label,value]) => '<div><dt>' + label + '</dt><dd>' + safe(value) + '</dd></div>').join('') + '</dl>' +
        '<div class="stats-hero-actions">' + (chosen.experience ? '<a class="primary" href="' + url('experience',chosen.experience) + '">进入快速体验</a>' : '') +
        (chosen.resource ? '<a class="soft" target="_blank" rel="noopener noreferrer" href="' + safe(chosen.resource.url) + '">' +
          safe(chosen.resource.label) + '</a>' : '') + '</div></aside>' : '') + '</div></section>';
  }

  function standards() {
    return '<section class="stats-section" aria-labelledby="stats-bench-title"><div class="stats-section-header"><div>' +
      '<h2 id="stats-bench-title">专业深度验收</h2><p>选择学科或行业路径，按公开基准与独立交付记录能力。</p></div></div>' +
      '<div class="stats-bench-grid">' + Object.entries(atlas.benchmark).map(([kind,item]) => {
        const summary = kind === 'academic' ? atlas.academic : atlas.industry;
        const passed = Course.hasPassed(learning(),benchmarkId(kind));
        return '<article class="stats-map-card"><div class="stats-launch-card-meta">' +
          stageTag(kind === 'academic' ? '大二专业课对标' : '入行一年对标') + (passed ? stageTag('站内作业自评达标') : '') +
          '</div><h3>' + safe(item.title) + '</h3><p>' + safe(summary) + '</p><p><strong>交付</strong> · ' +
          safe(item.artifacts) + '</p><a class="soft" href="' + url('benchmark',kind) + '">查看验收题与评分依据</a></article>';
      }).join('') + '</div><details class="stats-scope"><summary>查看公开课程、岗位标准和案例数据</summary><ul>' +
      anchors(atlas.sources) + '</ul></details></section>';
  }
  function overview() {
    el.innerHTML = header('统计与因果推断','练习发现值得问的问题，并判断证据能支持什么结论。') +
      courseNav('overview') + entry(model(),learning()) + launcher() + mapSection() + standards() +
      '<div class="stats-step-nav"><button class="soft" type="button" id="stats-download">下载学习记录</button></div>';
    el.querySelector('#stats-download').addEventListener('click',Course.downloadReport);
  }
  function renderMap(id) {
    const selected = modules.has(id) ? id : atlas.modules[0].id;
    el.innerHTML = header('完整能力地图','顺着先修关系挑选下一项能力，也可直接开始已开放的体验。') + courseNav('map') +
      mapSection(selected) + standards();
    if (modules.has(id)) {
      const detail = el.querySelector('#stats-module-title');
      detail.focus({preventScroll:true});
      detail.scrollIntoView({block:'nearest'});
    }
  }
  function renderBenchmark(kind) {
    const item = Object.hasOwn(atlas.benchmark,kind) ? atlas.benchmark[kind] : null;
    if (!item) {
      el.innerHTML = header('专业深度验收','用独立完成的题目、项目和真实反馈对照长期目标。') + courseNav('benchmarks') + standards();
      return;
    }
    el.innerHTML = header(item.title, kind === 'academic' ? '大二专业课范围内的独立作业' : '初级分析师的模拟工作样本') +
      courseNav('benchmarks') + '<section class="course-card"><h2>交付标准</h2><p>' + safe(item.task) + '</p>' +
      '<p><strong>需要提交</strong> · ' + safe(item.artifacts) + '</p><p>' +
      (kind === 'academic' ? '用试题和评分依据对照对应课程的要求。提交时可以写入复现步骤和作品链接。' :
        '在训练站提交模拟作业后，可用真实任务、可重跑分析和同事复核验证岗位能力。') +
      '</p><details class="stats-scope"><summary>提前查看验收维度</summary><ul>' +
      item.criteria.map(criterion => '<li>' + safe(criterion.label) + '</li>').join('') + '</ul></details></section>' +
      '<div class="stats-section" id="stats-benchmark-exercise"></div>';
    el.querySelector('#stats-benchmark-exercise').append(Course.exercise(benchmarkId(kind),{independent:true}));
  }

  function questionBox(unit) {
    const entries = model().choices[unit.id] || [];
    const selected = entries.at(-1)?.choice;
    const current = unit.question.choices.find(choice => choice.id === selected);
    const good = selected === unit.question.correct;
    return '<section class="stats-quick-section" aria-labelledby="stats-predict"><span class="stats-stage">预测</span><h2 id="stats-predict">' +
      safe(unit.question.prompt) + '</h2><div class="stats-question-choices" role="group" aria-label="选择你的判断">' +
      unit.question.choices.map(choice => '<button class="stats-option" data-choice="' + safe(choice.id) + '" type="button" aria-pressed="' +
        (selected === choice.id) + '">' + safe(choice.label) + '</button>').join('') + '</div>' +
      '<div id="stats-feedback" tabindex="-1" role="status" aria-live="polite"' +
      (current ? ' class="stats-feedback ' + (good ? 'is-correct' : 'is-retry') + '"><strong>' + (good ? '这个判断有依据' : '再试一次') +
        '</strong><p>' + safe(current.feedback) + '</p><span class="stats-stage">第 ' + entries.length + ' 次判断</span>' : ' hidden>') +
      '</div>' +
      (entries.length ? '<details class="stats-history"' + (openHistory.has(unit.id) ? ' open' : '') + '><summary>判断记录 · ' +
        entries.length + ' 次</summary><ol>' + entries.map(item => {
          const choice = unit.question.choices.find(c => c.id === item.choice);
          return '<li><span>' + safe(choice.label) + '</span><small>' + safe(timeLabel(item.at)) +
            ' · ' + (item.choice === unit.question.correct ? '识别了' : '待复练') + '</small></li>';
        }).join('') + '</ol></details>' : '') + '</section>';
  }
  function experimentBox(unit) {
    const test = unit.experiment;
    const choice = test.variants.find(v => v.id === selectedExperiments.get(unit.id)) ?? test.variants[0];
    return '<section class="stats-quick-section" aria-labelledby="stats-compare"><span class="stats-stage">对照实验 · 示意</span><h2 id="stats-compare">' +
      safe(test.title) + '</h2><p>' + safe(test.description) + '</p><div class="stats-experiment-tabs" role="group" aria-label="切换对照条件">' +
      test.variants.map(variant => '<button type="button" class="soft" data-variant="' + safe(variant.id) + '" aria-pressed="' +
        (choice.id === variant.id) + '">' + safe(variant.label) + '</button>').join('') + '</div><div aria-live="polite"><div class="stats-bars">' +
      choice.rows.map(row => '<div class="stats-bar"><span>' + safe(row.label) + '</span><strong>' + safe(row.text) +
        '</strong><div class="stats-meter" aria-hidden="true"><span style="width:' + Math.min(100,Math.max(0,Number(row.value) || 0)) +
        '%"></span></div></div>').join('') + '</div><p class="stats-experiment-summary">' + safe(choice.summary) + '</p></div><p>' +
      safe(test.takeaway) + '</p></section>';
  }
  function renderQuick(id) {
    const unit = byUnit.get(id) ?? units[0];
    const index = units.indexOf(unit);
    const next = units[index + 1];
    const module = atlas.modules.find(item => item.experience === unit.id);
    el.innerHTML = header(unit.title,unit.minutes + ' 分钟 · ' + unit.hook) + courseNav('overview') +
      '<div class="stats-quick"><div class="stats-step-nav"><span id="stats-quick-status">' + stageTag(progress(unit,model(),learning())) +
      '</span><a class="soft" href="' + url('map',module?.id) + '">查看对应能力</a></div>' +
      '<ol class="stats-stage-list"><li>先判断</li><li>切换条件</li><li>独立迁移</li><li>用到生活里</li></ol>' +
      '<div id="stats-question-box"></div><div id="stats-experiment-box"></div>' +
      '<section class="stats-takeaway"><span class="stats-stage">下次遇到，先问</span><h2>' + safe(unit.thought) + '</h2><p>' +
      '<strong>适用边界</strong> · ' + safe(unit.limit) + '</p></section>' +
      '<section class="stats-quick-section" aria-labelledby="stats-transfer"><span class="stats-stage">换个场景</span>' +
      '<h2 id="stats-transfer">独立迁移</h2><p>先写判断和依据，再对照评分。首次作答通过可记录为能独立迁移。</p>' +
      '<div id="stats-quick-transfer"></div></section>' +
      '<section class="stats-life"><span class="stats-stage">今天就用</span><h2>把方法用到自己的生活</h2><p>' + safe(unit.life.prompt) +
      '</p><p class="course-meta">' + safe(unit.life.example) + '</p><button type="button" class="soft" id="stats-life-note">记下我的生活应用</button></section>' +
      '<div class="stats-step-nav"><a class="soft" href="' + url('overview') + '">回到快速体验列表</a>' +
      (next ? '<a class="primary" href="' + url('experience',next.id) + '">下一项体验</a>' :
        '<a class="primary" href="' + url('map') + '">从全图选下一项能力</a>') + '</div></div>';
    const question = el.querySelector('#stats-question-box');
    const experiment = el.querySelector('#stats-experiment-box');
    function updateQuestion(focus = false) {
      question.innerHTML = questionBox(unit);
      question.querySelector('details')?.addEventListener('toggle', event => {
        if (event.currentTarget.open) openHistory.add(unit.id);
        else openHistory.delete(unit.id);
      });
      question.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click',() => {
        const uid = globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        const entries = model().choices[unit.id] ?? (model().choices[unit.id] = []);
        entries.push({id:uid,choice:button.dataset.choice,at:new Date().toISOString()});
        adapter.commit('已保存本次判断');
        updateQuestion(true);
      }));
      if (focus) question.querySelector('#stats-feedback').focus({preventScroll:true});
    }
    function updateExperiment(focusId) {
      experiment.innerHTML = experimentBox(unit);
      experiment.querySelectorAll('[data-variant]').forEach(button => {
        button.addEventListener('click',() => {
          selectedExperiments.set(unit.id,button.dataset.variant);
          updateExperiment(button.dataset.variant);
        });
        if (button.dataset.variant === focusId) button.focus({preventScroll:true});
      });
    }
    updateQuestion();
    updateExperiment();
    el.querySelector('#stats-quick-transfer').append(Course.exercise(taskId(unit.id),{independent:true}));
    el.querySelector('#stats-life-note').addEventListener('click',() => adapter.note(unit.title,url('experience',unit.id)));
  }
  function updateProgress() {
    const section = el.querySelector('#stats-quick-status');
    const [, , view, id] = location.hash.slice(1).split('/');
    if (section && view === 'experience' && byUnit.has(id)) section.innerHTML = stageTag(progress(byUnit.get(id),model(),learning()));
  }
  function report(quick) {
    const lines = [];
    for (const unit of units) {
      const entries = quick.choices[unit.id] || [];
      if (!entries.length) continue;
      lines.push('## 快速体验 · ' + unit.title,'',unit.question.prompt,'');
      for (const item of entries) {
        const answer = unit.question.choices.find(choice => choice.id === item.choice);
        lines.push('- ' + timeLabel(item.at) + ' · ' + answer.label, '  ' + answer.feedback);
      }
      lines.push('');
    }
    return lines;
  }
  function render(view,id) {
    if (view === 'map') renderMap(id);
    else if (view === 'experience') renderQuick(id);
    else if (view === 'benchmarks' || view === 'benchmark') renderBenchmark(id);
    else overview();
  }
  return {configure,normalize,merge,hasStarted,entry,render,updateProgress,report,url,
    views:['overview','map','experience','benchmarks','benchmark']};
})();
