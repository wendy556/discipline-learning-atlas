'use strict';
function createLearningExperience({id,name,lead,units,atlas}) {
  const modules = new Map(atlas.modules.map(module => [module.id, module]));
  const byUnit = new Map(units.map(unit => [unit.id, unit]));
  const labels = {learn:'站内体验', external:'可做外部练习', planned:'已规划'};
  const base = '#course/' + id + '/';
  const prefix = id === 'stats' ? '' : id + '-';
  const taskId = unit => 'quick-' + prefix + unit;
  const benchmarkId = kind => 'benchmark-' + prefix + kind;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const encode = id => encodeURIComponent(id);
  const url = (section, id = '') => base + section + (id ? '/' + encode(id) : '');
  const dateKey = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
  const timeLabel = value => value ? new Date(value).toLocaleString('zh-CN', {dateStyle:'short',timeStyle:'short'}) : '时间未知';
  const empty = () => ({choices:{}});
  let el;
  let adapter;
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

  function configure(target, callbacks) {
    el = target;
    adapter = callbacks;
  }
  function header(title, description) {
    return '<header class="course-intro"><h1 id="course-heading">' + safe(title) + '</h1><p>' +
      safe(description) + '</p></header>';
  }
  function launcher() {
    const count = recognizedCount(model(),learning());
    return '<section class="stats-section" aria-labelledby="stats-experience-title"><div class="stats-section-header">' +
      '<h2 id="stats-experience-title">课节</h2><span class="atlas-course-count">已识别 ' + count + ' / ' + units.length +
      '</span></div><ol class="stats-launcher">' + units.map(unit => {
        const current = progress(unit,model(),learning());
        return '<li><a class="stats-launch-card" href="' + url('experience',unit.id) + '"><div class="atlas-course-list-copy">' +
          '<h3>' + safe(unit.title) + '</h3><p>' + safe(unit.hook) + '</p></div><div class="stats-launch-card-meta">' +
          '<span>' + unit.minutes + ' 分钟</span>' + stageTag(current) + '</div></a></li>';
      }).join('') + '</ol></section>';
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
    return '<section class="stats-section" aria-labelledby="course-heading"><header class="course-intro stats-section-header"><div>' +
      '<h1 id="course-heading">' + safe(name) + '能力全图</h1><p>' + safe(atlas.scope) + '</p></div>' +
      '<span class="atlas-course-count">' + atlas.modules.length + ' 个能力模块</span></header><div class="stats-map-layout"><div class="stats-map-grid">' +
      atlas.modules.map(module => '<article class="stats-map-card' + (related.has(module.id) ? ' is-related' : '') +
        (module.id === selected ? ' is-active' : '') + '"><h3 class="stats-map-card-title"><a href="' + url('map',module.id) + '"' +
        (module.id === selected ? ' aria-current="location"' : '') + '>' + safe(module.title) + '</a></h3><div class="stats-launch-card-meta">' +
        stageTag(labels[module.availability]) + (module.experience ? stageTag(progress(byUnit.get(module.experience),model(),learning())) : '') +
        '</div></article>').join('') + '</div>' +
      (chosen ? '<aside class="stats-map-detail" aria-label="模块详情"><div class="atlas-map-detail-title"><h2 id="stats-module-title" tabindex="-1">' + safe(chosen.title) +
        '</h2><p>' + safe(chosen.question) + '</p></div>' + dependencyTrail(chosen,successors) + '<dl>' +
        [['常用方法',chosen.methods],['证据标准',chosen.evidence],['适用边界',chosen.limits],['代表任务',chosen.task],['怎么验收',chosen.assessment]]
          .map(([label,value]) => '<div><dt>' + label + '</dt><dd>' + safe(value) + '</dd></div>').join('') + '</dl>' +
        '<div class="stats-hero-actions">' + (chosen.experience ? '<a class="primary" href="' + url('experience',chosen.experience) + '">进入快速体验</a>' : '') +
        (chosen.resource ? '<a class="soft" target="_blank" rel="noopener noreferrer" href="' + safe(chosen.resource.url) + '">' +
          safe(chosen.resource.label) + '</a>' : '') + '</div></aside>' : '') + '</div></section>';
  }

  function standards() {
    return '<section class="stats-section" aria-labelledby="course-heading">' +
      header('专业深度验收','选择学科或行业路径，按公开基准与独立交付记录能力。') +
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
    el.innerHTML = adapter.shell(header(name,lead) + launcher() + '<section class="stats-section" aria-labelledby="stats-next-title">' +
      '<div class="stats-section-header"><h2 id="stats-next-title">进阶学习</h2></div>' +
      '<div class="atlas-course-overview-links">' +
      '<a class="stats-map-card" href="' + url('map') + '"><h3>能力全图</h3><p>查看 ' + atlas.modules.length +
      ' 个能力模块、先修关系和各模块的练习标准。</p></a>' +
      '<a class="stats-map-card" href="' + url('benchmarks') + '"><h3>专业验收</h3>' +
      '<p>选择大二专业课或入行一年对标，查看独立作业与评分标准。</p></a></div></section>' +
      '<div class="stats-step-nav"><button class="soft" type="button" id="stats-download">下载学习记录</button></div>', 'overview');
    el.querySelector('#stats-download').addEventListener('click',Course.downloadReport);
  }
  function renderMap(id) {
    const selected = modules.has(id) ? id : atlas.modules[0].id;
    el.innerHTML = adapter.shell(mapSection(selected), 'map', selected);
    if (modules.has(id)) {
      const detail = el.querySelector('#stats-module-title');
      detail.focus({preventScroll:true});
      detail.scrollIntoView({block:'nearest'});
    }
  }
  function renderBenchmark(kind) {
    const item = Object.hasOwn(atlas.benchmark,kind) ? atlas.benchmark[kind] : null;
    if (!item) {
      el.innerHTML = adapter.shell(standards(), 'benchmarks');
      return;
    }
    el.innerHTML = adapter.shell(header(item.title, kind === 'academic' ? '大二专业课范围内的独立作业' : '入行一年对标的模拟工作样本') +
      '<section class="course-card"><h2>交付标准</h2><p>' + safe(item.task) + '</p>' +
      '<p><strong>需要提交</strong> · ' + safe(item.artifacts) + '</p><p>' +
      (kind === 'academic' ? '用试题和评分依据对照对应课程的要求。提交时可以写入复现步骤和作品链接。' :
        '在训练站提交模拟作业后，可以用真实任务、可复核的交付和同事反馈验证岗位能力。') +
      '</p><details class="stats-scope"><summary>提前查看验收维度</summary><ul>' +
      item.criteria.map(criterion => '<li>' + safe(criterion.label) + '</li>').join('') + '</ul></details></section>' +
      '<div class="stats-section" id="stats-benchmark-exercise"></div>', 'benchmark', kind);
    el.querySelector('#stats-benchmark-exercise').append(Course.exercise(benchmarkId(kind),{independent:true}));
  }

  function questionBox(unit, attempt, historyOpen) {
    const entries = model().choices[unit.id] || [];
    const current = unit.question.choices.find(choice => choice.id === attempt?.choice);
    const good = current?.id === unit.question.correct;
    return '<section class="stats-quick-section atlas-lesson-prediction" aria-labelledby="stats-predict">' +
      '<p class="atlas-lesson-scenario">' + safe(unit.hook) + '</p><h2 id="stats-predict" tabindex="-1">' +
      safe(unit.question.prompt) + '</h2><form class="atlas-answer-form" autocomplete="off" aria-labelledby="stats-predict">' +
      '<div class="stats-question-choices" role="group" aria-label="选择你的判断">' +
      unit.question.choices.map(choice => '<label class="stats-option"><input name="lesson-answer" type="radio" value="' + safe(choice.id) + '"' +
        (current?.id === choice.id ? ' checked' : '') + (current ? ' disabled' : '') + '><span>' + safe(choice.label) + '</span></label>').join('') + '</div>' +
      (current ? '</form><div id="stats-feedback" tabindex="-1" role="status" class="stats-feedback ' + (good ? 'is-correct' : 'is-retry') +
        '"><strong>' + (good ? '这个判断有依据' : '这个判断还缺一步') + '</strong><p>' + safe(current.feedback) + '</p></div>' +
        '<div class="atlas-answer-action"><button class="soft" type="button" id="atlas-retry-answer">重新作答</button></div>' :
        '<div class="atlas-answer-action"><button class="primary" type="submit" disabled>提交判断</button></div></form>') +
      (entries.length ? '<details class="stats-history"' + (historyOpen ? ' open' : '') + '><summary>判断记录 · ' +
        entries.length + ' 次</summary><ol>' + entries.map(item => {
          const choice = unit.question.choices.find(c => c.id === item.choice);
          return '<li><span>' + safe(choice.label) + '</span><small>' + safe(timeLabel(item.at)) +
            ' · ' + (item.choice === unit.question.correct ? '识别了' : '待复练') + '</small></li>';
        }).join('') + '</ol></details>' : '') + '</section>';
  }
  function experimentBox(unit, choice) {
    const test = unit.experiment;
    const comparison = !choice ? '' : choice.rows.every(row => Number.isFinite(row.value))
      ? '<div class="stats-bars">' + choice.rows.map(row => '<div class="stats-bar"><span>' + safe(row.label) + '</span><strong>' + safe(row.text) +
        '</strong><div class="stats-meter" aria-hidden="true"><span style="width:' + Math.min(100,Math.max(0,row.value)) + '%"></span></div></div>').join('') + '</div>'
      : '<dl class="atlas-contrast-list">' + choice.rows.map(row => '<div><dt>' + safe(row.label) + '</dt><dd>' + safe(row.text) + '</dd></div>').join('') + '</dl>';
    return '<section class="stats-quick-section atlas-lesson-contrast" aria-labelledby="stats-compare">' +
      '<span class="atlas-lesson-label">对照实验 · 示意</span><h2 id="stats-compare" tabindex="-1">' +
      safe(test.title) + '</h2><p>' + safe(test.description) + '</p><div class="stats-experiment-tabs" role="group" aria-label="切换对照条件">' +
      test.variants.map(variant => '<button type="button" class="soft" data-variant="' + safe(variant.id) + '" aria-pressed="' +
        (choice?.id === variant.id) + '">' + safe(variant.label) + '</button>').join('') + '</div>' +
      (choice ? '<div class="atlas-experiment-reading" aria-live="polite">' + comparison + '<p class="stats-experiment-summary"><strong>结果</strong><span>' +
        safe(choice.summary) + '</span></p></div>' : '<p class="atlas-experiment-prompt">选一个条件查看结果。</p>') + '</section>';
  }
  function renderQuick(id) {
    const unit = byUnit.get(id) ?? units[0];
    const lessonIndex = units.indexOf(unit);
    const nextLesson = units[lessonIndex + 1];
    const module = atlas.modules.find(item => item.experience === unit.id);
    const finish = nextLesson ? ['下一课', url('experience',nextLesson.id)] : ['查看能力全图', url('map')];
    const viewedConditions = new Set();
    let submitted = null;
    let stepIndex = 0;
    const steps = [
      {title:'先做判断', next:'看对照实验', mount:mountJudgment},
      {title:'观察对照', next:'看知识点', mount:mountExperiment},
      {title:'提炼思维', next:'做迁移练习', mount:mountTakeaway},
      {title:'独立迁移', next:'看生活应用', mount:mountTransfer},
      {title:'用到生活里', mount:mountApplication}
    ];

    el.innerHTML = adapter.shell('<header class="atlas-lesson-header"><div class="atlas-lesson-heading">' +
      '<p class="atlas-lesson-breadcrumb">第 ' + (lessonIndex + 1) + ' 节 · ' + unit.minutes + ' 分钟</p>' +
      '<h1 id="course-heading">' + safe(unit.title) + '</h1></div>' +
      '<div class="atlas-lesson-meta"><span id="stats-quick-status">' + stageTag(progress(unit,model(),learning())) +
      '</span><a href="' + url('map',module?.id) + '">对应能力</a></div></header>' +
      '<div class="stats-quick atlas-lesson-flow"><p class="atlas-step-progress"></p><div class="atlas-step-panels"></div>' +
      '<div class="stats-step-nav atlas-step-actions" hidden><p class="atlas-step-hint" hidden>分别查看两种条件的结果，再继续。</p>' +
      '<button class="soft" type="button" id="atlas-step-back">上一步</button>' +
      '<button class="primary" type="button" id="atlas-step-next"></button>' +
      '<a class="primary" id="atlas-step-finish" href="' + finish[1] + '" hidden>' + finish[0] + '</a></div></div>', 'experience', unit.id);

    const panels = el.querySelector('.atlas-step-panels');
    const indicator = el.querySelector('.atlas-step-progress');
    const actions = el.querySelector('.atlas-step-actions');
    const previous = el.querySelector('#atlas-step-back');
    const advance = el.querySelector('#atlas-step-next');
    const finishLink = el.querySelector('#atlas-step-finish');
    const hint = el.querySelector('.atlas-step-hint');

    function refreshActions() {
      const first = stepIndex === 0;
      const last = stepIndex === steps.length - 1;
      const awaitingContrast = stepIndex === 1 && viewedConditions.size < unit.experiment.variants.length;
      actions.hidden = first && !submitted;
      previous.hidden = first;
      advance.hidden = last;
      advance.disabled = awaitingContrast;
      advance.textContent = steps[stepIndex].next ?? '';
      finishLink.hidden = !last;
      hint.hidden = !awaitingContrast;
    }

    function showStep(index, focus = true) {
      if (steps[stepIndex].panel) steps[stepIndex].panel.hidden = true;
      stepIndex = index;
      const step = steps[index];
      if (!step.panel) {
        step.panel = document.createElement('div');
        step.panel.className = 'atlas-step-panel';
        step.mount(step.panel);
        panels.append(step.panel);
      }
      step.panel.hidden = false;
      indicator.textContent = '第 ' + (index + 1) + ' / ' + steps.length + ' 步 · ' + step.title;
      refreshActions();
      if (focus) {
        step.panel.querySelector('h2').focus({preventScroll:true});
        window.scrollTo(0,0);
      }
    }

    function mountJudgment(panel) {
      function draw() {
        const historyOpen = panel.querySelector('.stats-history')?.open;
        panel.innerHTML = questionBox(unit,submitted,historyOpen);
        if (submitted) {
          panel.querySelector('#atlas-retry-answer').addEventListener('click',() => {
            submitted = null;
            draw();
            refreshActions();
            panel.querySelector('input[name="lesson-answer"]').focus();
          });
          return;
        }
        const form = panel.querySelector('form');
        const submit = form.querySelector('button[type="submit"]');
        form.addEventListener('change',() => {
          submit.disabled = false;
        });
        form.addEventListener('submit',event => {
          event.preventDefault();
          const choice = form.querySelector('input[name="lesson-answer"]:checked')?.value;
          if (!choice || submitted) return;
          const uid = globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
          submitted = {id:uid,choice,at:new Date().toISOString()};
          const entries = model().choices[unit.id] ?? (model().choices[unit.id] = []);
          entries.push(submitted);
          adapter.commit('已保存本次判断');
          draw();
          refreshActions();
          panel.querySelector('#stats-feedback').focus();
        });
      }
      draw();
    }

    function mountExperiment(panel) {
      function draw(variant) {
        panel.innerHTML = experimentBox(unit,variant);
        for (const button of panel.querySelectorAll('[data-variant]')) {
          button.addEventListener('click',() => {
            viewedConditions.add(button.dataset.variant);
            draw(unit.experiment.variants.find(choice => choice.id === button.dataset.variant));
            refreshActions();
          });
          if (button.dataset.variant === variant?.id) button.focus({preventScroll:true});
        }
      }
      draw();
    }

    function mountTakeaway(panel) {
      panel.innerHTML = '<section class="stats-takeaway" aria-labelledby="atlas-takeaway">' +
        '<span class="atlas-lesson-label">记住这个问法</span><h2 id="atlas-takeaway" tabindex="-1">' + safe(unit.thought) + '</h2><p>' +
        safe(unit.experiment.takeaway) + '</p><p><strong>适用边界</strong> · ' + safe(unit.limit) + '</p></section>';
    }

    function mountTransfer(panel) {
      panel.innerHTML = '<section class="stats-quick-section atlas-lesson-transfer" aria-labelledby="stats-transfer">' +
        '<h2 id="stats-transfer" tabindex="-1">独立迁移</h2><p>先写判断和依据，再对照评分。</p><div id="stats-quick-transfer"></div></section>';
      panel.querySelector('#stats-quick-transfer').append(Course.exercise(taskId(unit.id),{independent:true}));
    }

    function mountApplication(panel) {
      panel.innerHTML = '<section class="stats-life atlas-lesson-practice" aria-labelledby="atlas-application">' +
        '<h2 id="atlas-application" tabindex="-1">今天就用</h2><p>' + safe(unit.life.prompt) +
        '</p><details class="atlas-experiment-note"><summary>查看生活应用示例</summary><p>' + safe(unit.life.example) +
        '</p></details><button type="button" class="soft" id="stats-life-note">记下我的生活应用</button></section>';
      panel.querySelector('#stats-life-note').addEventListener('click',() => adapter.note(unit.title,url('experience',unit.id)));
    }

    previous.addEventListener('click',() => showStep(stepIndex - 1));
    advance.addEventListener('click',() => showStep(stepIndex + 1));
    showStep(0,false);
  }
  function updateProgress() {
    const section = el.querySelector('#stats-quick-status');
    const [, discipline, view, unit] = location.hash.slice(1).split('/');
    if (section && discipline === id && view === 'experience' && byUnit.has(unit)) {
      section.innerHTML = stageTag(progress(byUnit.get(unit),model(),learning()));
    }
  }
  function report(quick) {
    const lines = [];
    for (const unit of units) {
      const entries = quick.choices[unit.id] || [];
      if (!entries.length) continue;
      lines.push('## ' + name + ' · ' + unit.title,'',unit.question.prompt,'');
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
  return {configure,normalize,merge,hasStarted,render,updateProgress,report,url,progress,suggested,
    views:['overview','map','experience','benchmarks','benchmark']};
}
window.StatsExperience = createLearningExperience({
  id:'stats', name:'统计与因果推断', lead:'判断你看到的差异、证据和因果。',
  units:window.STATS_QUICK, atlas:window.STATS_MAP
});
window.PhilosophyExperience = createLearningExperience({
  id:'philosophy', name:'哲学', lead:'拆开一个判断，问清它为什么成立。',
  units:window.PHILOSOPHY_QUICK, atlas:window.PHILOSOPHY_MAP
});
