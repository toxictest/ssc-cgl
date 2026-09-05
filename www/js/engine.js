/* ============================================================
   ENGINE — question bank, validation, mastery, weakness, spaced repetition,
   mistake classification, adaptive difficulty, fatigue, readiness score.
   Pure logic; no DOM. Testable (see tests/run.js).
   ============================================================ */
(function () {
  const DIFF = { E: "EASY", B: "BEGINNER", S: "SSC_LEVEL", H: "HARD" };
  const DIFF_RANK = { EASY: 0, BEGINNER: 1, SSC_LEVEL: 2, HARD: 3 };
  const EST_TIME = { EASY: 30, BEGINNER: 45, SSC_LEVEL: 60, HARD: 90 };
  const MASTERY = ["NOT_STARTED", "INTRODUCED", "LEARNING", "PRACTICING", "COMPETENT", "STRONG", "MASTERED"];
  const INTERVALS = [1, 3, 7, 14, 30, 60];

  /* ---------- Question bank ---------- */
  function buildQuestions(rows, caRows) {
    const qs = [];
    const counters = {};
    (rows || []).forEach(r => {
      const [topic, d, question, options, correct, explanation, trap] = r;
      counters[topic] = (counters[topic] || 0) + 1;
      const t = window.TOPIC_MAP ? window.TOPIC_MAP[topic] : null;
      qs.push({
        id: `${topic}_${String(counters[topic]).padStart(3, "0")}`,
        subject: t ? t.subject : "unknown",
        topic, difficulty: DIFF[d] || "BEGINNER",
        question, options: options.slice(), correct, explanation: explanation || "", trap: trap || "",
        source: "AI-GENERATED PRACTICE QUESTION", estimatedTime: EST_TIME[DIFF[d]] || 45, isCurrentAffairs: false
      });
    });
    (caRows || []).forEach((c, i) => {
      qs.push({
        id: `ca_${String(i + 1).padStart(3, "0")}`, subject: "ga", topic: "current_affairs", difficulty: "SSC_LEVEL",
        question: c.q, options: c.options.slice(), correct: c.correct, explanation: c.explanation, trap: "",
        source: "AI-COMPILED CURRENT AFFAIRS — " + c.source, eventDate: c.eventDate, category: c.category, estimatedTime: 30, isCurrentAffairs: true
      });
    });
    return qs;
  }

  /* Content quality control: exactly one correct answer, 4 distinct options, explanation present */
  function validateQuestion(q) {
    const errs = [];
    if (!q.question || q.question.trim().length < 3) errs.push("empty question");
    if (!Array.isArray(q.options) || q.options.length !== 4) errs.push("needs 4 options");
    else {
      const set = new Set(q.options.map(o => String(o).trim().toLowerCase()));
      if (set.size !== 4) errs.push("duplicate options");
      if (q.options.some(o => String(o).trim() === "")) errs.push("blank option");
    }
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4)) errs.push("bad correct index");
    if (!q.explanation || q.explanation.length < 2) errs.push("missing explanation");
    if (!(q.difficulty in DIFF_RANK)) errs.push("bad difficulty");
    if (!window.TOPIC_MAP || !window.TOPIC_MAP[q.topic]) errs.push("unknown topic " + q.topic);
    if (/fails validation/i.test(q.explanation)) errs.push("flagged by author");
    return errs;
  }

  function validateBank(qs) {
    const bad = [];
    const seen = new Set();
    qs.forEach(q => {
      const e = validateQuestion(q);
      const key = (q.question.trim() + "|" + q.options.join("|")).toLowerCase();
      if (seen.has(key)) e.push("duplicate question text");
      seen.add(key);
      if (e.length) bad.push({ id: q.id, errors: e });
    });
    return bad;
  }

  /* ---------- Topic state helpers ---------- */
  function topicState(state, id) {
    if (!state.topics[id]) state.topics[id] = { mastery: "NOT_STARTED", attempts: 0, correct: 0, recent: [], lastStudied: null, lastRevised: null, nextReview: null, interval: 0, lapses: 0, manual: {}, timeTotal: 0, timedCorrect: 0, timedAttempts: 0, conceptTest: null, introducedAt: null };
    return state.topics[id];
  }

  function accuracy(ts, n) {
    const arr = n ? ts.recent.slice(-n) : ts.recent;
    if (!arr.length) return null;
    return arr.filter(x => x.c).length / arr.length;
  }

  /* Demonstrated-performance mastery (no fake progress: opening a lesson only gives INTRODUCED) */
  function computeMastery(ts) {
    if (ts.manual && ts.manual.known) return "STRONG";
    if (!ts.introducedAt && ts.attempts === 0) return "NOT_STARTED";
    const n = ts.recent.length;
    if (n < 5) return ts.attempts === 0 ? "INTRODUCED" : "LEARNING";
    const acc10 = accuracy(ts, 10);
    const acc20 = accuracy(ts, 20);
    const sscAcc = sscLevelAccuracy(ts);
    const timedOk = ts.timedAttempts >= 5 ? ts.timedCorrect / ts.timedAttempts >= 0.7 : false;
    const retained = ts.interval >= 14 && ts.lapses <= 1;
    let m;
    if (acc10 < 0.5) m = "LEARNING";
    else if (acc10 < 0.7) m = "PRACTICING";
    else if (acc10 < 0.85 || n < 15) m = "COMPETENT";
    else if (sscAcc >= 0.75 && timedOk) m = retained && acc20 >= 0.85 ? "MASTERED" : "STRONG";
    else m = "COMPETENT";
    // decay: no revision for long → drop one level
    if (ts.lastRevised || ts.lastStudied) {
      const days = daysSince(ts.lastRevised || ts.lastStudied);
      if (days > 45 && MASTERY.indexOf(m) >= 4) m = MASTERY[MASTERY.indexOf(m) - 1];
    }
    return m;
  }

  function sscLevelAccuracy(ts) {
    const arr = ts.recent.filter(r => r.d === "SSC_LEVEL" || r.d === "HARD");
    if (arr.length < 3) return 0;
    return arr.filter(r => r.c).length / arr.length;
  }

  function daysSince(iso) { if (!iso) return 9999; return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }
  function addDays(dateStr, n) { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  /* ---------- Mistake classification ("Why am I wrong?") ---------- */
  function classifyError(q, chosen, timeSec, confidence, ts) {
    // Heuristics: fast+wrong+high confidence → careless; very slow → time pressure; guess → guessing;
    // repeated wrong in same topic → concept; low accuracy topic → concept; else confusion.
    const est = q.estimatedTime || 45;
    if (confidence === "guess") return "GUESSING_ERROR";
    if (timeSec > est * 2) return "TIME_PRESSURE";
    if (confidence === "high" && timeSec < est * 0.5) return "CARELESS_MISTAKE";
    const acc = ts ? accuracy(ts, 10) : null;
    if (acc !== null && acc < 0.5) return "CONCEPT_ERROR";
    if (q.subject === "ga") return "MEMORY_ERROR";
    if (q.subject === "math" && q.trap && timeSec >= est * 0.5) return "CONCEPT_ERROR";
    if (q.subject === "math") return "CALCULATION_ERROR";
    if (q.subject === "english" && /find the error|improve/i.test(q.question)) return "READING_ERROR";
    return "CONFUSION";
  }

  const ERROR_LABELS = {
    CONCEPT_ERROR: "Concept error", CALCULATION_ERROR: "Calculation error", READING_ERROR: "Reading error", MEMORY_ERROR: "Memory error",
    CONFUSION: "Confusion", CARELESS_MISTAKE: "Careless mistake", TIME_PRESSURE: "Time pressure", GUESSING_ERROR: "Guessing error"
  };

  function whyWrongMessage(q, chosen) {
    // Specific reasoning where the option chosen matches a known trap
    const base = q.trap ? "Possible issue: " + q.trap : "Aksar log yahan option ko jaldi mein chun lete hain.";
    const chosenTxt = q.options[chosen];
    if (q.subject === "math" && /%/.test(q.question) && /25%/.test(q.question) && /80/.test(chosenTxt)) return "Possible issue: 25% ko 1/3 le liya (sahi: 1/4).";
    return base;
  }

  /* ---------- Record an attempt (core update path) ---------- */
  function recordAttempt(state, q, chosen, timeSec, confidence, mode) {
    const ts = topicState(state, q.topic);
    const correct = chosen === q.correct;
    const errorType = correct ? null : classifyError(q, chosen, timeSec, confidence, ts);
    const att = { id: "a" + Date.now() + Math.random().toString(36).slice(2, 6), qid: q.id, topic: q.topic, subject: q.subject, difficulty: q.difficulty, correct, timeSec: Math.round(timeSec), confidence: confidence || null, date: new Date().toISOString(), mode: mode || "practice", errorType, chosen };
    state.attempts.push(att);
    ts.attempts++; if (correct) ts.correct++;
    ts.recent.push({ c: correct, d: q.difficulty, t: Math.round(timeSec), at: att.date });
    if (ts.recent.length > 40) ts.recent.shift();
    ts.timeTotal += timeSec;
    if (mode === "timed" || mode === "mock") { ts.timedAttempts++; if (correct) ts.timedCorrect++; }
    ts.lastStudied = att.date;
    if (!ts.introducedAt) ts.introducedAt = att.date;
    const prevMastery = ts.mastery;
    ts.mastery = computeMastery(ts);
    if (!correct) addMistake(state, q, chosen, errorType, ts);
    else {
      // forgetting detection: if previously strong and now dipping
    }
    // schedule/adjust spaced repetition
    scheduleTopic(state, q.topic, correct);
    state.xp += correct ? (q.difficulty === "HARD" ? 4 : q.difficulty === "SSC_LEVEL" ? 3 : 2) : 1;
    return { att, correct, errorType, prevMastery, mastery: ts.mastery };
  }

  function addMistake(state, q, chosen, errorType, ts) {
    const existing = state.mistakes.find(m => m.qid === q.id);
    const today = Store.today();
    if (existing) {
      existing.repeatCount++; existing.date = today; existing.errorType = errorType;
      existing.nextReview = addDays(today, 1); existing.resolved = false;
      return existing;
    }
    const m = { id: "m" + Date.now() + Math.random().toString(36).slice(2, 5), qid: q.id, topic: q.topic, subject: q.subject, question: q.question, studentAnswer: q.options[chosen], correctAnswer: q.options[q.correct], errorType, reason: whyWrongMessage(q, chosen), concept: q.explanation, date: today, nextReview: addDays(today, 1), repeatCount: 1, resolved: false, reviews: 0 };
    state.mistakes.push(m);
    return m;
  }

  /* ---------- Spaced repetition (adaptive) ---------- */
  function scheduleTopic(state, topicId, success) {
    const ts = topicState(state, topicId);
    const today = Store.today();
    if (success) {
      const acc = accuracy(ts, 5);
      if (acc !== null && acc >= 0.8) {
        const idx = Math.min(INTERVALS.indexOf(ts.interval) + 1, INTERVALS.length - 1);
        ts.interval = INTERVALS[Math.max(idx, 0)];
        if (ts.lapses >= 2) ts.interval = Math.max(1, Math.floor(ts.interval / 2)); // repeat-forgetter → more frequent
      } else if (!ts.interval) ts.interval = 1;
    } else {
      if (ts.interval >= 7) ts.lapses++;
      ts.interval = 1;
    }
    ts.nextReview = addDays(today, ts.interval || 1);
  }

  function markRevised(state, topicId, success) {
    const ts = topicState(state, topicId);
    ts.lastRevised = new Date().toISOString();
    scheduleTopic(state, topicId, success);
    ts.mastery = computeMastery(ts);
  }

  function revisionQueue(state) {
    const today = Store.today();
    const topics = Object.entries(state.topics).filter(([id, ts]) => ts.nextReview && ts.nextReview <= today && ts.attempts > 0 && !(ts.manual && ts.manual.skip))
      .map(([id, ts]) => ({ type: "topic", id, name: TOPIC_MAP[id].name, subject: TOPIC_MAP[id].subject, due: ts.nextReview, priority: priorityScore(state, id) }));
    const mistakes = state.mistakes.filter(m => !m.resolved && m.nextReview <= today)
      .map(m => ({ type: "mistake", id: m.id, name: m.question.slice(0, 60), subject: m.subject, topic: m.topic, due: m.nextReview, priority: 50 + m.repeatCount * 10 }));
    const vocab = Object.entries(state.vocab).filter(([w, v]) => v.nextReview <= today).map(([w]) => ({ type: "vocab", id: w, name: w, subject: "english", priority: 30 }));
    return { topics: topics.sort((a, b) => b.priority - a.priority), mistakes: mistakes.sort((a, b) => b.priority - a.priority), vocab, total: topics.length + mistakes.length + vocab.length };
  }

  /* Vocab SRS (simple SM-2-like) */
  function reviewVocab(state, word, quality /*0 forgot,1 hard,2 good*/) {
    const v = state.vocab[word] || { interval: 0, ease: 2.3, lapses: 0, seen: 0, nextReview: Store.today() };
    v.seen++;
    if (quality === 0) { v.lapses++; v.interval = 1; v.ease = Math.max(1.3, v.ease - 0.2); }
    else { v.interval = v.interval === 0 ? 1 : v.interval === 1 ? 3 : Math.round(v.interval * (quality === 1 ? 1.3 : v.ease)); if (quality === 2) v.ease = Math.min(3, v.ease + 0.05); }
    v.nextReview = addDays(Store.today(), v.interval);
    state.vocab[word] = v;
    state.xp += 1;
  }

  /* ---------- Weakness / priority ---------- */
  function weaknessScore(state, topicId) {
    // 0..100 higher = weaker. Rolling: recent accuracy, repeated mistakes, time, confidence
    const ts = state.topics[topicId];
    if (!ts || ts.attempts < 3) return null;
    const acc = accuracy(ts, 15);
    const recentAcc = accuracy(ts, 5) ?? acc;
    const mist = state.mistakes.filter(m => m.topic === topicId && !m.resolved).length;
    const repeats = state.mistakes.filter(m => m.topic === topicId && m.repeatCount > 1).length;
    const avgT = ts.recent.length ? ts.recent.reduce((s, r) => s + r.t, 0) / ts.recent.length : 45;
    const slow = Math.min(1, Math.max(0, (avgT - 60) / 60));
    const overconf = state.attempts.filter(a => a.topic === topicId && !a.correct && a.confidence === "high").length;
    let s = (1 - acc) * 55 + (1 - recentAcc) * 20 + Math.min(mist, 5) * 3 + repeats * 3 + slow * 6 + Math.min(overconf, 3) * 2;
    return Math.round(Math.min(100, s));
  }

  function priorityScore(state, topicId) {
    // Study ROI: exam weight × weakness × prerequisite-importance × recency
    const t = TOPIC_MAP[topicId];
    const ts = state.topics[topicId];
    const w = weaknessScore(state, topicId);
    const dependents = TOPICS.filter(x => x.prereq.includes(topicId)).length;
    let p = t.weight * 10 + dependents * 4;
    if (w === null) p += (ts && ts.attempts) ? 10 : 20; // unseen topic: moderate priority (need to start)
    else p += w * 0.6;
    if (ts && ts.mastery === "MASTERED") p -= 40;
    if (ts && ts.mastery === "STRONG") p -= 20;
    if (ts && ts.manual && ts.manual.skip) p -= 100;
    if (!prereqsReady(state, topicId)) p -= 30;
    return Math.round(p);
  }

  function prereqsReady(state, topicId) {
    const t = TOPIC_MAP[topicId];
    return t.prereq.every(p => { const ts = state.topics[p]; return ts && MASTERY.indexOf(ts.mastery) >= MASTERY.indexOf("PRACTICING"); });
  }

  function missingPrereqs(state, topicId) {
    return TOPIC_MAP[topicId].prereq.filter(p => { const ts = state.topics[p]; return !(ts && MASTERY.indexOf(ts.mastery) >= MASTERY.indexOf("PRACTICING")); });
  }

  function weakTopics(state, n) {
    return Object.keys(state.topics).map(id => ({ id, name: TOPIC_MAP[id].name, subject: TOPIC_MAP[id].subject, score: weaknessScore(state, id), mastery: state.topics[id].mastery }))
      .filter(x => x.score !== null && x.score >= 35).sort((a, b) => b.score - a.score).slice(0, n || 5);
  }

  /* Prerequisite detector: if struggling with X, is a prereq actually the problem? */
  function diagnoseStruggle(state, topicId) {
    const missing = missingPrereqs(state, topicId);
    const weakPre = TOPIC_MAP[topicId].prereq.filter(p => (weaknessScore(state, p) || 0) >= 45);
    if (weakPre.length) return { type: "prereq", topics: weakPre };
    if (missing.length) return { type: "prereq_unseen", topics: missing };
    return { type: "self" };
  }

  /* ---------- Adaptive difficulty ---------- */
  function targetDifficulty(state, topicId) {
    const override = state.settings.difficultyOverride;
    if (override) return override;
    const ts = state.topics[topicId];
    const acc = ts ? accuracy(ts, 10) : null;
    if (acc === null) return state.settings.beginnerMode ? "EASY" : "BEGINNER";
    if (acc < 0.4) return "EASY";
    if (acc < 0.6) return "BEGINNER";
    if (acc < 0.75) return "BEGINNER+";
    if (acc < 0.9) return "SSC_LEVEL";
    return "HARD";
  }

  function pickQuestions(state, qs, topicId, n, opts) {
    opts = opts || {};
    const tgt = opts.difficulty || targetDifficulty(state, topicId);
    const allowed = tgt === "EASY" ? ["EASY", "BEGINNER"] : tgt === "BEGINNER" ? ["EASY", "BEGINNER", "SSC_LEVEL"] : tgt === "BEGINNER+" ? ["BEGINNER", "SSC_LEVEL"] : tgt === "SSC_LEVEL" ? ["BEGINNER", "SSC_LEVEL", "HARD"] : ["SSC_LEVEL", "HARD"];
    const recentIds = new Set(state.attempts.slice(-150).filter(a => a.correct).map(a => a.qid));
    let pool = qs.filter(q => q.topic === topicId && allowed.includes(q.difficulty));
    if (opts.excludeIds) pool = pool.filter(q => !opts.excludeIds.has(q.id));
    // prefer not-recently-correct
    const fresh = pool.filter(q => !recentIds.has(q.id));
    const ordered = shuffle(fresh).concat(shuffle(pool.filter(q => recentIds.has(q.id))));
    // order easy → hard within pick for gentle ramp
    return ordered.slice(0, n).sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* Concept recovery detection: 3 consecutive wrong or recent acc < 40% with ≥6 attempts */
  function needsRecovery(state, topicId) {
    const ts = state.topics[topicId];
    if (!ts || ts.recent.length < 4) return false;
    const last3 = ts.recent.slice(-3);
    if (last3.every(r => !r.c)) return true;
    const acc = accuracy(ts, 8);
    return ts.recent.length >= 6 && acc < 0.4;
  }

  /* Forgetting detection */
  function forgettingTopics(state) {
    return Object.entries(state.topics).filter(([id, ts]) => {
      if (ts.recent.length < 12) return false;
      const old = ts.recent.slice(-12, -4), nw = ts.recent.slice(-4);
      const oa = old.filter(r => r.c).length / old.length, na = nw.filter(r => r.c).length / nw.length;
      return oa >= 0.75 && na <= 0.5;
    }).map(([id]) => id);
  }

  /* ---------- Speed profile ---------- */
  function speedProfile(state, topicId) {
    const ts = state.topics[topicId];
    if (!ts || ts.recent.length < 5) return null;
    const acc = accuracy(ts, 15);
    const avgT = ts.recent.slice(-15).reduce((s, r) => s + r.t, 0) / Math.min(15, ts.recent.length);
    const target = 55;
    const fast = avgT <= target, accurate = acc >= 0.7;
    const label = fast && accurate ? "Fast & accurate" : !fast && accurate ? "Slow but accurate" : fast && !accurate ? "Fast but inaccurate" : "Slow and inaccurate";
    const advice = { "Fast & accurate": "Is topic mein aap ready ho — ab mixed/timed sets karo.", "Slow but accurate": `Accuracy achhi hai, par average ${Math.round(avgT)}s lag raha hai. Roz 10 timed questions karo.`, "Fast but inaccurate": "Jaldi mein galtiyan ho rahi hain. Har question mein 5 second extra lo aur options dobara padho.", "Slow and inaccurate": "Concept dobara dekho — pehle accuracy, phir speed." }[label];
    return { label, avgT: Math.round(avgT), acc: Math.round(acc * 100), advice };
  }

  /* ---------- Fatigue detection (within a session) ---------- */
  function fatigueCheck(sessionAttempts) {
    if (sessionAttempts.length < 10) return null;
    const first = sessionAttempts.slice(0, Math.floor(sessionAttempts.length / 2)), last = sessionAttempts.slice(-5);
    const acc1 = first.filter(a => a.correct).length / first.length, acc2 = last.filter(a => a.correct).length / last.length;
    const t1 = first.reduce((s, a) => s + a.timeSec, 0) / first.length, t2 = last.reduce((s, a) => s + a.timeSec, 0) / last.length;
    const careless = last.filter(a => a.errorType === "CARELESS_MISTAKE").length;
    if ((acc1 - acc2 >= 0.3 && t2 > t1 * 1.3) || careless >= 3) return "Performance thodi gir rahi hai (accuracy aur time dono). Ye knowledge ki kami nahi, thakaan ho sakti hai — 5 minute ka break lo.";
    return null;
  }

  /* ---------- Confidence matrix ---------- */
  function confidenceMatrix(state) {
    const a = state.attempts.filter(x => x.confidence);
    const m = { cc: 0, cw: 0, uc: 0, uw: 0 };
    a.forEach(x => { const conf = x.confidence === "high" || x.confidence === "medium"; if (conf && x.correct) m.cc++; else if (conf) m.cw++; else if (x.correct) m.uc++; else m.uw++; });
    const total = a.length || 1;
    let note = null;
    if (m.cw / total > 0.15) note = "Overconfidence pattern: kai baar 'high confidence' par galat. Answer lock karne se pehle ek baar options dobara padho.";
    else if (m.uc / total > 0.2) note = "Underconfidence pattern: aap 'unsure' hote hue bhi sahi kar rahe ho. Apni method par bharosa rakho — exam mein aise questions attempt karo.";
    return { ...m, total: a.length, note };
  }

  /* ---------- Error pattern ---------- */
  function errorPattern(state, days) {
    const since = Date.now() - (days || 14) * 86400000;
    const counts = {};
    state.attempts.filter(a => !a.correct && new Date(a.date).getTime() >= since).forEach(a => counts[a.errorType] = (counts[a.errorType] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ type: k, label: ERROR_LABELS[k], count: v }));
  }

  /* ---------- Readiness score (NOT an official probability) ---------- */
  function readinessScore(state) {
    const total = TOPICS.length;
    const ms = TOPICS.map(t => state.topics[t.id]?.mastery || "NOT_STARTED");
    const covered = ms.filter(m => MASTERY.indexOf(m) >= 3).length / total;
    const strong = ms.filter(m => MASTERY.indexOf(m) >= 4).length / total;
    const recent = state.attempts.slice(-200);
    const acc = recent.length ? recent.filter(a => a.correct).length / recent.length : 0;
    const mocks = state.mocks.slice(-3);
    const mockPct = mocks.length ? mocks.reduce((s, m) => s + m.score / m.maxScore, 0) / mocks.length : 0;
    const avgT = recent.length ? recent.reduce((s, a) => s + a.timeSec, 0) / recent.length : 90;
    const speed = Math.max(0, Math.min(1, (90 - avgT) / 50));
    const q = revisionQueue(state);
    const revisionOk = Math.max(0, 1 - q.total / 40);
    const weak = weakTopics(state, 20).length;
    const weakPenalty = Math.max(0, 1 - weak / 15);
    const repeats = state.mistakes.filter(m => m.repeatCount > 1 && !m.resolved).length;
    const repeatPenalty = Math.max(0, 1 - repeats / 20);
    // Gate: speed/revision/penalty components only count in proportion to actual coverage & practice volume,
    // so a brand-new student cannot get "free" points.
    const gate = Math.min(1, recent.length / 150) * Math.min(1, covered / 0.3);
    const score = Math.round(100 * (covered * 0.2 + strong * 0.15 + acc * 0.15 * Math.min(1, recent.length / 50) + mockPct * 0.2 + gate * (speed * 0.1 + revisionOk * 0.07 + weakPenalty * 0.08 + repeatPenalty * 0.05)));
    return { score, parts: { syllabus: Math.round(covered * 100), mastery: Math.round(strong * 100), accuracy: Math.round(acc * 100), mocks: Math.round(mockPct * 100), speed: Math.round(speed * 100), revision: Math.round(revisionOk * 100), weakTopics: weak, repeatedMistakes: repeats } };
  }

  /* ---------- Streak / achievements ---------- */
  function touchStreak(state) {
    const t = Store.today();
    if (state.streak.lastDate === t) return;
    const y = addDays(t, -1);
    state.streak.current = state.streak.lastDate === y ? state.streak.current + 1 : 1;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
    state.streak.lastDate = t;
  }

  const ACHIEVEMENTS = [
    { id: "first_day", name: "Day 1 Done", test: s => s.sessions.some(x => x.endedAt) },
    { id: "streak7", name: "7-Day Streak", test: s => s.streak.best >= 7 },
    { id: "q100", name: "100 Questions Solved", test: s => s.attempts.length >= 100 },
    { id: "q500", name: "500 Questions Solved", test: s => s.attempts.length >= 500 },
    { id: "first_mock", name: "First Mock", test: s => s.mocks.length >= 1 },
    { id: "acc80", name: "First 80% Accuracy Session", test: s => s.sessions.some(x => x.total >= 10 && x.correct / x.total >= 0.8) },
    { id: "recovered", name: "Weak Topic Recovered", test: s => Object.values(s.topics).some(ts => ts.recoveredOnce) },
    { id: "mistakes20", name: "20 Mistakes Reviewed", test: s => s.mistakes.filter(m => m.reviews > 0).length >= 20 }
  ];
  function checkAchievements(state) {
    const got = new Set(state.achievements.map(a => a.id)); const fresh = [];
    ACHIEVEMENTS.forEach(a => { if (!got.has(a.id) && a.test(state)) { state.achievements.push({ id: a.id, name: a.name, date: Store.today() }); fresh.push(a); } });
    return fresh;
  }

  window.Engine = { DIFF_RANK, MASTERY, INTERVALS, ERROR_LABELS, ACHIEVEMENTS, buildQuestions, validateQuestion, validateBank, topicState, accuracy, computeMastery, recordAttempt, classifyError, whyWrongMessage, scheduleTopic, markRevised, revisionQueue, reviewVocab, weaknessScore, priorityScore, prereqsReady, missingPrereqs, weakTopics, diagnoseStruggle, targetDifficulty, pickQuestions, shuffle, needsRecovery, forgettingTopics, speedProfile, fatigueCheck, confidenceMatrix, errorPattern, readinessScore, touchStreak, checkAchievements, daysSince, addDays };
})();
