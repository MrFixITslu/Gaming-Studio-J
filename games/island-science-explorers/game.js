(function(){
"use strict";
const $=id=>document.getElementById(id);
const GAME_ID="island-science-explorers";
const GAME_TITLE="Island Science Explorers";
const SUBJECT="Science";
const sessionStarted=Date.now();
const missions=[
  {id:"materials",icon:"🧪",title:"Materials Rescue Lab",desc:"Test materials and choose the best one for a job.",outcomes:["SCIENCE-G2-SPM-ELO1","SCIENCE-G2-SPM-ELO2","SCIENCE-G2-SPM-ELO3","SCIENCE-G2-SPM-ELO4"]},
  {id:"garden",icon:"🌱",title:"Sunshine Garden",desc:"Investigate what plants need and how animals help plants.",outcomes:["SCIENCE-G2-IRE-ELO1","SCIENCE-G2-IRE-ELO2"]},
  {id:"earth",icon:"🏖️",title:"Earth & Water Patrol",desc:"Protect the coast, study landforms and follow water.",outcomes:["SCIENCE-G2-ES-ELO1","SCIENCE-G2-ES-ELO2","SCIENCE-G2-ES-ELO3","SCIENCE-G2-ES-ELO4"]},
  {id:"engineering",icon:"🛠️",title:"Inventor Workshop",desc:"Define problems, build ideas and compare test results.",outcomes:["SCIENCE-G2-ED-ELO1","SCIENCE-G2-ED-ELO2","SCIENCE-G2-ED-ELO3"]}
];
const bank={
materials:[
 {o:"SCIENCE-G2-SPM-ELO1",q:"Which property makes a clear plastic bottle useful for seeing the water inside?",c:["Transparent","Magnetic","Soft","Absorbent"],a:0,why:"Transparent materials let light pass through, so you can see through them."},
 {o:"SCIENCE-G2-SPM-ELO1",q:"You need to sort a spoon, rubber band and paper towel. Which observation is about a property?",c:["The spoon is hard","The spoon is mine","The towel is on the table","The band is new"],a:0,why:"Hardness is an observable property of a material."},
 {o:"SCIENCE-G2-SPM-ELO2",q:"A picnic shelter must keep rain off. Which material is the best roof covering?",c:["Waterproof plastic sheet","Paper tissue","Cotton wool","Dry leaves with holes"],a:0,why:"A waterproof material is best when the job is keeping water out."},
 {o:"SCIENCE-G2-SPM-ELO2",q:"A handle should bend a little without snapping. Which property matters most?",c:["Flexible","Transparent","Shiny","Sweet"],a:0,why:"Flexible materials can bend without breaking easily."},
 {o:"SCIENCE-G2-SPM-ELO3",q:"A toy bridge is made from blocks. What shows that the same pieces can be used to make a new object?",c:["Take the bridge apart and rebuild the blocks as a tower","Paint the bridge blue","Put the bridge in water","Leave it unchanged"],a:0,why:"Objects made from pieces can often be taken apart and recombined into a different object."},
 {o:"SCIENCE-G2-SPM-ELO4",q:"Ice melts into water. If the water is frozen again, what happens?",c:["It can become ice again","It becomes wood","It disappears forever","It becomes sand"],a:0,why:"Melting and freezing water are reversible changes."},
 {o:"SCIENCE-G2-SPM-ELO4",q:"An egg is cooked by heating. Can cooling turn it back into a raw egg?",c:["No","Yes","Only in sunlight","Only with water"],a:0,why:"Cooking an egg is an irreversible change; cooling does not make it raw again."}
],
garden:[
 {o:"SCIENCE-G2-IRE-ELO1",q:"Two similar bean plants get the same water. One gets sunlight and one stays in a dark cupboard. What are you testing?",c:["Whether sunlight affects growth","Whether pots are colourful","Whether beans are tasty","Whether soil is heavy"],a:0,why:"Only the light condition changes, so the fair test investigates sunlight."},
 {o:"SCIENCE-G2-IRE-ELO1",q:"For a fair test of how water affects plant growth, what should stay the same?",c:["Plant type, soil and light","Amount of water","Only the plant name","Nothing"],a:0,why:"A fair test changes one main factor and keeps the others as similar as possible."},
 {o:"SCIENCE-G2-IRE-ELO1",q:"A plant gets sunlight but no water for many days. What is the best prediction?",c:["It will wilt and grow poorly","It will turn into a rock","It will grow faster","It will make more water"],a:0,why:"Plants need water as well as light and other suitable conditions to grow."},
 {o:"SCIENCE-G2-IRE-ELO2",q:"A bee visits one flower, pollen sticks to it, then it visits another flower. What job is the bee helping with?",c:["Pollination","Erosion","Freezing","Measuring"],a:0,why:"Moving pollen between flowers helps pollination."},
 {o:"SCIENCE-G2-IRE-ELO2",q:"A bird eats a fruit and later drops a seed far away. What process is this helping?",c:["Seed dispersal","Melting","Condensation","Magnetism"],a:0,why:"Animals can move seeds to new places, helping seed dispersal."}
],
earth:[
 {o:"SCIENCE-G2-ES-ELO1",q:"Which Earth event can happen quickly?",c:["A landslide after heavy rain","A cliff slowly wearing away","Soil forming over many years","A river slowly changing course"],a:0,why:"A landslide can happen in minutes, while many erosion changes happen slowly."},
 {o:"SCIENCE-G2-ES-ELO1",q:"Which change usually happens slowly?",c:["Waves wearing away a rocky coast","A rock falling suddenly","A flash flood","A tree falling in a storm"],a:0,why:"Repeated wave action can change a coast gradually over a long time."},
 {o:"SCIENCE-G2-ES-ELO2",q:"Rain is washing soil off a garden slope. Which solution is most likely to slow the erosion?",c:["Plant grass and ground cover","Remove every plant","Pour more water on it","Make the slope steeper"],a:0,why:"Plant roots help hold soil in place and ground cover reduces the force of rain on soil."},
 {o:"SCIENCE-G2-ES-ELO2",q:"Two barriers are tested against moving water. Barrier A loses 8 scoops of sand. Barrier B loses 2. Which worked better?",c:["Barrier B","Barrier A","They were equal","There is no evidence"],a:0,why:"Less sand was lost behind Barrier B, so the test data supports B as the better erosion solution."},
 {o:"SCIENCE-G2-ES-ELO3",q:"Which pair contains a landform and a body of water?",c:["Hill and bay","Cloud and road","Tree and house","Sun and bridge"],a:0,why:"A hill is a landform and a bay is a body of water."},
 {o:"SCIENCE-G2-ES-ELO4",q:"Where can water be found as a solid?",c:["Ice in a freezer","Rain in a puddle","Water in a river","Sea water"],a:0,why:"Ice is solid water."}
],
engineering:[
 {o:"SCIENCE-G2-ED-ELO1",q:"The class keeps spilling pencils because the desk tray is too shallow. What is the engineering problem?",c:["Pencils fall out of the tray","Pencils are yellow","The classroom has desks","Students like drawing"],a:0,why:"Engineers first define the problem that needs to be changed or solved."},
 {o:"SCIENCE-G2-ED-ELO1",q:"Before designing a bridge for toy cars, what should you find out first?",c:["What the bridge must do and what limits it has","Which colour is most popular","Who can draw fastest","What song to play"],a:0,why:"A useful design starts with the problem, criteria and constraints."},
 {o:"SCIENCE-G2-ED-ELO2",q:"Why is a labelled sketch useful before building?",c:["It shows the idea and how parts may work","It guarantees the design will never fail","It replaces testing","It makes materials stronger"],a:0,why:"A sketch helps communicate and improve a design before or during building."},
 {o:"SCIENCE-G2-ED-ELO3",q:"Two paper boats carry coins before sinking. Boat A carries 4 coins; Boat B carries 11. Which has stronger evidence for carrying a load?",c:["Boat B","Boat A","Both are the same","Neither can be compared"],a:0,why:"Boat B carried more coins in the test, so it performed better for that criterion."},
 {o:"SCIENCE-G2-ED-ELO3",q:"A shade design is tested at noon. Design A keeps the table 3°C cooler; Design B keeps it 7°C cooler. Which better meets the goal of keeping the table cool?",c:["Design B","Design A","Both equally","The test tells us nothing"],a:0,why:"For this goal, the larger temperature reduction shows stronger performance."}
]};
const scienceAlternates={
"SCIENCE-G2-SPM-ELO1":[
 {q:"Which observation describes an observable property of a rubber ball?",c:["It is flexible","It belongs to Kai","It was bought yesterday","It is near the door"],a:0,why:"Flexibility is a property that can be observed or tested."}
],
"SCIENCE-G2-SPM-ELO2":[
 {q:"You need a lunch bag lining that keeps spilled juice from soaking through. Which material is best?",c:["Waterproof plastic","Paper towel","Cotton wool","Thin tissue"],a:0,why:"A waterproof material is best when the goal is to stop liquid passing through."}
],
"SCIENCE-G2-SPM-ELO3":[
 {q:"A model house is built from connecting blocks. What could show the pieces can make a new object?",c:["Take it apart and rebuild the blocks as a boat","Leave it exactly the same","Only change its colour","Put it in the freezer"],a:0,why:"Pieces can sometimes be disassembled and recombined into a different object."}
],
"SCIENCE-G2-SPM-ELO4":[
 {q:"Chocolate melts when warmed and becomes firm again when cooled. What does this show?",c:["Some heating and cooling changes can be reversed","All changes are permanent","Cooling destroys matter","Heating always makes gas"],a:0,why:"Melting and solidifying can be reversible physical changes for some materials."}
],
"SCIENCE-G2-IRE-ELO1":[
 {q:"Two similar plants get the same light and soil. Plant A gets water; Plant B gets none. What factor is being tested?",c:["Water","Sunlight","Plant type","Soil type"],a:0,why:"Only the water condition changes, so the investigation tests the effect of water."}
],
"SCIENCE-G2-IRE-ELO2":[
 {q:"Seeds with tiny hooks stick to a dog's fur and later fall off somewhere else. What process is this?",c:["Seed dispersal","Freezing","Erosion","Evaporation"],a:0,why:"Animals can carry seeds to new places, helping seed dispersal."}
],
"SCIENCE-G2-ES-ELO1":[
 {q:"Which Earth change is usually slow?",c:["A river gradually wearing away its bank","A sudden rockfall","A flash flood","A landslide"],a:0,why:"Erosion can slowly change land over many days, months or years."}
],
"SCIENCE-G2-ES-ELO2":[
 {q:"Wind blows soil from two trays. Tray A has bare soil; Tray B has grass. Less soil leaves Tray B. What is supported by the test?",c:["Plant cover can help reduce erosion","Bare soil always stays in place","Grass causes more wind","The trays cannot be compared"],a:0,why:"The tray with plant cover lost less soil, so the evidence supports plant cover as an erosion-control solution."}
],
"SCIENCE-G2-ES-ELO3":[
 {q:"Which pair could both appear on a simple model of an island area?",c:["Mountain and river","Traffic light and calendar","Cloud and school rule","Song and price"],a:0,why:"A mountain is a landform and a river is a body of water."}
],
"SCIENCE-G2-ES-ELO4":[
 {q:"Which example is liquid water found on Earth?",c:["Water in a lake","Ice in a freezer","A rock","Dry sand"],a:0,why:"Lake water is liquid water."}
],
"SCIENCE-G2-ED-ELO1":[
 {q:"Rainwater keeps entering a classroom doorway. What should engineers identify first?",c:["The problem and what a successful solution must do","The favourite colour of the class","Who can draw fastest","A random material"],a:0,why:"Engineering begins by defining the problem, needs and constraints."}
],
"SCIENCE-G2-ED-ELO2":[
 {q:"A student draws a labelled plan for a shade structure before building it. What is the plan helping show?",c:["How the shape and parts may solve the problem","That testing is unnecessary","That the design cannot change","Only the colour"],a:0,why:"A sketch or model helps communicate how a design may function."}
],
"SCIENCE-G2-ED-ELO3":[
 {q:"Two towers are tested in front of a fan. Tower A falls at speed 2; Tower B stays standing until speed 5. Which design performed better for stability?",c:["Tower B","Tower A","They performed the same","There is no evidence"],a:0,why:"Tower B stayed standing under a stronger test, so the data supports it as more stable."}
]
};
function varyScience(item){
 const alts=scienceAlternates[item.o]||[];
 if(!alts.length||Math.random()<.5)return item;
 return alts[Math.floor(Math.random()*alts.length)];
}
let current=null,round=[],index=0,correct=0,repaired=0,mistakes=0,answered=false,questionMisses=0;
function profile(){return window.GSJLearning?.profile?.()||{name:"Explorer"}}
function speak(text){if(!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.86;u.pitch=1.03;speechSynthesis.speak(u)}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function award(id,title,description,icon,xp){
  const p=window.GSJLearning?.profile?.()||{id:"default"},key="gsj_game_events_v1";let events=[];
  try{events=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}
  if(!Array.isArray(events))events=[];
  if(events.some(e=>e.profileId===p.id&&e.gameId==="island-science-explorers"&&e.achievementId===id))return;
  events.push({profileId:p.id,gameId:"island-science-explorers",gameTitle:"Island Science Explorers",achievementId:id,title,description,icon,xp:xp||45,ts:new Date().toISOString()});
  localStorage.setItem(key,JSON.stringify(events.slice(-160)));
}
function priorityQuestion(q){
  const due=new Set((window.GSJLearning?.due?.("SCIENCE-G2")||[]).map(x=>x.id));
  const band=window.GSJLearning?.band?.(q.o)||"Support";
  return (due.has(q.o)?100:0)+(band==="Support"?30:band==="Core"?10:0)+Math.random();
}
function missionBand(m){const bands=m.outcomes.map(x=>window.GSJLearning?.band?.(x)||"Support");return bands.includes("Support")?"Support":bands.every(x=>x==="Challenge")?"Challenge":"Core"}

function evidenceScene(x){
  const o=x.o;
  if(o.startsWith("SCIENCE-G2-SPM")){
    if(o.endsWith("ELO4"))return '<div class="lw-scene science-scene"><div class="scene-title">🔥 Heating & Cooling Station</div><div class="matter-flow"><span>🧊 Ice</span><b>→ warm →</b><span>💧 Water</span><b>→ cool →</b><span>🧊 Ice</span></div><button class="lw-btn evidence-btn" id="observeBtn">Run change test</button><div class="evidence-panel" id="evidencePanel" hidden>Ice can melt and freeze again. Some heated materials, such as a cooked egg, cannot return to their original form.</div></div>';
    return '<div class="lw-scene science-scene"><div class="scene-title">🧪 Material Test Bench</div><div class="sample-row"><span>🧻 Paper towel<small>absorbent • soft</small></span><span>🥄 Metal spoon<small>hard • shiny</small></span><span>🧴 Clear plastic<small>waterproof • transparent</small></span></div><button class="lw-btn evidence-btn" id="observeBtn">Run property tests</button><div class="evidence-panel" id="evidencePanel" hidden>Scientists choose materials by the properties needed for a job: hardness, flexibility, absorbency, transparency and waterproofing.</div></div>';
  }
  if(o.startsWith("SCIENCE-G2-IRE")){
    if(o.endsWith("ELO1"))return '<div class="lw-scene science-scene"><div class="scene-title">🌱 Five-Day Plant Test</div><div class="plant-test"><div><b>☀️ + 💧</b><i style="--h:82%"></i><small>healthy growth</small></div><div><b>🌑 + 💧</b><i style="--h:38%"></i><small>weak growth</small></div><div><b>☀️ + no water</b><i style="--h:18%"></i><small>wilting</small></div></div><button class="lw-btn evidence-btn" id="observeBtn">Run 5-day test</button><div class="evidence-panel" id="evidencePanel" hidden>For a fair test, change one condition at a time and keep the other important conditions alike.</div></div>';
    return '<div class="lw-scene science-scene"><div class="scene-title">🐝 Pollination Trail</div><div class="pollination"><span>🌼 pollen</span><b>→ 🐝 →</b><span>🌸 new flower</span><b>→</b><span>🌱 seeds</span></div><button class="lw-btn evidence-btn" id="observeBtn">Follow the bee</button><div class="evidence-panel" id="evidencePanel" hidden>Animals can move pollen between flowers and can also carry or drop seeds in new places.</div></div>';
  }
  if(o.startsWith("SCIENCE-G2-ES")){
    if(o.endsWith("ELO2"))return '<div class="lw-scene science-scene"><div class="scene-title">🌧️ Erosion Test Trough</div><div class="erosion-test"><div><span>Bare soil</span><i style="--loss:82%"></i><b>8 scoops lost</b></div><div><span>Grass cover</span><i style="--loss:24%"></i><b>2 scoops lost</b></div></div><button class="lw-btn evidence-btn" id="observeBtn">Run rain test</button><div class="evidence-panel" id="evidencePanel" hidden>Compare how much soil moves. A solution that loses less soil is doing a better job of slowing erosion.</div></div>';
    if(o.endsWith("ELO3"))return '<div class="lw-scene science-scene"><div class="scene-title">🏝️ Land & Water Model</div><div class="island-model"><span class="land">⛰️ hill</span><span class="water">🌊 bay</span><span class="land">🏖️ beach</span><span class="water">💧 pond</span></div><button class="lw-btn evidence-btn" id="observeBtn">Explore model</button><div class="evidence-panel" id="evidencePanel" hidden>Landforms include hills and beaches. Bodies of water include bays, ponds, rivers and seas.</div></div>';
    if(o.endsWith("ELO4"))return '<div class="lw-scene science-scene"><div class="scene-title">💧 Water Watch</div><div class="water-states"><span>🧊 solid</span><span>💧 liquid</span><span>🌊 liquid</span></div><button class="lw-btn evidence-btn" id="observeBtn">Check water forms</button><div class="evidence-panel" id="evidencePanel" hidden>Water is found in many places. At Grade 2 we can identify liquid water and solid water (ice).</div></div>';
    return '<div class="lw-scene science-scene"><div class="scene-title">⏱️ Earth Change Timeline</div><div class="timeline-test"><span>⚡ landslide<br><small>can be quick</small></span><span>🌊 coastline erosion<br><small>often slow</small></span></div><button class="lw-btn evidence-btn" id="observeBtn">Compare time scales</button><div class="evidence-panel" id="evidencePanel" hidden>Some Earth events happen suddenly. Others change land little by little over long periods.</div></div>';
  }
  if(o.startsWith("SCIENCE-G2-ED")){
    if(o.endsWith("ELO3"))return '<div class="lw-scene science-scene"><div class="scene-title">🛠️ Prototype Test</div><div class="prototype-test"><div><span>Boat A</span><i style="--score:36%"></i><b>4 coins</b></div><div><span>Boat B</span><i style="--score:88%"></i><b>11 coins</b></div></div><button class="lw-btn evidence-btn" id="observeBtn">Test both designs</button><div class="evidence-panel" id="evidencePanel" hidden>Engineers compare test results against the same goal. Evidence helps identify strengths and weaknesses.</div></div>';
    if(o.endsWith("ELO2"))return '<div class="lw-scene science-scene"><div class="scene-title">✏️ Design Board</div><div class="design-sketch"><span>Problem</span><b>→</b><span>Sketch</span><b>→</b><span>Build</span><b>→</b><span>Test</span></div><button class="lw-btn evidence-btn" id="observeBtn">Open design notes</button><div class="evidence-panel" id="evidencePanel" hidden>A labelled sketch communicates the idea and shows how shape and parts may help the design work.</div></div>';
    return '<div class="lw-scene science-scene"><div class="scene-title">🔎 Problem Finder</div><div class="problem-card">Observe the situation → ask what needs to change → identify what a successful solution must do.</div><button class="lw-btn evidence-btn" id="observeBtn">Inspect the problem</button><div class="evidence-panel" id="evidencePanel" hidden>Engineering starts by defining a problem using observations, questions, needs and limits.</div></div>';
  }
  return '';
}
function bindEvidenceScene(buttons,x){
  const observe=$("observeBtn"),panel=$("evidencePanel");
  if(!observe){buttons.forEach(b=>b.disabled=false);return}
  buttons.forEach(b=>b.disabled=true);
  observe.onclick=()=>{
    observe.disabled=true;observe.textContent="Evidence collected ✓";
    if(panel)panel.hidden=false;
    buttons.forEach(b=>b.disabled=false);
    speak(panel?.textContent||x.q);
  };
}
function renderHome(){
 $("missionView").classList.remove("active");$("resultsView").classList.remove("active");$("homeView").style.display="block";
 $("profilePill").textContent="Explorer "+profile().name;
 const sum=window.GSJLearning?.summary?.("SCIENCE-G2")||{stages:{Mastered:0}};$("masteryPill").textContent=(sum.stages.Mastered||0)+" outcomes mastered";
 $("missionGrid").innerHTML=missions.map(m=>{const mastered=m.outcomes.filter(o=>window.GSJLearning?.stage?.(o)==="Mastered").length;return '<article class="lw-card"><div class="icon">'+m.icon+'</div><span class="lw-kicker">'+missionBand(m).toUpperCase()+'</span><h2>'+m.title+'</h2><p>'+m.desc+'</p><div class="lw-progress"><i style="width:'+(mastered/m.outcomes.length*100)+'%"></i></div><p><b>'+mastered+'/'+m.outcomes.length+'</b> outcomes mastered</p><button class="lw-btn" data-mission="'+m.id+'">Explore →</button></article>'}).join("");
 document.querySelectorAll("[data-mission]").forEach(b=>b.onclick=()=>startMission(b.dataset.mission));
}
function selectRound(m){
 const band=missionBand(m),pool=bank[m.id].map(item=>({item,priority:priorityQuestion(item)})).sort((a,b)=>b.priority-a.priority).map(row=>row.item);
 const size=band==="Support"?4:band==="Core"?5:6;
 return pool.slice(0,Math.min(size,pool.length)).map(varyScience);
}
function startMission(id){
 current=missions.find(m=>m.id===id);if(!current)return;round=selectRound(current);index=0;correct=0;repaired=0;mistakes=0;answered=false;questionMisses=0;
 $("homeView").style.display="none";$("resultsView").classList.remove("active");$("missionView").classList.add("active");
 $("missionName").textContent=current.icon+" "+current.title;renderChallenge();
}
function renderChallenge(){
 const x=round[index],band=window.GSJLearning?.band?.(x.o)||"Support",stage=window.GSJLearning?.stage?.(x.o)||"Learning";
 $("bandPill").textContent=band+" path";$("stagePill").textContent=stage;
 $("missionProgress").style.width=Math.round(index/round.length*100)+"%";
 answered=false;questionMisses=0;
 let choices=x.c.map((label,i)=>({label,correct:i===x.a}));choices=shuffle(choices);
 if(band==="Support"){const right=choices.find(v=>v.correct),wrong=choices.filter(v=>!v.correct).slice(0,2);choices=shuffle([right,...wrong].filter(Boolean))}
 if(!choices.some(v=>v.correct))choices[0]={label:x.c[x.a],correct:true};
 $("challengeArea").innerHTML='<span class="lw-kicker">INVESTIGATION '+(index+1)+' OF '+round.length+'</span>'+evidenceScene(x)+'<div class="lw-question">'+x.q+'</div><div class="lw-choices">'+choices.map((c,i)=>'<button class="lw-choice" data-choice="'+i+'">'+c.label+'</button>').join("")+'</div><div class="lw-feedback" id="feedback">Collect evidence first, then choose the answer that best matches what you observed.</div><div class="lw-toolbar"><button class="lw-btn secondary" id="hearQ" type="button">🔊 Hear question</button><button class="lw-btn" id="nextBtn" type="button" disabled>Next investigation →</button></div>';
 const buttons=[...document.querySelectorAll("[data-choice]")];
 buttons.forEach((b,i)=>b.onclick=()=>answer(b,choices[i],x,buttons));
 bindEvidenceScene(buttons,x);
 $("hearQ").onclick=()=>speak(x.q);
 $("nextBtn").onclick=()=>{index++;if(index>=round.length)finish();else renderChallenge()};
}
function answer(btn,choice,x,buttons){
 if(answered)return;answered=true;buttons.forEach(b=>b.disabled=true);
 const ok=choice.correct,firstTry=questionMisses===0;
 if(ok){
   if(firstTry)correct++;else repaired++;
   btn.classList.add("correct");
   const skill=window.GSJLearning?.record?.(x.o,true,{subject:SUBJECT,gameId:GAME_ID,activity:current.id});
   const fb=$("feedback");fb.className="lw-feedback good";
   fb.innerHTML=(firstTry?"✅ <b>Good evidence!</b> ":"🛠️ <b>Great repair!</b> ")+x.why+(skill?'<br><small>'+skill.stage+' • '+skill.band+' path</small>':"");
   $("nextBtn").disabled=false;
   speak((firstTry?"Correct. ":"Great repair. ")+x.why);
   return;
 }
 mistakes++;questionMisses++;
 btn.classList.add("wrong");
 const skill=window.GSJLearning?.record?.(x.o,false,{subject:SUBJECT,gameId:GAME_ID,activity:current.id});
 const fb=$("feedback");fb.className="lw-feedback bad";
 fb.innerHTML='📘 <b>Let’s learn it, then try again.</b> '+x.why+(skill?'<br><small>'+skill.stage+' • '+skill.band+' path</small>':"");
 $("nextBtn").disabled=true;
 speak("Let's learn it. "+x.why);
 setTimeout(function(){
   if(answered){answered=false;buttons.forEach(b=>{if(!b.classList.contains("wrong"))b.disabled=false});}
 },850);
}
function finish(){
 $("missionView").classList.remove("active");$("resultsView").classList.add("active");const pct=Math.round(correct/round.length*100);
 $("resultsTitle").textContent=pct>=80?"Explorer Badge earned!":"Field report complete!";
 $("resultsText").textContent="You completed every investigation. "+(repaired?repaired+" concept"+(repaired===1?" was":"s were")+" repaired after feedback. ":"")+"Mistakes became practice—not lost lives.";
 $("resultsStats").innerHTML='<div class="lw-card"><h2>'+pct+'%</h2><p>First-try accuracy</p></div><div class="lw-card"><h2>'+repaired+'</h2><p>Concepts repaired</p></div><div class="lw-card"><h2>'+missionBand(current)+'</h2><p>Next difficulty</p></div>';
 window.GSJLearning?.usage?.("score",{gameId:GAME_ID,title:GAME_TITLE,score:pct});
 window.GSJLearning?.usage?.("complete",{gameId:GAME_ID,title:GAME_TITLE,score:pct});
 award("science-"+current.id,"Explorer Badge: "+current.title,"Complete this Grade 2 science mission and repair any missed concepts.","🏅",50);
 if(pct>=80)award("science-evidence-"+current.id,"Evidence Star: "+current.title,"Complete the mission with at least 80% first-try accuracy.","⭐",30);
 const allMastered=missions.flatMap(m=>m.outcomes).every(o=>window.GSJLearning?.stage?.(o)==="Mastered");
 if(allMastered)award("science-master","Island Science Master","Master every Grade 2 Science outcome in Island Science Explorers.","🔬",120);
}
$("backBtn").onclick=renderHome;$("resultsHomeBtn").onclick=renderHome;$("replayBtn").onclick=()=>startMission(current.id);
$("soundBtn").onclick=()=>speak("Welcome to Island Science Explorers. Choose a mission and investigate the evidence.");
window.GSJLearning?.usage?.("session_start",{gameId:GAME_ID,title:GAME_TITLE});
window.addEventListener("pagehide",()=>window.GSJLearning?.usage?.("session_end",{gameId:GAME_ID,title:GAME_TITLE,seconds:Math.max(0,Math.round((Date.now()-sessionStarted)/1000))}),{once:true});
renderHome();
})();
