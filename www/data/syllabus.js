/* ============================================================
   EXAM STRUCTURE + SYLLABUS (configurable module)
   Each block is labelled with `kind`:
     "official"       -> taken from SSC notification (verify date below)
     "recommendation" -> preparation advice by this app (NOT an SSC rule)
     "estimate"       -> app estimate (difficulty / weight)
   Update `EXAM_CONFIG` when SSC publishes a new notification.
   ============================================================ */
window.EXAM_CONFIG = {
  kind: "official",
  examName: "SSC CGL (Combined Graduate Level)",
  basedOn: "SSC CGL 2024 notification (Tier-I pattern)",
  verifyNote: "Exam pattern, dates, eligibility and marking can change. Always verify against the LATEST official notification at ssc.gov.in before relying on it.",
  lastVerified: "2025-06",
  whatIsIt: "SSC CGL ek national-level exam hai jo Staff Selection Commission conduct karta hai. Isse Central Government ke Group B aur Group C posts (jaise Income Tax Inspector, Auditor, Assistant Section Officer, etc.) ke liye selection hota hai. Graduation complete hona zaroori hai.",
  tiers: [
    {
      name: "Tier-I (Computer Based, Qualifying + Screening)",
      totalQuestions: 100, totalMarks: 200, durationMin: 60,
      negativeMarking: 0.5, marksPerQuestion: 2,
      sections: [
        { id: "reasoning", name: "General Intelligence & Reasoning", questions: 25, marks: 50 },
        { id: "ga",        name: "General Awareness",                questions: 25, marks: 50 },
        { id: "math",      name: "Quantitative Aptitude",            questions: 25, marks: 50 },
        { id: "english",   name: "English Comprehension",            questions: 25, marks: 50 }
      ]
    },
    {
      name: "Tier-II Paper-I (Computer Based)",
      summary: "Session-I: Mathematical Abilities (30 Q) + Reasoning (30 Q) in 60 min; English (45 Q) + General Awareness (25 Q) in 60 min; Computer Knowledge module (20 Q, 15 min). 3 marks per question, negative 1 mark (Computer module: negative 1). Data Entry Speed Test in Session-II.",
      negativeMarking: 1, marksPerQuestion: 3
    }
  ]
};

/* ---------- Subjects ---------- */
window.SUBJECTS = [
  { id: "math",      name: "Mathematics",        short: "Math",      icon: "∑", color: "#2563eb" },
  { id: "english",   name: "English",            short: "English",   icon: "Aa", color: "#16a34a" },
  { id: "reasoning", name: "Reasoning",          short: "Reasoning", icon: "◈", color: "#9333ea" },
  { id: "ga",        name: "General Awareness",  short: "GA",        icon: "🌍", color: "#ea580c" }
];

/* ---------- Topic tree ----------
   prereq  : topics that should be at least COMPETENT first
   weight  : (estimate) historical importance 1..5 for Tier-I — label: "frequently tested" NOT "guaranteed"
   order   : learning order inside the subject
   tier    : "foundation" | "core" | "advanced"
*/
window.TOPICS = [
  /* ===== MATHEMATICS ===== */
  { id:"arith_found", subject:"math", name:"Arithmetic Foundation (tables, fractions, decimals)", order:1, prereq:[], weight:3, tier:"foundation" },
  { id:"number_system", subject:"math", name:"Number System", order:2, prereq:["arith_found"], weight:4, tier:"foundation" },
  { id:"simplification", subject:"math", name:"Simplification (BODMAS)", order:3, prereq:["arith_found"], weight:4, tier:"foundation" },
  { id:"divisibility", subject:"math", name:"Divisibility Rules", order:4, prereq:["number_system"], weight:3, tier:"foundation" },
  { id:"lcm_hcf", subject:"math", name:"LCM & HCF", order:5, prereq:["divisibility"], weight:3, tier:"foundation" },
  { id:"ratio", subject:"math", name:"Ratio & Proportion", order:6, prereq:["arith_found"], weight:4, tier:"core" },
  { id:"percentage", subject:"math", name:"Percentage", order:7, prereq:["arith_found"], weight:5, tier:"core" },
  { id:"average", subject:"math", name:"Average", order:8, prereq:["arith_found"], weight:4, tier:"core" },
  { id:"profit_loss", subject:"math", name:"Profit & Loss", order:9, prereq:["percentage"], weight:5, tier:"core" },
  { id:"discount", subject:"math", name:"Discount", order:10, prereq:["profit_loss"], weight:3, tier:"core" },
  { id:"si", subject:"math", name:"Simple Interest", order:11, prereq:["percentage"], weight:3, tier:"core" },
  { id:"ci", subject:"math", name:"Compound Interest", order:12, prereq:["si"], weight:4, tier:"core" },
  { id:"time_work", subject:"math", name:"Time & Work", order:13, prereq:["lcm_hcf","ratio"], weight:4, tier:"core" },
  { id:"pipes", subject:"math", name:"Pipes & Cisterns", order:14, prereq:["time_work"], weight:2, tier:"core" },
  { id:"tsd", subject:"math", name:"Time, Speed & Distance", order:15, prereq:["ratio"], weight:4, tier:"core" },
  { id:"boats", subject:"math", name:"Boats & Streams", order:16, prereq:["tsd"], weight:2, tier:"core" },
  { id:"mixture", subject:"math", name:"Mixture & Alligation", order:17, prereq:["ratio","average"], weight:3, tier:"core" },
  { id:"algebra", subject:"math", name:"Algebra (identities)", order:18, prereq:["simplification"], weight:5, tier:"advanced" },
  { id:"linear_eq", subject:"math", name:"Linear Equations", order:19, prereq:["algebra"], weight:2, tier:"advanced" },
  { id:"geometry", subject:"math", name:"Geometry (lines & angles)", order:20, prereq:["arith_found"], weight:4, tier:"advanced" },
  { id:"triangles", subject:"math", name:"Triangles", order:21, prereq:["geometry"], weight:4, tier:"advanced" },
  { id:"circles", subject:"math", name:"Circles", order:22, prereq:["geometry"], weight:4, tier:"advanced" },
  { id:"quadrilaterals", subject:"math", name:"Quadrilaterals & Polygons", order:23, prereq:["geometry"], weight:2, tier:"advanced" },
  { id:"mensuration", subject:"math", name:"Mensuration (2D & 3D)", order:24, prereq:["triangles","circles"], weight:5, tier:"advanced" },
  { id:"trigonometry", subject:"math", name:"Trigonometry", order:25, prereq:["triangles","algebra"], weight:5, tier:"advanced" },
  { id:"di", subject:"math", name:"Data Interpretation", order:26, prereq:["percentage","average","ratio"], weight:4, tier:"advanced" },

  /* ===== ENGLISH ===== */
  { id:"parts_speech", subject:"english", name:"Parts of Speech (basics)", order:1, prereq:[], weight:3, tier:"foundation" },
  { id:"tenses", subject:"english", name:"Tenses", order:2, prereq:["parts_speech"], weight:4, tier:"foundation" },
  { id:"sva", subject:"english", name:"Subject-Verb Agreement", order:3, prereq:["tenses"], weight:4, tier:"core" },
  { id:"articles", subject:"english", name:"Articles (a, an, the)", order:4, prereq:["parts_speech"], weight:3, tier:"foundation" },
  { id:"prepositions", subject:"english", name:"Prepositions", order:5, prereq:["parts_speech"], weight:4, tier:"core" },
  { id:"pronouns", subject:"english", name:"Pronouns", order:6, prereq:["parts_speech"], weight:3, tier:"core" },
  { id:"adj_adv", subject:"english", name:"Adjectives & Adverbs", order:7, prereq:["parts_speech"], weight:2, tier:"core" },
  { id:"conjunctions", subject:"english", name:"Conjunctions", order:8, prereq:["parts_speech"], weight:2, tier:"core" },
  { id:"vocab", subject:"english", name:"Vocabulary (daily words)", order:9, prereq:[], weight:5, tier:"foundation" },
  { id:"synonyms", subject:"english", name:"Synonyms", order:10, prereq:["vocab"], weight:4, tier:"core" },
  { id:"antonyms", subject:"english", name:"Antonyms", order:11, prereq:["vocab"], weight:4, tier:"core" },
  { id:"ows", subject:"english", name:"One Word Substitution", order:12, prereq:["vocab"], weight:4, tier:"core" },
  { id:"idioms", subject:"english", name:"Idioms & Phrases", order:13, prereq:["vocab"], weight:4, tier:"core" },
  { id:"spelling", subject:"english", name:"Spelling", order:14, prereq:["vocab"], weight:3, tier:"core" },
  { id:"error_detection", subject:"english", name:"Error Detection", order:15, prereq:["sva","tenses","prepositions"], weight:5, tier:"advanced" },
  { id:"sentence_improvement", subject:"english", name:"Sentence Improvement", order:16, prereq:["error_detection"], weight:4, tier:"advanced" },
  { id:"fill_blanks", subject:"english", name:"Fill in the Blanks", order:17, prereq:["prepositions","vocab"], weight:4, tier:"core" },
  { id:"active_passive", subject:"english", name:"Active / Passive Voice", order:18, prereq:["tenses"], weight:4, tier:"advanced" },
  { id:"narration", subject:"english", name:"Direct / Indirect Speech", order:19, prereq:["tenses"], weight:4, tier:"advanced" },
  { id:"para_jumble", subject:"english", name:"Para Jumbles", order:20, prereq:["conjunctions"], weight:4, tier:"advanced" },
  { id:"cloze", subject:"english", name:"Cloze Test", order:21, prereq:["fill_blanks"], weight:4, tier:"advanced" },
  { id:"rc", subject:"english", name:"Reading Comprehension", order:22, prereq:["vocab"], weight:4, tier:"advanced" },

  /* ===== REASONING ===== */
  { id:"analogy", subject:"reasoning", name:"Analogy", order:1, prereq:[], weight:5, tier:"foundation" },
  { id:"classification", subject:"reasoning", name:"Classification (Odd one out)", order:2, prereq:[], weight:4, tier:"foundation" },
  { id:"series", subject:"reasoning", name:"Number & Letter Series", order:3, prereq:[], weight:5, tier:"foundation" },
  { id:"coding", subject:"reasoning", name:"Coding-Decoding", order:4, prereq:["series"], weight:5, tier:"core" },
  { id:"blood_relations", subject:"reasoning", name:"Blood Relations", order:5, prereq:[], weight:3, tier:"core" },
  { id:"direction", subject:"reasoning", name:"Direction Sense", order:6, prereq:[], weight:3, tier:"core" },
  { id:"ranking", subject:"reasoning", name:"Order & Ranking", order:7, prereq:[], weight:2, tier:"core" },
  { id:"syllogism", subject:"reasoning", name:"Syllogism", order:8, prereq:[], weight:4, tier:"core" },
  { id:"venn", subject:"reasoning", name:"Venn Diagram", order:9, prereq:["classification"], weight:3, tier:"core" },
  { id:"statement_conclusion", subject:"reasoning", name:"Statement & Conclusion", order:10, prereq:["syllogism"], weight:2, tier:"advanced" },
  { id:"missing_number", subject:"reasoning", name:"Missing Number (matrix)", order:11, prereq:["series"], weight:4, tier:"core" },
  { id:"math_ops", subject:"reasoning", name:"Mathematical Operations", order:12, prereq:["simplification"], weight:4, tier:"core" },
  { id:"calendar", subject:"reasoning", name:"Calendar", order:13, prereq:[], weight:2, tier:"advanced" },
  { id:"clock", subject:"reasoning", name:"Clock", order:14, prereq:[], weight:2, tier:"advanced" },
  { id:"mirror_water", subject:"reasoning", name:"Mirror & Water Image", order:15, prereq:[], weight:4, tier:"core" },
  { id:"paper_folding", subject:"reasoning", name:"Paper Folding & Cutting", order:16, prereq:[], weight:3, tier:"core" },
  { id:"embedded", subject:"reasoning", name:"Embedded Figures", order:17, prereq:[], weight:3, tier:"core" },
  { id:"figure_series", subject:"reasoning", name:"Figure Series", order:18, prereq:["series"], weight:3, tier:"core" },
  { id:"dice_cubes", subject:"reasoning", name:"Dice & Cubes", order:19, prereq:[], weight:3, tier:"advanced" },
  { id:"matrix_word", subject:"reasoning", name:"Matrix & Word Formation", order:20, prereq:[], weight:2, tier:"advanced" },

  /* ===== GENERAL AWARENESS ===== */
  { id:"polity", subject:"ga", name:"Indian Polity & Constitution", order:1, prereq:[], weight:5, tier:"foundation" },
  { id:"history_ancient", subject:"ga", name:"Ancient & Medieval History", order:2, prereq:[], weight:4, tier:"core" },
  { id:"history_modern", subject:"ga", name:"Modern History (Freedom struggle)", order:3, prereq:[], weight:4, tier:"core" },
  { id:"geography", subject:"ga", name:"Geography (India & World)", order:4, prereq:[], weight:4, tier:"core" },
  { id:"economics", subject:"ga", name:"Economics (basics)", order:5, prereq:[], weight:4, tier:"core" },
  { id:"physics", subject:"ga", name:"Physics", order:6, prereq:[], weight:3, tier:"core" },
  { id:"chemistry", subject:"ga", name:"Chemistry", order:7, prereq:[], weight:3, tier:"core" },
  { id:"biology", subject:"ga", name:"Biology", order:8, prereq:[], weight:4, tier:"core" },
  { id:"static_gk", subject:"ga", name:"Static GK (dams, parks, firsts)", order:9, prereq:[], weight:4, tier:"core" },
  { id:"art_culture", subject:"ga", name:"Art & Culture (dances, festivals)", order:10, prereq:[], weight:3, tier:"core" },
  { id:"environment", subject:"ga", name:"Environment & Ecology", order:11, prereq:[], weight:2, tier:"core" },
  { id:"organizations", subject:"ga", name:"Important Organizations", order:12, prereq:[], weight:2, tier:"advanced" },
  { id:"sports", subject:"ga", name:"Sports", order:13, prereq:[], weight:2, tier:"advanced" },
  { id:"awards_books", subject:"ga", name:"Awards, Books & Authors", order:14, prereq:[], weight:3, tier:"advanced" },
  { id:"important_days", subject:"ga", name:"Important Days", order:15, prereq:[], weight:2, tier:"advanced" },
  { id:"schemes", subject:"ga", name:"Government Schemes", order:16, prereq:[], weight:3, tier:"advanced" },
  { id:"computer", subject:"ga", name:"Computer Basics", order:17, prereq:[], weight:2, tier:"core" },
  { id:"current_affairs", subject:"ga", name:"Current Affairs (date-labelled)", order:18, prereq:[], weight:5, tier:"core", isCurrentAffairs:true }
];

window.TOPIC_MAP = Object.fromEntries(window.TOPICS.map(t => [t.id, t]));

/* ---------- Preparation phases (recommendation) ---------- */
window.PHASES = [
  { id:1, name:"Foundation", desc:"Basic arithmetic, grammar basics, reasoning patterns, Polity basics.", exit:"Foundation topics at least COMPETENT (≥70% accuracy on basic questions)." },
  { id:2, name:"Core Concepts", desc:"Percentage, Ratio, Tenses, SVA, Coding, Series, History/Geography.", exit:"Core topics at least PRACTICING; no VERY WEAK core topic." },
  { id:3, name:"Topic Practice", desc:"Topic-wise SSC-level practice with timing.", exit:"≥65% accuracy on SSC-level questions in each subject." },
  { id:4, name:"Mixed Practice", desc:"Interleaved sets: mixed topics per subject.", exit:"≥65% accuracy on mixed sets." },
  { id:5, name:"Previous-Year Style", desc:"PYQ-style pattern practice (only verified PYQs are labelled as such).", exit:"Comfortable with pattern; time per question within target." },
  { id:6, name:"Mocks", desc:"Full mocks every 3–4 days + analysis + 7-day recovery plans.", exit:"Stable mock scores, declining careless mistakes." },
  { id:7, name:"Revision", desc:"Mistake book, formula cards, vocabulary, GA recall.", exit:"Revision queue under control; mastery not decaying." },
  { id:8, name:"Final Strategy", desc:"Final 30 / 7 day modes; exam-day routine.", exit:"Exam day." }
];

/* ---------- Strategy lessons (recommendation) ---------- */
window.STRATEGY_LESSONS = [
  { id:"q_select", title:"Question Selection", body:"Paper mein sab questions equal marks ke hote hain (Tier-I: 2 marks each). Isliye pehle woh questions karo jo tumhe 30–40 second mein dikh jaayein ki easy hain. Har section mein 3 rounds: Round 1 = sure-shot, Round 2 = thoda time lagne wale, Round 3 = risky. Kabhi bhi ek question par 2 minute se zyada mat atko." },
  { id:"time_mgmt", title:"Time Management (Tier-I)", body:"60 minute, 100 questions = average 36 second per question. Recommendation (NOT official rule): Reasoning ~12 min, GA ~6–8 min, English ~10 min, Math ~25–28 min. GA mein soch kar time waste mat karo — ya to aata hai ya nahi." },
  { id:"guessing", title:"Guessing Strategy", body:"Negative marking 0.5 per wrong (Tier-I, verify latest). Agar 4 options mein se 2 confidently eliminate ho gaye, to attempt karna mathematically favourable hai. Agar kuch bhi idea nahi, skip karo." },
  { id:"accuracy", title:"Accuracy over Attempts", body:"Beginner ka goal: 70 accurate attempts > 95 random attempts. Har wrong answer 2.5 marks ka swing hai (2 lost + 0.5 negative)." },
  { id:"section_switch", title:"Section Switching", body:"Tier-I mein sections ke beech switch allowed hota hai (verify latest). Apna strongest section pehle karo taaki confidence bane, lekin GA ko end ke liye rakho kyunki usme sochne se answer nahi aata." },
  { id:"mock_analysis", title:"How to Analyse a Mock", body:"Score mat dekho, ye dekho: (1) kaunse questions galat hue aur kyun — concept ya careless? (2) kaunse sahi hue par 2 min se zyada lage? (3) kaunse chhod diye jo aate the? Har mock ke baad 3 weak topics pick karo — bas 3." },
  { id:"exam_day", title:"Exam-Day Routine", body:"Ek raat pehle: formula cards + mistake book ka sirf top 20. Exam wale din naya kuch nahi. Admit card, ID, 45 min pehle centre. Pehle 2 minute instructions padho. Panic aaye to 3 deep breaths aur ek easy question dhundo." }
];
