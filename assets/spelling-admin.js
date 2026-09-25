(function(){
"use strict";
var state={levels:[],content:[],editingId:null,summary:null};
function $(id){return document.getElementById(id)}
function esc(s){return String(s||"").replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
async function request(url,opts){
  var r=await fetch(url,opts||{}),j={};try{j=await r.json()}catch(e){}
  if(!r.ok){var err=new Error(j.error||("Request failed: "+r.status));err.status=r.status;throw err}return j;
}
function words(){return $("words").value.split(/\r?\n|,/).map(function(x){return x.trim()}).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i}).slice(0,12)}
function msg(id,text,bad){var el=$(id);el.hidden=!text;el.textContent=text||"";el.style.borderColor=bad?"#ff6d7d55":"#63e3a955";el.style.color=bad?"#ffabb5":"#9bf0bc"}
function resetForm(){
  state.editingId=null;state.content=[];$("levelForm").reset();$("editorTitle").textContent="New weekly mission";$("saveStatus").textContent="Draft";$("saveStatus").classList.remove("live");$("contentEditor").innerHTML='<div class="empty-mini">Add words, then generate learning content.</div>';$("generatorMode").textContent="";updateCount();msg("formMessage","");
}
function updateCount(){var n=words().length;$("wordCount").textContent=n+" / 12";$("wordCount").style.color=n>=10&&n<=12?"#8bf0b4":n>12?"#ff9ca8":""}
function renderContent(){
  if(!state.content.length){$("contentEditor").innerHTML='<div class="empty-mini">Add words, then generate learning content.</div>';return}
  $("contentEditor").innerHTML=state.content.map(function(x,i){
    return '<div class="content-row" data-content-row="'+i+'"><div class="content-row-head"><b>'+esc(x.word)+'</b><span class="generator-note">Editable</span></div><div class="content-grid"><label>Definition<input class="field" data-field="definition" value="'+esc(x.definition)+'"></label><label>Syllables<input class="field" data-field="syllables" value="'+esc(x.syllables)+'"></label><label class="wide">Example sentence<input class="field" data-field="example" value="'+esc(x.example)+'"></label><label class="wide">Hint<input class="field" data-field="hint" value="'+esc(x.hint)+'"></label></div></div>';
  }).join("");
  Array.prototype.slice.call(document.querySelectorAll("[data-content-row]")).forEach(function(row){
    var i=Number(row.dataset.contentRow);Array.prototype.slice.call(row.querySelectorAll("[data-field]")).forEach(function(inp){inp.addEventListener("input",function(){state.content[i][inp.dataset.field]=inp.value})});
  });
}
async function generate(){
  var list=words();if(!list.length){msg("formMessage","Add the weekly words first.",true);return}
  $("generateBtn").disabled=true;$("generateBtn").textContent="Generating…";msg("formMessage","");
  try{
    var data=await request("./api/admin/spelling/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({words:list,story:$("story").value})});
    state.content=data.content||[];$("generatorMode").textContent=data.mode==="ollama"?"AI generated":"Local fallback generated";renderContent();msg("formMessage","Learning content generated. Review or edit it before publishing.",false);
  }catch(e){msg("formMessage",e.message,true)}
  finally{$("generateBtn").disabled=false;$("generateBtn").textContent="✨ Generate learning content"}
}
function payload(){
  return {week:$("week").value.trim(),title:$("title").value.trim(),destination:$("destination").value.trim(),theme:$("theme").value,words:words(),story:$("story").value.trim(),published:$("published").checked,content:state.content};
}
async function save(e){
  e.preventDefault();var body=payload();
  if(!body.title){msg("formMessage","Mission title is required.",true);return}
  if(body.published&&(body.words.length<10||body.words.length>12)){msg("formMessage","A published weekly mission must have 10–12 words.",true);return}
  if(!state.content.length){await generate();body=payload()}
  try{
    var url="./api/admin/spelling/levels"+(state.editingId?"/"+encodeURIComponent(state.editingId):""),method=state.editingId?"PUT":"POST";
    var data=await request(url,{method:method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    state.editingId=data.level.id;msg("formMessage","Mission saved.",false);await loadAll();editLevel(state.editingId);
  }catch(err){msg("formMessage",err.message,true)}
}
function editLevel(id){
  var x=state.levels.find(function(l){return l.id===id});if(!x)return;state.editingId=x.id;$("week").value=x.week||"";$("title").value=x.title||"";$("destination").value=x.destination||"";$("theme").value=x.theme||"Caribbean Sky";$("words").value=(x.words||[]).join("\n");$("story").value=x.story||"";$("published").checked=!!x.published;state.content=JSON.parse(JSON.stringify(x.content||[]));$("editorTitle").textContent="Edit "+x.title;$("saveStatus").textContent=x.published?"Published":"Draft";$("saveStatus").classList.toggle("live",!!x.published);renderContent();updateCount();window.scrollTo({top:0,behavior:"smooth"});
}
async function removeLevel(id){
  var x=state.levels.find(function(l){return l.id===id});if(!x||!confirm("Delete "+x.title+"? This removes it from the children's mission board."))return;
  try{await request("./api/admin/spelling/levels/"+encodeURIComponent(id),{method:"DELETE"});if(state.editingId===id)resetForm();await loadAll()}catch(e){alert(e.message)}
}
function renderLevels(){
  $("levelCount").textContent=state.levels.length+" mission"+(state.levels.length===1?"":"s");
  if(!state.levels.length){$("levelList").innerHTML='<div class="empty-mini">No spelling missions yet.</div>';return}
  $("levelList").innerHTML=state.levels.map(function(x){
    var st=((state.summary&&state.summary.levels)||[]).find(function(row){return row.id===x.id})||{};
    var hard=(st.difficultWords||[]).map(function(w){return w.word+" ("+w.count+")"}).join(" • ");
    return '<div class="level-row"><div class="level-row-top"><div class="grow"><b><span class="'+(x.published?"live-dot":"draft-dot")+'"></span>'+esc(x.title)+'</b><small>'+esc(x.week||"Weekly mission")+' • '+(x.words||[]).length+' words • '+esc(x.destination||"No destination")+'</small><small>Flights: '+(st.attempts||0)+' • Completed: '+(st.completions||0)+' • Diversions: '+(st.diversions||0)+'</small>'+(hard?'<small>Needs practice: '+esc(hard)+'</small>':'')+'</div></div><div class="level-actions"><button class="btn secondary" data-edit="'+esc(x.id)+'">Edit</button><button class="btn secondary danger" data-delete="'+esc(x.id)+'">Delete</button></div></div>';
  }).join("");
  Array.prototype.slice.call(document.querySelectorAll("[data-edit]")).forEach(function(b){b.onclick=function(){editLevel(b.dataset.edit)}});
  Array.prototype.slice.call(document.querySelectorAll("[data-delete]")).forEach(function(b){b.onclick=function(){removeLevel(b.dataset.delete)}});
}
function renderSummary(){
  var s=state.summary||{},t=s.totals||{};
  var items=[["Practice opens",t.practiceOpens||0],["Words mastered",t.wordsMastered||0],["Flight attempts",t.attempts||0],["Completed",t.completions||0],["Safe diversions",t.diversions||0],["Story reads",t.storyReads||0]];
  $("spellingMetrics").innerHTML=items.map(function(x){return '<div class="mini-metric"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>'}).join("");
}
async function loadAll(){
  try{
    var all=await Promise.all([request("./api/admin/spelling/levels",{cache:"no-store"}),request("./api/admin/spelling/summary",{cache:"no-store"})]);
    state.levels=all[0].levels||[];state.summary=all[1]||{};renderLevels();renderSummary();$("loginView").hidden=true;$("workspace").hidden=false;$("logoutBtn").hidden=false;return true;
  }catch(e){if(e.status===401){$("loginView").hidden=false;$("workspace").hidden=true;$("logoutBtn").hidden=true;return false}throw e}
}
async function login(e){
  e.preventDefault();msg("loginMessage","");
  try{await request("./api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:$("adminPassword").value})});$("adminPassword").value="";await loadAll()}
  catch(err){msg("loginMessage",err.message,true)}
}
async function logout(){try{await request("./api/admin/logout",{method:"POST"})}catch(e){}location.reload()}
function bind(){
  $("loginForm").addEventListener("submit",login);$("logoutBtn").onclick=logout;$("newBtn").onclick=resetForm;$("generateBtn").onclick=generate;$("levelForm").addEventListener("submit",save);$("words").addEventListener("input",updateCount);
}
bind();resetForm();loadAll().catch(function(e){msg("loginMessage",e.message,true)});
})();