# SSC CGL Mentor — beginner-first preparation system (Android APK + web)

**Deliverables**

| File | What |
|---|---|
| `SSC-CGL-Mentor-v1.0.apk` | Signed release APK (≈3 MB). Android 5.1+ (API 22), phone + tablet. Fully offline. |
| `SSC-CGL-Mentor-v1.0-debug.apk` | Debug build (same app, debuggable). |
| `www/` | The complete app (also runs as a PWA on laptop/desktop browser). |
| `android/` | Capacitor Android project (rebuild with `npm run apk`). |
| `tests/run.js` | Headless test suite (36 tests) — `npm test`. |
| `docs/` | Screenshots from the automated end-to-end run, architecture & content notes. |

## Install the APK
1. Copy `SSC-CGL-Mentor-v1.0.apk` to the phone/tablet.
2. Open it → allow "Install from unknown sources" for your file manager if asked.
3. Launch **SSC CGL Mentor**. No internet, no account needed.

Laptop: open `www/index.html` via any static server (`npm run serve` → http://localhost:8080) — the layout switches to a sidebar at ≥900 px. Add `?demo=1` to the URL on first run to load the demo dataset.

## What the student experiences
1. **Welcome → "Are you a complete beginner?" → daily time → subject confidence → details → Student Profile**
2. **Diagnostic test** (~20 Q, easy/beginner level, confidence prompt) → **Your Starting Point** (strong / weak / very weak, careless vs conceptual, time issues) → **Your First 7 Days** → **START DAY 1**
3. **Home** always answers "Today, do this" with one next action; readiness score, revision due, top weak topics, syllabus phase, small wins (data-based).
4. **Today's Study** = generated plan: revision queue → (concept recovery / forgetting refresh) → Learn+Practice per subject (weighted by weakness, prerequisite-ordered, max 2–3 new concepts/day) → mixed timed sets → mistake review → vocabulary. Modes: **busy (10 min), emergency (20–35), normal, deep (4h+, with breaks), final-30, final-7**. Missed days are redistributed, never dumped.
5. **Lesson** (12-part beginner format, Hinglish, glossary tooltips, prerequisite check, speed profile, "I already know this / skip / harder" overrides, Explain-it-back).
6. **Practice player**: adaptive difficulty (<40% → EASY … >90% → HARD), 3-level hints, confidence capture, *Why am I wrong?* with error classification (concept / calculation / reading / memory / confusion / careless / time-pressure / guessing), why other options are wrong, fatigue detection, keyboard support, pause (idle time not counted).
7. **Concept Recovery Mode** triggers automatically on repeated failure (re-explain differently → 1 diagnostic → 3 easy → ramp → retest); **Prerequisite detector** redirects (e.g., Profit & Loss failure → Percentage).
8. **Mistake Book** (search, filters, repeat counts, next revision date, error-pattern summary, CSV export).
9. **Spaced repetition** 1/3/7/14/30/60 days, adaptive (repeat-forgetters get shorter intervals); topic queue + mistake queue + vocabulary SRS + blind recall sessions.
10. **Mocks**: full (100 Q / 60 min, Tier-I marking from config), mini full, subject, topic, weak-topic, speed, revision, exam-pressure simulator (no back-navigation). Palette, mark-for-review, section jump. **Analysis**: "you lost marks mainly because…", per-subject/topic, careless & slow questions, strategy, **7-day recovery plan**; results feed the planner.
11. **Progress**: readiness breakdown, accuracy/questions/minutes trends, subject bars, mock trend, speed-vs-accuracy groups, confidence matrix (over/under-confidence), topic table, weekly review, monthly report, achievements.
12. **Tutor** (offline, rule-based): identifies topic → simple explanation → example → one check question → practice; "aaj kya padhun?", "meri weakness kya hai?", "baar-baar X mein galti".
13. **Settings**: time, target date, Beginner Mode, difficulty override, language, reminders, text size, high contrast, export (JSON/CSV), import progress, **import question banks (validated JSON/CSV)**, backups (never overwrite; auto-backup before import/restore), reset plan (Zero-Day Backlog Mode), demo data, self-test.

## Architecture (clean separation, no frameworks)
```
www/
  data/syllabus.js   EXAM_CONFIG (labelled OFFICIAL, verify date), SUBJECTS, TOPICS (prereqs, weights), PHASES, STRATEGY_LESSONS
  data/lessons.js    86 lessons (12-part beginner format)
  data/questions.js  469 validated AI-generated practice questions + date-labelled current-affairs examples
  data/vocab.js      vocabulary deck (word, meaning, Hindi, sentence, syn/ant, trick)
  js/store.js        local-first persistence, schema migration, export/import, backups
  js/engine.js       question bank build+validation, mastery, weakness/priority (ROI), SRS, mistake classification,
                     adaptive difficulty, recovery/forgetting/fatigue detection, confidence matrix, readiness score
  js/planner.js      phase detection, daily plan (all modes), missed-day recovery, weekly/monthly reports, mock recovery plan
  js/mock.js         mock builder, config-driven scoring, analysis
  js/ui.js           router, primitives, SVG charts, idle-aware timer
  js/practice.js     question player (hints, confidence, why-wrong, focus mode)
  js/views.core.js   onboarding, diagnostic, home, today, lesson, syllabus
  js/views.more.js   revision, mistakes, vocab, recall, mocks, analytics, tutor, practice hub, pomodoro, settings, self-test
  js/app.js          bootstrap, question import, demo data, self-tests, theme, reminders, Android back button
```
Data model (JSON in localStorage, versioned): `user, settings, diagnostic, topics{}, attempts[], mistakes[], sessions[], mocks[], plans{}, vocab{}, achievements[], streak`. Custom questions live under a separate key.

## Build from source
```
npm install
npm test                       # 36 headless tests + one-month simulation
npm run apk                    # needs JDK 17 + Android SDK 34 (ANDROID_HOME); output android/app/build/outputs/apk/debug/
# release: ./gradlew assembleRelease, then zipalign + apksigner (see keystore/ — demo key, replace for Play Store)
```

## Honesty / content rules implemented
- Exam facts are in one config block, labelled **OFFICIAL — based on SSC CGL 2024 notification, last verified 2025-06**, with an explicit "verify latest notification" note on every screen that shows them.
- Every question is labelled **AI-generated practice** (or **AI-compiled current affairs + event date + source**). No question is claimed to be an official/PYQ question. Imported questions are labelled *Imported (unverified)*.
- Readiness is labelled "Preparation Readiness Score — internal estimate, not an SSC probability". No selection guarantees anywhere.
- Mastery is demonstrated-performance only (opening a lesson ⇒ *Introduced*, never *Completed*). Mastery decays if not revised.

## Known limits (stated, not hidden)
- No real previous-year question database (would require verified sourcing) — PYQ filters therefore aren't shown; "PYQ-style" phase uses SSC-level practice instead.
- Tutor is rule-based offline (no LLM) — it teaches from lesson content and your data, it cannot solve arbitrary pasted questions.
- Non-verbal reasoning has text-described drills, not rendered figure banks.
- Current-affairs items are dated examples; the student must add a monthly compilation (import supported).
- Reminders are in-app nudges (no OS push notifications).
