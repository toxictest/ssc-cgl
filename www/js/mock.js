/* ============================================================
   MOCK ENGINE — builds mocks (full/subject/topic/weak/speed/revision),
   scores with Tier-I marking (config-driven), analyses, suggests strategy.
   ============================================================ */
(function () {
  function tier1() { return EXAM_CONFIG.tiers[0]; }

  function buildMock(state, qs, type, opts) {
    opts = opts || {};
    const t1 = tier1();
    let questions = [];
    const perQ = opts.marksPerQuestion || t1.marksPerQuestion, neg = opts.negative != null ? opts.negative : t1.negativeMarking;
    const pickSubject = (subject, n) => {
      const topics = TOPICS.filter(t => t.subject === subject);
      const per = Math.max(1, Math.ceil(n / topics.length));
      let pool = [];
      // spread across topics; SSC_LEVEL/BEGINNER mix
      Engine.shuffle(topics).forEach(t => { pool = pool.concat(Engine.shuffle(qs.filter(q => q.topic === t.id && q.difficulty !== "EASY")).slice(0, per)); });
      return Engine.shuffle(pool).slice(0, n);
    };
    if (type === "full") {
      t1.sections.forEach(s => questions = questions.concat(pickSubject(s.id, opts.small ? 10 : s.questions).map(q => ({ ...q, section: s.id }))));
    } else if (type === "subject") {
      questions = pickSubject(opts.subject, opts.count || 25).map(q => ({ ...q, section: opts.subject }));
    } else if (type === "topic") {
      questions = Engine.shuffle(qs.filter(q => q.topic === opts.topic)).slice(0, opts.count || 10).map(q => ({ ...q, section: q.subject }));
    } else if (type === "weak") {
      const weak = Engine.weakTopics(state, 5);
      const ids = weak.length ? weak.map(w => w.id) : ["percentage", "tenses", "series", "polity"];
      ids.forEach(id => questions = questions.concat(Engine.shuffle(qs.filter(q => q.topic === id)).slice(0, Math.ceil((opts.count || 15) / ids.length))));
      questions = questions.map(q => ({ ...q, section: q.subject }));
    } else if (type === "speed") {
      questions = Engine.shuffle(qs.filter(q => q.difficulty === "BEGINNER" || q.difficulty === "EASY")).slice(0, opts.count || 20).map(q => ({ ...q, section: q.subject }));
    } else if (type === "revision") {
      const ids = new Set(state.mistakes.filter(m => !m.resolved).map(m => m.qid));
      questions = Engine.shuffle(qs.filter(q => ids.has(q.id))).slice(0, opts.count || 15).map(q => ({ ...q, section: q.subject }));
    }
    const durationMin = opts.durationMin || (type === "full" ? (opts.small ? 24 : t1.durationMin) : type === "speed" ? Math.round(questions.length * 0.5) : Math.round(questions.length * 0.9));
    return { id: "mk" + Date.now(), type, title: opts.title || titleFor(type, opts), questions, durationMin, perQ, neg, startedAt: null, answers: {}, marked: {}, times: {}, visited: {} };
  }

  function titleFor(type, o) {
    return { full: o.small ? "Mini full mock (40 Q)" : "Full Mock — Tier-I pattern", subject: "Subject mock", topic: "Topic test" + (o.topic ? ": " + TOPIC_MAP[o.topic].name : ""), weak: "Weak-topic test", speed: "Speed test", revision: "Revision test (your mistakes)" }[type];
  }

  function score(mock) {
    let correct = 0, wrong = 0, skipped = 0;
    mock.questions.forEach((q, i) => { const a = mock.answers[i]; if (a == null) skipped++; else if (a === q.correct) correct++; else wrong++; });
    const total = correct * mock.perQ - wrong * mock.neg;
    return { correct, wrong, skipped, score: Math.round(total * 100) / 100, maxScore: mock.questions.length * mock.perQ, attempted: correct + wrong, accuracy: correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0, attemptRate: Math.round((correct + wrong) / mock.questions.length * 100) };
  }

  function analyse(state, mock) {
    const s = score(mock);
    const bySubject = {}, byTopic = {};
    const slow = [], careless = [];
    mock.questions.forEach((q, i) => {
      const a = mock.answers[i], t = mock.times[i] || 0, ok = a === q.correct;
      const S = bySubject[q.section] = bySubject[q.section] || { n: 0, c: 0, w: 0, s: 0, time: 0 };
      const T = byTopic[q.topic] = byTopic[q.topic] || { n: 0, c: 0, w: 0, s: 0, time: 0, subject: q.subject };
      [S, T].forEach(o => { o.n++; o.time += t; if (a == null) o.s++; else if (ok) o.c++; else o.w++; });
      if (t > (q.estimatedTime || 45) * 2) slow.push({ i, topic: q.topic, t });
      if (a != null && !ok && t < (q.estimatedTime || 45) * 0.5) careless.push({ i, topic: q.topic });
    });
    const lostBy = Object.entries(byTopic).map(([topic, v]) => ({ topic, subject: v.subject, lost: v.w * (mock.perQ + mock.neg) + v.s * mock.perQ, wrong: v.w, skipped: v.s, n: v.n })).sort((a, b) => b.lost - a.lost);
    const weakestTopics = lostBy.filter(x => x.lost > 0).slice(0, 6);
    const perSubjectLoss = {};
    weakestTopics.forEach(w => { (perSubjectLoss[w.subject] = perSubjectLoss[w.subject] || []).push(TOPIC_MAP[w.topic].name); });
    const totalTime = Object.values(mock.times).reduce((a, b) => a + b, 0);
    const strategy = [];
    if (s.accuracy < 60 && s.attemptRate > 70) strategy.push("Attempt rate high hai lekin accuracy kam — negative marking khaa rahi hai. Agle mock mein sirf sure-shot + 50% confident attempt karo.");
    if (s.attemptRate < 50) strategy.push("Attempt rate kam hai. Easy questions ko jaldi pehchano — Round-1 mein har section ke easy questions pehle.");
    if (slow.length >= 5) strategy.push(`${slow.length} questions par 2× se zyada time laga. 'Mark & move on' rule practice karo.`);
    if (careless.length >= 3) strategy.push(`${careless.length} careless mistakes (fast + wrong). Answer lock karne se pehle question ka last line dobara padho.`);
    if (!strategy.length) strategy.push("Balanced attempt. Ab weakest topics par focus + speed drills.");
    const analysis = { ...s, bySubject, byTopic, weakestTopics, perSubjectLoss, slow: slow.slice(0, 10), careless, totalTimeSec: totalTime, avgTimePerQ: mock.questions.length ? Math.round(totalTime / mock.questions.length) : 0, strategy };
    return analysis;
  }

  function finish(state, mock) {
    const analysis = analyse(state, mock);
    // record attempts into engine (mode 'mock') for weakness & mistake book
    mock.questions.forEach((q, i) => { const a = mock.answers[i]; if (a != null) Engine.recordAttempt(state, q, a, mock.times[i] || 60, null, "mock"); });
    const rec = { id: mock.id, type: mock.type, title: mock.title, date: Store.today(), finishedAt: new Date().toISOString(), durationMin: mock.durationMin, questionCount: mock.questions.length, score: analysis.score, maxScore: analysis.maxScore, accuracy: analysis.accuracy, attemptRate: analysis.attemptRate, correct: analysis.correct, wrong: analysis.wrong, skipped: analysis.skipped, analysis, recovery: Planner.mockRecoveryPlan({ analysis }), qids: mock.questions.map(q => q.id), answers: mock.answers, times: mock.times };
    state.mocks.push(rec);
    state.xp += 20;
    return rec;
  }

  window.Mock = { buildMock, score, analyse, finish };
})();
