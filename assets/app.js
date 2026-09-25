
const STORE_KEY="gsj_store_v2";
const EVENT_KEY="gsj_game_events_v1";
const ACTIVE_PROFILE_KEY="gsj_active_profile_id";
const RATING_ORDER={"Everyone":0,"7+":1,"Teen":2,"All":3};
const DEFAULT_STORE={version:2,activeProfileId:null,profiles:[],settings:{familyMode:false,maxRating:"All"}};
const state={catalog:null,filter:"all",query:"",store:null,installPrompt:null,currentDetails:null};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=()=>`p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const now=()=>new Date().toISOString();

function newProfile(name="Player 1",avatar="🍈"){
  return {id:uid(),name,avatar,createdAt:now(),xp:0,achievements:{},favorites:[],recent:[],ratings:{},launches:{},lastPlayed:{},xpLedger:{}};
}
function loadStore(){
  let store;
  try{store=JSON.parse(localStorage.getItem(STORE_KEY)||"null")}catch{}
  if(!store||!Array.isArray(store.profiles)){
    store=structuredClone(DEFAULT_STORE);
    const p=newProfile();
    const oldFav=JSON.parse(localStorage.getItem("gsj_favorites")||"[]");
    const oldRecent=JSON.parse(localStorage.getItem("gsj_recent")||"[]");
    p.favorites=Array.isArray(oldFav)?oldFav:[];
    p.recent=Array.isArray(oldRecent)?oldRecent:[];
    store.profiles=[p];store.activeProfileId=p.id;
  }
  store.settings=Object.assign({familyMode:false,maxRating:"All"},store.settings||{});
  if(!store.profiles.length){const p=newProfile();store.profiles=[p];store.activeProfileId=p.id}
  if(!store.profiles.some(p=>p.id===store.activeProfileId))store.activeProfileId=store.profiles[0].id;
  for(const p of store.profiles){
    p.xp=Number(p.xp)||0;p.achievements=p.achievements||{};p.favorites=p.favorites||[];p.recent=p.recent||[];p.ratings=p.ratings||{};p.launches=p.launches||{};p.lastPlayed=p.lastPlayed||{};p.xpLedger=p.xpLedger||{};
  }
  state.store=store;saveStore();
}
function saveStore(){localStorage.setItem(STORE_KEY,JSON.stringify(state.store));localStorage.setItem(ACTIVE_PROFILE_KEY,activeProfile().id)}
function activeProfile(){return state.store.profiles.find(p=>p.id===state.store.activeProfileId)||state.store.profiles[0]}
function levelInfo(xp){
  const level=Math.max(1,Math.floor(Math.sqrt(xp/120))+1);
  const start=120*(level-1)*(level-1),next=120*level*level;
  return {level,start,next,pct:Math.max(0,Math.min(100,(xp-start)/(next-start)*100))};
}
function addXP(amount,ledgerKey){
  const p=activeProfile();
  if(ledgerKey&&p.xpLedger[ledgerKey])return false;
  if(ledgerKey)p.xpLedger[ledgerKey]=now();
  p.xp+=amount;saveStore();return true;
}
function awardAchievement(id,title,description,icon="🏆",xp=25,source="Gaming Studio J"){
  const p=activeProfile();
  if(p.achievements[id])return false;
  p.achievements[id]={id,title,description,icon,xp,source,unlockedAt:now()};
  addXP(xp,`achievement:${id}`);
  saveStore();toast(`${icon} <strong>${escapeHtml(title)}</strong> +${xp} XP`);return true;
}
function derivedBadges(){
  const p=activeProfile(),launchIds=Object.keys(p.launches).filter(k=>p.launches[k]>0),ach=Object.keys(p.achievements);
  return [
    {id:"first_play",icon:"▶️",title:"First Launch",description:"Play a Studio title.",unlocked:launchIds.length>=1},
    {id:"five_launches",icon:"🎮",title:"Game Time",description:"Launch Studio titles five times.",unlocked:Object.values(p.launches).reduce((a,b)=>a+b,0)>=5},
    {id:"achievement_hunter",icon:"🏆",title:"Achievement Hunter",description:"Unlock five achievements.",unlocked:ach.length>=5},
    {id:"level_5",icon:"⭐",title:"Studio Level 5",description:"Reach Studio level 5.",unlocked:levelInfo(p.xp).level>=5}
  ];
}
function toast(html){
  const el=document.createElement("div");el.className="studio-toast";el.innerHTML=html;$("#toastArea").appendChild(el);setTimeout(()=>el.remove(),3300);
}
const ANALYTICS_CLIENT_KEY="gsj_client_id_v1";
function analyticsClientId(){
  let id=localStorage.getItem(ANALYTICS_CLIENT_KEY);
  if(!id){
    id=(crypto.randomUUID?crypto.randomUUID():"client_"+Date.now()+"_"+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,"");
    localStorage.setItem(ANALYTICS_CLIENT_KEY,id);
  }
  return id;
}
function trackPortalView(){
  try{
    fetch("./api/usage",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({clientId:analyticsClientId(),nickname:activeProfile().name,event:"portal_view"}),
      keepalive:true
    }).catch(()=>{});
  }catch{}
}

async function init(){
  loadStore();
  trackPortalView();
  try{const r=await fetch("./data/catalog.json",{cache:"no-store"});if(!r.ok)throw new Error();state.catalog=await r.json()}
  catch{state.catalog={studio:{name:"Gaming Studio J",tagline:"Play. Create. Explore."},items:[]};toast("Catalogue could not be loaded.")}
  syncGameEvents();syncExistingMrMelonProgress();bind();renderAll();
  if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
function bind(){
  $("#search").addEventListener("input",e=>{state.query=e.target.value.trim().toLowerCase();renderGrid()});
  $$(".tab").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.filter)));
  $$("[data-nav]").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.nav)));
  $("#heroPlay").addEventListener("click",()=>launch("mr-melons-adventure"));
  $("#heroDetails").addEventListener("click",()=>details("mr-melons-adventure"));
  $("#profileBtn").addEventListener("click",openProfile);
  $("#profileNav").addEventListener("click",openProfile);
  $("#mobileProfileBtn").addEventListener("click",openProfile);
  $("#viewProfileAchievements").addEventListener("click",openProfile);
  $("#settingsBtn").addEventListener("click",openSettings);
  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  $$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
  addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal.open").forEach(m=>closeModal(m.id))});
  $("#saveProfileBtn").addEventListener("click",saveProfileEdit);
  $("#newProfileBtn").addEventListener("click",createProfile);
  $("#familyMode").addEventListener("change",saveSettings);
  $("#maxRating").addEventListener("change",saveSettings);
  $("#settingsInstallBtn").addEventListener("click",installApp);
  $("#installBtn").addEventListener("click",installApp);
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.installPrompt=e;$("#installBtn").hidden=false});
  addEventListener("appinstalled",()=>{$("#installBtn").hidden=true;state.installPrompt=null;toast("Gaming Studio J installed.")});
  addEventListener("pageshow",()=>{syncGameEvents();renderAll()});
}
function renderAll(){
  $("#studioName").textContent=state.catalog.studio?.name||"Gaming Studio J";
  $("#studioTagline").textContent=state.catalog.studio?.tagline||"Play. Create. Explore.";
  renderProfileHeader();renderGrid();renderRecent();renderAchievements();
}
function allowedByFamily(item){
  if(!state.store.settings.familyMode)return true;
  const max=RATING_ORDER[state.store.settings.maxRating]??3;
  return (RATING_ORDER[item.age]??3)<=max;
}
function filtered(){
  const p=activeProfile(),today=Date.now()-1000*60*60*24*30;
  return (state.catalog.items||[]).filter(x=>{
    if(!allowedByFamily(x))return false;
    const f=state.filter;
    const filterOk=f==="all"||f===x.type||(f==="favorites"&&p.favorites.includes(x.id))||(f==="featured"&&x.featured)||(f==="new"&&new Date(x.created||0).getTime()>=today);
    const qOk=!state.query||[x.title,x.description,x.type,...(x.tags||[])].join(" ").toLowerCase().includes(state.query);
    return filterOk&&qOk;
  });
}
function setFilter(f){
  if(!f)return;
  state.filter=f;
  $$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.filter===f));
  $$("[data-nav]").forEach(x=>x.classList.toggle("active",x.dataset.nav===f||(f==="all"&&x.dataset.nav==="all")));
  const titles={all:"Discover",featured:"Featured",new:"New",game:"Games",app:"Apps",favorites:"Favourites"};
  $("#gridTitle").textContent=titles[f]||"Discover";renderGrid();
  $("#discover").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderGrid(){
  const items=filtered(),grid=$("#gameGrid");$("#resultCount").textContent=`${items.length} ${items.length===1?"title":"titles"}`;
  if(!items.length){grid.innerHTML='<div class="empty">Nothing here yet. Try another category or search term.</div>';return}
  grid.innerHTML=items.map(card).join("");
  $$("[data-play]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();launch(b.dataset.play)}));
  $$("[data-details]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();details(b.dataset.details)}));
  $$("[data-fav]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();toggleFav(b.dataset.fav)}));
  $$(".game-card").forEach(c=>c.addEventListener("click",()=>details(c.dataset.id)));
}
function card(x){
  const fav=activeProfile().favorites.includes(x.id),playable=x.status==="playable";
  return `<article class="game-card" data-id="${x.id}">
    <div class="game-thumb"><img src="${x.thumbnail}" alt="${escapeHtml(x.title)} artwork" loading="lazy">
      ${x.badge?`<span class="badge">${escapeHtml(x.badge)}</span>`:""}
      ${x.touchReady?'<span class="touch-badge">☝ Touch ready</span>':""}
      <button class="fav ${fav?"active":""}" data-fav="${x.id}" aria-label="${fav?"Remove from":"Add to"} favourites">${fav?"♥":"♡"}</button>
    </div>
    <div class="card-body">
      <div class="card-title-row"><img class="game-icon" src="${x.icon}" alt=""><div style="min-width:0"><div class="game-title">${escapeHtml(x.title)}</div><div class="meta">${escapeHtml(x.players||"")} • ${escapeHtml(x.age||"")}</div></div></div>
      <p class="desc">${escapeHtml(x.shortDescription||x.description)}</p>
      <div class="card-actions"><button class="btn primary" data-play="${x.id}" ${playable?"":"disabled"}>${playable?"▶ Play":"Coming soon"}</button><button class="btn secondary" data-details="${x.id}">Details</button></div>
    </div>
  </article>`;
}
function titleById(id){return (state.catalog.items||[]).find(x=>x.id===id)}
function launch(id){
  const x=titleById(id);if(!x||x.status!=="playable")return;
  const p=activeProfile(),first=!p.launches[id];p.launches[id]=(p.launches[id]||0)+1;p.lastPlayed[id]=now();p.recent=[id,...p.recent.filter(v=>v!==id)].slice(0,8);
  localStorage.setItem(ACTIVE_PROFILE_KEY,p.id);
  if(first)awardAchievement(`studio:first_play:${id}`,`First play: ${x.title}`,"Launch a Gaming Studio J title for the first time.","▶️",30);
  else addXP(5,`launch:${id}:${new Date().toISOString().slice(0,10)}`);
  saveStore();renderAll();location.href=x.url;
}
function details(id){
  const x=titleById(id);if(!x)return;state.currentDetails=id;
  $("#modalCover").src=x.thumbnail;$("#modalTitle").textContent=x.title;$("#modalDescription").textContent=x.description;
  $("#modalMeta").textContent=`${x.type==="game"?"Game":"App"} • ${x.players||""} • ${x.age||""}`;
  $("#modalTags").innerHTML=(x.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  $("#modalInfo").innerHTML=`<div class="info-chip"><small>Input</small><b>${escapeHtml((x.input||[]).join(" + "))}</b></div><div class="info-chip"><small>Touchscreen</small><b>${x.touchReady?"Supported":"Not listed"}</b></div><div class="info-chip"><small>Status</small><b>${escapeHtml(x.status||"")}</b></div>`;
  $("#modalPlay").disabled=x.status!=="playable";$("#modalPlay").textContent=x.status==="playable"?"▶ Play now":"Coming soon";$("#modalPlay").onclick=()=>launch(id);
  renderModalFavorite(x);renderStars(x);openModal("detailsModal");
}
function renderModalFavorite(x){
  const fav=activeProfile().favorites.includes(x.id),b=$("#modalFav");b.textContent=fav?"♥ Saved":"♡ Save";b.onclick=()=>{toggleFav(x.id);renderModalFavorite(x)};
}
function toggleFav(id){
  const p=activeProfile(),had=p.favorites.includes(id);
  p.favorites=had?p.favorites.filter(x=>x!==id):[id,...p.favorites];
  if(!had)awardAchievement("studio:first_favourite","First Favourite","Save a Studio title to your favourites.","♥",15);
  saveStore();renderGrid();renderProfileHeader();
}
function renderStars(x){
  const rating=Number(activeProfile().ratings[x.id]||0);
  $("#modalStars").innerHTML=[1,2,3,4,5].map(n=>`<button class="star ${n<=rating?"active":""}" data-rate="${n}" aria-label="${n} star rating">★</button>`).join("");
  $$("[data-rate]").forEach(b=>b.onclick=()=>rateTitle(x.id,Number(b.dataset.rate)));
}
function rateTitle(id,rating){
  const p=activeProfile(),first=!p.ratings[id];p.ratings[id]=rating;
  if(first)awardAchievement("studio:first_rating","First Rating","Rate a game or app in Gaming Studio J.","⭐",15);
  saveStore();renderStars(titleById(id));toast(`Rated ${rating}/5 stars`);
}
function renderRecent(){
  const p=activeProfile(),items=p.recent.map(titleById).filter(Boolean).filter(allowedByFamily),wrap=$("#recentShelf");
  if(!items.length){wrap.innerHTML='<div class="shelf-card"><div class="shelf-icon">🎮</div><div><b>Ready to play?</b><span>Your recently played games will appear here.</span></div></div>';return}
  wrap.innerHTML=items.slice(0,3).map(x=>`<button class="shelf-card recent-button" data-recent="${x.id}"><img class="shelf-icon" src="${x.icon}" alt=""><div><b>${escapeHtml(x.title)}</b><span>Continue playing</span></div></button>`).join("");
  $$("[data-recent]").forEach(b=>b.onclick=()=>launch(b.dataset.recent));
}
function renderAchievements(){
  const p=activeProfile(),earned=Object.values(p.achievements).sort((a,b)=>new Date(b.unlockedAt)-new Date(a.unlockedAt)),badges=derivedBadges();
  const cards=[...earned.slice(0,4).map(a=>achievementCard(a,true)),...badges.filter(b=>!b.unlocked).slice(0,Math.max(0,4-earned.length)).map(b=>achievementCard(b,false))];
  $("#achievementGrid").innerHTML=cards.length?cards.join(""):'<div class="empty">Play a game to start earning Studio achievements.</div>';
}
function achievementCard(a,unlocked){
  return `<div class="achievement-card ${unlocked?"":"locked"}"><div class="achievement-icon">${a.icon||"🏆"}</div><div><b>${escapeHtml(a.title)}</b><p>${escapeHtml(a.description||"")}${unlocked&&a.source?`<br>${escapeHtml(a.source)}`:""}</p></div></div>`;
}
function renderProfileHeader(){
  const p=activeProfile(),li=levelInfo(p.xp);
  $("#topAvatar").textContent=$("#sideAvatar").textContent=$("#mobileAvatar").textContent=$("#heroAvatar").textContent=p.avatar;
  $("#topName").textContent=$("#heroName").textContent=p.name;$("#topLevel").textContent=`Level ${li.level}`;
  $("#heroXpFill").style.width=`${li.pct}%`;$("#heroXpText").textContent=`${p.xp} XP • Level ${li.level}`;
}
function openProfile(){
  renderProfileModal();openModal("profileModal");
}
function renderProfileModal(){
  const p=activeProfile(),li=levelInfo(p.xp),earned=Object.values(p.achievements).sort((a,b)=>new Date(b.unlockedAt)-new Date(a.unlockedAt)),badges=derivedBadges().filter(b=>b.unlocked);
  $("#profileAvatar").textContent=p.avatar;$("#profileName").textContent=p.name;$("#profileLevel").textContent=`Studio Level ${li.level}`;$("#profileXpFill").style.width=`${li.pct}%`;$("#profileXpText").textContent=`${p.xp} XP • ${Math.max(0,li.next-p.xp)} XP to next level`;
  $("#profileStats").innerHTML=`<div class="stat-card"><b>${Object.values(p.launches).reduce((a,b)=>a+b,0)}</b><span>Launches</span></div><div class="stat-card"><b>${earned.length}</b><span>Achievements</span></div><div class="stat-card"><b>${p.favorites.length}</b><span>Favourites</span></div><div class="stat-card"><b>${badges.length}</b><span>Badges</span></div>`;
  $("#profileList").innerHTML=state.store.profiles.map(x=>`<button class="profile-choice ${x.id===p.id?"active":""}" data-profile="${x.id}"><span class="emoji">${x.avatar}</span><span><b>${escapeHtml(x.name)}</b><small>Level ${levelInfo(x.xp).level}</small></span></button>`).join("");
  $$("[data-profile]").forEach(b=>b.onclick=()=>switchProfile(b.dataset.profile));
  $("#profileNameInput").value=p.name;$("#profileAvatarInput").value=p.avatar;
  const all=[...earned,...badges.map(b=>({...b,source:"Studio Badge"}))];
  $("#profileAchievementGrid").innerHTML=all.length?all.map(a=>achievementCard(a,true)).join(""):'<div class="empty">No achievements yet.</div>';
}
function switchProfile(id){
  if(!state.store.profiles.some(p=>p.id===id))return;
  state.store.activeProfileId=id;saveStore();syncGameEvents();renderAll();renderProfileModal();toast(`Switched to ${escapeHtml(activeProfile().name)}`);
}
function saveProfileEdit(){
  const p=activeProfile(),name=$("#profileNameInput").value.trim().slice(0,18)||p.name,avatar=$("#profileAvatarInput").value||p.avatar;
  const changed=name!==p.name||avatar!==p.avatar;p.name=name;p.avatar=avatar;if(changed)awardAchievement("studio:profile_customized","Made It Yours","Customize your Gaming Studio J profile.","🎨",20);
  saveStore();renderAll();renderProfileModal();
}
function createProfile(){
  if(state.store.profiles.length>=8){toast("This device already has 8 profiles.");return}
  const name=`Player ${state.store.profiles.length+1}`,p=newProfile(name,"🎮");state.store.profiles.push(p);state.store.activeProfileId=p.id;saveStore();renderAll();renderProfileModal();toast(`Created ${name}`);
}
function openSettings(){
  $("#familyMode").checked=!!state.store.settings.familyMode;$("#maxRating").value=state.store.settings.maxRating||"All";$("#settingsInstallBtn").disabled=!state.installPrompt;openModal("settingsModal");
}
function saveSettings(){
  state.store.settings.familyMode=$("#familyMode").checked;state.store.settings.maxRating=$("#maxRating").value;saveStore();renderGrid();renderRecent();
}
async function installApp(){
  if(!state.installPrompt){toast("Install is available from your browser menu on supported devices.");return}
  state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$("#installBtn").hidden=true;$("#settingsInstallBtn").disabled=true;
}
function syncExistingMrMelonProgress(){
  let game;try{game=JSON.parse(localStorage.getItem("mrMelonAdventure_v1")||"null")}catch{}
  if(!game||!game.achievements)return;
  const map={
    armored:["Rind Ready","🛡️"],boss:["Rind Breaker","👑"],bottle:["Deep Water Treasure","💧"],
    brainy:["Melon Mathematician","🧠"],checkpoint:["Halfway Hero","🚩"],collector:["Melon Collector","🍈"],
    combo3:["Triple Melon Combo","🔥"],freeze:["Cool as Ice","❄️"],nova:["A New Hero","⚡"],
    secret1:["Secret Seed Hunter","🌟"],secretall:["Golden Gardener","👑"],stomper:["Head Bouncer","👟"],
    superfreeze:["Absolute Zero","🌨️"]
  };
  const p=activeProfile();let changed=false;
  for(const [id,earned] of Object.entries(game.achievements)){
    if(!earned)continue;
    const a=map[id]||[id,"🏆"],aid=`game:mr-melons-adventure:${id}`;
    if(p.achievements[aid])continue;
    p.achievements[aid]={id:aid,title:a[0],description:"Imported from existing Mr. Melon's Adventure progress.",icon:a[1],xp:40,source:"Mr. Melon's Adventure",unlockedAt:now()};
    if(!p.xpLedger[`achievement:${aid}`]){p.xpLedger[`achievement:${aid}`]=now();p.xp+=40}
    changed=true;
  }
  if(changed){saveStore();toast("Existing Mr. Melon achievements added to this Studio profile.");}
}

function syncGameEvents(){
  let events=[];try{events=JSON.parse(localStorage.getItem(EVENT_KEY)||"[]")}catch{}
  if(!Array.isArray(events))return;
  const p=activeProfile();let changed=false;
  for(const e of events){
    if(e.profileId!==p.id)continue;
    const id=`game:${e.gameId}:${e.achievementId}`;
    if(!p.achievements[id]){
      p.achievements[id]={id,title:e.title||"Game achievement",description:e.description||`Unlocked in ${e.gameTitle||"a Studio game"}.`,icon:e.icon||"🏆",xp:Number(e.xp)||40,source:e.gameTitle||e.gameId,unlockedAt:e.ts||now()};
      if(!p.xpLedger[`achievement:${id}`]){p.xpLedger[`achievement:${id}`]=now();p.xp+=Number(e.xp)||40}
      changed=true;
    }
  }
  if(changed){saveStore();toast("New game achievement synced to your Studio profile.");}
}
function openModal(id){document.getElementById(id)?.classList.add("open");document.body.style.overflow="hidden"}
function closeModal(id){document.getElementById(id)?.classList.remove("open");if(!$$(".modal.open").length)document.body.style.overflow=""}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
init();
