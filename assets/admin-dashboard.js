(()=>{
"use strict";
const $=s=>document.querySelector(s);
let refreshTimer=null;

function fmtInt(v){return Number(v||0).toLocaleString()}
function fmtDuration(sec){
  sec=Math.max(0,Number(sec||0));
  if(sec<60)return Math.round(sec)+"s";
  if(sec<3600)return Math.round(sec/60)+"m";
  return (sec/3600).toFixed(sec<36000?1:0)+"h";
}
async function api(path,options={}){
  const res=await fetch(path,{cache:"no-store",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok){const err=new Error(data.error||"Request failed.");err.status=res.status;throw err}
  return data;
}
function showLogin(message=""){
  $("#loginView").hidden=false;$("#dashboardView").hidden=true;$("#logoutBtn").hidden=true;
  if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}
  const box=$("#loginMessage");box.hidden=!message;box.textContent=message;
}
function showDashboard(){
  $("#loginView").hidden=true;$("#dashboardView").hidden=false;$("#logoutBtn").hidden=false;
  if(!refreshTimer)refreshTimer=setInterval(()=>loadDashboard(false),15000);
}
function metric(label,value,live=false,sub=""){
  return '<div class="metric-card '+(live?"live":"")+'"><b>'+value+'</b><span>'+label+'</span>'+(sub?'<small>'+sub+'</small>':"")+'</div>';
}
function renderSummary(s){
  const live=s.live||{},tot=s.totals||{};
  $("#generatedAt").textContent="Updated "+new Date(s.generatedAt).toLocaleString();
  $("#liveMetrics").innerHTML=[
    metric("Active now",fmtInt(live.activeNow),true),
    metric("In lobby",fmtInt(live.inLobby),true),
    metric("Playing",fmtInt(live.inGame),true),
    metric("Open rooms",fmtInt(live.openRooms),true),
    metric("Live matches",fmtInt(live.playingRooms),true)
  ].join("");
  $("#totalMetrics").innerHTML=[
    metric("Shared profiles",fmtInt(tot.uniqueProfiles||tot.uniquePlayers)),
    metric("Studio views",fmtInt(tot.portalViews)),
    metric("Title opens",fmtInt(tot.titleOpens)),
    metric("Title sessions",fmtInt(tot.titleSessions)),
    metric("Matches",fmtInt(tot.matches)),
    metric("Chat messages",fmtInt(tot.chatMessages)),
    metric("Peak concurrent",fmtInt(tot.peakConcurrent))
  ].join("");
  renderUsage(s.days||[]);
  renderTitleUsage(s.titles||[]);
}
function renderUsage(days){
  const box=$("#usageChart");box.textContent="";
  if(!days.length){box.innerHTML='<div class="empty-admin">No usage data yet.</div>';return}
  const max=Math.max(1,...days.flatMap(d=>[d.titleSessions||d.sessions||0,d.uniqueProfiles||d.uniquePlayers||0]));
  for(const d of days){
    const wrap=document.createElement("div");wrap.className="day-bar";
    const sessions=d.titleSessions||d.sessions||0,profiles=d.uniqueProfiles||d.uniquePlayers||0;
    const area=document.createElement("div");area.className="bar-area";area.title=d.date+" • "+sessions+" title sessions • "+profiles+" shared profiles";
    const s=document.createElement("div");s.className="bar-session";s.style.height=Math.max(2,(sessions/max)*100)+"%";
    const u=document.createElement("div");u.className="bar-unique";u.style.height=Math.max(2,(profiles/max)*100)+"%";
    area.append(s,u);
    const label=document.createElement("div");label.className="day-label";label.textContent=d.date.slice(5);
    wrap.append(area,label);box.append(wrap);
  }
  const legend=document.createElement("div");legend.className="chart-legend";legend.innerHTML='<span><i class="legend-dot sessions"></i>Title sessions</span><span><i class="legend-dot unique"></i>Shared profiles</span>';
  box.append(legend);
}
function renderTitleUsage(rows){
  const body=$("#titleUsageRows");if(!body)return;body.textContent="";
  if(!rows.length){body.innerHTML='<tr><td colspan="8" class="empty-admin">No title usage has been recorded yet.</td></tr>';return}
  rows.forEach(t=>{
    const tr=document.createElement("tr");
    const avg=t.sessions?Math.round((t.totalSeconds||0)/t.sessions):0;
    const vals=[t.title||t.id,t.kind||"game",fmtInt(t.opens),fmtInt(t.sessions),fmtInt(t.uniqueProfiles),fmtDuration(t.totalSeconds),fmtInt(t.completions),t.bestScore?fmtInt(t.bestScore):"—"];
    vals.forEach((v,idx)=>{const td=document.createElement("td");td.textContent=v;if(idx===0){const strong=document.createElement("strong");strong.textContent=v;td.textContent="";td.append(strong);if(avg){const small=document.createElement("small");small.textContent="Avg "+fmtDuration(avg)+" / session";td.append(document.createElement("br"),small)}}tr.append(td)});
    body.append(tr);
  });
}
function renderSpellingOverview(data){
  const box=$("#spellingOverview");if(!box)return;
  const t=data?.totals||{},levels=data?.levels||[];
  const metrics=[
    ["Practice opens",t.practiceOpens||0],["Words mastered",t.wordsMastered||0],["Flight attempts",t.attempts||0],
    ["Flights completed",t.completions||0],["Safe diversions",t.diversions||0],["Stories read",t.storyReads||0]
  ];
  const difficult=[];
  levels.forEach(l=>(l.difficultWords||[]).forEach(w=>difficult.push({word:w.word,count:w.count,title:l.title})));
  difficult.sort((a,b)=>b.count-a.count);
  box.innerHTML='<div class="spelling-metric-grid">'+metrics.map(x=>'<div class="spelling-metric"><b>'+fmtInt(x[1])+'</b><span>'+x[0]+'</span></div>').join("")+'</div>'+
    '<div class="spelling-difficult"><b>Words needing the most practice</b><p>'+(difficult.length?difficult.slice(0,8).map(x=>x.word+' ('+x.count+')').join(' • '):'No difficult-word data yet.')+'</p></div>';
}
function renderLeaderboard(rows){
  const body=$("#leaderboardRows");body.textContent="";
  if(!rows.length){body.innerHTML='<tr><td colspan="6" class="empty-admin">No scores submitted yet.</td></tr>';return}
  rows.slice(0,50).forEach((p,i)=>{
    const tr=document.createElement("tr");
    const vals=[
      i===0?"👑":"#"+(i+1),
      p.nickname,
      fmtInt(p.bestScore),
      (p.maxLevel||1)+"/8",
      fmtInt(p.matches),
      fmtDuration(p.totalSeconds)
    ];
    vals.forEach((v,idx)=>{const td=document.createElement("td");td.textContent=v;if(idx===0)td.className="rank";if(idx===1){const strong=document.createElement("strong");strong.textContent=v;td.textContent="";td.append(strong)}tr.append(td)});
    body.append(tr);
  });
}
function activityCopy(a){
  const extra=[];
  if(a.nickname)extra.push(a.nickname);
  if(a.title)extra.push(a.title);
  if(a.roomCode)extra.push("room "+a.roomCode);
  if(a.score!=null)extra.push("score "+fmtInt(a.score));
  if(a.players!=null)extra.push(a.players+" players");
  if(a.seconds!=null)extra.push(fmtDuration(a.seconds));
  return extra.join(" • ")||"—";
}
function renderActivity(rows){
  const box=$("#activityList");box.textContent="";
  if(!rows.length){box.innerHTML='<div class="empty-admin">No activity recorded yet.</div>';return}
  rows.slice(0,50).forEach(a=>{
    const row=document.createElement("div");row.className="activity-row";
    const time=document.createElement("time");time.textContent=new Date(a.ts).toLocaleString();
    const type=document.createElement("div");type.className="activity-type";type.textContent=String(a.type||"event").replaceAll("_"," ");
    const copy=document.createElement("div");copy.className="activity-copy";copy.textContent=activityCopy(a);
    row.append(time,type,copy);box.append(row);
  });
}
async function loadDashboard(showErrors=true){
  try{
    const [summary,leaderboard,activity,spelling]=await Promise.all([
      api("./api/admin/summary"),
      api("./api/admin/leaderboard"),
      api("./api/admin/activity"),
      api("./api/admin/spelling/summary")
    ]);
    showDashboard();renderSummary(summary);renderLeaderboard(leaderboard.leaderboard||[]);renderSpellingOverview(spelling);renderActivity(activity.activity||[]);
  }catch(err){
    if(err.status===401)return showLogin("");
    if(err.status===503)return showLogin(err.message);
    if(showErrors)showLogin(err.message);
  }
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const box=$("#loginMessage");box.hidden=true;
  try{
    await api("./api/admin/login",{method:"POST",body:JSON.stringify({password:$("#adminPassword").value})});
    $("#adminPassword").value="";await loadDashboard();
  }catch(err){box.hidden=false;box.textContent=err.message}
});
$("#logoutBtn").onclick=async()=>{try{await api("./api/admin/logout",{method:"POST",body:"{}"})}catch{}showLogin("Signed out.");};
$("#refreshBtn").onclick=()=>loadDashboard();
loadDashboard(false);
})();
