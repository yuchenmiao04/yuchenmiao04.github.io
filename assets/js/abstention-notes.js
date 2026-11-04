/* A constructed teaching example, not a model evaluation or a live experiment. */
(function () {
  "use strict";

  const WARRANTED_STEP = 2;
  const LAST_STEP = 7;
  const copy = {
    en: {
      name: "Stopping-time teaching example",
      disclaimer: "Illustrative trajectory · sufficient evidence first arrives at turn 2.",
      evidence: "w = earliest warranted stop",
      actual: "τ = actual stop",
      turn: "Turn",
      slider: "Actual abstention turn, τ",
      outcome: "Outcome",
      stop: "Stop turn",
      never: "No stop",
      timeline: "Seven-turn reference timeline",
      earliest: "earliest warranted stop",
      stopped: "actual stop",
      early: "Early",
      timely: "Timely",
      delayed: "Delayed",
      missed: "Missed",
      details: {
        early: "τ < w: stopped before sufficient evidence. SPL = 0.00.",
        timely: "τ = w: stopped as soon as warranted. SPL = 2 / 2 = 1.00.",
        delayed: (step, score) => "τ > w: stopped after " + (step - WARRANTED_STEP) + " extra turn(s). SPL = 2 / " + step + " = " + score + ".",
        missed: "No abstention within the seven-turn budget. SPL = 0.00."
      }
    },
    zh: {
      name: "停止时机教学算例",
      disclaimer: "教学示例 · 第 2 轮首次获得充分的弃权依据。",
      evidence: "w = 最早已有充分依据的轮次",
      actual: "τ = 实际弃权轮次",
      turn: "轮次",
      slider: "实际弃权轮次 τ",
      outcome: "状态",
      stop: "弃权轮次",
      never: "未弃权",
      timeline: "七轮参考时间轴",
      earliest: "最早已有充分弃权依据",
      stopped: "实际弃权",
      early: "过早",
      timely: "及时",
      delayed: "延迟",
      missed: "未弃权",
      details: {
        early: "τ < w：证据尚不足就停止。SPL = 0.00。",
        timely: "τ = w：依据充分时立即停止。SPL = 2 / 2 = 1.00。",
        delayed: (step, score) => "τ > w：已有依据后又多走了 " + (step - WARRANTED_STEP) + " 轮。SPL = 2 / " + step + " = " + score + "。",
        missed: "七轮预算内始终没有弃权。SPL = 0.00。"
      }
    }
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function metric(label) {
    const wrapper = element("div", "stop-result-metric");
    const value = element("strong", "stop-result-value");
    wrapper.append(element("span", "stop-result-label", label), value);
    return { wrapper: wrapper, value: value };
  }

  function initialize(demo, index) {
    if (demo.dataset.stopReady === "true") return;
    const timeline = demo.querySelector("[data-timeline]");
    const slider = demo.querySelector("[data-stop-step]");
    const never = demo.querySelector("[data-stop-never]");
    const result = demo.querySelector("[data-stop-result]");
    if (!timeline || !slider || !never || !result) return;

    const language = demo.dataset.lang || document.documentElement.lang || "en";
    const words = /^zh\b/i.test(language) ? copy.zh : copy.en;
    demo.dataset.stopReady = "true";
    demo.lang = words === copy.zh ? "zh-CN" : "en";
    demo.setAttribute("role", "group");
    demo.setAttribute("aria-label", words.name);

    const disclaimer = element("p", "stop-demo-disclaimer", words.disclaimer);
    let descriptionId = "stop-demo-context-" + (index + 1);
    while (document.getElementById(descriptionId)) descriptionId += "-example";
    disclaimer.id = descriptionId;
    const legend = element("div", "stop-timeline-legend");
    legend.append(element("span", "", words.evidence), element("span", "", words.actual));
    timeline.before(disclaimer, legend);
    timeline.setAttribute("role", "list");
    timeline.setAttribute("aria-label", words.timeline);
    timeline.replaceChildren();

    const cells = [];
    for (let step = 1; step <= LAST_STEP; step += 1) {
      const cell = element("div", "stop-timeline-cell");
      cell.setAttribute("role", "listitem");
      const labels = element("div", "stop-turn-markers");
      // Reserve the marker row in every cell so that moving τ never changes its height.
      if (step === WARRANTED_STEP) labels.append(element("span", "stop-marker", "w"));
      const stopMarker = element("span", "stop-marker", "τ");
      labels.append(stopMarker);
      cell.append(element("span", "stop-turn-label", words.turn), element("span", "stop-turn-number", String(step)), labels);
      timeline.append(cell);
      cells.push({ node: cell, marker: stopMarker, step: step });
    }

    slider.min = "1";
    slider.max = String(LAST_STEP);
    slider.step = "1";
    slider.setAttribute("aria-label", words.slider);
    const describedBy = slider.getAttribute("aria-describedby");
    slider.setAttribute("aria-describedby", (describedBy ? describedBy + " " : "") + descriptionId);
    const currentValue = element("output", "stop-step-value");
    currentValue.setAttribute("aria-hidden", "true");
    const control = slider.closest(".stop-control");
    if (control) control.append(currentValue);

    const metrics = element("div", "stop-result-metrics");
    const outcome = metric(words.outcome);
    const stop = metric(words.stop);
    const spl = metric("SPL");
    metrics.append(outcome.wrapper, stop.wrapper, spl.wrapper);
    const detail = element("p", "stop-result-detail");
    result.replaceChildren(metrics, detail);
    result.setAttribute("aria-live", "polite");
    result.setAttribute("aria-atomic", "true");

    function update() {
      const parsed = Number(slider.value);
      const step = Number.isFinite(parsed) ? Math.min(LAST_STEP, Math.max(1, Math.round(parsed))) : 5;
      slider.value = String(step);
      const missed = never.checked;
      const state = missed ? "missed" : step < WARRANTED_STEP ? "early" : step === WARRANTED_STEP ? "timely" : "delayed";
      const score = (!missed && step >= WARRANTED_STEP ? WARRANTED_STEP / step : 0).toFixed(2);

      slider.disabled = missed;
      slider.setAttribute("aria-valuetext", words.turn + " " + step + "; " + words[state]);
      currentValue.textContent = missed ? "τ = ∞" : "τ = " + step;
      demo.dataset.stopState = state;
      outcome.value.textContent = words[state];
      stop.value.textContent = missed ? "∞" : String(step);
      spl.value.textContent = score;
      detail.textContent = state === "delayed" ? words.details.delayed(step, score) : words.details[state];

      cells.forEach(function (cell) {
        const isStop = !missed && cell.step === step;
        const isWarranted = cell.step === WARRANTED_STEP;
        cell.node.classList.toggle("is-warranted", isWarranted);
        cell.node.classList.toggle("is-stop", isStop);
        cell.node.classList.toggle("is-early", isStop && state === "early");
        cell.marker.style.visibility = isStop ? "visible" : "hidden";
        if (isStop) cell.node.setAttribute("aria-current", "step");
        else cell.node.removeAttribute("aria-current");
        const description = [words.turn + " " + cell.step];
        if (isWarranted) description.push("w: " + words.earliest);
        if (isStop) description.push("τ: " + words.stopped);
        cell.node.setAttribute("aria-label", description.join("; "));
      });
    }

    slider.addEventListener("input", update);
    never.addEventListener("change", update);
    update();
  }

  function start() {
    document.querySelectorAll("[data-stop-demo]").forEach(initialize);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}());
