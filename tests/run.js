// Headless test runner: loads the app scripts into a minimal fake browser env and runs window.runSelfTests()
const fs=require("fs"),vm=require("vm"),path=require("path");
const mem={};const ls={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]},key:i=>Object.keys(mem)[i],get length(){return Object.keys(mem).length}};
const win={localStorage:ls,sessionStorage:{getItem:()=>null,setItem(){}},console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,history:{replaceState(){}},location:{hash:"",search:"",protocol:"file:",pathname:"/"},addEventListener(){},innerWidth:1200,navigator:{},URLSearchParams,Number,Array,Object,String,RegExp,Error,Promise,Map,Set,Blob:function(){},URL:{createObjectURL:()=>"",revokeObjectURL(){}}};
win.window=win;win.document={addEventListener(){},removeEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>({innerHTML:""}),createElement:()=>({style:{},setAttribute(){},appendChild(){},remove(){},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},classList:{toggle(){},add(){},remove(){}}}),body:{appendChild(){}},documentElement:{style:{setProperty(){}},setAttribute(){}},hidden:false};
win.self=win;
vm.createContext(win);
const www=path.join(__dirname,"..","www");
["data/syllabus.js","data/lessons.js","data/questions.js","data/vocab.js","js/store.js","js/engine.js","js/planner.js","js/mock.js","js/ui.js","js/practice.js","js/views.core.js","js/views.more.js","js/app.js"].forEach(f=>vm.runInContext(fs.readFileSync(path.join(www,f),"utf8"),win,{filename:f}));
vm.runInContext("Store.load();",win);
const r=vm.runInContext("runSelfTests()",win);
r.results.forEach(x=>console.log((x.ok?"PASS":"FAIL")+"  "+x.name+(x.err?"  -- "+x.err:"")));
console.log(`\n${r.passed} passed, ${r.failed} failed. Questions: ${vm.runInContext("QUESTIONS.length",win)}; bank issues: ${JSON.stringify(r.bankIssues)}`);
// simulate one month of usage for integrity
const sim=vm.runInContext(`(function(){const st=Store.get();Store.reset();const s=Store.get();s.user={dailyMinutes:120,confidence:{math:1,english:2,reasoning:2,ga:1},targetDate:Engine.addDays(Store.today(),90)};let days=0,qs=0;const orig=Store.today;for(let d=30;d>=0;d--){const iso=new Date(Date.now()-d*864e5).toISOString().slice(0,10);Store.today=()=>iso;const p=Planner.generateDailyPlan(s);p.tasks.forEach(t=>{if(t.topic&&(t.type==="practice"||t.type==="recovery")){Engine.pickQuestions(s,QUESTIONS,t.topic,t.count||6).forEach(q=>{Engine.recordAttempt(s,q,Math.random()<.65?q.correct:(q.correct+1)%4,40,"medium","practice");qs++});t.done=true}});p.completed=true;Engine.touchStreak(s);days++}Store.today=orig;const q=Engine.revisionQueue(s);return{days,qs,topicsTouched:Object.keys(s.topics).length,mistakes:s.mistakes.length,due:q.total,phase:Planner.currentPhase(s),readiness:Engine.readinessScore(s).score,weak:Engine.weakTopics(s,5).map(w=>w.id),planToday:Planner.generateDailyPlan(s).tasks.map(t=>t.type+":"+(t.topic||t.subject||"")).join(", ")}})()`,win);
console.log("\nOne-month simulation:",JSON.stringify(sim,null,1));
process.exit(r.failed?1:0);
