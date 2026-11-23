'use strict';
window.Course = (() => {
  const syllabus = window.ATLAS_CURRICULUM;
  const lessons = window.STATS_LESSONS;
  const transfer = window.STATS_TRANSFER;
  const practice = lessons.flatMap(item => item.exercises);
  const tasks = new Map([...practice, transfer, ...syllabus.diagnostics].map(task => [task.id, task]));
  const lessonIds = new Set(lessons.map(lesson => lesson.id));
  const knownVariants = new Set(['main', 'retry']);
  const cleanText = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
  const dateKey = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
  const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const validId = value => typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stamp = () => new Date().toISOString();
  const showDate = value => value ? new Date(value).toLocaleString('zh-CN', {dateStyle:'short', timeStyle:'short'}) : '日期未知';
  const empty = () => ({attempts:{}, drafts:{}});
  const taskKey = (id, variant) => id + ':' + variant;
  const knownKey = key => { const [id, variant, extra] = key.split(':'); return !extra && tasks.has(id) && knownVariants.has(variant); };

  function listUnion(first, second) {
    return [...new Map([...second, ...first].map(item => [item.id, item])).values()].sort((a,b) => a.at.localeCompare(b.at));
  }
  function normalize(value) {
    const clean = empty();
    if (!value || typeof value !== 'object') return clean;
    for (const [key, draft] of Object.entries(value.drafts || {})) {
      if (!knownKey(key) || !draft || typeof draft !== 'object') continue;
      clean.drafts[key] = {text:cleanText(draft.text, 8000), hint:!!draft.hint, at:dateKey(draft.at)};
    }
    for (const [key, items] of Object.entries(value.attempts || {})) {
      if (!knownKey(key) || !Array.isArray(items)) continue;
      const criteria = tasks.get(key.split(':')[0]).criteria.map(criterion => criterion.id);
      clean.attempts[key] = listUnion([], items.filter(item => item && validId(item.id) && typeof item.answer === 'string' && item.answer.trim()).map(item => {
        const reviews = Array.isArray(item.reviews) ? item.reviews : [];
        return {
          id:item.id, answer:cleanText(item.answer, 8000), at:dateKey(item.at), hint:!!item.hint, fresh:!!item.fresh,
          reviews:listUnion([], reviews.filter(review => review && validId(review.id)).map(review => ({
            id:review.id, at:dateKey(review.at),
            checks:Array.isArray(review.checks) ? criteria.filter(id => review.checks.includes(id)) : [],
            feedback:cleanText(review.feedback, 4000)
          })))
        };
      }));
    }
    return clean;
  }
  function merge(current, incoming) {
    const merged = normalize(current);
    const other = normalize(incoming);
    for (const [key, items] of Object.entries(other.attempts)) {
      const existing = new Map((merged.attempts[key] || []).map(item => [item.id,item]));
      for (const item of items) {
        const match = existing.get(item.id);
        if (!match) existing.set(item.id, item);
        else if (match.answer === item.answer) match.reviews = listUnion(match.reviews, item.reviews);
        else { const id = uid(); existing.set(id, {...item, id}); }
      }
      merged.attempts[key] = [...existing.values()].sort((a,b) => a.at.localeCompare(b.at));
    }
    for (const [key, draft] of Object.entries(other.drafts)) {
      const local = merged.drafts[key];
      const last = merged.attempts[key]?.at(-1);
      if ((!local || draft.at > local.at) && (!last || draft.at >= last.at)) {
        if (local?.text.trim() && local.text !== draft.text) {
          // Keep both copies: the former draft remains readable in the current editor.
          merged.drafts[key] = {...draft, text:(draft.text + '\n\n[导入前的草稿]\n' + local.text).slice(0,8000), hint:draft.hint || local.hint};
        } else {
          merged.drafts[key] = draft;
        }
      }
    }
    return merged;
  }
  const attemptsFor = (model, id, variant = 'main') => model.attempts[taskKey(id,variant)] || [];
  function passed(model, task, independent = false) {
    return [...knownVariants].some(variant => {
      const list = attemptsFor(model, task.id, variant);
      return list.some((attempt, index) => (!independent || (index === 0 && attempt.fresh && !attempt.hint)) &&
        task.criteria.every(criterion => attempt.reviews.at(-1)?.checks.includes(criterion.id)));
    });
  }
  function summary(model) {
    const complete = practice.filter(task => passed(model,task)).length;
    const firstLesson = lessons.find(lesson => lesson.exercises.some(task => !passed(model,task)));
    const transferPassed = passed(model,transfer,true);
    const started = [...practice,transfer].some(task => [...knownVariants].some(variant => attemptsFor(model,task.id,variant).length));
    return {complete, total:practice.length, transferPassed, started, cleared:complete === practice.length && transferPassed,
      next:firstLesson?.id ?? (transferPassed ? 'overview' : 'transfer'),
      nextTitle:firstLesson?.title ?? (transferPassed ? '查看学习路线' : '陌生情境验收')};
  }

  let el;
  let adapter;
  const opened = new Set();
  const variants = new Map();
  let step = 'overview';
  let disciplineId = 'stats';
  const model = () => adapter.model();
  const courseURL = (id, at = 'overview') => '#course/' + id + '/' + at;
  const isDiagnostic = id => syllabus.diagnostics.some(task => task.id === id);
  function configure(target, callbacks) { el = target; adapter = callbacks; }
  function render(id = 'stats', requested = 'overview') {
    disciplineId = window.ATLAS.disciplines.some(d => d.id === id) ? id : 'stats';
    step = disciplineId === 'stats' && (lessonIds.has(requested) || ['overview','transfer'].includes(requested)) ? requested : 'overview';
    const d = window.ATLAS.disciplines.find(item => item.id === disciplineId);
    const title = disciplineId === 'stats' ? '统计与因果推断' : d.name;
    el.innerHTML = '<div class="intro"><div><a class="plan-link" href="#map">学科地图</a><h1 id="course-heading">' + escapeHTML(title) +
      '</h1><p>' + (disciplineId === 'stats' ? '从一项差异出发，判断证据能支持什么结论。' : '课程路线与学习目标') + '</p></div></div>' +
      (disciplineId === 'stats'
        ? '<div class="course-layout"><aside class="course-sidebar" id="course-sidebar"></aside><div class="course-body" id="course-body"></div></div>'
        : '<div class="course-body" id="course-body"></div>');
    renderBody();
  }
  const body = () => el.querySelector('#course-body');
  function renderSidebar() {
    const current = summary(model());
    const nav = [{id:'overview', title:'课程目录'}, ...lessons.map(lesson => ({...lesson, done:lesson.exercises.every(task => passed(model(),task))})), {id:'transfer',title:'陌生情境验收',done:current.transferPassed}];
    el.querySelector('#course-sidebar').innerHTML = '<h2>从观察到因果</h2><p class="course-meta">3 节课 · 6 道练习</p><nav class="course-nav" aria-label="统计课程目录">' +
      nav.map(item => '<a href="' + courseURL('stats',item.id) + '"' + (step === item.id ? ' aria-current="step"' : '') + '>' +
        '<span>' + escapeHTML(item.title) + '</span>' + (item.done ? '<small>已通过</small>' : '') + '</a>').join('') +
      '</nav><div class="course-progress"><span>练习达标 ' + current.complete + ' / ' + current.total + '</span><progress max="' + current.total + '" value="' + current.complete +
      '" aria-label="已通过的练习"></progress><span>' + (current.cleared ? '首模块已通过自评' : (current.transferPassed ? '迁移已通过 · 继续练习' : '整年路线待学习与验收')) + '</span></div>';
  }
  function overview() {
    const current = summary(model());
    body().innerHTML = '<article class="course-card"><span class="course-badge">' + (current.cleared ? '首模块已通过自评' : '首模块已开放') +
      '</span><h2>观察到的差异，什么时候可以归因</h2><p>先做 3 节课，再到陌生案例独立作答。每次提交会保留原文，逐条自评会给出对应的复练建议。</p><div class="course-links">' +
      '<a class="primary" href="' + courseURL('stats',current.cleared ? lessons[0].id : current.next) + '">' + (current.started ? (current.cleared ? '回看首节课' : '继续学习') : '开始第一课') +
      '</a><button class="soft" id="copy-study" type="button">下载学习记录</button></div></article>' +
      '<div class="standard-grid"><article class="course-card"><h2>大一核心能力参照</h2><p>' + escapeHTML(syllabus.yearSummary) +
      '</p></article><article class="course-card"><h2>入行一年实务参照</h2><p>' + escapeHTML(syllabus.industrySummary) +
      '</p></article></div><article class="course-card"><h2>完整学习路线</h2><p>' + escapeHTML(syllabus.workload) +
      '。建议用每个模块的作业与真实交付检验进度。整年核心目标还要核验大纲的覆盖、独立作业与迁移表现，并据此补课。</p>' +
      '<ul class="stage-key"><li><strong>试学</strong> · 三节课的六道练习和独立迁移。</li><li><strong>已打基础</strong> · 独立通过数学、数据与概率模块的验收。</li><li><strong>已通过目标深度验收</strong> · 再通过推断、回归、综合项目和陌生题，复核课程覆盖。</li></ul>' +
      '<ol class="module-grid">' + syllabus.modules.map(module => '<li class="module-item"><h3>' + escapeHTML(module.title) +
        '</h3><span class="course-meta">' + module.hours + ' 小时 · ' + (module.id === 'causal' ? '可学习' : '课程规划') +
        '</span><dl><div><dt>先修</dt><dd>' + escapeHTML(module.prerequisite) + '</dd></div><div><dt>学习目标</dt><dd>' + escapeHTML(module.outcome) +
        '</dd></div><div><dt>验收作业</dt><dd>' + escapeHTML(module.assessment) + '</dd></div></dl></li>').join('') +
      '</ol></article><article class="course-card"><h2>已有基础自测</h2><p>用 10 分钟独立作答。基础过关时，可以直接从对应领域的实作开始。</p><ul class="baseline-list">' +
      syllabus.diagnostics.map(task => '<li><a href="' + courseURL(task.id) + '">' + escapeHTML(window.ATLAS.disciplines.find(d => d.id === task.id).name + ' · ' + task.title) +
        '</a><span class="course-meta">' + (passed(model(),task,true) ? '独立自测已通过' : '可作答') + '</span></li>').join('') +
      '</ul></article><details class="course-card course-index"><summary>公开大纲、习题和岗位框架</summary><ul>' +
      syllabus.sources.map(item => '<li><a target="_blank" rel="noopener noreferrer" href="' + escapeHTML(item.url) + '">' + escapeHTML(item.label) + '</a></li>').join('') +
      '</ul></details>';
    el.querySelector('#copy-study').addEventListener('click', downloadReport);
  }
  function planned() {
    const d = window.ATLAS.disciplines.find(item => item.id === disciplineId);
    const diagnostic = syllabus.diagnostics.find(task => task.id === d.id);
    body().innerHTML = '<article class="course-card"><h2>学到什么算过关</h2><p>' + escapeHTML(d.milestone) + '</p><h3>学习路线</h3><ol>' +
      (syllabus.routes[d.id] || []).map(item => '<li>' + escapeHTML(item) + '</li>').join('') +
      '</ol><p class="course-meta">' + (diagnostic ? '先做独立自测。通过后建议从实作开始。' : '课程规划已就绪，课节和题目将逐步开放。') + '</p></article>';
    if (diagnostic) body().append(createExercise(diagnostic,{independent:true}));
  }
  function renderBody() {
    if (disciplineId !== 'stats') { planned(); return; }
    renderSidebar();
    if (step === 'overview') { overview(); return; }
    if (step === 'transfer') {
      const current = summary(model());
      body().innerHTML = '<article class="course-card"><span class="course-badge">独立验收</span><h2>陌生情境迁移</h2><p>用同一套方法分析公共服务问题。写出判断、证据、条件和会让你改变决定的新信息。第一次提交后可打开解析与评分依据。</p><p class="course-meta">' +
        (current.cleared ? '首模块已通过自评。' : '首模块验收要求六道练习达标，并独立通过一道迁移题。') + '</p></article>';
      body().append(createExercise(transfer,{independent:true}));
      return;
    }
    const lesson = lessons.find(item => item.id === step);
    const i = lessons.indexOf(lesson);
    const next = lessons[i + 1];
    body().innerHTML = '<article class="course-card"><span class="course-badge">' + escapeHTML(lesson.time) + '</span><h2>' +
      escapeHTML(lesson.title) + '</h2><div class="lesson-copy">' + escapeHTML(lesson.concept) + '</div><h3>完整示范</h3><div class="lesson-copy">' +
      escapeHTML(lesson.example) + '</div><h3>假设与适用边界</h3><div class="lesson-copy">' + escapeHTML(lesson.assumptions) + '</div></article>';
    body().append(...lesson.exercises.map(task => createExercise(task)));
    const nav = document.createElement('div');
    nav.className = 'next-panel';
    nav.innerHTML = '<a class="primary" href="' + courseURL('stats',next?.id ?? 'transfer') + '">' + (next ? '下一课 · ' + escapeHTML(next.title) : '进入独立验收') + '</a>';
    body().append(nav);
  }
  function createExercise(task, {independent = false} = {}) {
    const node = document.createElement('section');
    node.className = 'exercise';
    node.setAttribute('aria-label',task.title);
    const renderTask = ({focus} = {}) => {
      const variant = variants.get(task.id) || 'main';
      const content = variant === 'retry' ? task.retry : task;
      const key = taskKey(task.id,variant);
      const list = attemptsFor(model(),task.id,variant);
      const last = list.at(-1);
      const review = last?.reviews.at(-1);
      const draft = model().drafts[key] || {text:'',hint:false,at:''};
      const compose = !last || !!draft.text || opened.has(key);
      const priorPassed = passed(model(),task,independent);
      const canHint = list.length > 0 || (variant === 'retry' && !independent);
      node.innerHTML = '<div class="exercise-meta"><span>' + (independent ? '独立作答' : '练习') +
        (variant === 'retry' ? ' · 新情境复练' : '') + '</span>' + (priorPassed ? '<span class="stage-pill">已达标</span>' : '') +
        '</div><h3>' + escapeHTML(task.title) + '</h3><p class="lesson-copy">' + escapeHTML(content.prompt) + '</p>' +
        (variant === 'retry' ? '<button type="button" class="text-button show-main">回看原题</button>' : '') +
        (compose ? '<form class="answer-form"><label class="answer-draft"><span>写下你的答案和推理</span><textarea required maxlength="8000" placeholder="写出你的判断和依据"></textarea></label>' +
          '<div class="attempt-actions"><button class="primary" type="submit">' + (last ? '提交修订' : '提交答案') + '</button>' +
          (canHint ? '<button class="soft show-hint" type="button" aria-expanded="' + String(draft.hint) + '">查看提示</button>' : '') +
          '<span class="course-meta save-label" role="status"></span></div>' +
          (canHint ? '<p class="lesson-copy exercise-hint"' + (draft.hint ? '' : ' hidden') + '>' + escapeHTML(content.hint) + '</p>' : '') + '</form>' :
          '<div class="attempt-actions"><button class="soft revise" type="button">修订答案</button></div>') +
        (last ? feedbackHTML(task,content,last,review,independent,variant) + historyHTML(list) : '');
      const form = node.querySelector('.answer-form');
      const textarea = form?.querySelector('textarea');
      if (form) {
        textarea.value = draft.text;
        function saveDraft() {
          model().drafts[key] = {text:textarea.value,hint:draft.hint,at:stamp()};
          const label = node.querySelector('.save-label');
          const ok = adapter.save();
          label.textContent = ok ? '草稿已保存' : '保存失败，请下载备份。';
        }
        textarea.addEventListener('input',saveDraft);
        node.querySelector('.show-hint')?.addEventListener('click', event => {
          draft.hint = true;
          node.querySelector('.exercise-hint').hidden = false;
          event.currentTarget.setAttribute('aria-expanded','true');
          saveDraft();
        });
        form.addEventListener('submit',event => {
          event.preventDefault();
          if (!textarea.value.trim()) { textarea.focus(); return; }
          const items = model().attempts[key] || (model().attempts[key] = []);
          items.push({id:uid(),at:stamp(),answer:textarea.value,hint:draft.hint,fresh:items.length === 0 && !draft.hint,reviews:[]});
          delete model().drafts[key];
          opened.delete(key);
          adapter.commit('已提交并保留原始答案');
          renderTask({focus:'.review-jump'});
        });
      }
      node.querySelector('.review-jump')?.addEventListener('click', () => {
        const detail = node.querySelector('.feedback-panel');
        detail.open = true;
        detail.querySelector('summary').focus();
      });
      node.querySelector('.review-form')?.addEventListener('submit',event => {
        event.preventDefault();
        const checks = task.criteria.filter(criterion => new FormData(event.currentTarget).has(criterion.id)).map(c => c.id);
        const missing = task.criteria.filter(c => !checks.includes(c.id));
        const feedback = missing.length ? missing.map(c => c.label + ' ' + c.repair).join('\n') : '已达到本题各项评分依据。';
        last.reviews.push({id:uid(),at:stamp(),checks,feedback});
        adapter.commit(missing.length ? '已保存自评和复练建议' : '已保存通过记录');
        renderTask({focus:'.review-result'});
      });
      node.querySelector('.revise')?.addEventListener('click',() => {
        opened.add(key);
        model().drafts[key] = {text:last.answer,at:stamp(),hint:last.hint};
        adapter.save();
        renderTask({focus:'textarea'});
      });
      node.querySelector('.show-retry')?.addEventListener('click',() => {
        variants.set(task.id,'retry');
        renderTask({focus:'textarea'});
      });
      node.querySelector('.show-main')?.addEventListener('click',() => {
        variants.set(task.id,'main');
        renderTask({focus:'.exercise-meta'});
      });
      if (disciplineId === 'stats') renderSidebar();
      if (focus) {
        const target = node.querySelector(focus);
        if (target) { if (!target.matches('textarea,button,a')) target.tabIndex = -1; target.focus(); }
      }
    };
    renderTask();
    return node;
  }
  function feedbackHTML(task,content,last,review,independent,variant) {
    const missing = review ? task.criteria.filter(criterion => !review.checks.includes(criterion.id)) : [];
    const evidence = independent ? '<p class="course-meta">'+ (last.fresh && !last.hint ? '本次是该题第一次作答。' : '本次是修订或练习记录。') + '</p>' : '';
    return '<div class="attempt-text"><span class="course-meta">最近提交 · ' + showDate(last.at) + '</span><p>' + escapeHTML(last.answer) + '</p>' + evidence + '</div>' +
      '<button type="button" class="soft review-jump">对照解析并自评</button>' +
      '<details class="feedback-panel"' + (review ? ' open' : '') + '><summary>解析、常见误区和评分依据</summary><h4>参考解法</h4><p class="lesson-copy">' +
      escapeHTML(content.solution) + '</p><h4>常见误区</h4><p class="lesson-copy">' + escapeHTML(content.misstep || task.misstep) +
      '</p><details class="tip-after"><summary>查看提示</summary><p>' + escapeHTML(content.hint) + '</p></details><form class="review-form"><fieldset class="criteria-list"><legend>逐项勾选答案中已经做到的内容</legend>' +
      task.criteria.map(c => '<label><input type="checkbox" name="' + escapeHTML(c.id) + '"' + (review?.checks.includes(c.id) ? ' checked' : '') + '><span>' + escapeHTML(c.label) + '</span></label>').join('') +
      '</fieldset><button type="submit" class="soft">保存逐项自评</button></form>' +
      (review ? '<div class="review-result" role="status"><h4>自评达标 ' + review.checks.length + ' / ' + task.criteria.length + '</h4>' +
        (missing.length ? '<ul>' + missing.map(c => '<li><strong>' + escapeHTML(c.label) + '</strong><p>' + escapeHTML(c.repair) + '</p></li>').join('') + '</ul>' : '<p>各项评分依据均已满足。</p>') + '</div>' : '') + '</details>' +
      (variant === 'main' && task.retry && (missing.length || attemptsFor(model(),task.id,'retry').length || model().drafts[taskKey(task.id,'retry')]?.text)
        ? '<button type="button" class="soft show-retry">' + (missing.length ? '做针对性复练' : '回看复练') + '</button>' : '');
  }
  function historyHTML(list) {
    return '<details class="attempt-history"><summary>本题记录 · ' + list.length + ' 次提交</summary><ol>' +
      list.map((attempt,i) => '<li><strong>第 ' + (i+1) + ' 次 · ' + showDate(attempt.at) + '</strong><p class="attempt-text">' + escapeHTML(attempt.answer) + '</p>' +
        (attempt.reviews.length ? '<ul>' + attempt.reviews.map(review => '<li><span class="course-meta">自评 · ' + showDate(review.at) + '</span><p class="lesson-copy">' +
          escapeHTML(review.feedback) + '</p></li>').join('') + '</ul>' : '<p class="course-meta">待自评</p>') + '</li>').join('') + '</ol></details>';
  }
  function downloadReport() {
    const current = summary(model());
    const lines = ['# 学科地图学习记录','','统计练习 · ' + current.complete + '/' + current.total,'独立迁移 · ' + (current.transferPassed ? '已通过自评' : '待通过'),''];
    for (const [key, items] of Object.entries(model().attempts)) {
      const [id, variant] = key.split(':');
      const task = tasks.get(id);
      if (!task || !items.length) continue;
      lines.push('## ' + task.title + (variant === 'retry' ? ' · 复练' : ''),'',variant === 'retry' ? task.retry.prompt : task.prompt,'');
      for (const [i, attempt] of items.entries()) {
        lines.push('### 第 ' + (i+1) + ' 次提交 · ' + showDate(attempt.at),'',attempt.answer,'');
        for (const review of attempt.reviews) lines.push('自评 ' + review.checks.length + '/' + task.criteria.length + ' · ' + showDate(review.at),'',review.feedback,'');
      }
    }
    const href = URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = href;
    link.download = '学科地图学习记录.md';
    link.click();
    setTimeout(() => URL.revokeObjectURL(href),1000);
  }
  return {configure, render, normalize, merge, summary, isDiagnostic, courseURL, diagnosticPassed:(value,id) => {
    const task = syllabus.diagnostics.find(t => t.id === id);
    return !!task && passed(value,task,true);
  }};
})();
