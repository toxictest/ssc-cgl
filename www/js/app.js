/* ============================================================
   APP bootstrap: build & validate question bank, import questions, demo data,
   self-tests, theme, reminders, navigation.
   ============================================================ */
(function () {
  /* ---------- Question bank (validated; invalid rows are excluded, not shown) ---------- */
  const all = Engine.buildQuestions(window.QUESTION_ROWS, window.CURRENT_AFFAIRS_ROWS);
  const bad = Engine.validateBank(all);
  const badIds = new Set(bad.map(b => b.id));
  window.QUESTIONS = all.filter(q => !badIds.has(q.id));
  window.QUESTION_ISSUES = bad;
  // user-imported questions (persisted separately from progress)
  try { const imp = JSON.parse(localStorage.getItem("sscmentor.customq") || "[]"); imp.forEach(q => { if (!Engine.validateQuestion(q).length) window.QUESTIONS.push(q); }); } catch (_) {}

  window.importQuestions = function (text, isCSV) {
    let rows;
    try {
      if (isCSV) {
        const lines = text.split(/\r?\n/).filter(Boolean); const head = lines.shift().split(",").map(s => s.trim().replace(/^"|"$/g, ""));
        rows = lines.map(l => { const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(c => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')); const o = {}; head.forEach((h, i) => o[h] = cells[i]); o.options = String(o.options || "").split("|"); o.correct = +o.correct; return o; });
      } else rows = JSON.parse(text);
      if (!Array.isArray(rows)) return { ok: false, error: "Expected an array" };
    } catch (e) { return { ok: false, error: e.message }; }
    const existing = JSON.parse(localStorage.getItem("sscmentor.customq") || "[]");
    let added = 0, rejected = 0;
    rows.forEach((r, i) => {
      const d = { E: "EASY", B: "BEGINNER", S: "SSC_LEVEL", H: "HARD" }[r.difficulty] || r.difficulty || "BEGINNER";
      const q = { id: "imp_" + Date.now() + "_" + i, subject: TOPIC_MAP[r.topic]?.subject || "unknown", topic: r.topic, difficulty: d, question: r.question, options: r.options, correct: r.correct, explanation: r.explanation || "", trap: r.trap || "", source: r.source ? "Imported — " + r.source : "Imported (unverified)", estimatedTime: 45, isCurrentAffairs: false };
      if (Engine.validateQuestion(q).length) { rejected++; return; }
      existing.push(q); window.QUESTIONS.push(q); added++;
    });
    localStorage.setItem("sscmentor.customq", JSON.stringify(existing));
    return { ok: true, added, rejected };
  };

  /* ---------- Demo data (realistic 3-week beginner) ---------- */
  window.loadDemo = function () {
    Store.reset(); const st = Store.get();
    st.user = { name: "Demo Student", level: "yes", dailyMinutes: 120, confidence: { math: 1, english: 2, reasoning: 1, ga: 1 }, education: "Graduation (Arts)", prefTime: "Morning", ncert: "partly", prevSSC: "no", externalMocks: "no", targetDate: Engine.addDays(Store.today(), 120), createdAt: new Date(Date.now() - 21 * 864e5).toISOString() };
    st.settings.beginnerMode = true;
    const realNow = Date.now(); const origToday = Store.today;
    const topicsByDay = [["arith_found", "parts_speech"], ["arith_found", "analogy"], ["number_system", "tenses"], ["simplification", "series"], ["percentage", "polity"], ["percentage", "tenses"], ["ratio", "sva"], ["percentage", "coding"], ["average", "vocab"], ["ratio", "polity"], ["profit_loss", "series"], ["percentage", "articles"], ["profit_loss", "history_modern"], ["lcm_hcf", "prepositions"], ["average", "classification"], ["profit_loss", "geography"], ["si", "sva"], ["time_work", "coding"], ["percentage", "biology"], ["ratio", "error_detection"], ["profit_loss", "tenses"]];
    let dayIdx = 0;
    for (let d = 20; d >= 0; d--) {
      if (d === 9 || d === 3) { dayIdx++; continue; } // two missed days
      const date = new Date(realNow - d * 864e5); const iso = date.toISOString().slice(0, 10);
      Store.today = () => iso;
      const sess = { date: iso, startedAt: date.toISOString(), endedAt: date.toISOString(), activeSec: 3600 + Math.round(Math.random() * 2400), total: 0, correct: 0, tasks: [] };
      const tps = topicsByDay[dayIdx++ % topicsByDay.length];
      tps.forEach(tp => {
        const qs = Engine.shuffle(QUESTIONS.filter(q => q.topic === tp)).slice(0, 8);
        const skill = { arith_found: .75, percentage: Math.min(.9, .45 + (20 - d) * .025), ratio: .6, average: .7, profit_loss: .45, tenses: .65, sva: .7, series: .8, coding: .75, analogy: .8, polity: .6 }[tp] ?? .6;
        qs.forEach(q => { const ok = Math.random() < skill; const chosen = ok ? q.correct : (q.correct + 1 + Math.floor(Math.random() * 3)) % 4; const t = 25 + Math.random() * 60; const conf = ["low", "medium", "high"][Math.floor(Math.random() * 3)]; const r = Engine.recordAttempt(st, q, chosen, t, conf, "practice"); r.att.date = new Date(date.getTime() + Math.random() * 3e6).toISOString(); sess.total++; if (ok) sess.correct++; });
      });
      st.sessions.push(sess); Engine.touchStreak(st);
      st.plans[iso] = { date: iso, minutes: 120, mode: "normal", phase: 1, tasks: [{ id: "t0", type: "practice", title: "done", done: true, minutes: 60 }], completed: true };
    }
    // one mock a week ago
    Store.today = () => new Date(realNow - 6 * 864e5).toISOString().slice(0, 10);
    const mk = Mock.buildMock(st, QUESTIONS, "full", { small: true }); mk.questions.forEach((q, i) => { if (Math.random() < .8) { mk.answers[i] = Math.random() < .55 ? q.correct : (q.correct + 1) % 4; } mk.times[i] = 20 + Math.random() * 70; }); Mock.finish(st, mk);
    Store.today = origToday;
    // fix mistake dates for demo: some due today
    st.mistakes.slice(0, 6).forEach(m => m.nextReview = Store.today());
    Object.values(st.topics).slice(0, 3).forEach(t => t.nextReview = Store.today());
    st.vocab = {}; VOCAB.slice(0, 15).forEach(v => st.vocab[v[0]] = { interval: 3, ease: 2.3, lapses: 0, seen: 2, nextReview: Store.today() });
    Engine.checkAchievements(st);
    Store.save(true);
  };

  /* ---------- Self-tests (browser) ---------- */
  window.runSelfTests = function () {
    const results = []; const t = (name, fn) => { try { const r = fn(); if (r === false) throw new Error("assertion failed"); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, err: e.message }); } };
    const S0 = Store.defaultState(); const origToday = Store.today;
    t("question bank validates (no critical issues)", () => QUESTION_ISSUES.length <= 2);
    t("every topic has ≥3 questions", () => TOPICS.every(tp => QUESTIONS.filter(q => q.topic === tp.id).length >= 3));
    t("every topic has a lesson", () => TOPICS.every(tp => LESSONS[tp.id]));
    t("percentage question 25% of 240 = 60", () => { const q = QUESTIONS.find(q => q.question.startsWith("25% of 240")); return q.options[q.correct] === "60"; });
    t("mastery: fresh topic NOT_STARTED", () => Engine.computeMastery({ mastery: "NOT_STARTED", attempts: 0, recent: [], manual: {}, timedAttempts: 0, timedCorrect: 0, lapses: 0, interval: 0 }) === "NOT_STARTED");
    t("mastery: 10/10 recent + timed → STRONG", () => { const ts = { attempts: 20, recent: Array.from({ length: 20 }, () => ({ c: true, d: "SSC_LEVEL", t: 40, at: new Date().toISOString() })), manual: {}, timedAttempts: 6, timedCorrect: 5, lapses: 0, interval: 3, introducedAt: 1, lastStudied: new Date().toISOString() }; return Engine.computeMastery(ts) === "STRONG"; });
    t("mastery: 3/10 → LEARNING", () => { const ts = { attempts: 10, recent: Array.from({ length: 10 }, (_, i) => ({ c: i < 3, d: "EASY", t: 40 })), manual: {}, timedAttempts: 0, timedCorrect: 0, lapses: 0, interval: 0, introducedAt: 1 }; return Engine.computeMastery(ts) === "LEARNING"; });
    t("recordAttempt wrong → mistake created & classified", () => { const s = Store.defaultState(); const q = QUESTIONS.find(q => q.topic === "percentage"); const r = Engine.recordAttempt(s, q, (q.correct + 1) % 4, 30, "high", "practice"); return !r.correct && s.mistakes.length === 1 && !!s.mistakes[0].errorType && s.mistakes[0].nextReview === Engine.addDays(Store.today(), 1); });
    t("careless classification: high confidence + fast", () => { const q = { estimatedTime: 60, subject: "math", trap: "" }; return Engine.classifyError(q, 0, 10, "high", null) === "CARELESS_MISTAKE"; });
    t("guess classification", () => Engine.classifyError({ estimatedTime: 60, subject: "math" }, 0, 30, "guess", null) === "GUESSING_ERROR");
    t("spaced repetition intervals grow on success", () => { const s = Store.defaultState(); const ts = Engine.topicState(s, "ratio"); ts.recent = Array.from({ length: 5 }, () => ({ c: true, d: "EASY", t: 30 })); ts.attempts = 5; Engine.scheduleTopic(s, "ratio", true); const i1 = ts.interval; Engine.scheduleTopic(s, "ratio", true); return i1 === 1 && ts.interval === 3; });
    t("spaced repetition resets on failure", () => { const s = Store.defaultState(); const ts = Engine.topicState(s, "ratio"); ts.interval = 14; Engine.scheduleTopic(s, "ratio", false); return ts.interval === 1 && ts.lapses === 1; });
    t("revision queue shows due items", () => { const s = Store.defaultState(); const ts = Engine.topicState(s, "ratio"); ts.attempts = 3; ts.nextReview = Store.today(); return Engine.revisionQueue(s).topics.length === 1; });
    t("weakness score null with <3 attempts, high for 0% acc", () => { const s = Store.defaultState(); const q = QUESTIONS.filter(q => q.topic === "average").slice(0, 5); q.forEach(x => Engine.recordAttempt(s, x, (x.correct + 1) % 4, 40, "medium", "practice")); return Engine.weaknessScore(s, "average") >= 60 && Engine.weaknessScore(s, "ratio") === null; });
    t("prerequisite detector points to percentage for profit_loss", () => { const s = Store.defaultState(); QUESTIONS.filter(q => q.topic === "percentage").slice(0, 5).forEach(x => Engine.recordAttempt(s, x, (x.correct + 1) % 4, 40, null, "practice")); QUESTIONS.filter(q => q.topic === "profit_loss").slice(0, 4).forEach(x => Engine.recordAttempt(s, x, (x.correct + 1) % 4, 40, null, "practice")); const d = Engine.diagnoseStruggle(s, "profit_loss"); return d.type === "prereq" && d.topics.includes("percentage"); });
    t("adaptive difficulty: <40% → EASY", () => { const s = Store.defaultState(); s.settings.beginnerMode = false; const ts = Engine.topicState(s, "ratio"); ts.recent = Array.from({ length: 10 }, (_, i) => ({ c: i < 3, d: "EASY", t: 30 })); return Engine.targetDifficulty(s, "ratio") === "EASY"; });
    t("adaptive difficulty: >90% → HARD", () => { const s = Store.defaultState(); const ts = Engine.topicState(s, "ratio"); ts.recent = Array.from({ length: 10 }, () => ({ c: true, d: "SSC_LEVEL", t: 30 })); return Engine.targetDifficulty(s, "ratio") === "HARD"; });
    t("mock scoring: +2/−0.5", () => { const m = { questions: [{ correct: 0 }, { correct: 1 }, { correct: 2 }, { correct: 3 }], answers: { 0: 0, 1: 1, 2: 0 }, perQ: 2, neg: 0.5 }; const s = Mock.score(m); return s.score === 3.5 && s.correct === 2 && s.wrong === 1 && s.skipped === 1 && s.maxScore === 8; });
    t("full mock has 100 questions with 25 per section", () => { const s = Store.defaultState(); const m = Mock.buildMock(s, QUESTIONS, "full"); const bySec = {}; m.questions.forEach(q => bySec[q.section] = (bySec[q.section] || 0) + 1); return m.questions.length === 100 && Object.values(bySec).every(v => v === 25); });
    t("mock analysis identifies weakest topics", () => { const s = Store.defaultState(); const m = Mock.buildMock(s, QUESTIONS, "full", { small: true }); m.questions.forEach((q, i) => { m.answers[i] = q.topic === "percentage" ? (q.correct + 1) % 4 : q.correct; m.times[i] = 30; }); const a = Mock.analyse(s, m); return a.accuracy < 100 ? a.weakestTopics.length > 0 : true; });
    t("daily plan respects time budget (2h)", () => { const s = Store.defaultState(); s.user = { dailyMinutes: 120, confidence: { math: 1, english: 2, reasoning: 2, ga: 1 } }; const p = Planner.generateDailyPlan(s); const tot = p.tasks.reduce((a, t) => a + t.minutes, 0); return tot <= 130 && tot >= 80 && p.tasks.filter(t => t.type === "learn").length <= 3; });
    t("busy-day plan (10 min) fits", () => { const s = Store.defaultState(); s.user = { dailyMinutes: 120, confidence: {} }; const p = Planner.generateDailyPlan(s, { minutes: 10 }); return p.mode === "busy" && p.tasks.reduce((a, t) => a + t.minutes, 0) <= 12; });
    t("deep plan (5h) includes a break and timed set", () => { const s = Store.defaultState(); s.user = { dailyMinutes: 300, confidence: {} }; const p = Planner.generateDailyPlan(s); return p.tasks.some(t => t.type === "break") && p.tasks.some(t => t.timed); });
    t("final-7 mode when exam ≤7 days: no 'learn' tasks", () => { const s = Store.defaultState(); s.user = { dailyMinutes: 180, confidence: {}, targetDate: Engine.addDays(Store.today(), 5) }; const p = Planner.generateDailyPlan(s); return p.mode === "final7" && !p.tasks.some(t => t.type === "learn"); });
    t("planner respects prerequisites (no profit_loss before percentage)", () => { const s = Store.defaultState(); const n = Planner.nextLearnTopic(s, "math"); return n && n.id === "arith_found"; });
    t("planner honours 'I already know this' override", () => { const s = Store.defaultState(); Engine.topicState(s, "arith_found").manual.known = true; s.topics.arith_found.mastery = "STRONG"; const n = Planner.nextLearnTopic(s, "math"); return n && n.id !== "arith_found"; });
    t("readiness score is 0..100 and low for new user", () => { const r = Engine.readinessScore(Store.defaultState()); return r.score >= 0 && r.score <= 100 && r.score <= 25; });
    t("export → import roundtrip preserves attempts", () => { const cur = Store.exportJSON(); const s = JSON.parse(cur); const n = s.attempts.length; const r = Store.importJSON(JSON.stringify(s)); return r.ok && Store.get().attempts.length === n; });
    t("import rejects invalid JSON", () => !Store.importJSON("{nope").ok);
    t("backup create/list/delete", () => { const r = Store.createBackup("test"); const ok = r.ok && Store.listBackups().some(b => b.id === r.id); Store.deleteBackup(r.id); return ok && !Store.listBackups().some(b => b.id === r.id); });
    t("CSV export escapes quotes", () => Store.toCSV([{ a: 'He said "hi"' }], ["a"]).includes('"He said ""hi"""'));
    t("question import validates and rejects bad rows", () => { const before = QUESTIONS.length; const r = window.importQuestions(JSON.stringify([{ topic: "ratio", difficulty: "E", question: "Test import q " + Date.now(), options: ["1", "2", "3", "4"], correct: 1, explanation: "test explanation" }, { topic: "ratio", question: "bad", options: ["1", "1", "1", "1"], correct: 9 }]), false); const ok = r.ok && r.added === 1 && r.rejected === 1; const stored = JSON.parse(localStorage.getItem("sscmentor.customq") || "[]"); localStorage.setItem("sscmentor.customq", JSON.stringify(stored.slice(0, -1))); QUESTIONS.length = before; return ok; });
    t("fatigue detection triggers on decline", () => { const arr = [...Array.from({ length: 6 }, () => ({ correct: true, timeSec: 30, errorType: null })), ...Array.from({ length: 5 }, () => ({ correct: false, timeSec: 70, errorType: "CARELESS_MISTAKE" }))]; return !!Engine.fatigueCheck(arr); });
    t("forgetting detection", () => { const s = Store.defaultState(); const ts = Engine.topicState(s, "ratio"); ts.recent = [...Array.from({ length: 8 }, () => ({ c: true, d: "EASY", t: 30 })), ...Array.from({ length: 4 }, () => ({ c: false, d: "EASY", t: 30 }))]; return Engine.forgettingTopics(s).includes("ratio"); });
    t("streak increments on consecutive days", () => { const s = Store.defaultState(); s.streak = { current: 3, best: 3, lastDate: Engine.addDays(Store.today(), -1) }; Engine.touchStreak(s); return s.streak.current === 4; });
    t("vocab SRS schedules forward", () => { const s = Store.defaultState(); Engine.reviewVocab(s, "Abandon", 2); return s.vocab.Abandon.nextReview > Store.today(); });
    Store.today = origToday;
    return { results, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, bankIssues: QUESTION_ISSUES };
  };

  /* ---------- Theme / accessibility ---------- */
  window.applyTheme = function () { const s = Store.get().settings; document.documentElement.style.setProperty("--fs", (16 * (s.fontScale || 1)) + "px"); document.documentElement.setAttribute("data-theme", s.highContrast ? "hc" : ""); };

  /* ---------- Reminders (in-app, gentle, max 1 per session) ---------- */
  function reminders() {
    const st = Store.get(); if (!st.settings.reminders || !st.user) return;
    const q = Engine.revisionQueue(st); const plan = st.plans[Store.today()];
    const msgs = [];
    if (q.total >= 5) msgs.push(`${q.total} revision items due today.`);
    if (plan && !plan.completed && plan.tasks.some(t => t.done)) msgs.push("Today's plan is half done — finish the next task.");
    if (st.streak.current >= 3 && st.streak.lastDate !== Store.today()) msgs.push(`Keep your ${st.streak.current}-day streak alive today.`);
    if (msgs.length && !sessionStorage.getItem("reminded")) { sessionStorage.setItem("reminded", "1"); setTimeout(() => UI.toast("🔔 " + msgs[0], ""), 1500); }
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    Store.load(); window.applyTheme();
    const st = Store.get();
    const params = new URLSearchParams(location.search);
    if (params.get("demo") === "1" && !st.user) { window.loadDemo(); history.replaceState(null, "", location.pathname); }
    const nav = document.getElementById("nav");
    const items = [["home", "🏠", "Home"], ["today", "📅", "Today"], ["practice", "✍️", "Practice"], ["mistakes", "📕", "Mistakes"], ["analytics", "📈", "Progress"], ["tutor", "🧑‍🏫", "Tutor"], ["mocks", "🧪", "Mocks"], ["settings", "⚙️", "Settings"]];
    nav.innerHTML = `<div class="logo">SSC CGL <span style="color:var(--primary)">Mentor</span></div>` + items.map(([id, ic, l]) => `<button data-go="${id}" aria-label="${l}"><span class="ic" aria-hidden="true">${ic}</span><span>${l}</span></button>`).join("");
    // mobile: show only first 5 + settings; desktop shows all
    if (window.innerWidth < 900) { UI.$$(".nav button").forEach(b => { if (["tutor", "mocks"].includes(b.dataset.go)) b.style.display = "none"; }); }
    UI.$$(".nav button").forEach(b => b.onclick = () => UI.go(b.dataset.go));
    if (!st.user && !location.hash.includes("onboard") && !location.hash.includes("selftest")) location.hash = "#onboard";
    UI.render();
    reminders();
    // Save on hide + crash-safe periodic flush
    document.addEventListener("visibilitychange", () => { if (document.hidden) Store.save(true); });
    window.addEventListener("beforeunload", () => Store.save(true));
    setInterval(() => Store.save(true), 30000);
    // Android back button (Capacitor) → history back
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) { window.Capacitor.Plugins.App.addListener("backButton", () => { if (document.querySelector(".focus") || document.querySelector(".modal")) { const m = document.querySelector(".modal"); if (m) m.remove(); else UI.toast("Use ✕ to exit the session (progress is saved).", ""); } else if (location.hash && location.hash !== "#home") history.back(); else window.Capacitor.Plugins.App.exitApp(); }); }
  });
})();
