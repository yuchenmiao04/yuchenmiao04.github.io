(function () {
  'use strict';

  var serial = 0;
  function language() { return /^zh(?:-|_|$)/i.test(document.documentElement.lang || '') ? 'zh' : 'en'; }
  var copy = {
    zh: {
      sketch: '计算机制', model: '解析模型', protocol: '协议示意',
      topologyTitle: '依赖、控制与消息更新，是不同的观察层次',
      topologyIntro: '实线表示 artifact / 数据依赖，虚线表示控制决策。三种结构可以组合，不构成互斥分类。',
      topologyLabel: '选择计算结构', pipeline: 'Pipeline', orchestrator: 'Orchestrator', debate: 'Debate',
      artifact: 'artifact / 数据依赖', control: '控制决策',
      pipelineNodes: [['阶段 f₁', 'x → h₁'], ['阶段 f₂', 'h₁ → h₂'], ['阶段 f₃', 'h₂ → y']],
      pipelineText: '固定 DAG 预先规定依赖：f₂ 消费 h₁，f₃ 消费 h₂。节点内部仍可以调用模型、工具或局部 debate。',
      orchestratorText: '控制器 C 根据状态 sₜ 展开任务 qᵢ，worker 返回 artifact，再形成下一次控制决策的输入。这里仅展示两种状态对应的任务数，不执行实际调度。',
      controller: '控制器 C(sₜ)', state: '状态', taskExpansion: '任务展开', stateTwo: 's₀：2 个任务', stateThree: 's₁：3 个任务',
      worker: 'Worker', mergedArtifact: '汇合 artifact hₜ', stateFeedback: '作为后续状态输入',
      debateText: '每个更新算子 Uᵢ 读取可见消息，产生新版本 mᵢᵗ。消息版本、可见范围与调度协议决定这一步读到什么；它也可以嵌入 pipeline 或受控制器管理。',
      updateOperator: '消息修订算子 Uᵢ', priorMessages: '读取上一轮可见消息', revisedMessages: '产生新消息版本', nextRound: '推进轮次',
      pipelineMobile: [['固定依赖', 'f₁(x) → h₁'], ['消费 artifact', 'f₂(h₁) → h₂'], ['消费 artifact', 'f₃(h₂) → y']],
      orchestratorMobile: [['读取状态', 'C(sₜ)'], ['展开 worker 任务', 'q₁ … qₖ(sₜ)，任务数依赖状态'], ['收集 artifact', 'hₜ 进入后续状态输入']],
      debateMobile: [['初始消息', 'm₁⁰、m₂⁰、m₃⁰'], ['读取可见版本', 'Uᵢ(mᵢᵗ⁻¹, {mⱼᵗ⁻¹})'], ['写入新版本', 'm₁ᵗ、m₂ᵗ、m₃ᵗ；按协议继续']],
      topologyNote: '独立首答只表示尚未读取同伴消息，不保证误差统计独立。',
      topologyCaption: '抽象计算图与控制状态示意，不是运行轨迹或性能实验。',

      costTitle: '消息拓扑如何改变上下文输入量',
      costIntro: '比较相同 N 个节点上的全连接与有向环。每个发送者每轮产生一份 ℓ=256 tokens 的新消息，有向边决定接收者；无自环。',
      agents: '节点数 N', rounds: '修订轮数 R', messageLength: '单份消息 ℓ', contextPolicy: '上下文策略',
      snapshot: '只读上一轮', fullHistory: '保留全部历轮',
      completeGraph: '全连接有向图', directedRing: '有向环', routedInput: '路由消息输入', edges: '有向边', tokens: 'tokens',
      costRatio: '全连接 / 有向环', formula: '本策略的计数式',
      snapshotDefinition: '第 r 次更新，每条边只向调用上下文提供一份上一轮消息。',
      historyDefinition: '第 r 次更新，每条边向调用上下文提供该发送者的 r 份消息，各长 ℓ；不递归嵌入其他节点的历史。',
      costBoundary: '只计进入更新调用的路由消息 token，排除基础 prompt、自身历史、输出、工具与 judge。未建模中心聚合，也不作质量或耗时判断。',
      costCaption: '固定消息长度的解析计数模型，不是实测 token、网络流量或延迟。',

      scheduleTitle: '同样两次修订，读取的版本可以不同',
      scheduleIntro: '固定 3 个 agent，每个各更新两次，共 6 次更新。异步没有全局“两轮”；版本号是本地更新次数，事件编号不表示实际耗时。',
      scheduleLabel: '选择更新调度', synchronous: '同步 / Jacobi', sequential: '顺序 / Gauss–Seidel', asynchronous: '异步 / 事件驱动',
      syncExplanation: '同一轮并行读取 t−1 快照；全部完成并送达后，下一轮才能开始。',
      sequentialExplanation: '按 A → B → C 扫描；后发更新可读取本轮前面已写入的新版本。共扫描两次。',
      asyncExplanation: '无全局轮次。前两次是启动更新，其后由列出的送达事件触发；只读取本地缓存，未送达的版本仍不可见。',
      previous: '上一步', next: '下一步', reset: '回到初始', initial: '初始快照', completed: '已完成版本',
      event: '逻辑事件', reads: '读取', writes: '写入', noUpdate: '本事件无更新', stale: '陈旧缓存',
      staleExplanation: '† 与赭色标记陈旧缓存：该事件前已有更新版本生成，但尚未送达当前读取者。',
      syncEvent: '轮', sequentialEvent: '更新', asyncEvent: '事件', start: '启动', delivery: '送达',
      beforeStart: '初始 A⁰、B⁰、C⁰ 已可用。选择“下一步”查看首次更新。',
      initialVersions: 'A⁰ · B⁰ · C⁰',
      scheduleBoundary: '这是预设的读取 / 写入顺序，没有模拟推理质量。只固定更新次数，不保证实际 token 或时间预算相同。异步示例遵守每条链路的先发先到；最后可排空消息，但不再触发更新。',
      scheduleCaption: '更新协议与缓存版本示意，不是模型实验或墙钟时间线。',

      correlationTitle: '相关误差下，数量与方差等效数量',
      correlationIntro: '令 Xᵢ∈{0,1} 为错误指标，所有边际错误率 p=0.25，任意两项相关系数均为 ρ。这里研究均值的方差。',
      population: '实际数量 N', correlation: '两两相关 ρ', effective: '方差等效 N_eff', variance: 'Var(X̄)',
      physicalCurve: 'N', effectiveCurve: 'N_eff', selected: '当前取值',
      correlationFormula: '同边际、同两两相关', correlationBoundary: 'N_eff 是均值方差的等效样本量，不是多数投票正确率，也不代表观测到的独立判断数。ρ=0 仅给出两两不相关，不能单凭此推出联合独立。',
      realizable: '非负 ρ 可由一个 exchangeable 构造实现：以概率 ρ 共享一次 Bernoulli(p) 抽样，否则各自独立抽样。图中没有进行投票模拟。',
      correlationCaption: '给定矩假设下的解析曲线；p 固定为 0.25，非实测性能。',
      chartX: '实际数量 N', chartY: '方差等效数量', valueAtN: '各 N 下的方差等效数量'
    },
    en: {
      sketch: 'Computation', model: 'Analytic model', protocol: 'Protocol sketch',
      topologyTitle: 'Dependencies, control, and message updates describe different layers',
      topologyIntro: 'Solid lines carry artifacts / data dependencies; dashed lines carry control decisions. These structures can be combined.',
      topologyLabel: 'Choose a computational structure', pipeline: 'Pipeline', orchestrator: 'Orchestrator', debate: 'Debate',
      artifact: 'Artifact / data dependency', control: 'Control decision',
      pipelineNodes: [['Stage f₁', 'x → h₁'], ['Stage f₂', 'h₁ → h₂'], ['Stage f₃', 'h₂ → y']],
      pipelineText: 'A fixed DAG defines dependencies in advance: f₂ consumes h₁ and f₃ consumes h₂. A node may itself invoke models, tools, or a local debate.',
      orchestratorText: 'Controller C expands tasks qᵢ from state sₜ. Workers return artifacts that feed subsequent control decisions. These two states illustrate task expansion; no scheduler is being executed.',
      controller: 'Controller C(sₜ)', state: 'State', taskExpansion: 'Task expansion', stateTwo: 's₀: 2 tasks', stateThree: 's₁: 3 tasks',
      worker: 'Worker', mergedArtifact: 'Merged artifact hₜ', stateFeedback: 'Input to subsequent state',
      debateText: 'Update operator Uᵢ reads the visible messages and writes a new version mᵢᵗ. Visibility and scheduling determine which versions it can read. This protocol can sit within a pipeline or under a controller.',
      updateOperator: 'Message update Uᵢ', priorMessages: 'Read visible prior-round messages', revisedMessages: 'Write new message versions', nextRound: 'Advance round',
      pipelineMobile: [['Fixed dependency', 'f₁(x) → h₁'], ['Consume artifact', 'f₂(h₁) → h₂'], ['Consume artifact', 'f₃(h₂) → y']],
      orchestratorMobile: [['Read state', 'C(sₜ)'], ['Expand worker tasks', 'q₁ … qₖ(sₜ); task count depends on state'], ['Collect artifacts', 'hₜ feeds a subsequent state']],
      debateMobile: [['Initial messages', 'm₁⁰, m₂⁰, m₃⁰'], ['Read visible versions', 'Uᵢ(mᵢᵗ⁻¹, {mⱼᵗ⁻¹})'], ['Write new versions', 'm₁ᵗ, m₂ᵗ, m₃ᵗ; continue under the protocol']],
      topologyNote: 'Separate initial answers have not read peer messages. Their errors need not be statistically independent.',
      topologyCaption: 'Abstract computation and control-state sketch, not an execution trace or a performance experiment.',

      costTitle: 'How message topology changes context input',
      costIntro: 'Compare a complete directed graph and a directed ring on the same N nodes. Each sender produces one new ℓ=256-token message per round; directed edges determine its readers. There are no self-loops.',
      agents: 'Nodes N', rounds: 'Revision rounds R', messageLength: 'Message length ℓ', contextPolicy: 'Context policy',
      snapshot: 'Previous round only', fullHistory: 'All prior rounds',
      completeGraph: 'Complete directed graph', directedRing: 'Directed ring', routedInput: 'Routed message input', edges: 'Directed edges', tokens: 'tokens',
      costRatio: 'Complete / ring', formula: 'Counting rule for this policy',
      snapshotDefinition: 'At update r, each edge supplies only one previous-round message to the call context.',
      historyDefinition: 'At update r, each edge supplies r messages from that sender, each of length ℓ. Other nodes’ histories are not recursively embedded.',
      costBoundary: 'Counts only routed messages entering update calls. Excludes base prompts, own history, outputs, tools, and judges. No central aggregation, quality, or elapsed-time claim is modelled.',
      costCaption: 'An analytic fixed-message-length count, not measured token usage, network traffic, or latency.',

      scheduleTitle: 'Two revisions each can read different versions',
      scheduleIntro: 'Three agents each update twice: six updates in total. Asynchrony has no global “two rounds.” Versions count local updates; event indices do not measure elapsed time.',
      scheduleLabel: 'Choose an update schedule', synchronous: 'Synchronous / Jacobi', sequential: 'Sequential / Gauss–Seidel', asynchronous: 'Asynchronous / events',
      syncExplanation: 'Updates in a round read the t−1 snapshot in parallel. The next round waits until every update has completed and arrived.',
      sequentialExplanation: 'Sweep A → B → C. Later updates can read versions already written earlier in the same sweep. Repeat for two sweeps.',
      asyncExplanation: 'There are no global rounds. Two startup updates are followed by the listed delivery-triggered updates. Each reads only its local cache; undelivered versions are invisible.',
      previous: 'Previous', next: 'Next', reset: 'Reset', initial: 'Initial snapshot', completed: 'Completed versions',
      event: 'Logical event', reads: 'Reads', writes: 'Writes', noUpdate: 'No update at this event', stale: 'Stale cache',
      staleExplanation: '† and ochre mark a stale cached version: a newer version was generated before the event but has not reached this reader.',
      syncEvent: 'Round', sequentialEvent: 'Update', asyncEvent: 'Event', start: 'Start', delivery: 'Deliver',
      beforeStart: 'A⁰, B⁰, and C⁰ are initially available. Select Next to inspect the first update.',
      initialVersions: 'A⁰ · B⁰ · C⁰',
      scheduleBoundary: 'These reads and writes are scripted, without reasoning-quality simulation. Equal update counts do not establish equal token or time budgets. The asynchronous example preserves FIFO on each link. Remaining messages may drain after the final update without triggering more updates.',
      scheduleCaption: 'An update-protocol and cache-version sketch, not a model experiment or wall-clock timeline.',

      correlationTitle: 'Correlated errors: count versus variance-equivalent count',
      correlationIntro: 'Let Xᵢ∈{0,1} indicate an error. Every marginal error rate is p=0.25 and every pair has correlation ρ. The quantity of interest is the variance of the mean.',
      population: 'Actual count N', correlation: 'Pairwise correlation ρ', effective: 'Variance-equivalent N_eff', variance: 'Var(X̄)',
      physicalCurve: 'N', effectiveCurve: 'N_eff', selected: 'Selected values',
      correlationFormula: 'Equal marginals and equal pairwise correlations', correlationBoundary: 'N_eff matches the variance of the mean. It is not majority-vote accuracy or an observed count of independent judgments. ρ=0 gives pairwise uncorrelatedness, which alone does not imply joint independence.',
      realizable: 'Nonnegative ρ is realizable by an exchangeable construction: with probability ρ, share one Bernoulli(p) draw; otherwise draw independently. No voting simulation is performed.',
      correlationCaption: 'An analytic curve under the stated moment assumptions, with p fixed at 0.25; not measured performance.',
      chartX: 'Actual count N', chartY: 'Variance-equivalent count', valueAtN: 'Variance-equivalent count at each N'
    }
  };

  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function p(text, cls) { return '<p class="' + (cls || 'av-copy') + '">' + esc(text) + '</p>'; }
  function number(value, decimals) { return Number(value).toLocaleString(language() === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 }); }
  function toggle(label, action, value, selected) { return '<button type="button" class="av-button' + (selected ? ' is-selected' : '') + '" data-av-action="' + action + '" data-av-value="' + value + '" aria-pressed="' + !!selected + '">' + esc(label) + '</button>'; }
  function group(label, action, options, selected) { return '<div class="av-control-group"><span class="av-control-label">' + esc(label) + '</span><div class="av-switch" role="group" aria-label="' + esc(label) + '">' + options.map(function (x) { return toggle(x[1], action, x[0], selected === x[0]); }).join('') + '</div></div>'; }
  function svgStart(id, title, description, height) { return '<svg class="av-svg" viewBox="0 0 700 ' + height + '" role="img" aria-labelledby="' + id + '-title ' + id + '-desc" xmlns="http://www.w3.org/2000/svg"><title id="' + id + '-title">' + esc(title) + '</title><desc id="' + id + '-desc">' + esc(description) + '</desc><defs><marker id="' + id + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94859f"/></marker></defs>'; }
  function edge(id, path, control) { return '<path class="av-edge' + (control ? ' av-edge--control' : '') + '" d="' + path + '" marker-end="url(#' + id + '-arrow)"/>'; }
  function node(x, y, w, h, title, detail, tone) { return '<g class="av-node' + (tone ? ' av-node--' + tone : '') + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9"/><text class="av-node-title" x="' + (x + w / 2) + '" y="' + (y + h / 2 - 6) + '" text-anchor="middle">' + esc(title) + '</text><text class="av-node-detail" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 20) + '" text-anchor="middle">' + esc(detail) + '</text></g>'; }
  function mobileFlow(items) { return '<ol class="av-mobile-flow">' + items.map(function (item) { return '<li><strong>' + esc(item[0]) + '</strong><span>' + esc(item[1]) + '</span></li>'; }).join('') + '</ol>'; }
  function legend(t) { return '<div class="av-legend"><span><i class="av-line-key"></i>' + esc(t.artifact) + '</span><span><i class="av-line-key av-line-key--control"></i>' + esc(t.control) + '</span></div>'; }

  function topologyControls(s, t) {
    return group(t.topologyLabel, 'mode', [['pipeline', t.pipeline], ['orchestrator', t.orchestrator], ['debate', t.debate]], s.mode) + (s.mode === 'orchestrator' ? group(t.taskExpansion, 'workers', [[2, t.stateTwo], [3, t.stateThree]], s.workers) : '');
  }
  function topologyView(s, t, id) {
    var mode = s.mode, sid = id + '-graph';
    var text = t[mode + 'Text'];
    var svg = svgStart(sid, t[mode], text, mode === 'pipeline' ? 186 : 372);
    if (mode === 'pipeline') {
      svg += edge(sid, 'M200 88H260');
      svg += edge(sid, 'M440 88H500');
      t.pipelineNodes.forEach(function (item, i) { svg += node(20 + i * 240, 44, 180, 88, item[0], item[1]); });
      svg += '<text class="av-edge-label" x="230" y="73" text-anchor="middle">h₁</text><text class="av-edge-label" x="470" y="73" text-anchor="middle">h₂</text>';
    } else if (mode === 'orchestrator') {
      svg += edge(sid, 'M190 55H246');
      svg += node(16, 20, 174, 70, t.state + ' s' + (s.workers === 2 ? '₀' : '₁'), 'sₜ');
      svg += node(246, 14, 220, 82, t.controller, 'sₜ → {qᵢ}', 'purple');
      var xs = s.workers === 2 ? [136, 416] : [18, 262, 506];
      xs.forEach(function (x, i) {
        var center = x + 88;
        svg += edge(sid, 'M356 96V124H' + center + 'V156', true);
        svg += edge(sid, 'M' + center + ' 236V264H356V288');
        svg += node(x, 156, 176, 80, t.worker + ' ' + (i + 1), 'q' + (i + 1) + ' → h' + (i + 1));
      });
      svg += node(236, 288, 240, 70, t.mergedArtifact, t.stateFeedback, 'purple');
      svg += edge(sid, 'M476 322H690V55H468');
    } else {
      [108, 350, 592].forEach(function (x, i) {
        svg += edge(sid, 'M' + x + ' 90V112H350V140');
        svg += edge(sid, 'M350 222V244H' + x + 'V270');
        svg += node(x - 88, 14, 176, 76, 'Agent ' + String.fromCharCode(65 + i), 'm' + (i + 1) + '⁰');
        svg += node(x - 88, 270, 176, 76, 'Agent ' + String.fromCharCode(65 + i), 'm' + (i + 1) + '¹');
      });
      svg += node(126, 140, 448, 82, t.updateOperator, t.priorMessages, 'purple');
      svg += edge(sid, 'M574 181H686V118H548V140', true);
      svg += '<text class="av-edge-label" x="630" y="105" text-anchor="middle">t ← t+1</text>';
    }
    var mobileItems = t[mode + 'Mobile'];
    if (mode === 'orchestrator') {
      var tasks = [], artifacts = [];
      for (var k = 1; k <= s.workers; k++) { tasks.push('q' + k); artifacts.push('W' + k + ': q' + k + ' → h' + k); }
      mobileItems = [[t.state + ' ' + (s.workers === 2 ? 's₀' : 's₁'), 'C(sₜ) → {' + tasks.join(', ') + '}'], [t.taskExpansion, artifacts.join(' · ')], [t.mergedArtifact, t.stateFeedback]];
    }
    return legend(t) + '<div class="av-diagram">' + svg + '</svg></div>' + mobileFlow(mobileItems) + p(text, 'av-explanation') + (mode === 'debate' ? p(t.topologyNote, 'av-note') : '');
  }

  function costControls(s, t) { return '<div class="av-controls-grid">' + group(t.agents, 'n', [[3, '3'], [5, '5'], [8, '8']], s.n) + group(t.rounds, 'rounds', [[1, '1'], [3, '3'], [5, '5']], s.rounds) + '</div>' + group(t.contextPolicy, 'context', [['snapshot', t.snapshot], ['history', t.fullHistory]], s.context); }
  function costView(s, t) {
    var fullEdges = s.n * (s.n - 1), ringEdges = s.n;
    var factor = s.context === 'snapshot' ? s.rounds : s.rounds * (s.rounds + 1) / 2;
    var full = fullEdges * s.length * factor, ring = ringEdges * s.length * factor;
    var data = [[t.completeGraph, 'N(N−1)', fullEdges, full, 'purple'], [t.directedRing, 'N', ringEdges, ring, 'teal']];
    var cards = '<div class="av-cost-columns">' + data.map(function (item) { return '<section class="av-cost-card av-cost-card--' + item[4] + '">' + p(item[0], 'av-card-title') + '<div class="av-edge-count"><span>m = ' + item[1] + '</span><strong>' + item[2] + ' ' + esc(t.edges) + '</strong></div><div class="av-cost-number">' + number(item[3]) + '<span>' + esc(t.tokens) + '</span></div><div class="av-bar-track" aria-hidden="true"><span style="width:' + (item[3] / full * 100) + '%"></span></div>' + p(t.routedInput, 'av-note') + '</section>'; }).join('') + '</div>';
    var formula = s.context === 'snapshot' ? 'C = m · R · ℓ' : 'C = m · ℓ · Σ(r=1…R) r = m · ℓ · R(R+1)/2';
    return cards + '<div class="av-formula"><span>' + esc(t.formula) + '</span><code>' + esc(formula) + '</code></div><div class="av-ratio"><span>' + esc(t.costRatio) + '</span><strong>' + (s.n - 1) + '×</strong><code>N−1</code></div>' + p(s.context === 'snapshot' ? t.snapshotDefinition : t.historyDefinition, 'av-explanation') + p(t.costBoundary, 'av-boundary');
  }

  // A read vector is ordered A, B, C. Writes in the same synchronous row commit together.
  function scheduleData(mode) {
    if (mode === 'sync') return [
      { updates: [{ agent: 0, reads: [0, 0, 0], write: 1 }, { agent: 1, reads: [0, 0, 0], write: 1 }, { agent: 2, reads: [0, 0, 0], write: 1 }] },
      { updates: [{ agent: 0, reads: [1, 1, 1], write: 2 }, { agent: 1, reads: [1, 1, 1], write: 2 }, { agent: 2, reads: [1, 1, 1], write: 2 }] }
    ];
    if (mode === 'sequential') return [
      { updates: [{ agent: 0, reads: [0, 0, 0], write: 1 }] },
      { updates: [{ agent: 1, reads: [1, 0, 0], write: 1 }] },
      { updates: [{ agent: 2, reads: [1, 1, 0], write: 1 }] },
      { updates: [{ agent: 0, reads: [1, 1, 1], write: 2 }] },
      { updates: [{ agent: 1, reads: [2, 1, 1], write: 2 }] },
      { updates: [{ agent: 2, reads: [2, 2, 1], write: 2 }] }
    ];
    return [
      { start: 'A', updates: [{ agent: 0, reads: [0, 0, 0], write: 1 }] },
      { start: 'B', updates: [{ agent: 1, reads: [0, 0, 0], write: 1 }] },
      { deliveries: [['A', 1, 'C']], updates: [{ agent: 2, reads: [1, 0, 0], write: 1 }] },
      { deliveries: [['B', 1, 'A']], updates: [{ agent: 0, reads: [1, 1, 0], write: 2 }] },
      { deliveries: [['A', 1, 'B'], ['C', 1, 'B']], updates: [{ agent: 1, reads: [1, 1, 1], write: 2 }] },
      { deliveries: [['A', 2, 'C'], ['B', 1, 'C']], updates: [{ agent: 2, reads: [2, 1, 1], write: 2 }] }
    ];
  }
  function scheduleControls(s, t) { return group(t.scheduleLabel, 'schedule', [['sync', t.synchronous], ['sequential', t.sequential], ['async', t.asynchronous]], s.schedule) + '<div class="av-stepper"><button type="button" class="av-button av-button--quiet" data-av-action="previous">← ' + esc(t.previous) + '</button><output class="av-step-count" data-av-output="step"></output><button type="button" class="av-button av-button--quiet" data-av-action="next">' + esc(t.next) + ' →</button><button type="button" class="av-button av-reset" data-av-action="reset">' + esc(t.reset) + '</button></div>'; }
  function version(agent, value, stale, t) { return '<span class="av-version' + (stale ? ' av-version--stale' : '') + '"' + (stale ? ' title="' + esc(t.stale) + '"' : '') + '>' + (stale ? '<span class="av-sr-only">' + esc(t.stale) + ': </span>' : '') + agent + '<sup>' + value + '</sup>' + (stale ? '<span class="av-stale-mark" aria-hidden="true">†</span>' : '') + '</span>'; }
  function eventLabel(row, mode, i, t) {
    var label = (mode === 'sync' ? t.syncEvent : mode === 'sequential' ? t.sequentialEvent : t.asyncEvent) + ' ' + (i + 1);
    var detail = row.start ? t.start + ' ' + row.start : row.deliveries ? t.delivery + ' ' + row.deliveries.map(function (d) { return d[0] + d[1] + '→' + d[2]; }).join(' · ') : '';
    return '<strong>' + esc(label) + '</strong>' + (detail ? '<span>' + esc(detail) + '</span>' : '');
  }
  function updateCard(update, latest, t) {
    var agent = String.fromCharCode(65 + update.agent);
    return '<div class="av-update"><div class="av-write"><span>' + esc(t.writes) + '</span>' + version(agent, update.write, false, t) + '</div><div class="av-read"><span class="av-read-label">' + esc(t.reads) + '</span><div>' + update.reads.map(function (v, i) { return version(String.fromCharCode(65 + i), v, v < latest[i], t); }).join(' ') + '</div></div></div>';
  }
  function scheduleView(s, t) {
    var rows = scheduleData(s.schedule), latest = [0, 0, 0], current = [0, 0, 0];
    var grid = '<div class="av-schedule-grid" role="table" aria-label="' + esc(t.scheduleTitle) + '"><div class="av-schedule-row av-schedule-header" role="row"><div role="columnheader">' + esc(t.event) + '</div><div role="columnheader">Agent A</div><div role="columnheader">Agent B</div><div role="columnheader">Agent C</div></div>';
    var mobile = '<ol class="av-schedule-mobile">';
    rows.forEach(function (row, i) {
      var status = s.step === i + 1 ? ' is-current' : s.step > i + 1 ? ' is-complete' : ' is-future';
      var contents = row.updates.map(function (update) { return updateCard(update, latest, t); });
      grid += '<div class="av-schedule-row' + status + '" role="row"' + (s.step === i + 1 ? ' aria-current="step"' : '') + '><div class="av-event-label" role="rowheader">' + eventLabel(row, s.schedule, i, t) + '</div>';
      [0, 1, 2].forEach(function (agent) {
        var index = row.updates.findIndex(function (u) { return u.agent === agent; });
        grid += '<div role="cell">' + (index < 0 ? '<span class="av-no-update" aria-label="' + esc(t.noUpdate) + '">—</span>' : contents[index]) + '</div>';
      });
      grid += '</div>';
      mobile += '<li class="' + status + '"' + (s.step === i + 1 ? ' aria-current="step"' : '') + '><div class="av-event-label">' + eventLabel(row, s.schedule, i, t) + '</div><div class="av-mobile-updates">' + contents.join('') + '</div></li>';
      row.updates.forEach(function (update) { latest[update.agent] = update.write; if (i < s.step) current[update.agent] = update.write; });
    });
    grid += '</div>'; mobile += '</ol>';
    var explanation = s.schedule === 'sync' ? t.syncExplanation : s.schedule === 'sequential' ? t.sequentialExplanation : t.asyncExplanation;
    return p(explanation, 'av-explanation av-explanation--top') + '<div class="av-version-state"><span>' + esc(t.completed) + '</span><strong>' + current.map(function (v, i) { return version(String.fromCharCode(65 + i), v, false, t); }).join(' ') + '</strong></div>' + (s.step === 0 ? p(t.beforeStart, 'av-note') : '') + grid + mobile + p(t.staleExplanation, 'av-note') + p(t.scheduleBoundary, 'av-boundary');
  }

  function range(label, action, min, max, step, value, id) { return '<div class="av-range-control"><div><label for="' + id + '">' + esc(label) + '</label><output for="' + id + '" data-av-output="' + action + '">' + esc(value) + '</output></div><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" data-av-action="' + action + '"></div>'; }
  function correlationControls(s, t, id) { return '<div class="av-range-grid">' + range(t.population, 'population', 3, 15, 2, s.population, id + '-n') + range(t.correlation, 'rho', 0, 0.9, 0.05, s.rho, id + '-rho') + '</div>'; }
  function effective(n, rho) { return n / (1 + (n - 1) * rho); }
  function correlationView(s, t, id) {
    var neff = effective(s.population, s.rho), variance = 0.25 * 0.75 / neff;
    var metrics = '<div class="av-metrics"><div><span>' + esc(t.population) + '</span><strong>' + s.population + '</strong></div><div class="av-metric--accent"><span>' + esc(t.effective) + '</span><strong>' + number(neff, 2) + '</strong></div><div><span>' + esc(t.variance) + '</span><strong>' + number(variance, 5) + '</strong></div></div>';
    var sid = id + '-curve', x = function (n) { return 62 + (n - 3) / 12 * 604; }, y = function (v) { return 258 - v / 15 * 210; };
    var svg = svgStart(sid, t.correlationTitle, t.correlationIntro + ' ' + t.correlationBoundary, 314);
    [0, 5, 10, 15].forEach(function (v) { svg += '<line class="av-chart-grid" x1="62" x2="666" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="av-chart-tick" x="48" y="' + (y(v) + 5) + '" text-anchor="end">' + v + '</text>'; });
    svg += '<text class="av-chart-label" x="62" y="23">' + esc(t.chartY) + '</text>';
    var baseline = '', curve = '';
    for (var n = 3; n <= 15; n += 2) {
      baseline += (n === 3 ? 'M' : 'L') + x(n) + ' ' + y(n);
      curve += (n === 3 ? 'M' : 'L') + x(n) + ' ' + y(effective(n, s.rho));
      svg += '<text class="av-chart-tick" x="' + x(n) + '" y="283" text-anchor="middle">' + n + '</text>';
    }
    svg += '<path class="av-curve av-curve--baseline" d="' + baseline + '"/><path class="av-curve" d="' + curve + '"/><line class="av-selected-line" x1="' + x(s.population) + '" x2="' + x(s.population) + '" y1="' + y(neff) + '" y2="258"/><circle class="av-curve-point" cx="' + x(s.population) + '" cy="' + y(neff) + '" r="5"/><text class="av-chart-label" x="666" y="308" text-anchor="end">' + esc(t.chartX) + '</text></svg>';
    var chartLegend = '<div class="av-legend"><span><i class="av-line-key av-line-key--baseline"></i>N</span><span><i class="av-line-key av-line-key--purple"></i>N_eff</span></div>';
    var mobile = '<div class="av-correlation-mobile" aria-label="' + esc(t.valueAtN) + '">' + [3, 5, 7, 9, 11, 13, 15].map(function (n) { var value = effective(n, s.rho); return '<div class="av-small-bar' + (n === s.population ? ' is-selected' : '') + '"><span>N=' + n + '</span><div class="av-small-track"><i style="width:' + (n / 15 * 100) + '%"></i><b style="width:' + (value / 15 * 100) + '%"></b></div><strong>' + number(value, 2) + '</strong></div>'; }).join('') + '</div>';
    return metrics + chartLegend + '<div class="av-diagram av-diagram--curve">' + svg + '</div>' + mobile + '<div class="av-formula"><span>' + esc(t.correlationFormula) + '</span><code>Var(X̄) = p(1−p)/N · [1+(N−1)ρ]</code><code>N_eff = N / [1+(N−1)ρ]</code></div>' + p(t.correlationBoundary, 'av-boundary') + p(t.realizable, 'av-note');
  }

  var components = {
    topology: { title: 'topologyTitle', intro: 'topologyIntro', caption: 'topologyCaption', kicker: 'sketch', controls: topologyControls, view: topologyView },
    cost: { title: 'costTitle', intro: 'costIntro', caption: 'costCaption', kicker: 'model', controls: costControls, view: costView },
    schedule: { title: 'scheduleTitle', intro: 'scheduleIntro', caption: 'scheduleCaption', kicker: 'protocol', controls: scheduleControls, view: scheduleView },
    correlation: { title: 'correlationTitle', intro: 'correlationIntro', caption: 'correlationCaption', kicker: 'model', controls: correlationControls, view: correlationView }
  };
  function syncControls(element, state) {
    Array.prototype.forEach.call(element.querySelectorAll('button[data-av-value]'), function (button) {
      var action = button.getAttribute('data-av-action'), value = button.getAttribute('data-av-value');
      var selected = String(state[action]) === value;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
    });
    if (state.kind === 'schedule') {
      var max = scheduleData(state.schedule).length;
      element.querySelector('[data-av-action="previous"]').disabled = state.step === 0;
      element.querySelector('[data-av-action="next"]').disabled = state.step === max;
      element.querySelector('[data-av-action="reset"]').disabled = state.step === 0;
      element.querySelector('[data-av-output="step"]').textContent = state.step + ' / ' + max;
    }
    if (state.kind === 'correlation') {
      element.querySelector('[data-av-output="population"]').textContent = state.population;
      element.querySelector('[data-av-output="rho"]').textContent = state.rho.toFixed(2);
      element.querySelector('[data-av-action="rho"]').setAttribute('aria-valuetext', state.rho.toFixed(2));
    }
  }
  function render(element, announce) {
    var s = element._agentVizState, t = copy[language()], c = components[s.kind];
    var controlsKey = language() + ':' + s.kind + ':' + (s.kind === 'topology' ? s.mode : '');
    var focus = element.contains(document.activeElement) && document.activeElement.getAttribute ? { action: document.activeElement.getAttribute('data-av-action'), value: document.activeElement.getAttribute('data-av-value') } : null;
    element.querySelector('.av-heading').innerHTML = p(t[c.kicker], 'av-kicker') + p(t[c.title], 'av-title') + p(t[c.intro], 'av-intro');
    if (s.controlsKey !== controlsKey) {
      element.querySelector('.av-controls').innerHTML = c.controls(s, t, s.id);
      s.controlsKey = controlsKey;
      if (focus && focus.action) {
        var target = Array.prototype.find.call(element.querySelectorAll('[data-av-action]'), function (button) { return button.getAttribute('data-av-action') === focus.action && button.getAttribute('data-av-value') === focus.value; });
        if (target) target.focus({ preventScroll: true });
      }
    }
    element.querySelector('.av-view').innerHTML = c.view(s, t, s.id);
    element.querySelector('.av-caption').textContent = t[c.caption];
    syncControls(element, s);
    if (announce) element.querySelector('.av-announcer').textContent = s.kind === 'cost' ? 'N=' + s.n + ', R=' + s.rounds + ', ℓ=' + s.length + ', ' + (s.context === 'snapshot' ? t.snapshot : t.fullHistory) : s.kind === 'correlation' ? 'N=' + s.population + ', ρ=' + s.rho.toFixed(2) + ', N_eff=' + number(effective(s.population, s.rho), 2) : s.kind === 'schedule' ? t.completed + ': ' + s.step + '/' + scheduleData(s.schedule).length : t[s.mode];
  }
  function initialise() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-viz]'), function (element) {
      var kind = element.getAttribute('data-viz');
      if (!components[kind] || element._agentVizState) return;
      var s = element._agentVizState = { kind: kind, id: 'agent-viz-' + (++serial), mode: 'pipeline', workers: 2, n: 5, rounds: 3, length: 256, context: 'snapshot', schedule: 'sync', step: 0, population: 7, rho: 0.2 };
      element.classList.add('agent-viz'); element.classList.add('agent-viz--' + kind);
      element.innerHTML = '<div class="av-heading"></div><div class="av-controls"></div><div class="av-view"></div><p class="av-caption"></p><div class="av-announcer av-sr-only" role="status" aria-live="polite" aria-atomic="true"></div>';
      element.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-av-action]');
        if (!button || !element.contains(button) || button.disabled) return;
        var action = button.getAttribute('data-av-action'), value = button.getAttribute('data-av-value');
        if (action === 'mode') s.mode = value;
        if (action === 'workers' || action === 'n' || action === 'rounds' || action === 'length') s[action] = Number(value);
        if (action === 'context') s.context = value;
        if (action === 'schedule') { s.schedule = value; s.step = 0; }
        if (action === 'previous') s.step = Math.max(0, s.step - 1);
        if (action === 'next') s.step = Math.min(scheduleData(s.schedule).length, s.step + 1);
        if (action === 'reset') s.step = 0;
        render(element, true);
        if (button.disabled && (action === 'previous' || action === 'next' || action === 'reset')) {
          var fallback = element.querySelector('[data-av-action="' + (s.step === 0 ? 'next' : 'previous') + '"]');
          if (fallback) fallback.focus({ preventScroll: true });
        }
      });
      element.addEventListener('input', function (event) {
        var input = event.target;
        if (input.getAttribute('data-av-action') === 'population') s.population = Number(input.value);
        else if (input.getAttribute('data-av-action') === 'rho') s.rho = Number(input.value);
        else return;
        render(element, false); // Keep the input element in place throughout a pointer drag.
      });
      element.addEventListener('change', function (event) { if (event.target.matches('input[type="range"]')) render(element, true); });
      element.addEventListener('keydown', function (event) {
        var groupElement = event.target.closest('.av-switch');
        if (!groupElement || !/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End)$/.test(event.key)) return;
        var options = Array.prototype.slice.call(groupElement.querySelectorAll('button:not([disabled])')), index = options.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        var next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (/ArrowRight|ArrowDown/.test(event.key) ? 1 : -1) + options.length) % options.length;
        options[next].focus(); options[next].click();
      });
      render(element, false);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise); else initialise();
  new MutationObserver(function () { Array.prototype.forEach.call(document.querySelectorAll('.agent-viz'), function (element) { if (element._agentVizState) render(element, false); }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.AgentArticleViz = { init: initialise };
})();
