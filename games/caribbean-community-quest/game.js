(function(){
"use strict";
const $=id=>document.getElementById(id),GAME_ID="caribbean-community-quest",GAME_TITLE="Caribbean Community Quest",SUBJECT="Social Studies",sessionStarted=Date.now();
const missions=[
{id:"heritage",icon:"🥁",title:"Heritage Harbour",desc:"Explore family stories, festivals and places that help us understand the past.",outcomes:["SS-G2-HCT-ELO1","SS-G2-HCT-ELO2","SS-G2-HCT-ELO3","SS-G2-HCT-ELO4","SS-G2-HCT-ELO5","SS-G2-HCT-ELO6"]},
{id:"civic",icon:"🤝",title:"Neighbourhood Helpers",desc:"Practise safety, responsibilities, conflict resolution and community decision-making.",outcomes:["SS-G2-CP-ELO1","SS-G2-CP-ELO2","SS-G2-CP-ELO3","SS-G2-CP-ELO4","SS-G2-CP-ELO5"]},
{id:"maps",icon:"🗺️",title:"Map & Environment Trail",desc:"Use symbols and directions, notice community features and care for natural resources.",outcomes:["SS-G2-ST-ELO1","SS-G2-ST-ELO2","SS-G2-ST-ELO3","SS-G2-ST-ELO4","SS-G2-ST-ELO5","SS-G2-ST-ELO6","SS-G2-ST-ELO7"]},
{id:"market",icon:"🧺",title:"Market Day Mission",desc:"Learn how workers, resources, goods and services help a community.",outcomes:["SS-G2-EDM-ELO1","SS-G2-EDM-ELO2","SS-G2-EDM-ELO3","SS-G2-EDM-ELO4","SS-G2-EDM-ELO5","SS-G2-EDM-ELO6"]}
];
const bank={
heritage:[
{o:"SS-G2-HCT-ELO1",q:"Grandma tells you how her grandparents travelled to the village long ago. What kind of source is this?",c:["An oral family history","A weather forecast","A price tag","A traffic sign"],a:0,why:"Stories shared by older family members can be oral sources about family and community history."},
{o:"SS-G2-HCT-ELO2",q:"Which item could help you learn how a family celebration changed over time?",c:["Old and new family photographs","Only today's temperature","A random number","A blank page"],a:0,why:"Comparing photographs from different times can provide evidence of change and continuity."},
{o:"SS-G2-HCT-ELO3",q:"A family decides together who will prepare food, set the table and clean up. What does this show?",c:["Family members can share roles and responsibilities","Only adults can help","Families never make decisions together","Jobs at home are always the same"],a:0,why:"Families interact by communicating, sharing responsibilities and helping one another."},
{o:"SS-G2-HCT-ELO4",q:"A family gathers every year for a special meal. Why can occasions like this matter?",c:["They can strengthen family connections and traditions","They make every family identical","They replace community rules","They prove the weather"],a:0,why:"Family occasions can help people share traditions, stories and relationships."},
{o:"SS-G2-HCT-ELO5",q:"At a community festival you hear music, see dances and taste traditional food. What are you learning about?",c:["Culture and traditions","Only road safety","Only rainfall","Only map distance"],a:0,why:"Festivals can express a community's culture, traditions and shared history."},
{o:"SS-G2-HCT-ELO6",q:"Why might a community protect an old fort, church, market or other historic place?",c:["It can help people learn about the past","Old places never need care","It makes new buildings impossible","It changes the weather"],a:0,why:"Historic sites can preserve evidence and stories about a community's past."}
],
civic:[
{o:"SS-G2-CP-ELO1",q:"A neighbour leaves rubbish where children play. Which action best supports a safe, healthy community?",c:["Ask an adult to help arrange safe cleanup and proper disposal","Scatter it farther","Ignore dangerous items","Burn everything yourself"],a:0,why:"Community responsibility includes keeping shared spaces clean and getting adult help with unsafe waste."},
{o:"SS-G2-CP-ELO2",q:"Two children both want the same ball. What is a fair way to solve the conflict?",c:["Listen, talk calmly and agree to take turns","Shout until one gives up","Hide the ball forever","Push the other child"],a:0,why:"Listening, calm discussion and fair compromise are constructive ways to resolve everyday conflict."},
{o:"SS-G2-CP-ELO3",q:"Why do communities have rules and people responsible for services?",c:["To help organize shared life and meet community needs","To stop everyone from helping","To make maps harder","To decide what children must like"],a:0,why:"Community structures help organize services, responsibilities and shared decisions."},
{o:"SS-G2-CP-ELO4",q:"You notice water spilled across a smooth floor at home. What should you do?",c:["Tell an adult and keep people away until it is cleaned","Run across it","Pretend it is not there","Pour more water"],a:0,why:"Recognizing hazards and getting appropriate help can prevent accidents."},
{o:"SS-G2-CP-ELO5",q:"Before crossing a road, what is the safest choice?",c:["Use a safe crossing point, look and listen carefully, and follow adult guidance","Run without looking","Cross between parked cars whenever possible","Follow a ball into the road"],a:0,why:"Safe road behaviour includes choosing a safe place and checking carefully before crossing."}
],
maps:[
{o:"SS-G2-ST-ELO1",q:"A map key shows ★ = school and + = health centre. What does the ★ tell you?",c:["Where the school is","Where north is","How hot it is","Who owns the map"],a:0,why:"A map legend or key explains what symbols represent."},
{o:"SS-G2-ST-ELO2",q:"Which is a human-made feature of a community?",c:["Bridge","River","Hill","Beach"],a:0,why:"A bridge is built by people; rivers, hills and beaches are natural features."},
{o:"SS-G2-ST-ELO3",q:"The library is north of the market on a town map. If you start at the market, which direction should you travel?",c:["North","South","East","West"],a:0,why:"Map directions help describe the position of places in relation to one another."},
{o:"SS-G2-ST-ELO4",q:"Mangroves, birds and crabs are found near a coastal wetland. What does this show?",c:["Different habitats support different living things","All animals live everywhere","Plants do not need habitats","Weather is the only community feature"],a:0,why:"Communities include habitats with plants and animals suited to different conditions."},
{o:"SS-G2-ST-ELO5",q:"Dark clouds, strong wind and heavy rain are expected. Which community plan makes sense?",c:["Prepare for wet, windy weather and follow safety guidance","Plan only for a dry day","Ignore the forecast","Leave loose items outside"],a:0,why:"Weather information helps communities prepare and make safer choices."},
{o:"SS-G2-ST-ELO6",q:"Which is an example of using the environment as a resource responsibly?",c:["Collecting rainwater while avoiding waste","Dumping rubbish in a river","Removing every tree from a slope","Wasting clean water"],a:0,why:"Resources can meet needs while still being cared for and used responsibly."},
{o:"SS-G2-ST-ELO7",q:"Which action best cares for a beach environment?",c:["Use bins and leave plants and animals undisturbed","Leave plastic behind","Break coral for souvenirs","Pour dirty water into the sea"],a:0,why:"Reducing litter and respecting living things helps protect shared environments."}
],
market:[
{o:"SS-G2-EDM-ELO1",q:"A carpenter uses skill and time to make a table. The carpenter's work is what kind of resource?",c:["Human resource","Weather resource","Map symbol","Festival"],a:0,why:"People's knowledge, skills and work are human resources."},
{o:"SS-G2-EDM-ELO2",q:"A farmer grows bananas in fertile soil. Which natural resource is especially important here?",c:["Land/soil","Traffic light","Receipt","School bell"],a:0,why:"Land and soil are natural resources used in farming."},
{o:"SS-G2-EDM-ELO3",q:"Who is a community worker that helps when there is a fire?",c:["Firefighter","Baker","Musician","Shopper"],a:0,why:"Firefighters provide an emergency safety service to the community."},
{o:"SS-G2-EDM-ELO4",q:"Which is a service rather than a good?",c:["A bus ride","A loaf of bread","A pencil","A mango"],a:0,why:"A service is work done for someone; a bus ride provides transportation rather than a physical item to keep."},
{o:"SS-G2-EDM-ELO5",q:"Why do people have different jobs in a community?",c:["Different jobs provide different goods and services people need","Every job does exactly the same thing","Jobs only exist at markets","Jobs never use skills"],a:0,why:"Communities depend on people doing different kinds of work."},
{o:"SS-G2-EDM-ELO6",q:"Why might a workplace have a rule to keep walkways clear?",c:["To reduce trips and keep people safe","To make work slower","To hide supplies","To change prices"],a:0,why:"Workplace rules can protect people and help work happen safely."}
]};
const socialAlternates={
"SS-G2-HCT-ELO1":[
 {q:"Uncle Joel remembers how the village market looked when he was a child. What can his story provide?",c:["An oral source about the past","A weather measurement","A map scale","A shop receipt"],a:0,why:"Memories shared by people can be oral sources that help us learn about the past."}
],
"SS-G2-HCT-ELO2":[
 {q:"Which pair would best help you compare family life then and now?",c:["A photograph from long ago and one from today","Two identical blank pages","Today's lunch menu only","One random number"],a:0,why:"Sources from different times can be compared to notice change and continuity."}
],
"SS-G2-HCT-ELO3":[
 {q:"One child washes fruit while another sets the table. What family interaction does this show?",c:["Sharing responsibilities","Ignoring one another","A weather change","Buying a service"],a:0,why:"Family members often cooperate and share responsibilities."}
],
"SS-G2-HCT-ELO4":[
 {q:"A family reunion includes stories, food and time together. Why can this occasion be important?",c:["It strengthens relationships and shared traditions","It changes the map","It replaces school rules","It measures rainfall"],a:0,why:"Family occasions can strengthen relationships and pass traditions between generations."}
],
"SS-G2-HCT-ELO5":[
 {q:"A festival includes traditional drumming, costumes and local food. What does this express?",c:["Culture and heritage","Only transport","Only weather","Only prices"],a:0,why:"Festivals can celebrate a community's culture and heritage."}
],
"SS-G2-HCT-ELO6":[
 {q:"Students visit an old sugar mill and read signs about its history. Why is the site useful?",c:["It provides evidence and stories about the past","It predicts tomorrow's weather","It tells every family what to eat","It is only useful because it is old"],a:0,why:"Historical places can help people understand past events and ways of life."}
],
"SS-G2-CP-ELO1":[
 {q:"Standing water near homes is attracting mosquitoes. What is a responsible community action?",c:["Tell adults and help remove safe containers holding stagnant water","Add more containers of water","Ignore the problem","Play in the water"],a:0,why:"Keeping shared spaces healthy includes noticing hazards and getting appropriate adult help."}
],
"SS-G2-CP-ELO2":[
 {q:"Two classmates disagree about whose turn it is in a game. What should they do?",c:["Talk calmly, listen and agree on a fair turn","Grab the game","Shout louder","Stop speaking forever"],a:0,why:"Listening and fair compromise help resolve conflicts peacefully."}
],
"SS-G2-CP-ELO3":[
 {q:"Residents ask the community council to repair a broken public light. What does this show?",c:["Community structures help organize services and respond to needs","Only shops can solve community problems","Rules are unnecessary","Maps make decisions"],a:0,why:"Community organizations and leaders help coordinate services and shared decisions."}
],
"SS-G2-CP-ELO4":[
 {q:"A loose electrical cord crosses a walkway at home. What is the safest response?",c:["Tell an adult and keep away until it is made safe","Jump over it repeatedly","Pull it hard","Cover it with water"],a:0,why:"Recognizing a hazard and getting adult help can prevent accidents."}
],
"SS-G2-CP-ELO5":[
 {q:"A ball rolls into the road. What should a child do?",c:["Stop and get an adult rather than running into the road","Run after it immediately","Close their eyes and cross","Stand between moving cars"],a:0,why:"Road safety means avoiding sudden entry into traffic and getting appropriate help."}
],
"SS-G2-ST-ELO1":[
 {q:"A map key shows 🏫 = school and 🌳 = park. What does 🏫 mean?",c:["School","North","River","Distance"],a:0,why:"A map key explains the meaning of symbols."}
],
"SS-G2-ST-ELO2":[
 {q:"Which is a natural feature of a community?",c:["River","Bus stop","Bridge","Clinic"],a:0,why:"Rivers form naturally; bus stops, bridges and clinics are built by people."}
],
"SS-G2-ST-ELO3":[
 {q:"The clinic is east of the school. From the school, which direction leads to the clinic?",c:["East","West","North","South"],a:0,why:"Direction words help describe the location of places relative to one another."}
],
"SS-G2-ST-ELO4":[
 {q:"Why might you find crabs and mangroves near a wet coastal area but not on a dry hillside?",c:["Different habitats support different living things","Every habitat is identical","Animals choose places by colour only","Plants never depend on conditions"],a:0,why:"Living things are suited to different habitats and conditions."}
],
"SS-G2-ST-ELO5":[
 {q:"The forecast says strong sun and very hot conditions. Which plan is sensible?",c:["Carry water, use shade and follow heat-safety guidance","Wear heavy rain gear only","Ignore the heat","Leave water at home"],a:0,why:"Weather information helps people make safer daily choices."}
],
"SS-G2-ST-ELO6":[
 {q:"Which action uses a natural resource to meet a need?",c:["Using sunlight to dry clothes","Throwing rubbish in a stream","Breaking street signs","Leaving taps running"],a:0,why:"Sunlight is a natural resource that can be used without wasting water or damaging shared spaces."}
],
"SS-G2-ST-ELO7":[
 {q:"Which action helps protect a community river?",c:["Keep litter and harmful waste out of the water","Dump oil into it","Remove all plants from its banks","Leave plastic bottles behind"],a:0,why:"Keeping pollution out of waterways helps care for the environment."}
],
"SS-G2-EDM-ELO1":[
 {q:"A nurse uses training and skill to care for patients. The nurse's knowledge and work are what type of resource?",c:["Human resource","Land resource","Weather event","Map symbol"],a:0,why:"People's skills, knowledge and labour are human resources."}
],
"SS-G2-EDM-ELO2":[
 {q:"Fishers depend on the sea for part of their work. The sea is what kind of resource?",c:["Natural resource","Human resource","Manufactured good","Workplace rule"],a:0,why:"The sea is part of the natural environment and can be a natural resource."}
],
"SS-G2-EDM-ELO3":[
 {q:"Which community worker helps deliver letters and parcels?",c:["Postal worker","Dentist","Farmer","Carpenter"],a:0,why:"Postal workers provide a delivery and communication service."}
],
"SS-G2-EDM-ELO4":[
 {q:"Which is a good rather than a service?",c:["A school notebook","A haircut","A bus ride","A medical check-up"],a:0,why:"A notebook is a physical good that can be bought and kept."}
],
"SS-G2-EDM-ELO5":[
 {q:"A baker, teacher and mechanic have different jobs. Why is that useful to a community?",c:["They provide different skills, goods and services","All jobs should be identical","Only one job is needed","Jobs have no connection to needs"],a:0,why:"Different jobs help meet different community needs."}
],
"SS-G2-EDM-ELO6":[
 {q:"Why might workers wear protective equipment for some jobs?",c:["To follow safety rules and reduce risk","To make prices higher","To avoid learning skills","To change the weather"],a:0,why:"Workplace rules and protective equipment can help prevent injuries."}
]
};
function varySocial(item){
 const alts=socialAlternates[item.o]||[];
 if(!alts.length||Math.random()<.45)return item;
 return alts[Math.floor(Math.random()*alts.length)];
}
let current=null,round=[],index=0,correct=0,answered=false;
function speak(t){if(!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.88;speechSynthesis.speak(u)}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function award(id,title,description,icon,xp){
  const p=window.GSJLearning?.profile?.()||{id:"default"},key="gsj_game_events_v1";let events=[];
  try{events=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}
  if(!Array.isArray(events))events=[];
  if(events.some(e=>e.profileId===p.id&&e.gameId==="caribbean-community-quest"&&e.achievementId===id))return;
  events.push({profileId:p.id,gameId:"caribbean-community-quest",gameTitle:"Caribbean Community Quest",achievementId:id,title,description,icon,xp:xp||45,ts:new Date().toISOString()});
  localStorage.setItem(key,JSON.stringify(events.slice(-160)));
}
function priorityQuestion(q){
  const due=new Set((window.GSJLearning?.due?.("SS-G2")||[]).map(x=>x.id));
  const band=window.GSJLearning?.band?.(q.o)||"Support";
  return (due.has(q.o)?100:0)+(band==="Support"?30:band==="Core"?10:0)+Math.random();
}
function bandFor(m){const b=m.outcomes.map(o=>window.GSJLearning?.band?.(o)||"Support");return b.includes("Support")?"Support":b.every(x=>x==="Challenge")?"Challenge":"Core"}

function communityScene(x){
 const o=x.o;
 if(o.startsWith("SS-G2-HCT"))return '<div class="lw-scene community-scene"><div class="scene-title">📜 Heritage Scrapbook</div><div class="timeline-cards"><button data-clue="past">👵 Past story</button><button data-clue="photo">📷 Family photo</button><button data-clue="festival">🥁 Festival</button></div><div class="evidence-panel" id="communityClue">Tap an item to inspect a source about family or community life.</div></div>';
 if(o.startsWith("SS-G2-CP"))return '<div class="lw-scene community-scene"><div class="scene-title">🏘️ Safe Neighbourhood Patrol</div><div class="hazard-row"><button data-clue="spill">💧 Wet floor</button><button data-clue="road">🚸 Road crossing</button><button data-clue="rubbish">🗑️ Rubbish</button></div><div class="evidence-panel" id="communityClue">Inspect one situation before choosing the safest or fairest action.</div></div>';
 if(o.startsWith("SS-G2-ST"))return '<div class="lw-scene community-scene"><div class="scene-title">🗺️ Community Map</div><div class="mini-map"><span class="north">N ↑</span><button data-clue="school" style="grid-area:a">★ School</button><button data-clue="market" style="grid-area:b">🧺 Market</button><button data-clue="clinic" style="grid-area:c">+ Clinic</button><button data-clue="beach" style="grid-area:d">🌊 Beach</button></div><div class="map-legend">★ school • + health centre • 🌊 natural feature</div><div class="evidence-panel" id="communityClue">Tap a place to explore the map, symbols and relative position.</div></div>';
 return '<div class="lw-scene community-scene"><div class="scene-title">🧺 Market Day</div><div class="market-row"><button data-clue="good">🥭 Mango</button><button data-clue="service">🚌 Bus ride</button><button data-clue="worker">👩🏽‍🚒 Firefighter</button><button data-clue="resource">🌱 Soil</button></div><div class="evidence-panel" id="communityClue">Explore a market item, service, worker or resource before answering.</div></div>';
}
function bindCommunityScene(answerButtons){
 const clue=$("communityClue"),nodes=[...document.querySelectorAll("[data-clue]")];
 let explored=false;
 (answerButtons||[]).forEach(b=>b.disabled=true);
 const text={
  past:"Older people can share oral history about family and community life.",
  photo:"Photographs can provide evidence about change and continuity over time.",
  festival:"Festivals can express music, food, dance, identity and shared traditions.",
  spill:"Wet floors can cause slips. Warn others and get appropriate adult help.",
  road:"Safe crossing means using a suitable crossing point and looking/listening carefully.",
  rubbish:"Shared spaces stay healthier when waste is handled safely and properly.",
  school:"Map symbols help us locate important community places.",
  market:"A market is a human-made community feature where exchange happens.",
  clinic:"Health centres provide services that support the community.",
  beach:"Beaches are natural features and resources that should be cared for.",
  good:"A mango is a good: a physical item people can buy, sell or use.",
  service:"A bus ride is a service: work done to meet a transportation need.",
  worker:"Community workers use skills and labour to provide important services.",
  resource:"Land and soil are natural resources used for farming and other needs."
 };
 nodes.forEach(n=>n.onclick=()=>{
   nodes.forEach(x=>x.classList.remove("selected"));n.classList.add("selected");
   if(clue)clue.textContent=text[n.dataset.clue]||"Good observation.";
   if(!explored){explored=true;(answerButtons||[]).forEach(b=>b.disabled=false)}
   speak(clue?.textContent||"Good observation.");
 });
}
function renderHome(){
 $("missionView").classList.remove("active");$("resultsView").classList.remove("active");$("homeView").style.display="block";
 const p=window.GSJLearning?.profile?.()||{name:"Player"};$("profilePill").textContent="Guide "+p.name;
 const sum=window.GSJLearning?.summary?.("SS-G2")||{stages:{Mastered:0}};$("masteryPill").textContent=(sum.stages.Mastered||0)+" outcomes mastered";
 $("missionGrid").innerHTML=missions.map(m=>{const done=m.outcomes.filter(o=>window.GSJLearning?.stage?.(o)==="Mastered").length;return '<article class="lw-card"><div class="icon">'+m.icon+'</div><span class="lw-kicker">'+bandFor(m).toUpperCase()+'</span><h2>'+m.title+'</h2><p>'+m.desc+'</p><div class="lw-progress"><i style="width:'+(done/m.outcomes.length*100)+'%"></i></div><p><b>'+done+'/'+m.outcomes.length+'</b> outcomes mastered</p><button class="lw-btn" data-mission="'+m.id+'">Start quest →</button></article>'}).join("");
 document.querySelectorAll("[data-mission]").forEach(b=>b.onclick=()=>start(b.dataset.mission));
}
function start(id){current=missions.find(m=>m.id===id);if(!current)return;const b=bandFor(current),size=b==="Support"?4:b==="Core"?5:6;round=bank[id].map(item=>({item,priority:priorityQuestion(item)})).sort((a,b)=>b.priority-a.priority).map(row=>row.item).slice(0,Math.min(size,bank[id].length)).map(varySocial);index=0;correct=0;$("homeView").style.display="none";$("resultsView").classList.remove("active");$("missionView").classList.add("active");$("missionName").textContent=current.icon+" "+current.title;render()}
function render(){
 const x=round[index],band=window.GSJLearning?.band?.(x.o)||"Support",stage=window.GSJLearning?.stage?.(x.o)||"Learning";answered=false;$("bandPill").textContent=band+" path";$("stagePill").textContent=stage;$("progress").style.width=Math.round(index/round.length*100)+"%";
 let cs=shuffle(x.c.map((label,i)=>({label,ok:i===x.a})));if(band==="Support"){const right=cs.find(v=>v.ok),wrong=cs.filter(v=>!v.ok).slice(0,2);cs=shuffle([right,...wrong].filter(Boolean))}if(!cs.some(v=>v.ok))cs[0]={label:x.c[x.a],ok:true};
 $("challengeArea").innerHTML='<span class="lw-kicker">STOP '+(index+1)+' OF '+round.length+'</span>'+communityScene(x)+'<div class="lw-question">'+x.q+'</div><div class="lw-choices">'+cs.map((v,i)=>'<button class="lw-choice" data-c="'+i+'">'+v.label+'</button>').join("")+'</div><div class="lw-feedback" id="feedback">Explore the community scene, then make the choice that best fits the evidence.</div><div class="lw-toolbar"><button class="lw-btn secondary" id="hearBtn">🔊 Hear it</button><button class="lw-btn" id="nextBtn" disabled>Continue route →</button></div>';
 const bs=[...document.querySelectorAll("[data-c]")];bs.forEach((b,i)=>b.onclick=()=>answer(b,cs[i],x,bs));bindCommunityScene(bs);$("hearBtn").onclick=()=>speak(x.q);$("nextBtn").onclick=()=>{index++;index>=round.length?finish():render()};
}
function answer(btn,ch,x,buttons){if(answered)return;answered=true;buttons.forEach(b=>b.disabled=true);if(ch.ok){correct++;btn.classList.add("correct")}else{btn.classList.add("wrong");buttons.forEach(b=>{if(b.textContent===x.c[x.a])b.classList.add("correct")})}
 const skill=window.GSJLearning?.record?.(x.o,ch.ok,{subject:SUBJECT,gameId:GAME_ID,activity:current.id}),fb=$("feedback");fb.className="lw-feedback "+(ch.ok?"good":"bad");fb.innerHTML=(ch.ok?"✅ <b>Good community thinking.</b> ":"📘 <b>Here's why:</b> ")+x.why+(skill?'<br><small>'+skill.stage+' • '+skill.band+' path</small>':"");$("nextBtn").disabled=false;speak((ch.ok?"Correct. ":"Let's learn it. ")+x.why)}
function finish(){$("missionView").classList.remove("active");$("resultsView").classList.add("active");const pct=Math.round(correct/round.length*100);$("resultsTitle").textContent=pct>=80?"Community Star earned!":pct>=60?"Strong community work!":"Good start—let's revisit it.";$("resultsText").textContent="You solved "+correct+" of "+round.length+" community situations. Your next route will adapt to the concepts you need most.";$("resultsStats").innerHTML='<div class="lw-card"><h2>'+pct+'%</h2><p>Understanding</p></div><div class="lw-card"><h2>'+correct+'/'+round.length+'</h2><p>Decisions</p></div><div class="lw-card"><h2>'+bandFor(current)+'</h2><p>Next path</p></div>';window.GSJLearning?.usage?.("score",{gameId:GAME_ID,title:GAME_TITLE,score:pct});if(pct>=80){window.GSJLearning?.usage?.("complete",{gameId:GAME_ID,title:GAME_TITLE,score:pct});award("community-"+current.id,"Community Star: "+current.title,"Complete this Grade 2 Social Studies mission.","⭐",50)}const allMastered=missions.flatMap(m=>m.outcomes).every(o=>window.GSJLearning?.stage?.(o)==="Mastered");if(allMastered)award("community-master","Community Knowledge Master","Master every Grade 2 Social Studies outcome in Community Quest.","🧭",120)}
$("backBtn").onclick=renderHome;$("homeBtn").onclick=renderHome;$("replayBtn").onclick=()=>start(current.id);$("readBtn").onclick=()=>speak("Welcome to Caribbean Community Quest. Choose a place on the town map and help the community.");window.GSJLearning?.usage?.("session_start",{gameId:GAME_ID,title:GAME_TITLE});window.addEventListener("pagehide",()=>window.GSJLearning?.usage?.("session_end",{gameId:GAME_ID,title:GAME_TITLE,seconds:Math.max(0,Math.round((Date.now()-sessionStarted)/1000))}),{once:true});renderHome();
})();
