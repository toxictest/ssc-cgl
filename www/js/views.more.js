/* ============================================================
   VIEWS (more): revision, mistake book, vocab, recall, mocks, analytics, tutor, settings, pomodoro, practice hub
   ============================================================ */
(function () {
  const { $, $$, esc } = UI;
  const S = () => Store.get();

  /* ---------------- REVISION QUEUE ---------------- */
  UI.route("revision", (root, p) => {
    const st = S(); const q = Engine.revisionQueue(st);
    const only = p.only;
    root.innerHTML = `<div class="topbar"><h1>Today's Revision</h1><span class="pill">${q.total} due</span></div>
    ${q.total === 0 ? `<div class="card"><div class="emptystate"><div class="ic">✅</div><p>Nothing due today. Revision auto-schedules after practice (Day 1 → 3 → 7 → 14 → 30 → 60).</p><a class="btn" href="#recall">Do a blind recall test anyway</a></div></div>` : ""}
    ${q.mistakes.length ? `<div class="card"><h3>📕 Mistakes due (${q.mistakes.length})</h3><p class="small muted">Sabse pehle — repeated mistakes highest priority.</p><button class="btn primary" id="revMist">Re-attempt ${Math.min(q.mistakes.length, 10)} mistake questions</button></div>` : ""}
    ${q.topics.length && only !== "mistakes" ? `<div class="card"><h3>🔁 Topics due (${q.topics.length})</h3>${q.topics.slice(0, 8).map(t => `<div class="task"><div class="n">↻</div><div style="flex:1"><div class="t">${esc(t.name)}</div><div class="meta">${esc(UI.subjName(t.subject))} · due ${t.due}</div></div><div class="act"><button class="btn sm primary" data-rev="${t.id}">5 Q</button><button class="btn sm ghost" data-post="${t.id}">Postpone</button></div></div>`).join("")}</div>` : ""}
    ${q.vocab.length && only !== "mistakes" ? `<div class="card"><h3>🔤 Words due (${q.vocab.length})</h3><a class="btn primary" href="#vocab?n=${Math.min(15, q.vocab.length)}">Review words</a></div>` : ""}
    <p class="small muted">Smart revision prioritizes: forgotten concepts → repeated mistakes → high-weight weak topics → recently learned → declining accuracy. Not "revise everything".</p>`;
    const done = (res) => { if (p.fromPlan) window.completePlanTask("_afterRevision", res); UI.render(); };
    const rm = $("#revMist", root); if (rm) rm.onclick = () => { const ids = q.mistakes.slice(0, 10).map(m => st.mistakes.find(x => x.id === m.id).qid); const qs = ids.map(id => QUESTIONS.find(x => x.id === id)).filter(Boolean); Practice.run({ title: "Mistake revision", questions: qs, mode: "revision", onDone: res => { if (res) res.attempts.forEach(a => { const m = st.mistakes.find(x => x.qid === a.q.id); if (m) { m.reviews++; if (a.correct) { m.nextReview = Engine.addDays(Store.today(), m.reviews >= 3 ? 14 : m.reviews === 2 ? 7 : 3); if (m.reviews >= 3 && m.repeatCount <= 1) m.resolved = true; } else { m.nextReview = Engine.addDays(Store.today(), 1); } } }); Store.save(); done(res); } }); };
    $$("[data-rev]", root).forEach(b => b.onclick = () => { const id = b.dataset.rev; Practice.run({ title: "Revision: " + TOPIC_MAP[id].name, questions: Engine.pickQuestions(st, QUESTIONS, id, 5), mode: "revision", onDone: res => { if (res) Engine.markRevised(st, id, res.correct / Math.max(1, res.attempts.length) >= 0.6); Store.save(); done(res); } }); });
    $$("[data-post]", root).forEach(b => b.onclick = () => { const ts = st.topics[b.dataset.post]; ts.nextReview = Engine.addDays(Store.today(), 1); Store.save(); UI.toast("Postponed to tomorrow.", ""); UI.render(); });
  });

  /* ---------------- MISTAKE BOOK ---------------- */
  UI.route("mistakes", (root, p) => {
    const st = S(); const f = p.filter || "open"; const search = (p.q || "").toLowerCase();
    let list = st.mistakes.slice().reverse();
    if (f === "open") list = list.filter(m => !m.resolved); if (f === "repeated") list = list.filter(m => m.repeatCount > 1); if (f === "careless") list = list.filter(m => m.errorType === "CARELESS_MISTAKE"); if (f === "concept") list = list.filter(m => m.errorType === "CONCEPT_ERROR");
    if (p.subject) list = list.filter(m => m.subject === p.subject);
    if (search) list = list.filter(m => (m.question + " " + TOPIC_MAP[m.topic].name).toLowerCase().includes(search));
    const pat = Engine.errorPattern(st, 14);
    root.innerHTML = `<div class="topbar"><h1>My Mistake Book</h1><span class="pill">${st.mistakes.filter(m => !m.resolved).length} open</span></div>
    ${pat.length ? `<div class="card soft"><b>Your current error pattern (14 days):</b> ${pat.slice(0, 3).map(x => `${x.label} ×${x.count}`).join(" · ")}. ${pat[0] && pat[0].type === "CARELESS_MISTAKE" ? "Tip: answer lock karne se pehle question ki last line dobara padho." : pat[0] && pat[0].type === "CONCEPT_ERROR" ? "Tip: in topics ke lessons ko dobara dekho — recovery mode auto-activate hoga." : ""}</div>` : ""}
    <div class="row"><input id="srch" placeholder="Search question or topic…" value="${esc(p.q || "")}" style="max-width:320px"><select id="filt">${[["open", "Open"], ["all", "All"], ["repeated", "Repeated"], ["careless", "Careless"], ["concept", "Concept"]].map(([v, l]) => `<option value="${v}" ${f === v ? "selected" : ""}>${l}</option>`).join("")}</select><select id="subj"><option value="">All subjects</option>${SUBJECTS.map(s => `<option value="${s.id}" ${p.subject === s.id ? "selected" : ""}>${esc(s.short)}</option>`).join("")}</select></div>
    ${list.length ? list.slice(0, 60).map(m => `<div class="card"><div class="row between"><span class="tag">${esc(TOPIC_MAP[m.topic].name)}</span><span class="pill ${m.errorType === "CARELESS_MISTAKE" ? "warn" : "bad"}">${esc(Engine.ERROR_LABELS[m.errorType])}</span></div><p><b>${esc(m.question)}</b></p><p class="small">Your answer: <span style="color:var(--bad)">${esc(m.studentAnswer)}</span> · Correct: <span style="color:var(--ok)">${esc(m.correctAnswer)}</span></p><p class="small"><b>Why:</b> ${esc(m.reason)}</p><details><summary>Correct concept</summary><p class="small">${esc(m.concept)}</p></details><div class="row between small muted"><span>Repeated ×${m.repeatCount} · reviews ${m.reviews} · next ${m.nextReview}${m.resolved ? " · <b>resolved</b>" : ""}</span><div><button class="btn sm" data-retry="${m.qid}">Retry</button>${!m.resolved ? `<button class="btn sm ghost" data-res="${m.id}">Mark resolved</button>` : ""}</div></div></div>`).join("") : `<div class="card"><div class="emptystate"><div class="ic">📕</div><p>${st.mistakes.length ? "No mistakes match this filter." : "Abhi koi mistake nahi. Jaise hi koi question galat hoga, yahan uska reason, concept aur revision date aa jaayegi."}</p></div></div>`}
    <div class="row"><button class="btn sm" id="exp">Export CSV</button></div>`;
    const nav = () => UI.go("mistakes", { filter: $("#filt", root).value, subject: $("#subj", root).value, q: $("#srch", root).value }, true);
    $("#filt", root).onchange = nav; $("#subj", root).onchange = nav; $("#srch", root).oninput = () => { clearTimeout(root._t); root._t = setTimeout(nav, 300); };
    $$("[data-retry]", root).forEach(b => b.onclick = () => { const q = QUESTIONS.find(x => x.id === b.dataset.retry); if (q) Practice.run({ title: "Retry", questions: [q], mode: "revision", onDone: () => UI.render() }); });
    $$("[data-res]", root).forEach(b => b.onclick = () => { const m = st.mistakes.find(x => x.id === b.dataset.res); m.resolved = true; Store.save(); UI.render(); });
    $("#exp", root).onclick = () => UI.download("mistake-book.csv", Store.exportMistakesCSV(), "text/csv");
  });

  /* ---------------- VOCAB (SRS) ---------------- */
  UI.route("vocab", (root, p) => {
    const st = S(); const n = +p.n || 10; const today = Store.today();
    const due = VOCAB.filter(v => st.vocab[v[0]] && st.vocab[v[0]].nextReview <= today);
    const fresh = VOCAB.filter(v => !st.vocab[v[0]]);
    const deck = [...due, ...fresh].slice(0, n);
    let i = 0, flipped = false; const results = { attempts: [], correct: 0, activeSec: 0 }; const act = UI.activeTimer();
    function draw() {
      if (i >= deck.length) { results.activeSec = act.stop(); if (p.fromPlan) window.completePlanTask("_afterVocab", results, `${deck.length} words reviewed`); root.innerHTML = `<div class="card ok"><h3>Vocabulary done ✅</h3><p>${deck.length} words reviewed. ${results.correct} marked "knew it".</p><a class="btn primary" href="#${p.fromPlan ? "today" : "vocab"}">Continue</a></div>`; return; }
      const [w, mean, hi, sent, syn, ant, trick] = deck[i]; const v = st.vocab[w];
      root.innerHTML = `<div class="topbar"><h1>Vocabulary</h1><span class="pill">${i + 1}/${deck.length}</span></div>
      <div class="card" style="text-align:center;min-height:200px"><div class="label">${v ? `Seen ${v.seen}× · interval ${v.interval}d` : "New word"}</div><h1 style="font-size:2rem">${esc(w)}</h1>
      ${flipped ? `<p><b>${esc(mean)}</b> · <span lang="hi">${esc(hi)}</span></p><p class="small">"${esc(sent)}"</p><p class="small">Synonym: ${esc(syn)} · Antonym: ${esc(ant)}</p><p class="small muted">Memory trick: ${esc(trick)}</p>` : `<p class="muted">Pehle khud yaad karo: meaning kya hai?</p><button class="btn primary" id="flip">Show meaning</button>`}</div>
      ${flipped ? `<div class="choice"><button data-q="0">Forgot</button><button data-q="1">Hard</button><button data-q="2">Knew it</button></div>` : ""}`;
      const fl = $("#flip", root); if (fl) fl.onclick = () => { flipped = true; draw(); };
      $$("[data-q]", root).forEach(b => b.onclick = () => { Engine.reviewVocab(st, w, +b.dataset.q); results.attempts.push({ correct: +b.dataset.q === 2 }); if (+b.dataset.q === 2) results.correct++; Store.save(); i++; flipped = false; draw(); });
    }
    draw();
  });

  /* ---------------- ACTIVE RECALL / BLIND REVISION ---------------- */
  UI.route("recall", (root, p) => {
    const st = S();
    const studied = Object.keys(st.topics).filter(id => st.topics[id].attempts >= 3 && LESSONS[id]);
    const pool = (studied.length ? studied : ["percentage", "tenses", "series", "polity"]).slice();
    const items = Engine.shuffle(pool).slice(0, 6).map(id => ({ id, prompt: `Without looking at notes: ${TOPIC_MAP[id].name} ka main formula/rule kya hai?`, answer: (LESSONS[id].formula || LESSONS[id].concept || "").split(". ").slice(0, 2).join(". ") + "." }));
    let i = 0, shown = false; const res = { attempts: [], correct: 0, activeSec: 0 }; const act = UI.activeTimer();
    function draw() {
      if (i >= items.length) { res.activeSec = act.stop(); if (p.fromPlan) window.completePlanTask("_afterRecall", res, `${res.correct}/${items.length} recalled`); root.innerHTML = `<div class="card ok"><h3>Recall session done</h3><p>${res.correct}/${items.length} recalled correctly. Jo yaad nahi aaye, unki revision kal aayegi.</p><a class="btn primary" href="#${p.fromPlan ? "today" : "home"}">Continue</a></div>`; return; }
      const it = items[i];
      root.innerHTML = `<div class="topbar"><h1>Blind Recall</h1><span class="pill">${i + 1}/${items.length}</span></div><div class="card"><div class="label">${esc(UI.subjName(TOPIC_MAP[it.id].subject))}</div><p style="font-size:1.1rem"><b>${esc(it.prompt)}</b></p><textarea rows="3" placeholder="Apne words mein likho (optional)"></textarea>${shown ? `<div class="card soft"><b>Reference:</b> ${esc(it.answer)}</div><div class="choice"><button data-r="0">Yaad nahi tha</button><button data-r="1">Yaad tha ✓</button></div>` : `<button class="btn primary spread" id="show">Show answer</button>`}</div>`;
      const s = $("#show", root); if (s) s.onclick = () => { shown = true; draw(); };
      $$("[data-r]", root).forEach(b => b.onclick = () => { const ok = b.dataset.r === "1"; res.attempts.push({ correct: ok }); if (ok) res.correct++; Engine.markRevised(st, it.id, ok); Store.save(); i++; shown = false; draw(); });
    }
    draw();
  });

  /* ---------------- MOCKS ---------------- */
  UI.route("mocks", (root) => {
    const st = S();
    root.innerHTML = `<div class="topbar"><h1>Mock Tests</h1></div>
    <div class="card"><h3>Start a test</h3><div class="grid c2">
      <button class="btn" data-mock="full">🧪 Full mock (100 Q, 60 min)</button><button class="btn" data-mock="small">Mini full mock (40 Q, 24 min)</button>
      <button class="btn" data-mock="subject">Subject mock (25 Q)</button><button class="btn" data-mock="topic">Topic test (10 Q)</button>
      <button class="btn" data-mock="weak">Weak-topic test</button><button class="btn" data-mock="speed">Speed test (20 easy, 10 min)</button>
      <button class="btn" data-mock="revision">Revision test (your mistakes)</button><button class="btn" data-mock="pressure">Exam pressure simulator</button></div>
      <p class="small muted">Marking (Tier-I): +${EXAM_CONFIG.tiers[0].marksPerQuestion} / −${EXAM_CONFIG.tiers[0].negativeMarking}. <span class="pill">Verify latest notification</span> Questions are AI-generated practice, not official papers.</p></div>
    <div class="card"><h3>History</h3>${st.mocks.length ? st.mocks.slice().reverse().map(m => `<div class="task"><div class="n">${m.score}</div><div style="flex:1"><div class="t">${esc(m.title)}</div><div class="meta">${m.date} · ${m.score}/${m.maxScore} · acc ${m.accuracy}% · attempt ${m.attemptRate}%</div></div><div class="act"><a class="btn sm" href="#mockresult?id=${m.id}">Analysis</a></div></div>`).join("") : `<div class="emptystate"><div class="ic">🧪</div><p>No mocks yet. Beginner tip: pehle 2–3 weeks foundation, phir mini mock se shuru karo.</p></div>`}</div>`;
    $$("[data-mock]", root).forEach(b => b.onclick = () => launchMock(b.dataset.mock));
  });

  function launchMock(type) {
    const st = S();
    const start = (mock) => { if (!mock.questions.length) { UI.toast("Not enough questions for this test yet.", "error"); return; } runMock(mock); };
    if (type === "full") start(Mock.buildMock(st, QUESTIONS, "full"));
    else if (type === "small") start(Mock.buildMock(st, QUESTIONS, "full", { small: true }));
    else if (type === "pressure") { const m = Mock.buildMock(st, QUESTIONS, "full", { small: true, title: "Pressure simulator (40 Q, 20 min, no back-navigation)" }); m.durationMin = 20; m.pressure = true; start(m); }
    else if (type === "subject") { const m = UI.modal(`<h3>Choose subject</h3><div class="choice">${SUBJECTS.map(s => `<button data-s="${s.id}">${esc(s.name)}</button>`).join("")}</div>`); $$("[data-s]", m.el).forEach(b => b.onclick = () => { m.close(); start(Mock.buildMock(st, QUESTIONS, "subject", { subject: b.dataset.s })); }); }
    else if (type === "topic") { const m = UI.modal(`<h3>Choose topic</h3><select id="tp">${TOPICS.map(t => `<option value="${t.id}">${esc(UI.subjName(t.subject))} — ${esc(t.name)}</option>`).join("")}</select><button class="btn primary big spread" id="ok">Start</button>`); $("#ok", m.el).onclick = () => { const id = $("#tp", m.el).value; m.close(); start(Mock.buildMock(st, QUESTIONS, "topic", { topic: id })); }; }
    else start(Mock.buildMock(st, QUESTIONS, type));
  }

  function runMock(mock) {
    const st = S(); let i = 0; mock.startedAt = Date.now(); const end = mock.startedAt + mock.durationMin * 60000; let qStart = Date.now();
    const root = document.createElement("div"); root.className = "focus"; document.body.appendChild(root); let iv;
    const sections = [...new Set(mock.questions.map(q => q.section))];
    function draw() {
      const q = mock.questions[i]; mock.visited[i] = true;
      root.innerHTML = `<div class="inner"><div class="top"><div><div class="label">${esc(mock.title)}</div><div class="small muted">Q ${i + 1}/${mock.questions.length} · ${esc(UI.subjName(q.section))}</div></div><div class="row"><span class="timer" id="mt"></span><button class="btn sm" id="pal">Palette</button><button class="btn sm primary" id="submit">Submit</button></div></div>
      <div class="card"><div class="qtext">${esc(q.question)}</div><div class="opts">${q.options.map((o, k) => `<button class="opt ${mock.answers[i] === k ? "sel" : ""}" data-k="${k}"><span class="k">${"ABCD"[k]}</span><span>${esc(o)}</span></button>`).join("")}</div>
      <div class="row between"><div class="row"><button class="btn sm" id="clear">Clear</button><button class="btn sm ${mock.marked[i] ? "primary" : ""}" id="mark">${mock.marked[i] ? "Marked ★" : "Mark for review"}</button></div><div class="row">${mock.pressure ? "" : `<button class="btn sm" id="prev" ${i === 0 ? "disabled" : ""}>← Prev</button>`}<button class="btn sm primary" id="next">${i + 1 < mock.questions.length ? "Save & Next →" : "Save"}</button></div></div></div>
      <div class="small muted">Sections: ${sections.map(s => `<button class="btn sm ghost" data-sec="${s}">${esc(UI.subjName(s))}</button>`).join(" ")}</div></div>`;
      $$(".opt", root).forEach(b => b.onclick = () => { mock.answers[i] = +b.dataset.k; $$(".opt", root).forEach(x => x.classList.toggle("sel", x === b)); });
      $("#clear", root).onclick = () => { delete mock.answers[i]; $$(".opt", root).forEach(x => x.classList.remove("sel")); };
      $("#mark", root).onclick = () => { mock.marked[i] = !mock.marked[i]; draw(); };
      $("#next", root).onclick = () => { saveTime(); if (i + 1 < mock.questions.length) { i++; draw(); } else palette(); };
      const pv = $("#prev", root); if (pv) pv.onclick = () => { saveTime(); i--; draw(); };
      $("#pal", root).onclick = palette; $("#submit", root).onclick = submit;
      $$("[data-sec]", root).forEach(b => b.onclick = () => { if (mock.pressure) return UI.toast("Pressure mode: no section jumping.", ""); saveTime(); i = mock.questions.findIndex(q => q.section === b.dataset.sec); draw(); });
      qStart = Date.now(); tick();
    }
    function saveTime() { mock.times[i] = (mock.times[i] || 0) + (Date.now() - qStart) / 1000; qStart = Date.now(); }
    function tick() { const el = $("#mt", root); if (!el) return; const left = (end - Date.now()) / 1000; el.textContent = UI.fmt(left); el.classList.toggle("low", left < 300); if (left <= 0) { saveTime(); finish(); } }
    iv = setInterval(tick, 1000);
    function palette() {
      const m = UI.modal(`<h3>Question palette</h3><div class="legend"><span><i class="dot" style="background:var(--ok-bg);border:1px solid var(--ok)"></i>Answered</span><span><i class="dot" style="background:#f3e8ff;border:1px solid #9333ea"></i>Marked</span><span><i class="dot" style="background:var(--bad-bg)"></i>Visited, unanswered</span><span><i class="dot" style="background:#fff;border:1px solid #ccc"></i>Not visited</span></div><div class="palette spread">${mock.questions.map((q, k) => `<button data-j="${k}" class="${mock.answers[k] != null ? "ans" : mock.visited[k] ? "vis" : ""} ${mock.marked[k] ? "mk" : ""} ${k === i ? "cur" : ""}" aria-label="Question ${k + 1}${mock.answers[k] != null ? " answered" : ""}${mock.marked[k] ? " marked" : ""}">${k + 1}</button>`).join("")}</div><p class="small muted spread">Answered ${Object.keys(mock.answers).length} · Marked ${Object.values(mock.marked).filter(Boolean).length} · Unanswered ${mock.questions.length - Object.keys(mock.answers).length}</p><div class="row"><button class="btn" id="cl">Close</button><button class="btn primary" id="sb">Submit test</button></div>`);
      $$("[data-j]", m.el).forEach(b => b.onclick = () => { if (mock.pressure && +b.dataset.j < i) return UI.toast("Pressure mode: cannot go back.", ""); saveTime(); i = +b.dataset.j; m.close(); draw(); });
      $("#cl", m.el).onclick = m.close; $("#sb", m.el).onclick = () => { m.close(); submit(); };
    }
    async function submit() { saveTime(); const un = mock.questions.length - Object.keys(mock.answers).length; if (await UI.confirm(`Submit now? ${un} unanswered.`, "Submit")) finish(); }
    function finish() { clearInterval(iv); root.remove(); const rec = Mock.finish(st, mock); const fresh = Engine.checkAchievements(st); Engine.touchStreak(st); window.completePlanTask("_afterMock", null, `${rec.score}/${rec.maxScore}`); Store.save(true); fresh.forEach(a => UI.toast("🏅 " + a.name, "ok")); UI.go("mockresult", { id: rec.id }); }
    draw();
  }

  UI.route("mockresult", (root, p) => {
    const st = S(); const m = st.mocks.find(x => x.id === p.id); if (!m) { UI.go("mocks", null, true); return; }
    const A = m.analysis;
    const lossText = Object.entries(A.perSubjectLoss).map(([s, ts]) => `<li><b>${esc(UI.subjName(s))}:</b> ${ts.map(esc).join(" + ")}</li>`).join("");
    root.innerHTML = `<div class="topbar"><h1>Mock Analysis</h1><span class="pill">${m.date}</span></div>
    <div class="card hero"><div class="label" style="color:#c7d2fe">${esc(m.title)}</div><h1>${m.score} / ${m.maxScore}</h1><p class="muted">Accuracy ${A.accuracy}% · Attempted ${A.attempted}/${m.questionCount} (${A.attemptRate}%) · Correct ${A.correct} · Wrong ${A.wrong} · Skipped ${A.skipped} · Avg ${A.avgTimePerQ}s/Q</p></div>
    <div class="card"><h3>You lost marks mainly because:</h3>${lossText ? `<ul>${lossText}</ul>` : "<p>Very few losses — well done.</p>"}
    <h3>Subject performance</h3>${UI.barChart(Object.entries(A.bySubject).map(([s, v]) => ({ label: `${UI.subjName(s)} (${v.c}/${v.n})`, value: Math.round(v.c / v.n * 100), color: UI.subjColor(s) })), { max: 100, suffix: "%" })}
    <h3>Weakest topics in this mock</h3>${A.weakestTopics.map(w => `<div class="row between small"><a href="#lesson?topic=${w.topic}">${esc(TOPIC_MAP[w.topic].name)}</a><span>−${w.lost} marks (${w.wrong} wrong, ${w.skipped} skipped)</span></div>`).join("") || "<p class='small muted'>—</p>"}
    <p class="small"><b>Careless (fast + wrong):</b> ${A.careless.length} · <b>Too slow (&gt;2× est.):</b> ${A.slow.length}</p>
    <h3>Suggested strategy <span class="pill">AI recommendation</span></h3><ul class="small">${A.strategy.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
    <div class="card"><h3>Next 7-day recovery plan</h3>${m.recovery.map(d => `<div class="task"><div class="n">D${d.day}</div><div><div class="t">${esc(d.focus)}</div><div class="meta">${d.tasks.map(esc).join(" · ")}</div></div></div>`).join("")}<p class="small muted">Ye plan aapke daily planner mein weak-topic priority ke roop mein reflect hoga.</p></div>
    <details class="card"><summary>Review all questions</summary>${m.qids.map((id, k) => { const q = QUESTIONS.find(x => x.id === id); if (!q) return ""; const a = m.answers[k]; return `<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="small"><span class="tag">${k + 1}</span><span class="tag">${esc(TOPIC_MAP[q.topic].name)}</span> ${a == null ? "<span class='pill gray'>skipped</span>" : a === q.correct ? "<span class='pill ok'>correct</span>" : "<span class='pill bad'>wrong</span>"} · ${Math.round(m.times[k] || 0)}s</div><p><b>${esc(q.question)}</b></p><p class="small">Correct: ${esc(q.options[q.correct])}${a != null && a !== q.correct ? ` · Yours: ${esc(q.options[a])}` : ""}</p><p class="small muted">${esc(q.explanation)}</p></div>`; }).join("")}</details>
    <a class="btn primary big" href="#today">Back to today's plan</a>`;
  });

  /* ---------------- ANALYTICS ---------------- */
  UI.route("analytics", (root) => {
    const st = S(); const rs = Engine.readinessScore(st);
    const byDay = {}; st.attempts.forEach(a => { const d = a.date.slice(0, 10); byDay[d] = byDay[d] || { n: 0, c: 0 }; byDay[d].n++; if (a.correct) byDay[d].c++; });
    const days = Object.keys(byDay).sort().slice(-21);
    const accSeries = days.map(d => ({ x: d, y: Math.round(byDay[d].c / byDay[d].n * 100) }));
    const qSeries = days.map(d => ({ x: d, y: byDay[d].n }));
    const hrs = {}; st.sessions.forEach(s => hrs[s.date] = Math.round((s.activeSec || 0) / 60));
    const hSeries = days.map(d => ({ x: d, y: hrs[d] || 0 }));
    const subj = SUBJECTS.map(s => { const a = st.attempts.filter(x => x.subject === s.id); return { label: `${s.name} (${a.length})`, value: a.length ? Math.round(a.filter(x => x.correct).length / a.length * 100) : 0, color: s.color }; });
    const mockSeries = st.mocks.map(m => ({ x: m.date, y: Math.round(m.score / m.maxScore * 100) }));
    const cm = Engine.confidenceMatrix(st);
    const wk = Planner.weeklyReview(st); const mo = Planner.monthlyReport(st);
    const speed = Object.keys(st.topics).map(id => ({ id, sp: Engine.speedProfile(st, id) })).filter(x => x.sp);
    const groups = {}; speed.forEach(x => (groups[x.sp.label] = groups[x.sp.label] || []).push(TOPIC_MAP[x.id].name));
    const topicRows = Object.entries(st.topics).filter(([id, ts]) => ts.attempts > 0).map(([id, ts]) => ({ id, name: TOPIC_MAP[id].name, acc: Math.round(Engine.accuracy(ts) * 100), n: ts.attempts, m: ts.mastery, w: Engine.weaknessScore(st, id) })).sort((a, b) => (b.w || 0) - (a.w || 0));
    root.innerHTML = `<div class="topbar"><h1>Progress</h1></div>
    <div class="card"><div class="row between"><h3>Preparation Readiness Score</h3><b style="font-size:1.5rem">${rs.score}/100</b></div><div class="bar ${rs.score >= 70 ? "ok" : rs.score >= 40 ? "warn" : "bad"}"><i style="width:${rs.score}%"></i></div>
    <div class="grid c3 spread small"><div>Syllabus coverage: <b>${rs.parts.syllabus}%</b></div><div>Topics strong+: <b>${rs.parts.mastery}%</b></div><div>Recent accuracy: <b>${rs.parts.accuracy}%</b></div><div>Mock average: <b>${rs.parts.mocks}%</b></div><div>Speed index: <b>${rs.parts.speed}</b></div><div>Revision health: <b>${rs.parts.revision}%</b></div><div>Weak topics: <b>${rs.parts.weakTopics}</b></div><div>Repeated mistakes: <b>${rs.parts.repeatedMistakes}</b></div></div>
    <p class="small muted">Internal estimate to guide preparation. It is <b>not</b> an official SSC prediction or selection probability.</p></div>
    ${st.attempts.length < 5 ? `<div class="card"><div class="emptystate"><div class="ic">📈</div><p>Charts appear after a few practice sessions. Start today's study to build data.</p><a class="btn primary" href="#today">Start today</a></div></div>` : `
    <div class="card"><h3>Accuracy (daily, last 21 days)</h3>${UI.lineChart([{ name: "Accuracy %", color: "#2563eb", points: accSeries }], { max: 100, label: "accuracy" })}</div>
    <div class="grid c3"><div class="card"><h3>Questions per day</h3>${UI.lineChart([{ name: "Questions", color: "#16a34a", points: qSeries }], { label: "questions" })}</div><div class="card"><h3>Active minutes per day</h3>${UI.lineChart([{ name: "Minutes", color: "#9333ea", points: hSeries }], { label: "minutes" })}</div></div>
    <div class="card"><h3>Subject accuracy</h3>${UI.barChart(subj, { max: 100, suffix: "%" })}</div>
    ${mockSeries.length ? `<div class="card"><h3>Mock trend (% of max)</h3>${UI.lineChart([{ name: "Mock %", color: "#ea580c", points: mockSeries }], { max: 100 })}</div>` : ""}
    <div class="card"><h3>Speed vs accuracy</h3>${Object.keys(groups).length ? Object.entries(groups).map(([g, ts]) => `<p class="small"><b>${g}:</b> ${ts.map(esc).join(", ")}</p>`).join("") : "<p class='small muted'>Needs 5+ attempts per topic.</p>"}</div>
    <div class="card"><h3>Confidence vs performance</h3>${cm.total ? `<table><tr><th></th><th>Correct</th><th>Wrong</th></tr><tr><td>Confident</td><td>${cm.cc}</td><td>${cm.cw}</td></tr><tr><td>Unsure</td><td>${cm.uc}</td><td>${cm.uw}</td></tr></table>${cm.note ? `<p class="small">${esc(cm.note)}</p>` : ""}` : "<p class='small muted'>Answer confidence prompts to see this.</p>"}</div>
    <div class="card"><h3>Topic performance</h3><table><tr><th>Topic</th><th>Acc</th><th>N</th><th>Mastery</th></tr>${topicRows.slice(0, 40).map(r => `<tr><td><a href="#lesson?topic=${r.id}">${esc(r.name)}</a></td><td>${r.acc}%</td><td>${r.n}</td><td>${UI.masteryPill(r.m)}</td></tr>`).join("")}</table></div>
    <div class="card"><h3>Weekly review</h3><div class="grid c2 small"><div>Questions: <b>${wk.questions}</b> (prev ${wk.prevQuestions})</div><div>Accuracy: <b>${wk.accuracy ?? "—"}%</b></div><div>Hours: <b>${wk.hours}</b></div><div>Careless: <b>${wk.careless}</b> (prev ${wk.prevCareless})</div></div>
    <p class="small"><b>Learned:</b> ${wk.learned.map(t => esc(TOPIC_MAP[t].name)).join(", ") || "—"}</p><p class="small"><b>Forgot (declining):</b> ${wk.forgot.map(t => esc(TOPIC_MAP[t].name)).join(", ") || "—"}</p><p class="small"><b>Improved:</b> ${wk.improved.map(i => `${esc(TOPIC_MAP[i.topic].name)} ${i.from}→${i.to}%`).join(", ") || "—"}</p><p class="small"><b>Got worse:</b> ${wk.worse.map(i => `${esc(TOPIC_MAP[i.topic].name)} ${i.from}→${i.to}%`).join(", ") || "—"}</p><p class="small"><b>Top strong areas:</b> ${wk.strong.map(s => `${esc(TOPIC_MAP[s.topic].name)} ${s.acc}%`).join(", ") || "—"}</p><p class="small"><b>Next week's priorities:</b> ${wk.priorities.map(p => esc(p.name)).join(", ") || "Continue the learning path"}</p></div>
    <div class="card"><h3>Monthly report</h3><div class="grid c2 small"><div>Study hours: <b>${mo.hours}</b></div><div>Questions: <b>${mo.questions}</b></div><div>Accuracy: <b>${mo.accuracy ?? "—"}%</b></div><div>Mocks: <b>${mo.mocks}</b> (avg ${mo.avgMock ?? "—"})</div><div>Best subject: <b>${mo.best ? UI.subjName(mo.best.subject) + " " + mo.best.acc + "%" : "—"}</b></div><div>Weakest: <b>${mo.weakest ? UI.subjName(mo.weakest.subject) + " " + mo.weakest.acc + "%" : "—"}</b></div><div>Improvement (1st half→2nd): <b>${mo.improvement > 0 ? "+" : ""}${mo.improvement}%</b></div><div>Revision rate: <b>${mo.revisionRate}%</b></div></div><p class="small muted">New monthly strategy: planner recomputes priorities daily from this data.</p></div>
    <div class="card"><h3>Achievements</h3>${st.achievements.length ? st.achievements.map(a => `<span class="pill ok" style="margin:3px">🏅 ${esc(a.name)}</span>`).join("") : "<p class='small muted'>Earn badges by studying consistently — XP: " + st.xp + "</p>"}<p class="small muted">XP ${st.xp} · Best streak ${st.streak.best} days</p></div>`}`;
  });

  /* ---------------- AI TUTOR (rule-based, offline) ---------------- */
  UI.route("tutor", (root, p) => {
    const st = S(); st._tutor = st._tutor || [];
    const log = st._tutor;
    if (p.topic && !log.some(m => m.topic === p.topic && m.auto)) { log.push({ who: "bot", auto: true, topic: p.topic, html: tutorExplain(p.topic, "concept") }); }
    function draw() {
      root.innerHTML = `<div class="topbar"><h1>Tutor</h1><button class="btn sm" id="clr">Clear</button></div>
      <div class="card small muted">Offline rule-based tutor: ye lessons aur aapke data se jawab deta hai. Answers seedha nahi batata — pehle hint, phir method. Puchho: "Percentage samajh nahi aa raha", "ratio aur proportion mein difference", "main tense mein galti karta hoon", "kya padhun aaj".</div>
      <div id="chat">${log.length ? log.map(m => `<div class="card ${m.who === "me" ? "soft" : ""}" style="${m.who === "me" ? "margin-left:14%" : "margin-right:10%"}"><div class="label">${m.who === "me" ? "You" : "Tutor"}</div>${m.who === "me" ? esc(m.text) : m.html}</div>`).join("") : `<div class="emptystate"><div class="ic">🧑‍🏫</div><p>Kya samajh nahi aa raha? Neeche likho.</p></div>`}</div>
      <div class="row sticky-bottom"><input id="msg" placeholder="e.g. Percentage samajh nahi aa raha" aria-label="Message"><button class="btn primary" id="send">Send</button></div>
      <div class="row small">${["Percentage samajh nahi aa raha", "Ratio aur proportion mein difference kya hai?", "Main baar-baar tense mein mistake karta hoon", "Aaj kya padhun?", "Meri weakness kya hai?"].map(s => `<button class="btn sm ghost" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`;
      const send = () => { const v = $("#msg", root).value.trim(); if (!v) return; log.push({ who: "me", text: v }); log.push({ who: "bot", html: tutorReply(v) }); if (log.length > 40) log.splice(0, log.length - 40); Store.save(); draw(); window.scrollTo(0, document.body.scrollHeight); };
      $("#send", root).onclick = send; $("#msg", root).onkeydown = e => { if (e.key === "Enter") send(); };
      $$("[data-s]", root).forEach(b => b.onclick = () => { $("#msg", root).value = b.dataset.s; send(); });
      $("#clr", root).onclick = () => { st._tutor = []; Store.save(); UI.render(); };
      $$("[data-tq]", root).forEach(b => b.onclick = () => { const id = b.dataset.tq; Practice.run({ title: "Tutor practice: " + TOPIC_MAP[id].name, questions: Engine.pickQuestions(st, QUESTIONS, id, 4, { difficulty: "EASY" }), mode: "practice", onDone: r => { if (r) { log.push({ who: "bot", html: `<p>${r.correct}/${r.attempts.length} sahi. ${r.correct === r.attempts.length ? "Concept clear lag raha hai — kal revision mein milega." : "Chalo jahan galti hui use dobara dekhte hain — Mistake Book mein reason likha hai."}</p>` }); Store.save(); } UI.render(); } }); });
      $$("[data-check]", root).forEach(b => b.onclick = () => { const ok = b.dataset.check === "1"; log.push({ who: "bot", html: ok ? `<p>Sahi! ✅ Ab 4 easy questions try karo.</p><button class="btn sm primary" data-tq="${b.dataset.t}">Practice 4 Q</button>` : `<p>Not quite. ${esc((LESSONS[b.dataset.t] || {}).easyEx || "")} — dobara socho aur phir practice karo.</p><button class="btn sm primary" data-tq="${b.dataset.t}">Practice 4 Q</button>` }); Store.save(); draw(); });
    }
    draw();
  });

  function findTopic(text) {
    const t = text.toLowerCase();
    const alias = { percent: "percentage", pratishat: "percentage", ratio: "ratio", anupat: "ratio", average: "average", ausat: "average", profit: "profit_loss", loss: "profit_loss", "laabh": "profit_loss", discount: "discount", interest: "si", "compound": "ci", "time and work": "time_work", "work": "time_work", speed: "tsd", train: "tsd", boat: "boats", mixture: "mixture", algebra: "algebra", geometry: "geometry", triangle: "triangles", circle: "circles", mensuration: "mensuration", trigono: "trigonometry", "trig": "trigonometry", "data interpretation": "di", lcm: "lcm_hcf", hcf: "lcm_hcf", "number system": "number_system", bodmas: "simplification", simplif: "simplification", tense: "tenses", "subject verb": "sva", agreement: "sva", article: "articles", preposition: "prepositions", pronoun: "pronouns", vocab: "vocab", synonym: "synonyms", antonym: "antonyms", idiom: "idioms", "one word": "ows", spelling: "spelling", "error": "error_detection", voice: "active_passive", passive: "active_passive", narration: "narration", "indirect": "narration", "para jumble": "para_jumble", cloze: "cloze", comprehension: "rc", analogy: "analogy", series: "series", coding: "coding", "blood": "blood_relations", direction: "direction", syllogism: "syllogism", venn: "venn", "missing": "missing_number", calendar: "calendar", clock: "clock", mirror: "mirror_water", dice: "dice_cubes", polity: "polity", constitution: "polity", history: "history_modern", geography: "geography", economics: "economics", physics: "physics", chemistry: "chemistry", biology: "biology", "current affairs": "current_affairs" };
    for (const k of Object.keys(alias)) if (t.includes(k)) return alias[k];
    for (const tp of TOPICS) if (t.includes(tp.name.toLowerCase().split(" (")[0])) return tp.id;
    return null;
  }

  function tutorExplain(id, kind) {
    const L = LESSONS[id] || {}; const t = TOPIC_MAP[id]; const st = S(); const ts = st.topics[id];
    const acc = ts && ts.attempts ? Math.round(Engine.accuracy(ts) * 100) : null;
    const check = { percentage: ["25% ko fraction mein kaise likhenge?", "1/4"], ratio: ["₹100 ko 2:3 mein baanto — chhota hissa?", "40"], tenses: ["'I ___ (see) him yesterday' — saw ya have seen?", "saw"], average: ["10, 20, 30 ka average?", "20"], profit_loss: ["CP 100, SP 120 — profit %?", "20"], series: ["2, 4, 8, 16, ? ", "32"] }[id];
    return `<p><b>1. Problem:</b> ${esc(t.name)}${acc !== null ? ` — aapki accuracy abhi ${acc}% hai (${ts.attempts} attempts).` : " — abhi practice data nahi hai."}</p>
    <p><b>2. Simple explanation:</b> ${esc(L.what || "")}</p><p>${esc((L.concept || "").split(". ").slice(0, 2).join(". "))}.</p>
    <p><b>3. Example:</b> ${esc(L.easyEx || "")}</p>
    ${L.trap ? `<p><b>Yahan log galti karte hain:</b> ${esc(L.trap)}</p>` : ""}
    ${check ? `<p><b>4. Chhota check:</b> ${esc(check[0])}</p><div class="row"><button class="btn sm" data-check="1" data-t="${id}">Answer: ${esc(check[1])}</button><button class="btn sm" data-check="0" data-t="${id}">Kuch aur</button></div>` : `<p><b>4. Practice:</b></p><button class="btn sm primary" data-tq="${id}">4 easy questions</button>`}
    <p class="small"><a href="#lesson?topic=${id}">Full lesson →</a></p>`;
  }

  function tutorReply(text) {
    const st = S(); const t = text.toLowerCase();
    if (/difference|farak|vs|aur .* mein/.test(t) && /ratio/.test(t) && /proportion/.test(t)) return `<p><b>Ratio</b> = do quantities ki comparison (2:3 → pehla 2 hisse, doosra 3). <b>Proportion</b> = do ratios barabar hain (2:3 = 4:6 → "2, 3, 4, 6 are in proportion"; a:b :: c:d → ad = bc).</p><p>Ratio ek comparison hai; proportion ek <i>equation</i> hai do ratios ki.</p><p><b>Check:</b> 3:4 aur 9:x proportion mein hain — x? (Hint: 3 × x = 4 × 9)</p><button class="btn sm primary" data-tq="ratio">Practice 4 Q</button>`;
    if (/kya padhun|what.*study|aaj|today|next/.test(t)) { const plan = st.plans[Store.today()]; const nx = plan && plan.tasks.find(x => !x.done && !x.skipped); return nx ? `<p><b>Aaj:</b> ${esc(nx.title)} (${nx.minutes} min). ${esc(nx.why || "")}</p><a class="btn sm primary" href="#today">Open today's plan</a>` : `<p>Aaj ka plan complete hai ya bana nahi. <a href="#today">Today</a> kholo — wahan exactly next step milega.</p>`; }
    if (/weak|kamzor|weakness|galti|mistake/.test(t) && !findTopic(t)) { const w = Engine.weakTopics(st, 5); const pat = Engine.errorPattern(st, 14); return w.length ? `<p><b>Top weak topics:</b></p><ul>${w.map(x => `<li><a href="#lesson?topic=${x.id}">${esc(x.name)}</a> — weakness ${x.score}/100</li>`).join("")}</ul>${pat.length ? `<p><b>Error pattern:</b> ${pat.slice(0, 3).map(x => x.label + " ×" + x.count).join(", ")}</p>` : ""}<p>Recommendation: pehle #1 topic ka lesson + recovery.</p>` : `<p>Abhi enough data nahi (kam se kam 3 attempts per topic). Diagnostic ya today's practice karo, phir weakness dikhegi.</p>`; }
    if (/baar-baar|repeatedly|always|hamesha/.test(t) && findTopic(t)) { const id = findTopic(t); const d = Engine.diagnoseStruggle(st, id); const L = LESSONS[id] || {}; return `<p>Repeated mistakes in <b>${esc(TOPIC_MAP[id].name)}</b>. ${d.type !== "self" ? `Shayad problem yahan nahi — <b>${esc(TOPIC_MAP[d.topics[0]].name)}</b> ki foundation weak hai. Pehle woh.` : "Concept Recovery Mode use karte hain."}</p><p><b>Sabse common galti:</b> ${esc(L.trap || "")}</p><p><b>Rule yaad rakho:</b> ${esc((L.formula || "").split(". ")[0])}.</p><button class="btn sm primary" data-tq="${d.type !== "self" ? d.topics[0] : id}">Recovery practice (4 easy Q)</button>`; }
    const id = findTopic(t);
    if (id) return tutorExplain(id, "concept");
    if (/solve|kaise hoga|how/.test(t)) return `<p>Question yahan paste karo aur topic batao — main seedha answer nahi dunga, pehle <b>Hint 1</b> (direction) → <b>Hint 2</b> (next step) → <b>Hint 3</b> (shortcut) dunga. Practice screen mein 💡 Hint button bhi yahi karta hai.</p>`;
    return `<p>Main is topic ko pehchaan nahi paya. Topic ka naam likho (jaise "percentage", "tenses", "coding", "polity") ya puchho "aaj kya padhun?" / "meri weakness kya hai?".</p>`;
  }

  /* ---------------- PRACTICE HUB (browse by subject/topic) ---------------- */
  UI.route("practice", (root, p) => {
    const st = S(); const sub = p.subject || "math";
    root.innerHTML = `<div class="topbar"><h1>Practice</h1></div><div class="row">${SUBJECTS.map(s => `<a class="btn sm ${s.id === sub ? "primary" : ""}" href="#practice?subject=${s.id}">${esc(s.short)}</a>`).join("")}</div>
    <div class="card">${TOPICS.filter(t => t.subject === sub).sort((a, b) => a.order - b.order).map(t => { const n = QUESTIONS.filter(q => q.topic === t.id).length; const ts = st.topics[t.id]; return `<div class="task"><div class="n">${t.order}</div><div style="flex:1"><div class="t">${esc(t.name)}</div><div class="meta">${n} Q · ${ts && ts.attempts ? Math.round(Engine.accuracy(ts) * 100) + "% acc" : "not attempted"}</div></div><div class="act"><a class="btn sm" href="#lesson?topic=${t.id}">Lesson</a><button class="btn sm primary" data-p="${t.id}">Practice</button></div></div>`; }).join("")}</div>
    ${sub === "ga" ? `<div class="card"><h3>Current affairs (date-labelled)</h3><p class="small muted">In-app CA items are examples with event dates & sources; supplement with a monthly compilation. Filter:</p><div class="row">${[["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "3 months"], ["180", "6 months"], ["all", "All"]].map(([v, l]) => `<button class="btn sm ${(p.ca || "all") === v ? "primary" : ""}" data-ca="${v}">${l}</button>`).join("")}</div>${QUESTIONS.filter(q => q.isCurrentAffairs && ((p.ca || "all") === "all" || Engine.daysSince(q.eventDate) <= +(p.ca))).map(q => `<div class="small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="tag">${q.eventDate}</span><span class="tag">${esc(q.category)}</span> ${esc(q.question)} <i class="muted">— ${esc(q.source)}</i></div>`).join("") || "<p class='small muted'>No items in this range.</p>"}</div>` : ""}`;
    $$("[data-p]", root).forEach(b => b.onclick = () => { const id = b.dataset.p; Practice.run({ title: "Practice: " + TOPIC_MAP[id].name, questions: Engine.pickQuestions(st, QUESTIONS, id, 8), mode: "practice", askConfidence: true, onDone: () => UI.render() }); });
    $$("[data-ca]", root).forEach(b => b.onclick = () => UI.go("practice", { subject: "ga", ca: b.dataset.ca }, true));
  });

  /* ---------------- POMODORO ---------------- */
  UI.route("pomodoro", (root) => {
    const st = S(); const presets = { "25/5": [25, 5], "50/10": [50, 10], "90/15": [90, 15] };
    let [work, brk] = presets[st.settings.pomodoro] || [25, 5]; let mode = "work", left = work * 60, running = false, iv, act = null;
    function draw() { root.innerHTML = `<div class="topbar"><h1>Pomodoro</h1></div><div class="card" style="text-align:center"><div class="label">${mode === "work" ? "Focus" : "Break"}</div><div class="timer" style="font-size:3.2rem">${UI.fmt(left)}</div><div class="row" style="justify-content:center"><button class="btn primary" id="tog">${running ? "Pause" : "Start"}</button><button class="btn" id="rst">Reset</button><button class="btn" id="sw">Switch to ${mode === "work" ? "break" : "work"}</button></div><div class="row spread" style="justify-content:center">${Object.keys(presets).map(k => `<button class="btn sm ${st.settings.pomodoro === k ? "primary" : ""}" data-pre="${k}">${k}</button>`).join("")}<input type="number" id="cust" min="5" max="180" placeholder="custom min" style="width:120px"></div><p class="small muted">Actual active time (not idle) is added to today's study hours when you pause/finish a focus block.</p></div>`;
      $("#tog", root).onclick = () => { running = !running; if (running) { act = UI.activeTimer(); iv = setInterval(() => { left--; const el = $(".timer", root); if (el) el.textContent = UI.fmt(left); if (left <= 0) { finishBlock(); } }, 1000); } else { clearInterval(iv); bank(); } draw(); };
      $("#rst", root).onclick = () => { clearInterval(iv); running = false; bank(); left = (mode === "work" ? work : brk) * 60; draw(); };
      $("#sw", root).onclick = () => { clearInterval(iv); running = false; bank(); mode = mode === "work" ? "break" : "work"; left = (mode === "work" ? work : brk) * 60; draw(); };
      $$("[data-pre]", root).forEach(b => b.onclick = () => { st.settings.pomodoro = b.dataset.pre; [work, brk] = presets[b.dataset.pre]; left = work * 60; mode = "work"; Store.save(); draw(); });
      $("#cust", root).onchange = e => { const v = +e.target.value; if (v >= 5) { work = v; left = v * 60; mode = "work"; draw(); } };
    }
    function bank() { if (act && mode === "work") { const s = act.stop(); const sess = st.sessions.find(x => x.date === Store.today()) || (st.sessions.push({ date: Store.today(), startedAt: new Date().toISOString(), activeSec: 0, total: 0, correct: 0, tasks: [] }), st.sessions[st.sessions.length - 1]); sess.activeSec += s; Store.save(); if (s > 30) UI.toast(`+${UI.fmtH(s)} active study time saved.`, "ok"); } act = null; }
    function finishBlock() { clearInterval(iv); running = false; bank(); UI.toast(mode === "work" ? "Focus block done — take your break." : "Break over — back to work!", "ok"); mode = mode === "work" ? "break" : "work"; left = (mode === "work" ? work : brk) * 60; draw(); }
    draw();
  });

  /* ---------------- SETTINGS / DATA ---------------- */
  UI.route("settings", (root) => {
    const st = S(); const bks = Store.listBackups(); const info = Store.storageInfo();
    root.innerHTML = `<div class="topbar"><h1>Settings</h1></div>
    <div class="card"><h3>Study preferences</h3>
      <label class="f">Daily study time</label><select id="mins">${[30, 60, 90, 120, 180, 240, 300].map(v => `<option value="${v}" ${st.user && st.user.dailyMinutes === v ? "selected" : ""}>${v >= 60 ? v / 60 + " h" : v + " min"}</option>`).join("")}</select>
      <label class="f">Target exam date</label><input type="date" id="tdate" value="${esc(st.user && st.user.targetDate || "")}">
      <label class="f">Beginner Mode</label><select id="bm"><option value="1" ${st.settings.beginnerMode ? "selected" : ""}>On — simpler, smaller sessions, more encouragement</option><option value="0" ${!st.settings.beginnerMode ? "selected" : ""}>Off</option></select>
      <label class="f">Difficulty override</label><select id="diff"><option value="">Adaptive (recommended)</option>${["EASY", "BEGINNER", "SSC_LEVEL", "HARD"].map(d => `<option ${st.settings.difficultyOverride === d ? "selected" : ""}>${d}</option>`).join("")}</select>
      <label class="f">Language</label><select id="lang">${[["hinglish", "Hinglish"], ["english", "English"], ["hindi", "Hindi (Hinglish content)"]].map(([v, l]) => `<option value="${v}" ${st.settings.language === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <label class="f">Reminders (in-app, while open)</label><select id="rem"><option value="0" ${!st.settings.reminders ? "selected" : ""}>Off</option><option value="1" ${st.settings.reminders ? "selected" : ""}>On — study/revision/streak nudges (no spam)</option></select>
    </div>
    <div class="card"><h3>Accessibility</h3><label class="f">Text size</label><select id="fs">${[[1, "Normal"], [1.15, "Large"], [1.3, "Extra large"]].map(([v, l]) => `<option value="${v}" ${st.settings.fontScale == v ? "selected" : ""}>${l}</option>`).join("")}</select><label class="f">High contrast</label><select id="hc"><option value="0" ${!st.settings.highContrast ? "selected" : ""}>Off</option><option value="1" ${st.settings.highContrast ? "selected" : ""}>On</option></select><p class="small muted">Keyboard: number keys select options, Enter checks/next, H = hint. Status is always shown with text, not colour alone.</p></div>
    <div class="card"><h3>Data (stays on this device)</h3><p class="small muted">Stored locally: profile, attempts, mistakes, sessions, mocks, plans, vocab progress. ~${info.usedKB} KB. Nothing is uploaded.</p>
      <div class="row"><button class="btn sm" id="expJ">Export progress (JSON)</button><button class="btn sm" id="expM">Export mistakes (CSV)</button><button class="btn sm" id="expA">Export attempts (CSV)</button><button class="btn sm" id="expQ">Export questions (JSON)</button></div>
      <div class="row spread"><label class="btn sm">Import progress (JSON)<input type="file" id="impJ" accept="application/json" class="sr-only"></label><label class="btn sm">Import questions (JSON/CSV)<input type="file" id="impQ" accept=".json,.csv" class="sr-only"></label></div>
      <p class="small muted spread">Custom question format: JSON array of {topic, difficulty(E/B/S/H), question, options[4], correct(0-3), explanation, trap?} or CSV with the same headers (options separated by "|"). Imported questions are validated and labelled "Imported".</p>
      <h3 class="spread">Backups</h3><div class="row"><button class="btn sm" id="bk">Create backup now</button></div>${bks.length ? bks.slice().reverse().map(b => `<div class="row between small" style="padding:6px 0;border-top:1px solid var(--line)"><span>${esc(b.label)} · ${new Date(b.date).toLocaleString()} · ${b.attempts} attempts</span><span><button class="btn sm" data-rs="${b.id}">Restore</button><button class="btn sm ghost" data-del="${b.id}">Delete</button></span></div>`).join("") : "<p class='small muted'>No backups yet. A backup is auto-created before any import/restore.</p>"}
    </div>
    <div class="card"><h3>Reset</h3><div class="row"><button class="btn sm" id="resetPlan">Reset my preparation plan (keep history)</button><button class="btn sm" id="demo">Load demo data</button><button class="btn sm danger" id="wipe">Erase everything</button></div><p class="small muted">"Reset plan" = Zero-Day Backlog Mode: drops low-priority tasks, keeps critical revision, rebuilds a fresh 7-day path.</p></div>
    <div class="card"><h3>About</h3><p class="small">SSC CGL Mentor v1.0 — offline, local-first. Exam facts labelled OFFICIAL are based on ${esc(EXAM_CONFIG.basedOn)} (last verified ${esc(EXAM_CONFIG.lastVerified)}); always check the latest notification on ssc.gov.in. Practice questions are AI-generated (not official). The app does not guarantee selection — it is designed to maximize preparation quality and consistency.</p><p class="small"><a href="#selftest">Run self-test</a></p></div>`;
    const sv = () => Store.save();
    $("#mins", root).onchange = e => { st.user.dailyMinutes = +e.target.value; sv(); UI.toast("Saved. Tomorrow's plan will use it (or regenerate today's).", "ok"); };
    $("#tdate", root).onchange = e => { st.user.targetDate = e.target.value || null; sv(); };
    $("#bm", root).onchange = e => { st.settings.beginnerMode = e.target.value === "1"; sv(); };
    $("#diff", root).onchange = e => { st.settings.difficultyOverride = e.target.value || null; sv(); };
    $("#lang", root).onchange = e => { st.settings.language = e.target.value; sv(); };
    $("#rem", root).onchange = e => { st.settings.reminders = e.target.value === "1"; sv(); };
    $("#fs", root).onchange = e => { st.settings.fontScale = +e.target.value; sv(); window.applyTheme(); };
    $("#hc", root).onchange = e => { st.settings.highContrast = e.target.value === "1"; sv(); window.applyTheme(); };
    $("#expJ", root).onclick = () => UI.download(`ssc-mentor-progress-${Store.today()}.json`, Store.exportJSON());
    $("#expM", root).onclick = () => UI.download("mistake-book.csv", Store.exportMistakesCSV(), "text/csv");
    $("#expA", root).onclick = () => UI.download("attempts.csv", Store.exportAttemptsCSV(), "text/csv");
    $("#expQ", root).onclick = () => UI.download("questions.json", JSON.stringify(QUESTIONS, null, 1));
    $("#impJ", root).onchange = async e => { const f = e.target.files[0]; if (!f) return; if (!await UI.confirm("Import will replace current progress. A backup of the current data is created first. Continue?", "Import")) return; const r = Store.importJSON(await f.text()); if (r.ok) { UI.toast("Imported.", "ok"); location.reload(); } else UI.toast("Import failed: " + r.errors.join("; "), "error"); };
    $("#impQ", root).onchange = async e => { const f = e.target.files[0]; if (!f) return; const r = window.importQuestions(await f.text(), f.name.endsWith(".csv")); UI.toast(r.ok ? `Imported ${r.added} questions (${r.rejected} rejected).` : "Import failed: " + r.error, r.ok ? "ok" : "error"); };
    $("#bk", root).onclick = () => { const r = Store.createBackup("manual"); UI.toast(r.ok ? "Backup created." : "Backup failed: " + r.error, r.ok ? "ok" : "error"); UI.render(); };
    $$("[data-rs]", root).forEach(b => b.onclick = async () => { if (await UI.confirm("Restore this backup? Current data is backed up first.", "Restore")) { const r = Store.restoreBackup(b.dataset.rs); if (r.ok) location.reload(); else UI.toast(r.errors.join("; "), "error"); } });
    $$("[data-del]", root).forEach(b => b.onclick = async () => { if (await UI.confirm("Delete this backup?", "Delete")) { Store.deleteBackup(b.dataset.del); UI.render(); } });
    $("#resetPlan", root).onclick = async () => { if (await UI.confirm("Reset plan? History, mistakes and mastery are kept; today's plan is rebuilt and skipped topics are cleared.")) { Object.values(st.topics).forEach(t => { if (t.manual) t.manual.skip = false; }); st.plans = {}; Planner.generateDailyPlan(st); Store.save(true); UI.toast("Fresh plan created. You are not behind — start today.", "ok"); UI.go("today"); } };
    $("#demo", root).onclick = async () => { if (await UI.confirm("Load demo data? Current data is backed up first.", "Load demo")) { Store.createBackup("before-demo"); window.loadDemo(); location.reload(); } };
    $("#wipe", root).onclick = async () => { if (await UI.confirm("Erase ALL local data? Export a backup first if needed.", "Erase")) { Store.createBackup("before-erase"); Store.reset(); location.hash = "#onboard"; location.reload(); } };
  });

  /* ---------------- SELF-TEST ---------------- */
  UI.route("selftest", (root) => {
    const r = window.runSelfTests();
    root.innerHTML = `<div class="topbar"><h1>Self-test</h1><span class="pill ${r.failed ? "bad" : "ok"}">${r.passed} passed · ${r.failed} failed</span></div><div class="card">${r.results.map(x => `<div class="small" style="padding:4px 0">${x.ok ? "✅" : "❌"} ${esc(x.name)}${x.err ? ` — <span style="color:var(--bad)">${esc(x.err)}</span>` : ""}</div>`).join("")}</div><div class="card"><h3>Question bank audit</h3><p class="small">${QUESTIONS.length} questions · ${r.bankIssues.length} issues${r.bankIssues.length ? ": " + r.bankIssues.map(b => b.id + " (" + b.errors.join(", ") + ")").join("; ") : ""}</p><p class="small">Topics without lessons: ${TOPICS.filter(t => !LESSONS[t.id]).map(t => t.id).join(", ") || "none"} · Topics with &lt;3 questions: ${TOPICS.filter(t => QUESTIONS.filter(q => q.topic === t.id).length < 3).map(t => t.id).join(", ") || "none"}</p></div>`;
  });
})();
