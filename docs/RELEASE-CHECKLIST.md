# Release checklist (verified by automated E2E + unit tests, 2026-09-05)
[x] Beginner onboarding works (E2E)            [x] Diagnostic test works (E2E)
[x] Personalized plan works (unit+E2E)          [x] Daily study mode works (E2E: lesson→practice→task done)
[x] Math / English / Reasoning / GA modules     [x] Question engine (469 Q, all validated, 0 issues)
[x] Solution engine (answer/steps/trap/why-wrong/other options)
[x] Hint system (3 levels)                      [x] Mistake book (auto-classified, searchable, CSV)
[x] Revision engine (SRS adaptive, queue)       [x] Mock tests (7 types, palette, timer)
[x] Mock analysis + 7-day recovery              [x] Weakness detection (rolling, prerequisite-aware)
[x] Progress analytics (SVG charts)             [x] Search & filtering (mistake book, CA date filter)
[x] Import / Export (JSON, CSV, question banks) [x] Backup / Restore (never overwrite, auto pre-backup)
[x] Offline (all assets local in APK; SW for web)
[x] Error handling (router try/catch, storage fail toast, corrupt-state recovery)
[x] Empty states on every list                  [x] Responsive: 390px phone, 820px tablet, 1366px laptop (screenshots)
[x] Accessibility: keyboard, focus rings, text-size, high-contrast, text labels alongside colour
[x] Demo data (Settings → Load demo / ?demo=1)  [x] Self-test passes (36/36 in Node and in Chromium)
[x] No fake buttons / placeholders              [x] No fabricated official info or PYQ claims
[x] No guaranteed-selection claims
