/* ============================================================
   VIEWS (core): onboarding, diagnostic, home dashboard, today's study, lesson, syllabus
   ============================================================ */
(function () {
  const { $, $$, esc, h, raw } = UI;
  const S = () => Store.get();

  /* ---------------- ONBOARDING ---------------- */
  UI.route("onboard", (root) => {
    const st = S();
    const draft = st._onboardDraft || (st._onboardDraft = { step: 0, level: null, minutes: null, confidence: {}, education: null, prefTime: null, lang: "hinglish", ncert: null, mocks: null, targetDate: "", name: "", prevSSC: null });
    const steps = [
      () => `<div class="card hero"><h1>Welcome to your SSC CGL preparation.</h1><p class="muted">Ye app aapka personal mentor hai: roz batayega kya padhna hai, kaise padhna hai, kya practice karni hai, kya revise karna hai — aur aap kahan improve kar rahe ho.</p></div>
        <div class="card"><h3>SSC CGL kya hai? (30 sec)</h3><p>${esc(EXAM_CONFIG.whatIsIt)}</p><p class="small muted">Tier-I: ${EXAM_CONFIG.tiers[0].totalQuestions} questions · ${EXAM_CONFIG.tiers[0].totalMarks} marks · ${EXAM_CONFIG.tiers[0].durationMin} min · negative ${EXAM_CONFIG.tiers[0].negativeMarking}. <span class="pill">OFFICIAL INFO — verify latest notification</span></p>
        <p class="small muted">Privacy: sab data sirf aapke phone mein save hota hai. Koi account nahi, koi upload nahi.</p></div>
        <button class="btn primary big" data-next>Start (2 minutes) →</button>`,
      () => `<div class="card"><h2>Are you a complete beginner?</h2><p class="muted small">Honest answer se plan sahi banega.</p><div class="choice">${[["yes", "YES — bilkul shuru se"], ["somewhat", "SOMEWHAT — thoda idea hai"], ["no", "NO — pehle padha hai"]].map(([v, l]) => `<button data-set="level" data-v="${v}" class="${draft.level === v ? "sel" : ""}">${l}</button>`).join("")}</div></div>`,
      () => `<div class="card"><h2>How much time can you study daily?</h2><div class="choice">${[[60, "1 hour"], [120, "2 hours"], [180, "3 hours"], [240, "4 hours"], [300, "5+ hours"]].map(([v, l]) => `<button data-set="minutes" data-v="${v}" class="${draft.minutes === v ? "sel" : ""}">${l}</button>`).join("")}</div><p class="small muted">Realistic batao — plan usi ke hisaab se banega. Baad mein badal sakte ho.</p></div>`,
      () => `<div class="card"><h2>Har subject mein aap kitne confident ho?</h2>${SUBJECTS.map(s => `<label class="f">${esc(s.name)}</label><div class="choice">${[[1, "Weak"], [2, "Average"], [3, "Good"]].map(([v, l]) => `<button data-conf="${s.id}" data-v="${v}" class="${draft.confidence[s.id] === v ? "sel" : ""}">${l}</button>`).join("")}</div>`).join("")}</div>`,
      () => `<div class="card"><h2>Thodi aur details</h2>
        <label class="f">Educational background</label><select data-field="education"><option value="">Select</option>${["Graduation (Arts)", "Graduation (Commerce)", "Graduation (Science/Engg)", "Final year", "Other"].map(o => `<option ${draft.education === o ? "selected" : ""}>${o}</option>`).join("")}</select>
        <label class="f">Preferred study time</label><select data-field="prefTime"><option value="">Select</option>${["Morning", "Afternoon", "Evening", "Night", "Flexible"].map(o => `<option ${draft.prefTime === o ? "selected" : ""}>${o}</option>`).join("")}</select>
        <label class="f">Language for explanations</label><select data-field="lang">${[["hinglish", "Hinglish (recommended)"], ["english", "English"], ["hindi", "Hindi (Hinglish fallback)"]].map(([v, l]) => `<option value="${v}" ${draft.lang === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label class="f">Basic NCERT-level concepts (class 6–10 maths) done?</label><div class="choice">${[["yes", "Yes"], ["partly", "Partly"], ["no", "No / long ago"]].map(([v, l]) => `<button data-set="ncert" data-v="${v}" data-stay class="${draft.ncert === v ? "sel" : ""}">${l}</button>`).join("")}</div>
        <label class="f">Previous SSC exam experience?</label><div class="choice">${[["no", "None"], ["yes", "Attempted before"]].map(([v, l]) => `<button data-set="prevSSC" data-v="${v}" data-stay class="${draft.prevSSC === v ? "sel" : ""}">${l}</button>`).join("")}</div>
        <label class="f">Access to external mock tests?</label><div class="choice">${[["yes", "Yes"], ["no", "No (use in-app mocks)"]].map(([v, l]) => `<button data-set="mocks" data-v="${v}" data-stay class="${draft.mocks === v ? "sel" : ""}">${l}</button>`).join("")}</div>
        <label class="f">Target exam date (optional)</label><input type="date" data-field="targetDate" value="${esc(draft.targetDate)}">
        <label class="f">Your name (optional, stays on device)</label><input data-field="name" value="${esc(draft.name)}" maxlength="30" placeholder="e.g. Rahul">
        <button class="btn primary big spread" data-next>Continue →</button></div>`,
      () => {
        const conf = draft.confidence; const lbl = v => v === 1 ? "Weak" : v === 3 ? "Good" : "Average";
        const strat = draft.level === "yes" || conf.math === 1 ? "Foundation-first" : draft.level === "no" ? "Practice-heavy" : "Balanced";
        return `<div class="card"><h2>Your Student Profile</h2><table><tr><td>Level</td><td><b>${draft.level === "yes" ? "Beginner" : draft.level === "somewhat" ? "Early intermediate" : "Intermediate"}</b></td></tr>
        ${SUBJECTS.map(s => `<tr><td>${esc(s.short)}</td><td><b>${lbl(conf[s.id] || 2)}</b></td></tr>`).join("")}
        <tr><td>Available time</td><td><b>${draft.minutes / 60} hours/day</b></td></tr><tr><td>Recommended strategy</td><td><b>${strat}</b> <span class="pill">AI recommendation</span></td></tr></table>
        <p class="small muted">Beginner Mode: ${draft.level === "no" ? "off" : "on"} (simpler explanations, smaller sessions, easier first questions, more encouragement). Change anytime in Settings.</p></div>
        <div class="card soft"><h3>Next: a 15–20 minute diagnostic test</h3><p>${draft.level === "yes" ? "Mushkil nahi hai — bas ye dekhna hai ki kahan se shuru karein. Galat hona bilkul normal hai." : "Ye aapke strong/weak topics pehchanega taaki plan personal ho."}</p><button class="btn primary big" id="startDiag">Take diagnostic test →</button><button class="btn big spread" id="skipDiag">Skip for now (start from basics)</button></div>`;
      }
    ];
    function draw() {
      root.innerHTML = `<div class="topbar"><div class="brand">SSC CGL <span>Mentor</span></div><span class="small muted">Step ${draft.step + 1}/${steps.length}</span></div><div class="bar"><i style="width:${(draft.step) / (steps.length - 1) * 100}%"></i></div>${steps[draft.step]()}${draft.step > 0 ? `<button class="btn ghost spread" data-back>← Back</button>` : ""}`;
      $$("[data-set]", root).forEach(b => b.onclick = () => { draft[b.dataset.set] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; Store.save(); if (b.hasAttribute("data-stay")) { $$(`[data-set="${b.dataset.set}"]`, root).forEach(x => x.classList.toggle("sel", x === b)); } else nextStep(); });
      $$("[data-conf]", root).forEach(b => b.onclick = () => { draft.confidence[b.dataset.conf] = +b.dataset.v; Store.save(); $$(`[data-conf="${b.dataset.conf}"]`, root).forEach(x => x.classList.toggle("sel", x === b)); if (Object.keys(draft.confidence).length === 4) setTimeout(nextStep, 250); });
      $$("[data-field]", root).forEach(el => el.onchange = () => { draft[el.dataset.field] = el.value; Store.save(); });
      const nb = $("[data-next]", root); if (nb) nb.onclick = () => { if (draft.step === 4 && !draft.ncert) { UI.toast("Please answer the NCERT question.", "error"); return; } nextStep(); };
      const bb = $("[data-back]", root); if (bb) bb.onclick = () => { draft.step--; draw(); };
      const sd = $("#startDiag", root); if (sd) sd.onclick = () => { commit(); UI.go("diagnostic"); };
      const sk = $("#skipDiag", root); if (sk) sk.onclick = () => { commit(); UI.go("home"); };
    }
    function nextStep() { if (draft.step === 1 && !draft.level) return; if (draft.step === 2 && !draft.minutes) return; if (draft.step === 3 && Object.keys(draft.confidence).length < 4) { UI.toast("Sab 4 subjects choose karo.", ""); return; } draft.step++; Store.save(); draw(); }
    function commit() {
      const st = S();
      st.user = { name: draft.name || "", level: draft.level, dailyMinutes: draft.minutes, confidence: draft.confidence, education: draft.education, prefTime: draft.prefTime, ncert: draft.ncert, prevSSC: draft.prevSSC, externalMocks: draft.mocks, targetDate: draft.targetDate || null, createdAt: new Date().toISOString() };
      st.settings.language = draft.lang; st.settings.beginnerMode = draft.level !== "no";
      // pre-mark: if 'no' beginner & NCERT yes → arithmetic foundation considered known
      if (draft.level === "no" && draft.ncert === "yes") { Engine.topicState(st, "arith_found").manual.known = true; Engine.topicState(st, "arith_found").mastery = "STRONG"; Engine.topicState(st, "parts_speech").manual.known = true; Engine.topicState(st, "parts_speech").mastery = "STRONG"; }
      delete st._onboardDraft; Store.save(true);
    }
    draw();
  });

  /* ---------------- DIAGNOSTIC ---------------- */
  UI.route("diagnostic", (root) => {
    const st = S();
    const plan = [["arith_found", 2], ["percentage", 2], ["ratio", 1], ["average", 1], ["algebra", 1], ["geometry", 1], ["tenses", 1], ["sva", 1], ["vocab", 1], ["sentence_improvement", 1], ["analogy", 1], ["series", 2], ["coding", 1], ["polity", 1], ["static_gk", 1], ["current_affairs", 1]];
    const qs = [];
    plan.forEach(([t, n]) => { const pool = QUESTIONS.filter(q => q.topic === t && (q.difficulty === "EASY" || q.difficulty === "BEGINNER")); qs.push(...Engine.shuffle(pool.length ? pool : QUESTIONS.filter(q => q.topic === t)).slice(0, n)); });
    root.innerHTML = `<div class="card"><h2>Diagnostic Test</h2><p>${qs.length} questions · ~15–20 min · Beginner-friendly.</p><ul class="small"><li>Har question ke baad confidence puchenge (Guess/Low/Medium/High).</li><li>Galat hona normal hai — isi se pata chalega kahan se shuru karna hai.</li><li>Answers ko check karne ke baad hi solution dikhega.</li></ul><button class="btn primary big" id="go">Start diagnostic</button><button class="btn big spread" onclick="location.hash='#home'">Skip</button></div>`;
    $("#go", root).onclick = () => Practice.run({ title: "Diagnostic", questions: qs, mode: "diagnostic", askConfidence: true, onDone: (r) => { if (!r) return; saveDiagnostic(r); UI.go("diagresult"); } });
  });

  function saveDiagnostic(r) {
    const st = S(); const byTopic = {};
    r.attempts.forEach(a => { const t = byTopic[a.q.topic] = byTopic[a.q.topic] || { n: 0, c: 0, t: 0, errs: [] }; t.n++; if (a.correct) t.c++; t.t += a.timeSec; if (!a.correct) t.errs.push(a.errorType); });
    const strong = [], weak = [], veryWeak = [];
    Object.entries(byTopic).forEach(([id, v]) => { const acc = v.c / v.n; if (acc >= 0.75) strong.push(id); else if (acc > 0) weak.push(id); else veryWeak.push(id); });
    const careless = r.attempts.filter(a => a.errorType === "CARELESS_MISTAKE").length, concept = r.attempts.filter(a => a.errorType === "CONCEPT_ERROR" || a.errorType === "CONFUSION").length, slow = r.attempts.filter(a => a.timeSec > (a.q.estimatedTime || 45) * 1.8).length;
    // seed topic states (as diagnostic attempts) so planner sees actual data
    r.attempts.forEach(a => { Engine.recordAttempt(st, a.q, a.chosen == null ? -1 : a.chosen, a.timeSec, a.confidence, "diagnostic"); });
    st.diagnostic = { date: Store.today(), byTopic, strong, weak, veryWeak, careless, concept, slow, total: r.attempts.length, correct: r.correct };
    Engine.touchStreak(st); Store.save(true);
  }

  UI.route("diagresult", (root) => {
    const d = S().diagnostic; if (!d) { UI.go("home", null, true); return; }
    const names = ids => ids.map(i => TOPIC_MAP[i].name).join(", ") || "—";
    Planner.generateDailyPlan(S()); Store.save();
    const first7 = firstWeekPreview();
    root.innerHTML = `<div class="card hero"><h1>Your Starting Point</h1><p class="muted">${d.correct}/${d.total} correct. ${d.correct / d.total < 0.4 ? "Bilkul theek hai — hum foundation se shuru karenge." : d.correct / d.total < 0.7 ? "Achhi shuruaat. Kuch topics pakke, kuch par kaam karenge." : "Strong start! Plan practice-heavy hoga."}</p></div>
    <div class="card"><h3>Strong topics</h3><p>${esc(names(d.strong))}</p><h3>Weak topics</h3><p>${esc(names(d.weak))}</p><h3>Very weak topics</h3><p>${esc(names(d.veryWeak))}</p>
    <div class="grid c3"><div class="stat"><div class="v">${d.careless}</div><div class="l">Careless mistakes</div></div><div class="stat"><div class="v">${d.concept}</div><div class="l">Conceptual mistakes</div></div><div class="stat"><div class="v">${d.slow}</div><div class="l">Time-management issues</div></div></div></div>
    <div class="card"><h3>Your First 7 Days</h3>${first7.map((x, i) => `<div class="task"><div class="n">${i + 1}</div><div><div class="t">${esc(x.title)}</div><div class="meta">${esc(x.sub)}</div></div></div>`).join("")}<p class="small muted">Plan roz aapki performance se adapt hoga. Ye sirf preview hai.</p></div>
    <button class="btn primary big" onclick="location.hash='#today'">START DAY 1 →</button>`;
  });

  function firstWeekPreview() {
    const st = S(); const out = []; const used = new Set();
    for (let i = 0; i < 7; i++) {
      const subs = i % 2 === 0 ? ["math", "english"] : ["reasoning", "ga"];
      const picks = subs.map(s => { const t = Planner.nextLearnTopic(st, s, used); if (t) used.add(t.id); return t; }).filter(Boolean);
      out.push({ title: `Day ${i + 1}: ` + picks.map(p => p.name).join(" + "), sub: (i === 6 ? "Weekly review + mini mock (20 Q)" : "Lesson + practice + revision of previous days") });
    }
    return out;
  }

  /* ---------------- HOME ---------------- */
  UI.route("home", (root) => {
    const st = S();
    if (!st.user) { UI.go("onboard", null, true); return; }
    const today = Store.today();
    let plan = st.plans[today];
    const missed = Planner.missedDaysInfo(st);
    if (!plan) { plan = Planner.generateDailyPlan(st); Store.save(); }
    const done = plan.tasks.filter(t => t.done).length, total = plan.tasks.length;
    const nextTask = plan.tasks.find(t => !t.done && !t.skipped);
    const q = Engine.revisionQueue(st);
    const weak = Engine.weakTopics(st, 5);
    const rs = Engine.readinessScore(st);
    const hours = st.sessions.reduce((s, x) => s + (x.activeSec || 0), 0) / 3600;
    const acc = st.attempts.length ? Math.round(st.attempts.filter(a => a.correct).length / st.attempts.length * 100) : null;
    const lastMock = st.mocks[st.mocks.length - 1];
    const cov = TOPICS.filter(t => Engine.MASTERY.indexOf(st.topics[t.id]?.mastery || "NOT_STARTED") >= 3).length;
    const phase = PHASES[Planner.currentPhase(st) - 1];
    const dte = Planner.daysToExam(st);
    const nextAction = nextTask ? { label: nextTask.title, go: "today" } : q.total ? { label: `Review ${q.total} revision items`, go: "revision" } : { label: "Plan tomorrow / take a mock", go: "mocks" };
    root.innerHTML = `<div class="topbar"><div class="brand">SSC CGL <span>Mentor</span></div><div class="row"><span class="pill ok" title="Study streak">🔥 ${st.streak.current} day</span>${dte !== null ? `<span class="pill ${dte <= 30 ? "warn" : ""}">${dte} days to exam</span>` : ""}</div></div>
    ${missed.missed >= 1 && !plan.recoveryShown ? `<div class="card warn"><b>You missed ${missed.missed} day${missed.missed > 1 ? "s" : ""}.</b> Don't try to complete everything today — we've redistributed the important revision and dropped low-priority tasks. Aaj ka plan realistic hai.</div>` : ""}
    <div class="card hero"><div class="label" style="color:#c7d2fe">TODAY, DO THIS</div><h2 style="margin-top:4px">${esc(nextAction.label)}</h2><p class="muted">${total ? `${done}/${total} tasks done · ${plan.minutes} min plan · ${esc(plan.mode)} mode` : ""}</p><button class="btn big" style="background:#fff;color:var(--primary);border:0" onclick="location.hash='#${nextAction.go}'">${done === 0 ? "START TODAY →" : done < total ? "Continue today's study →" : "View today's summary"}</button>
    <div class="row spread"><button class="btn sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:transparent" data-min="10">Only 10 min today</button><button class="btn sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:transparent" data-min="30">Only 30 min</button></div></div>
    <div class="grid c2"><div class="stat"><div class="v">${UI.fmtH(hours * 3600)}</div><div class="l">Total study time</div></div><div class="stat"><div class="v">${st.attempts.length}</div><div class="l">Questions solved</div></div><div class="stat"><div class="v">${acc === null ? "—" : acc + "%"}</div><div class="l">Overall accuracy</div></div><div class="stat"><div class="v">${lastMock ? lastMock.score + "/" + lastMock.maxScore : "—"}</div><div class="l">Last mock score</div></div></div>
    <div class="card"><div class="row between"><h3>Preparation Readiness Score</h3><b style="font-size:1.4rem">${rs.score}/100</b></div><div class="bar ${rs.score >= 70 ? "ok" : rs.score >= 40 ? "warn" : "bad"}"><i style="width:${rs.score}%"></i></div><p class="small muted">App ka internal estimate (syllabus, mastery, accuracy, mocks, speed, revision). Ye official SSC probability nahi hai. <a href="#analytics">Details</a></p></div>
    <div class="grid c3">
      <div class="card"><h3>Revision due</h3>${q.total ? `<p><b>${q.total}</b> items: ${q.mistakes.length} mistakes, ${q.topics.length} topics, ${q.vocab.length} words</p><a class="btn sm" href="#revision">Revise now</a>` : `<p class="muted">Nothing due. 👍</p>`}</div>
      <div class="card"><h3>Top weak topics</h3>${weak.length ? weak.map(w => `<div class="row between small"><a href="#lesson?topic=${w.id}">${esc(w.name)}</a><span class="pill bad">${w.score}</span></div>`).join("") : `<p class="muted small">Abhi enough data nahi. Practice karte raho — 3+ attempts ke baad dikhega.</p>`}</div>
      <div class="card"><h3>Syllabus progress</h3><p><b>${cov}</b>/${TOPICS.length} topics at Practicing+</p><div class="bar"><i style="width:${Math.round(cov / TOPICS.length * 100)}%"></i></div><p class="small muted">Phase ${phase.id}: ${esc(phase.name)} — ${esc(phase.desc)}</p><a class="btn sm" href="#syllabus">Roadmap</a></div>
    </div>
    ${st.attempts.length >= 30 ? smallWins(st) : ""}
    <p class="tiny muted">The system is designed to maximize preparation quality and consistency — it does not guarantee selection.</p>`;
    $$("[data-min]", root).forEach(b => b.onclick = () => { Planner.generateDailyPlan(st, { minutes: +b.dataset.min }); Store.save(); UI.go("today"); });
    plan.recoveryShown = true; Store.save();
  });

  function smallWins(st) {
    const wk = Planner.weeklyReview(st); const wins = [];
    wk.improved.slice(0, 2).forEach(i => wins.push(`Your ${TOPIC_MAP[i.topic].name} accuracy improved from ${i.from}% → ${i.to}%.`));
    if (wk.prevCareless > wk.careless && wk.prevQuestions > 10) wins.push(`You made ${wk.prevCareless - wk.careless} fewer careless mistakes this week.`);
    if (wk.questions > wk.prevQuestions && wk.prevQuestions > 0) wins.push(`Last week you solved ${wk.prevQuestions} questions. This week you've already solved ${wk.questions}.`);
    if (!wins.length) return "";
    return `<div class="card ok"><h3>Small wins</h3>${wins.map(w => `<p>✅ ${esc(w)}</p>`).join("")}</div>`;
  }

  /* ---------------- TODAY'S STUDY ---------------- */
  UI.route("today", (root) => {
    const st = S(); if (!st.user) { UI.go("onboard", null, true); return; }
    const today = Store.today();
    let plan = st.plans[today] || Planner.generateDailyPlan(st);
    const sess = st.sessions.find(s => s.date === today) || (st.sessions.push({ date: today, startedAt: new Date().toISOString(), activeSec: 0, total: 0, correct: 0, tasks: [] }), st.sessions[st.sessions.length - 1]);
    Store.save();
    const done = plan.tasks.filter(t => t.done).length;
    const icons = { learn: "📘", practice: "✍️", revision: "🔁", mistakes: "📕", vocab: "🔤", mock: "🧪", mixed: "🔀", recovery: "🛠️", recall: "🧠", break: "☕" };
    root.innerHTML = `<div class="topbar"><h1>Today's Study</h1><span class="pill">${plan.minutes} min · ${esc(plan.mode)}</span></div>
    <div class="card">${plan.tasks.map((t, i) => `<div class="task ${t.done ? "done" : ""} ${t.skipped ? "muted" : ""}"><div class="n">${t.done ? "✓" : i + 1}</div><div style="flex:1"><div class="t">${icons[t.type] || "•"} ${esc(t.title)}</div><div class="meta">${t.minutes} min${t.count ? ` · ${t.count} questions` : ""}${t.timed ? " · timed" : ""}${t.subtitle ? " · " + esc(t.subtitle) : ""}</div>${t.why ? `<div class="tiny muted">${esc(t.why)}</div>` : ""}${t.result ? `<div class="tiny"><b>${t.result}</b></div>` : ""}</div><div class="act">${t.done ? "" : t.skipped ? `<span class="tiny">skipped</span>` : `<button class="btn sm primary" data-start="${i}">Start</button><button class="btn sm ghost" data-skip="${i}" aria-label="Skip">Skip</button>`}</div></div>`).join("")}</div>
    ${done === plan.tasks.length ? daySummary(st, sess, plan) : `<div class="card soft"><b>Next:</b> ${esc((plan.tasks.find(t => !t.done && !t.skipped) || {}).title || "All tasks handled — see summary")}</div>`}
    <div class="row"><button class="btn sm" id="regen">Regenerate plan</button><button class="btn sm" id="lessTime">I have less time today</button><a class="btn sm" href="#pomodoro">Pomodoro timer</a></div>`;
    $$("[data-start]", root).forEach(b => b.onclick = () => startTask(plan, +b.dataset.start, sess));
    $$("[data-skip]", root).forEach(b => b.onclick = () => { plan.tasks[+b.dataset.skip].skipped = true; Store.save(); UI.render(); });
    $("#regen", root).onclick = async () => { if (await UI.confirm("Regenerate today's plan? Completed tasks are kept in history.")) { Planner.generateDailyPlan(st); Store.save(); UI.render(); } };
    $("#lessTime", root).onclick = () => { const m = UI.modal(`<h3>How many minutes do you have?</h3><div class="choice">${[10, 20, 30, 45, 60].map(v => `<button data-m="${v}">${v} min</button>`).join("")}</div>`); $$("[data-m]", m.el).forEach(b => b.onclick = () => { Planner.generateDailyPlan(st, { minutes: +b.dataset.m }); Store.save(); m.close(); UI.render(); }); };
  });

  function daySummary(st, sess, plan) {
    plan.completed = true; Engine.touchStreak(st); const fresh = Engine.checkAchievements(st); Store.save();
    fresh.forEach(a => UI.toast("🏅 Achievement: " + a.name, "ok"));
    const acc = sess.total ? Math.round(sess.correct / sess.total * 100) : 0;
    const weak = Engine.weakTopics(st, 3);
    const q = Engine.revisionQueue(st);
    const tomorrow = Engine.addDays(Store.today(), 1);
    const dueTomorrow = Object.values(st.topics).filter(t => t.nextReview === tomorrow).length + st.mistakes.filter(m => !m.resolved && m.nextReview === tomorrow).length;
    return `<div class="card ok"><h3>Today's summary 🎉</h3><div class="grid c2"><div class="stat"><div class="v">${sess.correct}/${sess.total}</div><div class="l">Today's score</div></div><div class="stat"><div class="v">${acc}%</div><div class="l">Accuracy</div></div><div class="stat"><div class="v">${UI.fmtH(sess.activeSec)}</div><div class="l">Active study time</div></div><div class="stat"><div class="v">${dueTomorrow}</div><div class="l">Revision due tomorrow</div></div></div>
    <p><b>Weakness today:</b> ${weak.length ? weak.map(w => esc(w.name)).join(", ") : "none detected"}</p><p><b>Tomorrow:</b> revision first (${dueTomorrow} items), then next topics in your path. Plan auto-generates when you open the app.</p></div>`;
  }

  function startTask(plan, idx, sess) {
    const st = S(); const t = plan.tasks[idx];
    const finishTask = (res, label) => { t.done = true; if (res) { sess.total += res.attempts.length; sess.correct += res.correct; sess.activeSec += res.activeSec || 0; t.result = label || `${res.correct}/${res.attempts.length} correct`; } else if (label) t.result = label; sess.tasks.push({ type: t.type, topic: t.topic, result: t.result }); Engine.touchStreak(st); Store.save(true); UI.go("today", null, true); afterTaskAdvice(t, res); };
    if (t.type === "learn") { st._afterLesson = { planIdx: idx }; UI.go("lesson", { topic: t.topic, fromPlan: 1 }); return; }
    if (t.type === "practice" || t.type === "recovery") {
      const recovery = t.type === "recovery" || Engine.needsRecovery(st, t.topic);
      if (recovery) return recoveryFlow(t.topic, res => finishTask(res));
      const qs = Engine.pickQuestions(st, QUESTIONS, t.topic, t.count || 10);
      Practice.run({ title: t.title, questions: qs, mode: t.timed ? "timed" : "practice", askConfidence: (st.attempts.length % 3 === 0), perQuestionSec: t.timed ? 75 : null, onDone: res => finishTask(res) });
      return;
    }
    if (t.type === "mixed") {
      const topics = TOPICS.filter(x => x.subject === t.subject && st.topics[x.id] && st.topics[x.id].attempts >= 3);
      let qs = []; const per = Math.max(1, Math.ceil((t.count || 10) / Math.max(1, topics.length)));
      topics.forEach(x => qs.push(...Engine.pickQuestions(st, QUESTIONS, x.id, per)));
      if (!qs.length) qs = Engine.shuffle(QUESTIONS.filter(q => q.subject === t.subject && q.difficulty !== "HARD")).slice(0, t.count || 10);
      qs = Engine.shuffle(qs).slice(0, t.count || 10);
      Practice.run({ title: t.title, questions: qs, mode: t.timed ? "timed" : "practice", perQuestionSec: t.timed ? 70 : null, onDone: res => finishTask(res) });
      return;
    }
    if (t.type === "revision" || t.type === "mistakes") { st._afterRevision = { planIdx: idx }; UI.go("revision", { fromPlan: 1, only: t.type === "mistakes" ? "mistakes" : "" }); return; }
    if (t.type === "vocab") { st._afterVocab = { planIdx: idx }; UI.go("vocab", { fromPlan: 1, n: t.count || 10 }); return; }
    if (t.type === "recall") { st._afterRecall = { planIdx: idx }; UI.go("recall", { fromPlan: 1 }); return; }
    if (t.type === "mock") { st._afterMock = { planIdx: idx }; UI.go("mocks"); return; }
    if (t.type === "break") { finishTask(null, "Break taken"); return; }
  }
  window.completePlanTask = function (key, res, label) { const st = S(); const info = st[key]; if (!info) return; delete st[key]; const plan = st.plans[Store.today()]; if (!plan) return; const t = plan.tasks[info.planIdx]; if (!t || t.done) return; t.done = true; t.result = label || (res ? `${res.correct}/${res.attempts.length} correct` : "done"); const sess = st.sessions.find(s => s.date === Store.today()); if (sess && res) { sess.total += res.attempts.length; sess.correct += res.correct; sess.activeSec += res.activeSec || 0; } Engine.touchStreak(st); Store.save(true); };

  function afterTaskAdvice(t, res) {
    if (!res || !t.topic) return;
    const st = S(); const sp = Engine.speedProfile(st, t.topic);
    const acc = res.attempts.length ? res.correct / res.attempts.length : 0;
    let msg = null;
    if (acc >= 0.8) msg = `Great — ${Math.round(acc * 100)}% in ${TOPIC_MAP[t.topic].name}. Next time: timed set.`;
    else if (acc < 0.4) { const d = Engine.diagnoseStruggle(st, t.topic); msg = d.type !== "self" ? `Aapko shayad ${TOPIC_MAP[t.topic].name} ki nahi, ${TOPIC_MAP[d.topics[0]].name} ki foundation ki problem hai. Kal wahi pehle aayega.` : `Concept Recovery Mode kal activate hoga for ${TOPIC_MAP[t.topic].name} — simpler explanation + easy questions.`; }
    else if (sp && sp.label === "Slow but accurate") msg = sp.advice;
    if (msg) UI.toast(msg, "");
  }

  /* Concept Recovery flow: re-explain differently → 1 diagnostic → 3 easy → ramp → retest */
  function recoveryFlow(topic, done) {
    const st = S(); const L = LESSONS[topic] || {};
    const m = UI.modal(`<div class="label">Concept Recovery Mode</div><h3>${esc(TOPIC_MAP[topic].name)}</h3><p>Ye topic baar-baar galat ho raha hai. Difficulty nahi badhayenge. Pehle concept ko doosre tareeke se samjho:</p>
      <div class="lesson"><div class="box"><b>Simple words mein:</b> ${esc(L.what || "")}</div><div class="box"><b>Sabse aasan example:</b> ${esc(L.easyEx || "")}</div><div class="box"><b>Yahan galti hoti hai:</b> ${esc(L.trap || "")}</div><div class="box"><b>Shortcut:</b> ${esc(L.shortcut || "")}</div></div>
      <p class="small muted">Ab: 1 diagnostic question → 3 very easy → 2 beginner → 1 SSC-level retest.</p><button class="btn primary big" id="go">Start recovery (7 Q)</button>`, { sticky: true });
    $("#go", m.el).onclick = () => {
      m.close();
      const easy = Engine.shuffle(QUESTIONS.filter(q => q.topic === topic && q.difficulty === "EASY"));
      const beg = Engine.shuffle(QUESTIONS.filter(q => q.topic === topic && q.difficulty === "BEGINNER"));
      const ssc = Engine.shuffle(QUESTIONS.filter(q => q.topic === topic && q.difficulty === "SSC_LEVEL"));
      const qs = [...(beg[0] ? [beg[0]] : []), ...easy.slice(0, 3), ...beg.slice(1, 3), ...ssc.slice(0, 1)].slice(0, 7);
      Practice.run({ title: "Recovery: " + TOPIC_MAP[topic].name, questions: qs.length ? qs : Engine.pickQuestions(st, QUESTIONS, topic, 6, { difficulty: "EASY" }), mode: "recovery", askConfidence: false, onDone: res => { if (res && res.attempts.length && res.correct / res.attempts.length >= 0.7) { Engine.topicState(st, topic).recoveredOnce = true; UI.toast("Concept recovered ✅ — difficulty ab dheere-dheere badhegi.", "ok"); } done(res); } });
    };
  }
  window.recoveryFlow = recoveryFlow;

  /* ---------------- LESSON ---------------- */
  UI.route("lesson", (root, p) => {
    const st = S(); const id = p.topic; const t = TOPIC_MAP[id]; const L = LESSONS[id];
    if (!t) { root.innerHTML = `<div class="card">Topic not found.</div>`; return; }
    const ts = Engine.topicState(st, id); if (!ts.introducedAt) { ts.introducedAt = new Date().toISOString(); ts.mastery = Engine.computeMastery(ts); Store.save(); }
    const missing = Engine.missingPrereqs(st, id);
    const sp = Engine.speedProfile(st, id);
    const gl = (txt) => { if (!L || !L.glossary || !L.glossary.length) return esc(txt); let out = esc(txt); L.glossary.forEach(([w, d]) => { const re = new RegExp("\\b(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "i"); out = out.replace(re, `<span class="gloss" title="${esc(d)}">$1</span>`); }); return out; };
    const sec = (n, title, body) => body ? `<h3><span class="num">${n}</span>${title}</h3><div class="box">${gl(body)}</div>` : "";
    const qCount = QUESTIONS.filter(q => q.topic === id).length;
    root.innerHTML = `<div class="topbar"><div><div class="label">${esc(UI.subjName(t.subject))} · Lesson</div><h1>${esc(t.name)}</h1></div>${UI.masteryPill(ts.mastery)}</div>
    <div class="row small"><span class="tag">Importance: ${"★".repeat(t.weight)}${"☆".repeat(5 - t.weight)} <span class="muted">(historical estimate)</span></span><span class="tag">AI-written study material</span></div>
    ${missing.length ? `<div class="card warn"><b>Prerequisite check:</b> Is topic se pehle ${missing.map(m => `<a href="#lesson?topic=${m}">${esc(TOPIC_MAP[m].name)}</a>`).join(", ")} at least "Practicing" level par hona chahiye. Aap chahein to continue kar sakte ho (human override).</div>` : ""}
    ${sp ? `<div class="card soft small"><b>Your speed profile:</b> ${sp.label} (avg ${sp.avgT}s, ${sp.acc}% acc). ${esc(sp.advice)}</div>` : ""}
    ${L ? `<div class="card lesson">${sec(1, "What is this?", L.what)}${sec(2, "Why does SSC ask it?", L.why)}${sec(3, "Basic concept", L.concept)}${sec(4, "Formula / rule", L.formula)}${sec(5, "Easy example", L.easyEx)}${sec(6, "Beginner example", L.beginnerEx)}${sec(7, "SSC-level example", L.sscEx)}${sec(8, "Shortcut", L.shortcut)}${sec(9, "Common trap", L.trap)}
      ${L.glossary && L.glossary.length ? `<h3><span class="num">📖</span>Terms explained</h3><ul class="small">${L.glossary.map(([w, d]) => `<li><b>${esc(w)}</b>: ${esc(d)}</li>`).join("")}</ul>` : ""}
      <h3><span class="num">10</span>Practice</h3><p class="small muted">${qCount} practice questions available (adaptive difficulty: currently <b>${Engine.targetDifficulty(st, id)}</b>).</p>
      <div class="row"><button class="btn primary" id="prac">Practice 8 questions</button><button class="btn" id="mini">Mini test (6 Q, timed)</button><button class="btn" id="recall">Explain it back</button></div>
      <h3><span class="num">12</span>Revision reminder</h3><p class="small">${ts.nextReview ? `Next scheduled revision: <b>${ts.nextReview}</b> (interval ${ts.interval} d)` : "Pehli practice ke baad revision auto-schedule hoga (Day 1 → 3 → 7 → 14 → 30 → 60, adaptive)."}</p></div>` : `<div class="card"><p>Lesson content for this topic is not written yet — practice questions are available.</p><button class="btn primary" id="prac">Practice</button></div>`}
    <div class="card"><h3>Your control</h3><div class="row"><button class="btn sm" id="known">${ts.manual.known ? "✓ Marked as known" : "I already know this"}</button><button class="btn sm" id="skip">${ts.manual.skip ? "✓ Skipped (undo)" : "Skip for now"}</button><button class="btn sm" id="harder">Give me harder questions</button><a class="btn sm" href="#tutor?topic=${id}">Ask tutor</a></div></div>`;
    const finish = (res, label) => { if (p.fromPlan) window.completePlanTask("_afterLesson", res, label); };
    $("#prac", root).onclick = () => Practice.run({ title: "Practice: " + t.name, questions: Engine.pickQuestions(st, QUESTIONS, id, 8), mode: "practice", askConfidence: true, onDone: res => { finish(res); UI.go(p.fromPlan ? "today" : "lesson", p.fromPlan ? null : { topic: id }, true); } });
    const mini = $("#mini", root); if (mini) mini.onclick = () => Practice.run({ title: "Mini test: " + t.name, questions: Engine.pickQuestions(st, QUESTIONS, id, 6, { difficulty: "SSC_LEVEL" }), mode: "timed", perQuestionSec: 75, onDone: res => { if (res) { ts.conceptTest = res.correct / Math.max(1, res.attempts.length); Store.save(); } finish(res); UI.render(); } });
    const rc = $("#recall", root); if (rc) rc.onclick = () => explainBack(id);
    $("#known", root).onclick = () => { ts.manual.known = !ts.manual.known; ts.mastery = Engine.computeMastery(ts); Store.save(); UI.render(); };
    $("#skip", root).onclick = () => { ts.manual.skip = !ts.manual.skip; Store.save(); UI.toast(ts.manual.skip ? "Skipped — planner won't assign this until you undo." : "Un-skipped.", ""); UI.render(); };
    $("#harder", root).onclick = () => Practice.run({ title: "Hard set: " + t.name, questions: Engine.pickQuestions(st, QUESTIONS, id, 6, { difficulty: "HARD" }), mode: "practice", onDone: () => UI.render() });
    if (p.fromPlan) { const b = document.createElement("button"); b.className = "btn primary big"; b.textContent = "Lesson done → Practice now"; b.onclick = () => $("#prac", root).click(); root.appendChild(b); }
  });

  function explainBack(id) {
    const L = LESSONS[id] || {}; const key = (L.what || "").toLowerCase();
    const m = UI.modal(`<h3>Apne words mein batao:</h3><p><b>${esc(TOPIC_MAP[id].name)} kya hota hai?</b></p><textarea id="ans" rows="4" placeholder="Bina notes dekhe likho..."></textarea><div class="row spread"><button class="btn primary" id="chk">Check</button></div><div id="out"></div>`);
    $("#chk", m.el).onclick = () => {
      const a = $("#ans", m.el).value.toLowerCase();
      const kws = (L.glossary || []).map(g => g[0].toLowerCase()).concat(key.split(/\W+/).filter(w => w.length > 5)).slice(0, 8);
      const hit = kws.filter(k => a.includes(k)).length;
      const ok = a.length > 25 && hit >= 1;
      $("#out", m.el).innerHTML = `<div class="card ${ok ? "ok" : "warn"}"><b>${ok ? "Achha explanation!" : "Thoda aur clear karo."}</b><p class="small">Reference: ${esc(L.what || "")}</p>${!ok ? `<p class="small">Key idea: ${esc((L.concept || "").split(". ")[0])}.</p>` : ""}</div>`;
      const ts = Engine.topicState(S(), id); ts.explainBack = ok; Store.save();
    };
  }

  /* ---------------- SYLLABUS / ROADMAP ---------------- */
  UI.route("syllabus", (root, p) => {
    const st = S(); const sub = p.subject || "math";
    const phase = Planner.currentPhase(st);
    const topics = TOPICS.filter(t => t.subject === sub).sort((a, b) => a.order - b.order);
    root.innerHTML = `<div class="topbar"><h1>Syllabus & Roadmap</h1></div>
    <div class="card"><h3>Your phase: ${phase}. ${esc(PHASES[phase - 1].name)}</h3><p class="small">${esc(PHASES[phase - 1].desc)}</p><p class="small muted"><b>Exit criteria:</b> ${esc(PHASES[phase - 1].exit)}</p><details><summary>All 8 phases</summary>${PHASES.map(ph => `<div class="task"><div class="n ${ph.id < phase ? "" : ""}" style="${ph.id < phase ? "background:var(--ok-bg);color:var(--ok)" : ph.id === phase ? "background:var(--primary);color:#fff" : ""}">${ph.id}</div><div><div class="t">${esc(ph.name)}</div><div class="meta">${esc(ph.desc)} <br><i>Exit: ${esc(ph.exit)}</i></div></div></div>`).join("")}</details></div>
    <div class="row">${SUBJECTS.map(s => `<a class="btn sm ${s.id === sub ? "primary" : ""}" href="#syllabus?subject=${s.id}">${esc(s.short)}</a>`).join("")}</div>
    <div class="card"><p class="small muted">Learning path (prerequisite order). Tap a topic to open its lesson. Importance ★ = historical frequency estimate — not a guarantee.</p>
    ${topics.map(t => { const ts = st.topics[t.id]; const m = ts ? ts.mastery : "NOT_STARTED"; const ready = Engine.prereqsReady(st, t.id); const w = Engine.weaknessScore(st, t.id); return `<div class="task"><div class="n" style="${!ready ? "opacity:.4" : ""}">${t.order}</div><div style="flex:1"><a class="t" href="#lesson?topic=${t.id}" style="text-decoration:none;color:inherit">${esc(t.name)}</a><div class="meta">${"★".repeat(t.weight)} · ${t.tier}${t.prereq.length ? " · needs: " + t.prereq.map(x => TOPIC_MAP[x].name.split(" (")[0]).join(", ") : ""}${ts && ts.attempts ? ` · ${ts.attempts} attempts · ${Math.round(Engine.accuracy(ts) * 100)}%` : ""}${w !== null && w >= 40 ? ` · <span style="color:var(--bad)">weak ${w}</span>` : ""}</div></div><div class="act">${UI.masteryPill(m)}</div></div>`; }).join("")}</div>
    <div class="card"><h3>Exam structure <span class="pill">OFFICIAL — as per ${esc(EXAM_CONFIG.basedOn)}</span></h3><p class="small muted">${esc(EXAM_CONFIG.verifyNote)} Last verified: ${esc(EXAM_CONFIG.lastVerified)}.</p><table><tr><th>Section (Tier-I)</th><th>Q</th><th>Marks</th></tr>${EXAM_CONFIG.tiers[0].sections.map(s => `<tr><td>${esc(s.name)}</td><td>${s.questions}</td><td>${s.marks}</td></tr>`).join("")}<tr><td><b>Total</b></td><td><b>${EXAM_CONFIG.tiers[0].totalQuestions}</b></td><td><b>${EXAM_CONFIG.tiers[0].totalMarks}</b> · ${EXAM_CONFIG.tiers[0].durationMin} min · −${EXAM_CONFIG.tiers[0].negativeMarking}/wrong</td></tr></table><p class="small"><b>Tier-II:</b> ${esc(EXAM_CONFIG.tiers[1].summary)}</p></div>
    <div class="card"><h3>Exam strategy lessons <span class="pill">Recommendation</span></h3>${STRATEGY_LESSONS.map(s => `<details><summary>${esc(s.title)}</summary><p class="small">${esc(s.body)}</p></details>`).join("")}</div>`;
  });
})();
