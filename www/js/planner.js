/* ============================================================
   PLANNER — roadmap phase, daily plan generation, time modes,
   missed-day recovery, final-30/7 modes, weekly review, mock recovery plan.
   Pure logic; no DOM.
   ============================================================ */
(function () {
  const M = () => Engine.MASTERY;

  function currentPhase(state) {
    const days = daysToExam(state);
    if (days !== null && days <= 7) return 8;
    if (days !== null && days <= 30) return 7;
    const tierDone = tier => { const ts = TOPICS.filter(t => t.tier === tier); return ts.filter(t => M().indexOf(state.topics[t.id]?.mastery || "NOT_STARTED") >= 4).length / ts.length; };
    const f = tierDone("foundation"), c = tierDone("core"), a = tierDone("advanced");
    const mocks = state.mocks.length;
    if (f < 0.6) return 1;
    if (c < 0.4) return 2;
    if (c < 0.75 || a < 0.3) return 3;
    if (a < 0.6) return 4;
    if (mocks < 2) return 5;
    return 6;
  }

  function daysToExam(state) {
    const d = state.user && state.user.targetDate;
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  }

  /* Pick the next topic to LEARN in a subject: lowest-order topic whose prereqs are ready and mastery < COMPETENT */
  function nextLearnTopic(state, subject, exclude) {
    exclude = exclude || new Set();
    const cands = TOPICS.filter(t => t.subject === subject && !exclude.has(t.id) && !(state.topics[t.id]?.manual?.skip) && !(state.topics[t.id]?.manual?.known))
      .filter(t => M().indexOf(state.topics[t.id]?.mastery || "NOT_STARTED") < 4)
      .filter(t => Engine.prereqsReady(state, t.id))
      .sort((a, b) => a.order - b.order);
    if (!cands.length) return null;
    // If diagnostic marked subject weak → strictly by order; else favor priority among first 3
    const top = cands.slice(0, 3).sort((a, b) => Engine.priorityScore(state, b.id) - Engine.priorityScore(state, a.id));
    return cands[0].tier === "foundation" ? cands[0] : top[0];
  }

  /* Subject time split based on diagnostic confidence + weakness */
  function subjectWeights(state) {
    const conf = state.user?.confidence || {};
    const base = { math: 1.3, english: 1, reasoning: 0.9, ga: 0.8 };
    const w = {};
    for (const s of Object.keys(base)) {
      const c = conf[s] || 2; // 1 weak, 2 avg, 3 good
      w[s] = base[s] * (c === 1 ? 1.35 : c === 3 ? 0.75 : 1);
    }
    return w;
  }

  /* ---------- Daily plan ---------- */
  function generateDailyPlan(state, opts) {
    opts = opts || {};
    const date = opts.date || Store.today();
    const minutes = opts.minutes || (state.user?.dailyMinutes || 120);
    const phase = currentPhase(state);
    const queue = Engine.revisionQueue(state);
    const weak = Engine.weakTopics(state, 5);
    const forgetting = Engine.forgettingTopics(state);
    const tasks = [];
    let remaining = minutes;
    const add = (t) => { if (remaining - t.minutes < -5) return false; tasks.push({ id: "t" + tasks.length, done: false, skipped: false, ...t }); remaining -= t.minutes; return true; };

    const mode = minutes <= 12 ? "busy" : minutes <= 35 ? "emergency" : minutes >= 240 ? "deep" : "normal";

    /* Revision first (spaced repetition) — always keep at least a bit */
    const revMinutes = mode === "busy" ? 3 : mode === "emergency" ? 5 : Math.min(25, Math.max(10, Math.round(minutes * 0.15)));
    if (queue.mistakes.length || queue.topics.length || queue.vocab.length) {
      add({ type: "revision", title: "Revision queue", subtitle: `${queue.mistakes.length} mistakes · ${queue.topics.length} topics · ${queue.vocab.length} words due`, minutes: revMinutes, why: "Spaced repetition: aaj revise nahi kiya to 2 din mein bhool jaoge." });
    } else if (Object.values(state.topics).filter(t => t.attempts >= 5).length >= 3 && mode !== "busy") {
      add({ type: "revision", title: "Quick recall", subtitle: "Formula & vocabulary recall", minutes: Math.min(revMinutes, 8), why: "Active recall keeps memory fresh." });
    }

    if (mode === "busy") {
      const wt = weak[0] ? weak[0].id : nextLearnTopic(state, "math")?.id || "percentage";
      add({ type: "practice", topic: wt, title: "5-min practice: " + TOPIC_MAP[wt].name, minutes: 5, count: 5, why: "Continuity matters more than quantity today." });
      add({ type: "mistakes", title: "2-min mistake review", minutes: 2, count: 3, why: "Purani galti dobara na ho." });
      return finalize(state, date, minutes, tasks, mode, phase);
    }

    /* Final-30 / Final-7 modes: revision + mocks + weak topics; no new learning */
    if (phase >= 7) {
      const isFinal7 = phase === 8;
      weak.slice(0, isFinal7 ? 2 : 3).forEach(w => add({ type: "practice", topic: w.id, title: "Weak topic: " + w.name, minutes: 20, count: 12, timed: true, why: `Weakness score ${w.score}/100 — yahan sabse zyada marks recover honge.` }));
      if (!isFinal7 && state.mocks.length === 0 || (state.mocks.length && Engine.daysSince(state.mocks[state.mocks.length - 1].date) >= 3)) add({ type: "mock", title: isFinal7 ? "Sectional mock (25 Q)" : "Full mock (Tier-I pattern)", minutes: isFinal7 ? 20 : 60, why: "Mock + analysis final phase ka core hai." });
      add({ type: "mistakes", title: "Mistake book review", minutes: 15, count: 10, why: "Top repeated mistakes — highest yield." });
      add({ type: "vocab", title: "Vocabulary revision", minutes: 10, count: 15, why: "Vocabulary questions fixed marks hain." });
      add({ type: "recall", topic: "polity", title: "GA rapid recall", minutes: 10, count: 10, why: "Static GA revision." });
      return finalize(state, date, minutes, tasks, isFinal7 ? "final7" : "final30", phase);
    }

    /* Concept recovery / forgetting first */
    const recoveryTopic = Object.keys(state.topics).find(id => Engine.needsRecovery(state, id) && !state.topics[id].manual?.skip);
    if (recoveryTopic && mode !== "emergency") {
      const diag = Engine.diagnoseStruggle(state, recoveryTopic);
      const target = diag.type !== "self" ? diag.topics[0] : recoveryTopic;
      add({ type: "recovery", topic: target, title: "Concept Recovery: " + TOPIC_MAP[target].name, minutes: 20, count: 7, why: diag.type !== "self" ? `Aapko ${TOPIC_MAP[recoveryTopic].name} ki problem nahi — ${TOPIC_MAP[target].name} ki foundation pehle mazboot karni hai.` : "Repeated mistakes — concept dobara, easy questions se." });
    }
    forgetting.slice(0, 1).forEach(id => add({ type: "practice", topic: id, title: "Refresh: " + TOPIC_MAP[id].name, minutes: 12, count: 8, why: "Ye topic pehle achha tha, recent accuracy giri hai — forgetting detect hua." }));

    if (mode === "emergency") {
      const wt = weak[0] ? weak[0].id : nextLearnTopic(state, "math")?.id || "percentage";
      add({ type: "practice", topic: wt, title: "Weak topic: " + TOPIC_MAP[wt].name, minutes: 10, count: 8, why: "20–30 min mein sabse zyada return yahin milega." });
      add({ type: "practice", topic: nextLearnTopic(state, "reasoning")?.id || "series", title: "Quick reasoning set", minutes: 8, count: 8, why: "Speed maintain." });
      add({ type: "mistakes", title: "Mistake review", minutes: 5, count: 4, why: "" });
      return finalize(state, date, minutes, tasks, mode, phase);
    }

    /* Normal / deep: Learn (limit new concepts) + Practice per subject weighted */
    const w = subjectWeights(state);
    const subjects = ["math", "english", "reasoning", "ga"].sort((a, b) => w[b] - w[a]);
    const totalW = subjects.reduce((s, k) => s + w[k], 0);
    const learnBudget = remaining - (mode === "deep" ? 45 : 15);
    const maxNew = state.settings.beginnerMode ? 2 : 3; // hard cap on new *non-foundation* concepts/day
    let newCount = 0;
    const used = new Set(tasks.map(t => t.topic).filter(Boolean));
    for (const s of subjects) {
      const share = Math.min(50, Math.round(learnBudget * (w[s] / totalW))); // cap: no single topic >50 min (anti-overload)
      if (share < 8) continue;
      const t = nextLearnTopic(state, s, used);
      if (!t) { // subject covered → mixed practice
        add({ type: "mixed", subject: s, title: `Mixed practice: ${SUBJECTS.find(x => x.id === s).name}`, minutes: share, count: Math.max(6, Math.round(share / 1.5)), why: "Interleaved practice: topic pehchanna seekho, exam jaisa." });
        continue;
      }
      used.add(t.id);
      const ts = state.topics[t.id];
      const isNew = !ts || ts.attempts < 5;
      if (isNew && newCount >= maxNew) { // don't overload with new concepts → practice weak instead
        const alt = weak.find(x => !used.has(x.id) && TOPIC_MAP[x.id].subject === s);
        if (alt) { used.add(alt.id); add({ type: "practice", topic: alt.id, title: `Practice: ${alt.name}`, minutes: share, count: Math.round(share / 1.6), why: `Weak (score ${alt.score}). Naye topics ki limit aaj poori — pehle isse sudhaaro.` }); continue; }
        const seen = TOPICS.filter(x => x.subject === s && !used.has(x.id) && state.topics[x.id] && state.topics[x.id].attempts >= 3).sort((a, b) => Engine.priorityScore(state, b.id) - Engine.priorityScore(state, a.id))[0];
        if (seen) { used.add(seen.id); add({ type: "practice", topic: seen.id, title: `Practice: ${seen.name}`, minutes: Math.min(share, 20), count: Math.round(Math.min(share, 20) / 1.6), why: "Naye concepts ki daily limit poori — practice se pakka karo." }); }
        else if ((t.tier === "foundation" || t.prereq.length === 0) && newCount < maxNew + 1) { newCount++; used.add(t.id); add({ type: "learn", topic: t.id, title: `Learn: ${t.name}`, minutes: Math.round(share * 0.4), why: reasonFor(state, t) }); add({ type: "practice", topic: t.id, title: `Practice: ${t.name}`, minutes: share - Math.round(share * 0.4), count: Math.max(5, Math.round(share / 2)), why: "Foundation topic — chhota lesson, zyada practice." }); }
        continue;
      }
      if (isNew) {
        newCount++;
        const lm = Math.round(share * 0.45), pm = share - lm;
        add({ type: "learn", topic: t.id, title: `Learn: ${t.name}`, minutes: lm, why: reasonFor(state, t) });
        add({ type: "practice", topic: t.id, title: `Practice: ${t.name}`, minutes: pm, count: Math.max(5, Math.round(pm / 1.5)), why: "Lesson ke turant baad practice → retention 2×." });
      } else {
        add({ type: "practice", topic: t.id, title: `Practice: ${t.name}`, minutes: share, count: Math.max(6, Math.round(share / 1.5)), timed: (ts.mastery === "COMPETENT"), why: reasonFor(state, t) });
      }
    }
    /* Redistribute leftover time into existing practice tasks (don't waste the budget, don't add new concepts) */
    if (remaining > 12) {
      const pr = tasks.filter(t => t.type === "practice" || t.type === "mixed");
      if (pr.length) { const extra = Math.min(8, Math.floor(Math.min(remaining - 8, 40) / pr.length)); pr.forEach(t => { t.minutes += extra; t.count = (t.count || 5) + Math.round(extra / 1.6); }); remaining -= extra * pr.length; }
    }
    /* Deep-study: fill big budgets with mixed timed sets + breaks (not more new content) */
    let k = 0;
    while (remaining >= 55 && k < 4) { const sub = subjects[k % subjects.length]; add({ type: "mixed", subject: sub, title: `Timed mixed set: ${SUBJECTS.find(x => x.id === sub).name}`, minutes: 25, count: 15, timed: true, why: "Mixed practice: topic pehchanna + speed." }); if (k % 2 === 1) add({ type: "break", title: "Break (10 min)", minutes: 10, why: "Long sessions need breaks — fatigue se accuracy girti hai." }); k++; }
    if (remaining > 12 && state.attempts.length) { const w2 = weak.find(x => !used.has(x.id)); if (w2) { used.add(w2.id); add({ type: "practice", topic: w2.id, title: `Practice: ${w2.name}`, minutes: Math.min(20, remaining - 8), count: 8, why: `Weak (score ${w2.score}).` }); } }
    if (mode === "deep" && !tasks.some(t => t.type === "break")) {
      add({ type: "mixed", subject: "math", title: "Timed mixed section (Math)", minutes: 25, count: 15, timed: true, why: "Deep day: exam-like timed set." });
      add({ type: "break", title: "Break (walk / water)", minutes: 10, why: "4+ hour plan mein breaks zaroori." });
    }
    if (phase >= 5 && state.mocks.length === 0 || (phase >= 5 && Engine.daysSince(state.mocks[state.mocks.length - 1]?.date) >= 4 && remaining >= 60)) add({ type: "mock", title: "Full mock", minutes: 60, why: "Phase " + phase + ": mock cadence every 3–4 days." });
    if (remaining >= 8 && state.mistakes.filter(m => !m.resolved).length) add({ type: "mistakes", title: "Mistake review", minutes: Math.min(15, remaining), count: 6, why: "Din ka end mistakes se." });
    if (remaining >= 8) add({ type: "vocab", title: "Vocabulary (10 words)", minutes: 8, count: 10, why: "Roz 10 words = 300/month." });
    return finalize(state, date, minutes, tasks, mode, phase);
  }

  function reasonFor(state, t) {
    const deps = TOPICS.filter(x => x.prereq.includes(t.id)).length;
    const parts = [];
    if (t.weight >= 4) parts.push("frequently tested (historical pattern, not a guarantee)");
    if (deps >= 2) parts.push(`prerequisite for ${deps} other topics`);
    const w = Engine.weaknessScore(state, t.id);
    if (w !== null && w >= 40) parts.push(`your accuracy is low (weakness ${w}/100)`);
    if (t.tier === "foundation") parts.push("foundation topic — sab kuch is par tikta hai");
    return parts.length ? "Why: " + parts.join("; ") + "." : "Next in your learning path.";
  }

  function finalize(state, date, minutes, tasks, mode, phase) {
    const plan = { date, minutes, mode, phase, tasks, createdAt: new Date().toISOString(), completed: false };
    // Anti-overload guard: max 2–3 'learn' tasks, cap total questions
    const totalQ = tasks.reduce((s, t) => s + (t.count || 0), 0);
    const cap = state.settings.beginnerMode ? 40 : 80;
    if (totalQ > cap) { const f = cap / totalQ; tasks.forEach(t => { if (t.count) t.count = Math.max(3, Math.round(t.count * f)); }); }
    state.plans[date] = plan;
    return plan;
  }

  /* Missed-day recovery: don't dump; recompute */
  function missedDaysInfo(state) {
    const dates = Object.keys(state.plans).sort();
    if (!dates.length) return { missed: 0 };
    const last = dates[dates.length - 1];
    const gap = Engine.daysSince(last) - 1;
    const lastPlan = state.plans[last];
    if (gap >= 1 && !lastPlan.completed && lastPlan.date !== Store.today()) return { missed: gap + (lastPlan.completed ? 0 : 1), lastDate: last };
    return { missed: Math.max(0, gap) };
  }

  /* Weekly review */
  function weeklyReview(state) {
    const since = Date.now() - 7 * 86400000, prev = Date.now() - 14 * 86400000;
    const wk = state.attempts.filter(a => new Date(a.date).getTime() >= since);
    const pw = state.attempts.filter(a => { const t = new Date(a.date).getTime(); return t >= prev && t < since; });
    const byTopic = arr => { const m = {}; arr.forEach(a => { m[a.topic] = m[a.topic] || { n: 0, c: 0 }; m[a.topic].n++; if (a.correct) m[a.topic].c++; }); return m; };
    const a = byTopic(wk), b = byTopic(pw);
    const improved = [], worse = [];
    Object.keys(a).forEach(t => { if (b[t] && a[t].n >= 4 && b[t].n >= 4) { const d = a[t].c / a[t].n - b[t].c / b[t].n; if (d >= 0.15) improved.push({ topic: t, from: Math.round(b[t].c / b[t].n * 100), to: Math.round(a[t].c / a[t].n * 100) }); if (d <= -0.15) worse.push({ topic: t, from: Math.round(b[t].c / b[t].n * 100), to: Math.round(a[t].c / a[t].n * 100) }); } });
    const learned = Object.entries(state.topics).filter(([id, ts]) => ts.introducedAt && new Date(ts.introducedAt).getTime() >= since).map(([id]) => id);
    const forgot = Engine.forgettingTopics(state);
    const topMistakes = state.mistakes.filter(m => new Date(m.date).getTime() >= since).sort((x, y) => y.repeatCount - x.repeatCount).slice(0, 5);
    const strong = Object.entries(a).filter(([t, v]) => v.n >= 5 && v.c / v.n >= 0.8).sort((x, y) => y[1].c / y[1].n - x[1].c / x[1].n).slice(0, 5).map(([t, v]) => ({ topic: t, acc: Math.round(v.c / v.n * 100) }));
    const priorities = Engine.weakTopics(state, 5);
    const hours = state.sessions.filter(s => new Date(s.date).getTime() >= since).reduce((s, x) => s + (x.activeSec || 0), 0) / 3600;
    const careless = wk.filter(x => x.errorType === "CARELESS_MISTAKE").length, pc = pw.filter(x => x.errorType === "CARELESS_MISTAKE").length;
    const r = { date: Store.today(), questions: wk.length, prevQuestions: pw.length, accuracy: wk.length ? Math.round(wk.filter(x => x.correct).length / wk.length * 100) : null, hours: Math.round(hours * 10) / 10, learned, forgot, improved, worse, topMistakes, strong, priorities, careless, prevCareless: pc };
    return r;
  }

  /* Monthly report */
  function monthlyReport(state) {
    const since = Date.now() - 30 * 86400000;
    const a = state.attempts.filter(x => new Date(x.date).getTime() >= since);
    const bySub = {};
    a.forEach(x => { bySub[x.subject] = bySub[x.subject] || { n: 0, c: 0 }; bySub[x.subject].n++; if (x.correct) bySub[x.subject].c++; });
    const subs = Object.entries(bySub).map(([s, v]) => ({ subject: s, acc: Math.round(v.c / v.n * 100), n: v.n })).sort((x, y) => y.acc - x.acc);
    const mocks = state.mocks.filter(m => new Date(m.date).getTime() >= since);
    const hours = state.sessions.filter(s => new Date(s.date).getTime() >= since).reduce((s, x) => s + (x.activeSec || 0), 0) / 3600;
    const first = a.slice(0, Math.floor(a.length / 2)), last = a.slice(Math.floor(a.length / 2));
    const impr = first.length && last.length ? Math.round((last.filter(x => x.correct).length / last.length - first.filter(x => x.correct).length / first.length) * 100) : 0;
    const revised = state.mistakes.filter(m => m.reviews > 0).length, totalM = state.mistakes.length || 1;
    return { hours: Math.round(hours * 10) / 10, questions: a.length, accuracy: a.length ? Math.round(a.filter(x => x.correct).length / a.length * 100) : null, mocks: mocks.length, avgMock: mocks.length ? Math.round(mocks.reduce((s, m) => s + m.score, 0) / mocks.length) : null, best: subs[0], weakest: subs[subs.length - 1], improvement: impr, revisionRate: Math.round(revised / totalM * 100), repeated: state.mistakes.filter(m => m.repeatCount > 1).length };
  }

  /* 7-day recovery plan after mock */
  function mockRecoveryPlan(mock) {
    const topics = mock.analysis.weakestTopics.slice(0, 4);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const t = topics[i % topics.length];
      days.push({ day: i + 1, focus: t ? TOPIC_MAP[t.topic].name : "Mixed", tasks: t ? [`Lesson recap: ${TOPIC_MAP[t.topic].name} (10 min)`, `12 questions, timed (15 min)`, "Mistake review (5 min)"] : ["Mixed timed set (20 min)"] });
    }
    days[6].tasks.push("Sectional mock (25 Q) on the weakest subject");
    return days;
  }

  window.Planner = { currentPhase, daysToExam, nextLearnTopic, generateDailyPlan, missedDaysInfo, weeklyReview, monthlyReport, mockRecoveryPlan, subjectWeights };
})();
