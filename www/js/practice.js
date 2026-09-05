/* ============================================================
   PRACTICE PLAYER — shared question player used by daily study, topic practice,
   recovery mode, revision test. Hints (3 levels), confidence, why-wrong,
   fatigue detection, timed mode, focus-mode layout.
   ============================================================ */
(function () {
  const { $, $$, esc, h, raw } = UI;

  /* opts: { title, questions, mode:'practice'|'timed'|'recovery'|'diagnostic', topic, onDone(results), askConfidence:boolean, perQuestionSec, beginner }
     results: { attempts:[{q,chosen,correct,timeSec,confidence,errorType}], correct, total, activeSec } */
  function run(opts) {
    const S = Store.get();
    const qs = opts.questions;
    if (!qs.length) { UI.toast("Is topic ke liye abhi questions nahi hain.", "error"); opts.onDone && opts.onDone(null); return; }
    let i = 0, chosen = null, hintLevel = 0, qStart = Date.now(), locked = false;
    const results = { attempts: [], correct: 0, total: qs.length };
    const act = UI.activeTimer();
    const root = document.createElement("div"); root.className = "focus"; root.setAttribute("role", "region"); root.setAttribute("aria-label", opts.title);
    document.body.appendChild(root);
    let tickIv = null;
    const perQ = opts.perQuestionSec || null;

    function q() { return qs[i]; }
    function header() {
      const pct = Math.round(i / qs.length * 100);
      return `<div class="top"><div><div class="label">${esc(opts.title)}</div><div class="small muted">Question ${i + 1} of ${qs.length}</div></div>
        <div class="row"><span class="timer" id="qtimer">00:00</span><button class="btn sm" id="pauseBtn" aria-label="Pause">⏸</button><button class="btn sm ghost" id="exitBtn" aria-label="Exit">✕</button></div></div>
        <div class="bar" aria-label="progress"><i style="width:${pct}%"></i></div>`;
    }
    function render() {
      const Q = q();
      const diffLabel = { EASY: "Easy", BEGINNER: "Beginner", SSC_LEVEL: "SSC level", HARD: "Hard" }[Q.difficulty];
      root.innerHTML = `<div class="inner">${header()}
        <div class="card"><div><span class="tag">${esc(TOPIC_MAP[Q.topic]?.name || Q.topic)}</span><span class="tag">${diffLabel}</span><span class="tag" title="Source">${Q.isCurrentAffairs ? "AI-compiled CA · " + esc(Q.eventDate) : "AI-generated practice"}</span></div>
        <div class="qtext" id="qtext">${esc(Q.question)}</div>
        <div class="opts" role="radiogroup" aria-labelledby="qtext">${Q.options.map((o, k) => `<button class="opt" role="radio" aria-checked="false" data-k="${k}"><span class="k">${"ABCD"[k]}</span><span>${esc(o)}</span></button>`).join("")}</div>
        <div id="hintArea"></div>
        <div class="row between spread"><button class="btn sm" id="hintBtn">💡 Hint ${hintLevel < 3 ? `(${hintLevel + 1}/3)` : ""}</button><button class="btn primary" id="lockBtn" disabled>Check answer</button></div>
        </div>
        <div id="feedback"></div>
        <p class="tiny muted">Keyboard: <span class="kbd">1</span>–<span class="kbd">4</span> select · <span class="kbd">Enter</span> check/next · <span class="kbd">H</span> hint</p>
      </div>`;
      $$(".opt", root).forEach(b => b.onclick = () => select(+b.dataset.k));
      $("#lockBtn", root).onclick = lock;
      $("#hintBtn", root).onclick = hint;
      $("#exitBtn", root).onclick = exit;
      $("#pauseBtn", root).onclick = pause;
      qStart = Date.now(); chosen = null; hintLevel = 0; locked = false;
      clearInterval(tickIv); tickIv = setInterval(tick, 500); tick();
    }
    function tick() {
      const el = $("#qtimer", root); if (!el) return;
      const t = (Date.now() - qStart) / 1000;
      if (perQ) { el.textContent = UI.fmt(perQ - t); el.classList.toggle("low", perQ - t < 10); if (t >= perQ && !locked) { UI.toast("Time up for this question — moving on.", "error"); lock(true); } }
      else { el.textContent = UI.fmt(t); if (t > (q().estimatedTime || 45) * 2 && !locked && !el.dataset.warned) { el.dataset.warned = 1; UI.toast("Kaafi time ho gaya. Exam mein aise question ko mark karke aage badho.", ""); } }
    }
    function select(k) { if (locked) return; chosen = k; $$(".opt", root).forEach(b => { b.classList.toggle("sel", +b.dataset.k === k); b.setAttribute("aria-checked", +b.dataset.k === k ? "true" : "false"); }); $("#lockBtn", root).disabled = false; }
    function hint() {
      const Q = q(); if (hintLevel >= 3) return;
      hintLevel++;
      const lesson = LESSONS[Q.topic] || {};
      const texts = [
        "Hint 1 (direction): " + (lesson.concept ? lesson.concept.split(". ")[0] + "." : "Pehle question ka main keyword pehchano."),
        "Hint 2 (next step): " + (lesson.formula ? lesson.formula.split(". ")[0] + "." : "Options ko eliminate karo — 2 options clearly galat honge."),
        "Hint 3 (strong): " + (lesson.shortcut || Q.explanation.split(".")[0] + ".")
      ];
      $("#hintArea", root).innerHTML = texts.slice(0, hintLevel).map(t => `<div class="hint small">${esc(t)}</div>`).join("");
      $("#hintBtn", root).textContent = `💡 Hint ${hintLevel < 3 ? `(${hintLevel + 1}/3)` : "(all shown)"}`;
    }
    function lock(timeout) {
      if (locked) return; locked = true; clearInterval(tickIv);
      const Q = q(); const timeSec = (Date.now() - qStart) / 1000;
      const proceed = (confidence) => {
        const correct = chosen === Q.correct;
        let res;
        if (opts.mode !== "diagnostic") res = Engine.recordAttempt(S, Q, chosen == null ? -1 : chosen, timeSec, confidence, opts.mode === "timed" ? "timed" : opts.mode);
        else res = { correct, errorType: correct ? null : Engine.classifyError(Q, chosen, timeSec, confidence, null) };
        results.attempts.push({ q: Q, chosen, correct, timeSec: Math.round(timeSec), confidence, errorType: res.errorType, hintsUsed: hintLevel });
        if (correct) results.correct++;
        Store.save();
        showFeedback(Q, correct, res, timeSec, timeout);
      };
      $$(".opt", root).forEach(b => { b.disabled = true; });
      $("#lockBtn", root).disabled = true;
      if (opts.askConfidence && chosen != null && !timeout) askConfidence(proceed); else proceed(null);
    }
    function askConfidence(cb) {
      const m = UI.modal(`<h3>How confident were you?</h3><div class="choice">${[["guess", "Guess"], ["low", "Low"], ["medium", "Medium"], ["high", "High"]].map(([v, l]) => `<button data-c="${v}">${l}</button>`).join("")}</div>`, { sticky: true });
      $$("[data-c]", m.el).forEach(b => b.onclick = () => { m.close(); cb(b.dataset.c); });
    }
    function showFeedback(Q, correct, res, timeSec, timeout) {
      $$(".opt", root).forEach(b => { const k = +b.dataset.k; if (k === Q.correct) b.classList.add("right"); else if (k === chosen) b.classList.add("wrong"); b.classList.remove("sel"); });
      const beginner = S.settings.beginnerMode;
      const head = correct ? (beginner ? "Sahi! 🎉" : "Correct") : timeout ? "Time up — let's see the method." : (beginner ? "Not quite. Chalo concept samajhte hain." : "Incorrect");
      const why = !correct && chosen != null ? `<p><b>Possible issue:</b> ${esc(Engine.whyWrongMessage(Q, chosen))} <span class="tag">${esc(Engine.ERROR_LABELS[res.errorType] || "")}</span></p>` : "";
      const wrongOpts = Q.options.map((o, k) => k !== Q.correct ? `<li><b>${"ABCD"[k]}</b> ${esc(o)} — ${k === chosen ? "yahi common trap hai" : "doesn't satisfy the condition"}</li>` : "").join("");
      const fb = $("#feedback", root);
      fb.innerHTML = `<div class="card ${correct ? "ok" : "bad"}"><h3>${head}</h3>
        <p><b>Answer:</b> ${"ABCD"[Q.correct]}. ${esc(Q.options[Q.correct])}</p>
        <p><b>Step-by-step:</b> ${esc(Q.explanation)}</p>
        ${Q.trap ? `<p><b>Common mistake:</b> ${esc(Q.trap)}</p>` : ""}
        ${why}
        <details><summary>Why other options are wrong</summary><ul class="small">${wrongOpts}</ul></details>
        <details><summary>Ask tutor about this</summary><p class="small">${esc((LESSONS[Q.topic] || {}).concept || "")}</p><p class="small"><a href="#lesson?topic=${Q.topic}" id="lessonLink">Open full lesson: ${esc(TOPIC_MAP[Q.topic]?.name || "")}</a></p></details>
        <div class="small muted">Time: ${Math.round(timeSec)}s · est ${Q.estimatedTime}s ${res.prevMastery && res.mastery !== res.prevMastery ? `· Mastery: ${UI.masteryLabel(res.prevMastery)} → <b>${UI.masteryLabel(res.mastery)}</b>` : ""}</div>
        <div class="sticky-bottom"><button class="btn primary big" id="nextBtn">${i + 1 < qs.length ? "Next question →" : "Finish"}</button></div></div>`;
      $("#nextBtn", root).onclick = next; $("#nextBtn", root).focus();
      const lk = $("#lessonLink", root); if (lk) lk.onclick = () => { exit(true); };
      const fat = Engine.fatigueCheck(results.attempts.map(a => ({ correct: a.correct, timeSec: a.timeSec, errorType: a.errorType })));
      if (fat && !results.fatigueShown) { results.fatigueShown = true; UI.toast(fat, ""); }
      fb.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function next() { i++; if (i >= qs.length) finish(); else render(); }
    function pause() {
      clearInterval(tickIv); const paused = Date.now();
      const m = UI.modal(`<h3>Paused</h3><p class="muted">Timer stopped. Idle time is not counted as study time.</p><button class="btn primary big" id="resume">Resume</button>`, { sticky: true });
      $("#resume", m.el).onclick = () => { qStart += Date.now() - paused; m.close(); tickIv = setInterval(tick, 500); };
    }
    async function exit(silent) {
      if (!silent && results.attempts.length < qs.length) { const ok = await UI.confirm("Exit now? Answered questions are saved; remaining will be skipped.", "Exit"); if (!ok) return; }
      finish(true);
    }
    function finish(early) {
      clearInterval(tickIv); results.activeSec = act.stop(); document.removeEventListener("keydown", keys);
      root.remove();
      results.early = !!early;
      opts.onDone && opts.onDone(results);
    }
    function keys(e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (["1", "2", "3", "4"].includes(e.key)) select(+e.key - 1);
      else if (e.key === "Enter") { if (!locked) { if (chosen != null) lock(); } else { const n = $("#nextBtn", root); n && n.click(); } }
      else if (e.key.toLowerCase() === "h" && !locked) hint();
    }
    document.addEventListener("keydown", keys);
    render();
  }

  /* Summary card after a set */
  function summaryHTML(results, extra) {
    if (!results) return "";
    const acc = results.total ? Math.round(results.correct / results.attempts.length * 100) : 0;
    const errs = {}; results.attempts.filter(a => !a.correct).forEach(a => errs[a.errorType] = (errs[a.errorType] || 0) + 1);
    const avgT = results.attempts.length ? Math.round(results.attempts.reduce((s, a) => s + a.timeSec, 0) / results.attempts.length) : 0;
    return `<div class="grid c2"><div class="stat"><div class="v">${results.correct}/${results.attempts.length}</div><div class="l">Correct</div></div><div class="stat"><div class="v">${acc}%</div><div class="l">Accuracy</div></div><div class="stat"><div class="v">${avgT}s</div><div class="l">Avg time / question</div></div><div class="stat"><div class="v">${UI.fmtH(results.activeSec || 0)}</div><div class="l">Active time</div></div></div>
      ${Object.keys(errs).length ? `<p class="small"><b>Error types:</b> ${Object.entries(errs).map(([k, v]) => `${Engine.ERROR_LABELS[k]} ×${v}`).join(", ")}</p>` : ""}${extra || ""}`;
  }

  window.Practice = { run, summaryHTML };
})();
