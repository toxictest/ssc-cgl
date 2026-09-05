/* ============================================================
   STORE — local-first persistence (localStorage), schema, backup/restore.
   Nothing leaves the device. No account, no personal data beyond what the
   student types (a display name is optional).
   ============================================================ */
(function () {
  const KEY = "sscmentor.v1";
  const BACKUP_INDEX = "sscmentor.backups";
  const SCHEMA_VERSION = 1;

  function today() { return new Date().toISOString().slice(0, 10); }

  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      user: null,               // profile from onboarding (see onboarding.js)
      settings: { language: "hinglish", beginnerMode: true, pomodoro: "25/5", reminders: false, difficultyOverride: null, fontScale: 1, highContrast: false },
      diagnostic: null,         // { date, results:[...], summary }
      topics: {},               // topicId -> { mastery, attempts, correct, recentAcc[], lastStudied, lastRevised, nextReview, interval, lapses, manual:{known,skip}, introducedAt, timeAvg }
      attempts: [],             // every question attempt {id,qid,topic,correct,timeSec,confidence,date,mode,errorType,chosen}
      mistakes: [],             // mistake book entries
      sessions: [],             // study sessions {date,startedAt,endedAt,activeSec,tasks:[...]}
      mocks: [],                // mock attempts
      plans: {},                // date -> daily plan
      vocab: {},                // word -> {interval,nextReview,ease,lapses,seen}
      achievements: [],         // {id,date}
      xp: 0,
      streak: { current: 0, best: 0, lastDate: null },
      weeklyReviews: [],
      caProgress: {},           // current-affairs seen
      log: []                   // small event log for integrity checks
    };
  }

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { state = defaultState(); return state; }
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
    } catch (e) {
      console.error("State corrupted, starting fresh; previous state kept under recovery key.", e);
      try { localStorage.setItem(KEY + ".corrupt." + Date.now(), localStorage.getItem(KEY) || ""); } catch (_) {}
      state = defaultState();
    }
    return state;
  }

  function migrate(s) {
    const d = defaultState();
    // shallow-merge new keys so old saves keep working
    for (const k of Object.keys(d)) if (!(k in s)) s[k] = d[k];
    for (const k of Object.keys(d.settings)) if (!(k in s.settings)) s.settings[k] = d.settings[k];
    s.schemaVersion = SCHEMA_VERSION;
    return s;
  }

  let saveTimer = null;
  function save(immediate) {
    if (!state) return;
    const doSave = () => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.error("Save failed", e); UI && UI.toast && UI.toast("Storage full or unavailable — export a backup!", "error"); }
    };
    if (immediate) { clearTimeout(saveTimer); doSave(); return; }
    clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 150);
  }

  function reset() { state = defaultState(); save(true); }

  /* ---------- Export / Import ---------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }

  function validateImport(obj) {
    const errs = [];
    if (!obj || typeof obj !== "object") errs.push("Not a JSON object");
    else {
      if (!("topics" in obj) || !("attempts" in obj)) errs.push("Missing core fields (topics/attempts)");
      if (obj.attempts && !Array.isArray(obj.attempts)) errs.push("attempts must be an array");
      if (obj.mistakes && !Array.isArray(obj.mistakes)) errs.push("mistakes must be an array");
    }
    return errs;
  }

  function importJSON(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, errors: ["Invalid JSON: " + e.message] }; }
    const errors = validateImport(obj);
    if (errors.length) return { ok: false, errors };
    // never silently overwrite: auto-backup current first
    createBackup("auto-before-import");
    state = migrate(obj);
    save(true);
    return { ok: true };
  }

  function toCSV(rows, headers) {
    const esc = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    return [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  }

  function exportMistakesCSV() {
    return toCSV(state.mistakes, ["date", "topic", "question", "studentAnswer", "correctAnswer", "errorType", "reason", "nextReview", "repeatCount"]);
  }
  function exportAttemptsCSV() {
    return toCSV(state.attempts, ["date", "qid", "topic", "correct", "timeSec", "confidence", "mode", "errorType"]);
  }

  /* ---------- Backups (never overwrite) ---------- */
  function listBackups() {
    try { return JSON.parse(localStorage.getItem(BACKUP_INDEX) || "[]"); } catch (_) { return []; }
  }
  function createBackup(label) {
    const id = "bk_" + Date.now();
    const list = listBackups();
    try {
      localStorage.setItem(id, JSON.stringify(state));
      list.push({ id, label: label || "manual", date: new Date().toISOString(), attempts: state.attempts.length });
      // keep last 5 to respect storage
      while (list.length > 5) { const old = list.shift(); localStorage.removeItem(old.id); }
      localStorage.setItem(BACKUP_INDEX, JSON.stringify(list));
      return { ok: true, id };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  function restoreBackup(id) {
    const raw = localStorage.getItem(id);
    if (!raw) return { ok: false, errors: ["Backup not found"] };
    createBackup("auto-before-restore");
    return importJSON(raw);
  }
  function deleteBackup(id) {
    localStorage.removeItem(id);
    localStorage.setItem(BACKUP_INDEX, JSON.stringify(listBackups().filter(b => b.id !== id)));
  }

  function storageInfo() {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); used += (localStorage.getItem(k) || "").length * 2; }
    return { usedKB: Math.round(used / 1024) };
  }

  window.Store = { load, save, reset, get: () => state, today, exportJSON, importJSON, exportMistakesCSV, exportAttemptsCSV, toCSV, listBackups, createBackup, restoreBackup, deleteBackup, storageInfo, defaultState, SCHEMA_VERSION };
})();
