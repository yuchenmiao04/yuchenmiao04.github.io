(function () {
  'use strict';

  var serial = 0;
  var presets = {
    A: [720, 180, 40, 60],
    B: [810, 90, 40, 60],
    C: [510, 90, 160, 240]
  };
  var copy = {
    zh: {
      synthetic: '合成设定 · 非实验结果',
      matrixTitle: '同一个准确率，可以隐藏不同的证据风险',
      matrixIntro: 'A 表示答案正确，E 表示证据充分。这里只展示 E 可判定的 1,000 个样本；四格共同描述联合分布。',
      presetLabel: '选择合成分布', presetA: '设定 A · 基准', presetB: '设定 B · 同准确率', presetC: '设定 C · 换分母',
      matrixLabels: ['答案正确 / 证据充分', '答案正确 / 证据不足', '答案错误 / 证据充分', '答案错误 / 证据不足'],
      matrixCaption: '每格数值为样本数；百分比与色条均以全部 1,000 个可判定样本为分母。',
      accuracy: '答案准确率', conditional: '正确答案中的证据失败率', joint: '正确但证据不足的联合比例',
      matrixA: 'A → B：准确率保持 90%，但正确且证据不足的样本从 180 降为 90。单独看答案准确率，无法区分这两个分布。',
      matrixB: '与 A 相比，B 的准确率仍为 90%，条件证据失败率从 20% 降至 10%。这里的变化也体现在联合比例：18% → 9%。',
      matrixC: 'B → C：正确且证据不足的样本都为 90，联合比例都是 9%；正确答案分母从 900 变为 600，条件失败率因此从 10% 变为 15%。必须同时检查四格和分母。',
      matrixBoundary: '所有数值都是人为构造的分布，不是 MARS-Gov 的实测结果，也不表示同一批样本的配对变化。E 不可判定的情况未包含在图中，应另报其占比；此处 Accuracy 也仅针对该可判定子集。',
      auditTitle: '改变审查配额，会改变样本的平均风险',
      auditIntro: '目标总体固定为 1,000 个“答案正确且 E 可判定”的样本。高一致层有 800 个，证据失败率 5%；分歧层有 200 个，失败率 25%。总体目标为 9%。',
      allocation: '200 个审查名额中，分给分歧层的名额', high: '高一致层', disagree: '分歧层',
      population: '总体样本数 Nₕ', failure: '设定的层内失败率', auditN: '审查样本数 nₕ', inclusion: '纳入概率 nₕ / Nₕ',
      populationMix: '总体的层构成', sampleMix: '审查样本的层构成',
      naive: '朴素样本均值的设计期望', weighted: '分层加权估计的设计期望', target: '固定总体目标',
      naiveFormula: '朴素均值按审查名额加权', weightedFormula: '分层估计按总体规模加权',
      auditExplanation: '拖动滑块只改变抽样配额，不改变总体。朴素均值追随被审查样本的构成；使用已知层规模加权，在本抽样设计下的期望始终为 9%。',
      auditBoundary: '合成有限总体示意，非 MARS-Gov 实测。每层内独立简单随机无放回抽样，配额为整数，两层纳入概率始终大于 0。图中展示抽样设计下的期望，单次实际估计会波动；图示不比较估计方差，也不声称该配额最优。',
      selected: '当前分布', auditSelected: '当前审查配额', of: ' / '
    },
    en: {
      synthetic: 'SYNTHETIC SETTING · NOT EXPERIMENTAL RESULTS',
      matrixTitle: 'One accuracy score can hide different evidence risks',
      matrixIntro: 'A denotes answer correctness and E evidence sufficiency. All 1,000 cases here have a decidable E label; the four cells describe their joint distribution.',
      presetLabel: 'Choose a synthetic distribution', presetA: 'Setting A · baseline', presetB: 'Setting B · same accuracy', presetC: 'Setting C · new denominator',
      matrixLabels: ['Correct answer / sufficient evidence', 'Correct answer / insufficient evidence', 'Incorrect answer / sufficient evidence', 'Incorrect answer / insufficient evidence'],
      matrixCaption: 'Each cell shows a count. Percentages and bar lengths use all 1,000 decidable cases as the denominator.',
      accuracy: 'Answer accuracy', conditional: 'Evidence failure among correct answers', joint: 'Correct but insufficient: joint proportion',
      matrixA: 'A → B: accuracy stays at 90%, while correct answers with insufficient evidence fall from 180 to 90. Answer accuracy alone cannot distinguish these distributions.',
      matrixB: 'Relative to A, B still has 90% accuracy, but conditional evidence failure falls from 20% to 10%. The joint proportion also changes: 18% → 9%.',
      matrixC: 'B → C: both contain 90 correct answers with insufficient evidence, a joint proportion of 9%. The correct-answer denominator falls from 900 to 600, raising conditional failure from 10% to 15%. Inspect all four cells and their denominators.',
      matrixBoundary: 'All numbers are constructed distributions, not MARS-Gov measurements or paired changes on the same cases. Cases with an undecidable E label are excluded and require a separate coverage report. Accuracy here also applies only to the decidable subset.',
      auditTitle: 'Audit allocation changes the sample’s average risk',
      auditIntro: 'The target population is fixed: 1,000 correct answers with decidable E labels. The high-agreement stratum has 800 cases at 5% evidence failure; the disagreement stratum has 200 at 25%. The population target is 9%.',
      allocation: 'Disagreement-stratum slots out of 200 audits', high: 'High agreement', disagree: 'Disagreement',
      population: 'Population size Nₕ', failure: 'Assumed within-stratum failure', auditN: 'Audited sample size nₕ', inclusion: 'Inclusion probability nₕ / Nₕ',
      populationMix: 'Population composition', sampleMix: 'Audit-sample composition',
      naive: 'Design expectation of the naive sample mean', weighted: 'Design expectation of the stratified estimator', target: 'Fixed population target',
      naiveFormula: 'The naive mean weights by audit allocation', weightedFormula: 'The stratified estimator weights by population size',
      auditExplanation: 'The slider changes allocation, not the population. The naive mean follows the audited sample’s composition. Weighting by known stratum sizes keeps the design expectation at 9% under this sampling design.',
      auditBoundary: 'A synthetic finite population, not MARS-Gov measurements. Independent simple random sampling without replacement occurs within each stratum, with integer allocations and strictly positive inclusion probabilities. Values shown are design expectations: realized estimates vary. The illustration does not compare estimator variance or claim an optimal allocation.',
      selected: 'Current distribution', auditSelected: 'Current audit allocation', of: ' / '
    }
  };

  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function percentage(value) { return (value * 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + '%'; }
  function paragraph(value, cls) { return '<p class="' + cls + '">' + esc(value) + '</p>'; }
  function header(t, kind) { return '<div class="ev-heading">' + paragraph(t.synthetic, 'ev-kicker') + paragraph(t[kind + 'Title'], 'ev-title') + paragraph(t[kind + 'Intro'], 'ev-intro') + '</div>'; }
  function metric(label, value, formula, extra) { return '<div class="ev-metric' + (extra ? ' ev-metric--' + extra : '') + '"><span class="ev-metric-label">' + esc(label) + '</span><strong>' + esc(value) + '</strong><span class="ev-metric-formula">' + esc(formula) + '</span></div>'; }
  function matrixMetrics(counts) {
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    var correct = counts[0] + counts[1];
    return { total: total, correct: correct, accuracy: correct / total, conditional: counts[1] / correct, joint: counts[1] / total };
  }
  function matrixView(key, t) {
    var data = presets[key], m = matrixMetrics(data);
    var codes = ['A=1, E=1', 'A=1, E=0', 'A=0, E=1', 'A=0, E=0'];
    var tones = ['supported', 'hidden', '', ''];
    var cells = data.map(function (value, i) {
      return '<div class="ev-cell' + (tones[i] ? ' ev-cell--' + tones[i] : '') + '"><span class="ev-cell-code">' + codes[i] + '</span>' + paragraph(t.matrixLabels[i], 'ev-cell-label') + '<div class="ev-cell-number"><strong>' + value + '</strong><span>' + percentage(value / m.total) + '</span></div><div class="ev-cell-track" aria-hidden="true"><i style="width:' + (value / m.total * 100) + '%"></i></div></div>';
    }).join('');
    return '<div class="ev-matrix" role="group" aria-label="' + esc(t.selected + ' ' + key) + '">' + cells + '</div>' + paragraph(t.matrixCaption, 'ev-grid-caption') + '<div class="ev-metrics">' + metric(t.accuracy, percentage(m.accuracy), 'P(A=1) = ' + m.correct + ' / ' + m.total) + metric(t.conditional, percentage(m.conditional), 'P(E=0 | A=1) = ' + data[1] + ' / ' + m.correct) + metric(t.joint, percentage(m.joint), 'P(A=1, E=0) = ' + data[1] + ' / ' + m.total) + '</div>' + paragraph(t['matrix' + key], 'ev-explanation');
  }
  function matrixSummary(key, t) {
    var m = matrixMetrics(presets[key]);
    return t.selected + ' ' + key + '. ' + t.accuracy + ' ' + percentage(m.accuracy) + '; ' + t.conditional + ' ' + percentage(m.conditional) + '; ' + t.joint + ' ' + percentage(m.joint) + '.';
  }
  function mountMatrix(root, t) {
    root.innerHTML = header(t, 'matrix') + '<div class="ev-controls"><div class="ev-switch" role="group" aria-label="' + esc(t.presetLabel) + '">' + ['A', 'B', 'C'].map(function (key) { return '<button type="button" data-ev-preset="' + key + '" aria-pressed="' + (key === 'A') + '">' + esc(t['preset' + key]) + '</button>'; }).join('') + '</div></div><div class="ev-view">' + matrixView('A', t) + '</div><p class="ev-sr-only" aria-live="polite" aria-atomic="true"></p>' + paragraph(t.matrixBoundary, 'ev-caption');
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ev-preset]');
      if (!button || !root.contains(button)) return;
      var key = button.getAttribute('data-ev-preset');
      if (!Object.prototype.hasOwnProperty.call(presets, key)) return;
      root.querySelectorAll('[data-ev-preset]').forEach(function (control) { control.setAttribute('aria-pressed', String(control === button)); });
      root.querySelector('.ev-view').innerHTML = matrixView(key, t);
      root.querySelector('.ev-sr-only').textContent = matrixSummary(key, t);
    });
  }
  function auditMetrics(disagreement) {
    var high = 200 - disagreement;
    return { high: high, disagreement: disagreement, highProbability: high / 800, disagreementProbability: disagreement / 200, naive: (high * 0.05 + disagreement * 0.25) / 200, weighted: 0.8 * 0.05 + 0.2 * 0.25 };
  }
  function stratum(t, type, population, rate, sample, probability) {
    return '<div class="ev-stratum ev-stratum--' + type + '">' + paragraph(type === 'high' ? t.high : t.disagree, 'ev-stratum-title') + '<dl><dt>' + esc(t.population) + '</dt><dd>' + population + '</dd><dt>' + esc(t.failure) + '</dt><dd>' + percentage(rate) + '</dd><dt>' + esc(t.auditN) + '</dt><dd>' + sample + '</dd><dt>' + esc(t.inclusion) + '</dt><dd>' + percentage(probability) + '</dd></dl></div>';
  }
  function bar(label, highShare) { return '<div class="ev-bar-row"><div class="ev-bar-label"><span>' + esc(label) + '</span><strong>' + percentage(highShare) + ' / ' + percentage(1 - highShare) + '</strong></div><div class="ev-stacked-bar" aria-hidden="true"><i class="ev-stack-high" style="width:' + (highShare * 100) + '%"></i><i class="ev-stack-disagree" style="width:' + ((1 - highShare) * 100) + '%"></i></div></div>'; }
  function auditView(disagreement, t) {
    var m = auditMetrics(disagreement);
    return '<div class="ev-strata">' + stratum(t, 'high', 800, 0.05, m.high, m.highProbability) + stratum(t, 'disagree', 200, 0.25, m.disagreement, m.disagreementProbability) + '</div><div class="ev-allocation">' + bar(t.populationMix, 0.8) + bar(t.sampleMix, m.high / 200) + '<div class="ev-legend"><span><i class="ev-stack-high"></i>' + esc(t.high) + '</span><span><i class="ev-stack-disagree"></i>' + esc(t.disagree) + '</span></div></div><div class="ev-metrics ev-metrics--audit">' + metric(t.naive, percentage(m.naive), '(' + m.high + ' × 5% + ' + m.disagreement + ' × 25%) / 200') + metric(t.weighted, percentage(m.weighted), '0.8 × 5% + 0.2 × 25%', 'weighted') + '</div><div class="ev-formulas"><div><span>' + esc(t.naiveFormula) + '</span><code>E[ȳ_sample] = Σₕ (nₕ / 200) pₕ</code></div><div><span>' + esc(t.weightedFormula) + '</span><code>E[Σₕ (Nₕ / 1000) ȳₕ] = Σₕ (Nₕ / 1000) pₕ = 9%</code></div></div>' + paragraph(t.auditExplanation, 'ev-explanation');
  }
  function mountAudit(root, t, id) {
    var inputId = id + '-allocation';
    root.innerHTML = header(t, 'audit') + '<div class="ev-controls"><div class="ev-range-heading"><label for="' + inputId + '">' + esc(t.allocation) + '</label><output for="' + inputId + '">100 / 200</output></div><input id="' + inputId + '" type="range" min="20" max="180" step="1" value="100" aria-valuetext="100 / 200"><div class="ev-range-scale" aria-hidden="true"><span>20</span><span>100</span><span>180</span></div></div><div class="ev-view">' + auditView(100, t) + '</div><p class="ev-sr-only" aria-live="polite" aria-atomic="true"></p>' + paragraph(t.auditBoundary, 'ev-caption');
    var input = root.querySelector('input');
    input.addEventListener('input', function () {
      var value = Math.max(20, Math.min(180, Math.round(Number(input.value))));
      if (!Number.isFinite(value)) return;
      input.value = String(value);
      input.setAttribute('aria-valuetext', value + ' / 200');
      root.querySelector('output').textContent = value + ' / 200';
      root.querySelector('.ev-view').innerHTML = auditView(value, t);
    });
    input.addEventListener('change', function () {
      var m = auditMetrics(Number(input.value));
      root.querySelector('.ev-sr-only').textContent = t.auditSelected + ': ' + t.high + ' ' + m.high + ', ' + t.disagree + ' ' + m.disagreement + '. ' + t.naive + ' ' + percentage(m.naive) + '; ' + t.weighted + ' ' + percentage(m.weighted) + '.';
    });
  }
  function initialize() {
    var lang = /^zh(?:-|_|$)/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
    var t = copy[lang];
    document.querySelectorAll('[data-evidence-viz]').forEach(function (root) {
      if (root.getAttribute('data-ev-ready') === 'true') return;
      var kind = root.getAttribute('data-evidence-viz');
      if (kind !== 'matrix' && kind !== 'audit') return;
      root.classList.add('evidence-viz');
      root.setAttribute('data-ev-ready', 'true');
      var id = 'evidence-viz-' + (++serial);
      if (kind === 'matrix') mountMatrix(root, t);
      else mountAudit(root, t, id);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
}());
