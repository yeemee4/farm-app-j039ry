/* ================= v0.6 · 구글 시트 서버 동기화 =================
   켜는 곳: 설정 › 서버 연결 (대표). 서버 = server/Code.gs (Apps Script 웹 앱).
   방식: save() 할 때마다 1.2초 뒤 '바뀐 것만' 골라(기록·모돈은 한 건씩, 나머지 설정은 키별) 보낼 목록에 넣고 보냄.
         인터넷이 끊기면 보낼 목록에 쌓아 두었다가 다시 연결되면 보냄. 1분마다·화면을 다시 열 때 받아 옴.
         같은 기록을 두 곳에서 고치면 나중에 서버에 닿은 쪽이 남음. 아직 못 보낸 내 수정은 받아 온 값으로 덮지 않음.
   PIN 은 서버로 해시만 보냄. 서버 주소·토큰은 이 휴대폰에만 저장(저장소에 없음). */
const SYNC_KEY=ENV==="test"?"farm-test-sync":"farm-sync",SYNC_SKIP=["v","user","accounts"],PIN_MASK="•",SUBK="§";
const syObj=v=>v&&typeof v==="object"&&!Array.isArray(v);
let SY=(()=>{try{return JSON.parse(localStorage.getItem(SYNC_KEY)||"null")}catch(e){return null}})()||{};
SY.snap=SY.snap||{rec:{},sow:{},key:{}};SY.out=SY.out||{};SY.ph=SY.ph||{};
const syOn=()=>!!(SY.url&&SY.token);
function sySave(){try{localStorage.setItem(SYNC_KEY,JSON.stringify(SY))}catch(e){}}
const syFarm=()=>SY.farm||FARM.id||"bidam";
// 짧은 해시(변경 감지용) · PIN 해시(SHA-256)
function fnv(s){if(typeof s!=="string")s=s==null?"":String(JSON.stringify(s));let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+s.length.toString(36)}
function sha256(str){const K=[],H=[];let p=2;const isP=n=>{for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true},fr=x=>((x-Math.floor(x))*4294967296)|0;
  for(let n=0;n<64;p++)if(isP(p)){if(n<8)H[n]=fr(Math.pow(p,1/2));K[n++]=fr(Math.pow(p,1/3))}
  const b=unescape(encodeURIComponent(str)),l=b.length,w=[];for(let i=0;i<l;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);w[l>>2]|=0x80<<(24-(l%4)*8);w[((l+8>>6)<<4)+15]=l*8;
  const r=(x,n)=>(x>>>n)|(x<<(32-n));for(let j=0;j<w.length;j+=16){const W=w.slice(j,j+16).map(x=>x|0);let [a,b2,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){if(i>=16){const s0=r(W[i-15],7)^r(W[i-15],18)^(W[i-15]>>>3),s1=r(W[i-2],17)^r(W[i-2],19)^(W[i-2]>>>10);W[i]=(W[i-16]+s0+W[i-7]+s1)|0}
      const t1=(h+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+W[i])|0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b2)^(a&c)^(b2&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b2;b2=a;a=(t1+t2)|0}
    H[0]=(H[0]+a)|0;H[1]=(H[1]+b2)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0}
  return H.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("")}
const pinHash=(acc,pin)=>sha256(syFarm()+"|"+acc+"|"+pin);
async function syCall(q){const r=await fetch(SY.url,{method:"POST",body:JSON.stringify(q),headers:{"Content-Type":"text/plain;charset=utf-8"},redirect:"follow"});if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
// ---- 상태 표시 ----
let SYST={busy:false,err:null,last:SY.last||null};
function syPending(){return Object.keys(SY.out).length}
function syBadge(){const w=$("#whoBtn i");if(!w)return;const n=syPending();let c="",tt="";
  if(!SY.url){c="";tt=""}else if(!SY.token){c="var(--red)";tt=t("서버 로그인 필요")}else if(SYST.err||!navigator.onLine){c="var(--amber)";tt=`${t("오프라인")}${n?` · ${t("보낼 기록")} ${n}${t("건")}`:""}`}else if(n){c="var(--amber)";tt=`${t("보내는 중")} ${n}${t("건")}`}else{c="var(--good)";tt=`${t("동기화됨")}${SYST.last?" · "+SYST.last:""}`}
  w.style.background=c||"";const b=$("#whoBtn");if(b)b.title=tt;let e=$("#syncTag");if(!e&&$("#hdDate")){e=document.createElement("span");e.id="syncTag";$("#hdDate").after(e)}if(e){e.textContent=tt?"☁ "+tt:"";e.style.color=c||""}}
// ---- 바뀐 것 고르기 ----
let syT=null;
function syDiff(){if(!syOn()||!state)return;if(SY.join||SY.replace){clearTimeout(syT);syT=setTimeout(syDiff,1500);return}   // 처음 받기가 끝나기 전엔 이 휴대폰 옛 기록을 올리지 않음
  const S=SY.snap,F=syFarm(),add=(k,id,j,del)=>{SY.out[k+"|"+id]={farm:F,k,id,j:del?"":j,del:!!del,n:null}};
  const scan=(k,arr)=>{const seen={};arr.forEach(x=>{const j=JSON.stringify(x),h=fnv(j);seen[x.id]=1;if(S[k][x.id]!==h){S[k][x.id]=h;add(k,x.id,j);if(k==="rec"&&!SY.fresh)SY.out[k+"|"+x.id].n=syNote(x)}});Object.keys(S[k]).forEach(id=>{if(!seen[id]){delete S[k][id];add(k,id,"",true)}})};
  scan("rec",state.records||[]);scan("sow",state.sows||[]);
  // 설정 묶음: 객체(할 일 체크·아침 점검·마감 등)는 안쪽 항목 하나씩 → 두 사람이 동시에 체크해도 서로 덮지 않음
  const seenK={};Object.keys(state).filter(k=>!SYNC_SKIP.includes(k)).forEach(k=>{const v=state[k];
    if(syObj(v))Object.keys(v).forEach(sub=>{const id=k+SUBK+sub,j=JSON.stringify(v[sub]),h=fnv(j);seenK[id]=1;if(S.key[id]!==h){S.key[id]=h;add("key",id,j)}});
    else{const j=JSON.stringify(v),h=fnv(j);seenK[k]=1;if(S.key[k]!==h){S.key[k]=h;add("key",k,j)}}});
  Object.keys(S.key).forEach(id=>{if(!seenK[id]){delete S.key[id];add("key",id,"",true)}});
  // 계정은 따로 (PIN 해시만)
  const ah=fnv(JSON.stringify(state.accounts||[]));if(S.acc!==ah){S.acc=ah;SY.accDirty=true}
  SY.fresh=false;sySave();syFlush()}
// 디스코드 알림 문구 (켜 둔 항목만)
const NOTIF_ON=["폐사","도태","교배","임신확인","분만","이유","이동","약품","백신","돈군백신","출하","실사"];
function notifOn(type,d){const o=(state.notif||{})[type];if(o!==undefined)return o;if(type==="사료")return d&&d.mode!=="입고";return NOTIF_ON.includes(type)}
function syNote(r){try{if(!r||!r.type||!notifOn(r.type,r.data)||r.workDate<addDays(TODAY,-2))return null;return `[${FARM.name||"비담농장"}] ${L(r.type)} · ${summary(r)} · ${r.user||""}`}catch(e){return null}}
// ---- 보내기 · 받기 ----
let syLock=Promise.resolve();function syQ(fn){const p=syLock.then(fn,fn);syLock=p.catch(()=>{});return p}
function syFlush(){return syQ(syFlush1)}
async function syFlush1(){if(!syOn())return;SYST.busy=true;
  try{if(SY.accDirty){const A=(state.accounts||[]).map(a=>{const o={id:a.id,name:a.name,role:a.role,farm:a.farm||syFarm(),lang:a.lang,active:a.active!==false};if(a.pin&&!a.pin.includes(PIN_MASK)){o.ph=pinHash(a.id,a.pin);o.pinLen=a.pin.length}return o});
      const r=await syCall({a:"saveAccounts",token:SY.token,farm:syFarm(),accounts:A});if(r.ok)SY.accDirty=false;else if(r.err==="auth")return syAuthLost()}
    const keys=Object.keys(SY.out);for(let i=0;i<keys.length;i+=400){const part=keys.slice(i,i+400),rows=part.map(k=>SY.out[k]);
      const r=await syCall({a:"push",token:SY.token,rows});if(!r.ok){if(r.err==="auth")return syAuthLost();throw new Error("서버: "+r.err)}
      part.forEach(k=>{if(SY.out[k]===rows[part.indexOf(k)])delete SY.out[k]})}
    SYST.err=null;SYST.last=nowHM();SY.last=SYST.last}
  catch(e){SYST.err=t("보내기")+" · "+String(e.message||e)}finally{SYST.busy=false;sySave();syBadge()}}
function syPull(full){return syQ(()=>syPull1(full))}
async function syPull1(full){if(!syOn())return;SYST.busy=true;let changed=false;
  try{const r=await syCall({a:"pull",token:SY.token,farm:syFarm(),since:full?0:(SY.cursor||0)});if(!r.ok){if(r.err==="auth")return syAuthLost();throw new Error("서버: "+r.err)}
    if(SY.replace){SY.replace=false;state.records=[];state.sows=[];SY.snap={rec:{},sow:{},key:{}}}
    const S=SY.snap,idx={rec:{},sow:{}};(state.records||[]).forEach((x,i)=>idx.rec[x.id]=i);(state.sows||[]).forEach((x,i)=>idx.sow[x.id]=i);
    const kill={rec:new Set(),sow:new Set()};
    r.rows.forEach(w=>{w.id=String(w.id);if(!w.del&&typeof w.j!=="string")w.j=w.j==null||w.j===""?"null":JSON.stringify(w.j);   // 시트가 3·true 같은 값을 숫자·참거짓으로 돌려줌 → 다시 글자로
      if(SY.out[w.k+"|"+w.id])return;   // 아직 못 보낸 내 수정이 우선
      const h=w.del?null:fnv(w.j);
      if(w.k==="key"){const [k,sub]=w.id.split(SUBK);if(SYNC_SKIP.includes(k)||S.key[w.id]===h)return;changed=true;
        if(sub===undefined){if(w.del)delete state[k];else state[k]=JSON.parse(w.j)}else{if(!syObj(state[k]))state[k]={};if(w.del)delete state[k][sub];else state[k][sub]=JSON.parse(w.j)}
        if(w.del)delete S.key[w.id];else S.key[w.id]=h;return}
      const arr=w.k==="rec"?state.records:state.sows,I=idx[w.k];
      if(w.del){if(I[w.id]!==undefined){kill[w.k].add(w.id);changed=true}delete S[w.k][w.id];return}
      if(S[w.k][w.id]===h)return;const o=JSON.parse(w.j);if(I[w.id]!==undefined)arr[I[w.id]]=o;else{I[w.id]=arr.length;arr.push(o)}S[w.k][w.id]=h;changed=true});
    {const seen=new Set();for(let i=state.records.length-1;i>=0;i--){const id=state.records[i].id;if(seen.has(id)||kill.rec.has(id))state.records.splice(i,1);else seen.add(id)}}if(kill.sow.size)state.sows=state.sows.filter(x=>!kill.sow.has(x.id));
    if(r.accounts&&r.accounts.length){const loc={};(state.accounts||[]).forEach(a=>loc[a.id]=a);state.accounts=r.accounts.map(a=>{const l=loc[a.id];const keep=l&&l.pin&&!l.pin.includes(PIN_MASK)&&l.pin.length===a.pinLen;return {...a,pin:keep?l.pin:PIN_MASK.repeat(a.pinLen||4)}});S.acc=fnv(JSON.stringify(state.accounts));changed=true}
    SY.cursor=r.cursor;SY.discord=r.discord;SYST.err=null;SYST.last=nowHM();SY.last=SYST.last}
  catch(e){SYST.err=t("받기")+" · "+String(e.message||e)+(e.stack&&!String(e.message).startsWith("서버")?" @"+String(e.stack).split("\n")[1].trim().slice(0,60):"")}finally{SYST.busy=false;sySave();syBadge()}
  if(changed){SYNC_MUTE=true;save();SYNC_MUTE=false;if(!document.querySelector(".sheet")&&!(ui.in&&tab==="input"))render()}
  return changed}
function syAuthLost(){SY.token=null;sySave();SYST.busy=false;syBadge();toast(t("서버 로그인이 끝났습니다. 다시 로그인해 주세요."))}
// save() 를 감싸 변경 감지 예약
let SYNC_MUTE=false;const _save0=save;
save=function(){_save0();if(SYNC_MUTE||!syOn())return;clearTimeout(syT);syT=setTimeout(syDiff,1200)};
setInterval(()=>{if(syOn()&&document.visibilityState==="visible"){if(syPending())syFlush();else syPull()}},60e3);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&syOn())syPull()});
addEventListener("online",()=>{if(syOn())syFlush().then(()=>syPull())});
const _render0=render;render=function(){_render0();try{syBadge()}catch(e){}};

// ---- 로그인: 서버 연결 중이면 PIN 을 서버에서 확인 (한 번 성공한 계정은 오프라인에서도 이 휴대폰에서 로그인) ----
const _pinKey0=A.pinKey;
A.pinKey=v=>{if(!SY.url)return _pinKey0(v);const a=state.accounts.find(x=>x.id===ui.loginId);if(!a)return;ui.pinErr=false;ui.pin=(ui.pin||"")+v;
  const need=a.pinLen||(a.pin||"").length||4;if(ui.pin.length<need){render();return}
  const pin=ui.pin,ph=pinHash(a.id,pin);ui.pin="";
  const ok=tok=>{ME=a.id;try{localStorage.setItem(SKEY,ME)}catch(e){}SY.ph[a.id]=ph;if(tok)SY.token=tok;SY.acc=a.id;sySave();ui.loginId=null;tab="home";ui.setPage="main";render();window.scrollTo(0,0);if(syOn())syFlush().then(()=>syPull())};
  if(!navigator.onLine&&SY.ph[a.id]===ph){ok(null);return}
  syCall({a:"login",acc:a.id,ph,farm:syFarm()}).then(r=>{if(r.ok)ok(r.token);else{ui.pinErr=true;render()}}).catch(()=>{if(SY.ph[a.id]===ph)ok(null);else{ui.pinErr=true;toast(t("서버에 연결할 수 없습니다. 이 휴대폰에서 처음 로그인하는 계정은 인터넷이 필요합니다."));render()}})};

// ---- 설정 › 서버 연결 ----
function vSyncSet(){const n=syPending(),me0=me();
  let h=`<div class="pagehd"><h2>☁ ${t("서버 연결")}</h2></div><div class="note">${t("구글 시트 서버에 연결하면 여러 휴대폰이 같은 기록을 봅니다. 인터넷이 끊겨도 입력은 되고, 연결되면 자동으로 보냅니다.")}</div>`;
  h+=`<div class="panel"><div class="f"><label for="syUrl">${t("서버 주소 (Apps Script 웹 앱 URL)")}</label><input type="url" id="syUrl" value="${esc(SY.url||"")}" placeholder="https://script.google.com/macros/s/…/exec"></div>
    <div class="acts"><button class="act pri" type="button" data-a="syHello">${t("연결 확인")}</button>${SY.url?`<button class="act" type="button" data-a="syOff">${t("연결 끊기")}</button>`:""}</div>
    ${ui.syMsg?`<div class="note" style="color:${ui.syMsg.bad?"var(--red)":"var(--good)"}">${esc(ui.syMsg.t)}</div>`:""}</div>`;
  if(ui.syHello&&ui.syHello.empty&&can("admin"))h+=`<div class="sec-t">${t("처음 설치")}</div><div class="panel"><div class="note">${t("서버가 비어 있습니다. 이 휴대폰의 계정·기록으로 서버를 시작합니다. 다른 휴대폰은 그다음 ‘서버에서 받기’로 연결합니다.")}</div><div class="acts"><button class="act pri" type="button" data-a="syInit">${t("이 휴대폰 기록으로 서버 시작")}</button></div></div>`;
  if(ui.syHello&&!ui.syHello.empty&&!SY.token)h+=`<div class="sec-t">${t("이 휴대폰 연결")}</div><div class="panel"><div class="note">${t("서버의 기록을 받아 이 휴대폰의 기록을 바꿉니다(이 휴대폰에만 있던 기록은 사라집니다). 그다음 로그인 화면에서 내 PIN 으로 로그인하세요.")}</div><div class="acts"><button class="act pri" type="button" data-a="syJoin">${t("서버에서 받기")}</button></div></div>`;
  if(SY.url&&SY.token){h+=`<div class="sec-t">${t("상태")}</div><div class="panel"><div class="setrow"><span>${t("농장")}</span><b>${esc(syFarm())}</b></div><div class="setrow"><span>${t("보낼 기록")}</span><b>${n}${t("건")}</b></div><div class="setrow"><span>${t("마지막 동기화")}</span><b>${esc(SYST.last||"-")}</b></div>${SYST.err?`<div class="note" style="color:var(--amber)">${esc(SYST.err)}</div>`:""}
    <div class="acts"><button class="act" type="button" data-a="syNow">${t("지금 동기화")}</button><button class="act" type="button" data-a="syFull">${t("전부 다시 받기")}</button></div></div>`;
    if(can("admin")){h+=`<div class="sec-t">${t("디스코드 알림")} <span>${SY.discord?t("연결됨"):t("안 됨")}</span></div><div class="panel"><div class="f"><label for="syDc">${t("디스코드 웹훅 주소 (서버에만 저장)")}</label><input type="url" id="syDc" placeholder="https://discord.com/api/webhooks/…"></div><div class="acts"><button class="act pri" type="button" data-a="syDc">${t("저장·시험 메시지")}</button>${SY.discord?`<button class="act" type="button" data-a="syDcOff">${t("알림 끄기")}</button>`:""}</div></div>`;
      const T=[...new Set([...NOTIF_ON,"양자","특이사항","사료","재고","도입"])];
      h+=`<div class="sec-t">${t("알림 보낼 기록")}</div><div class="panel">${T.map(k=>{const on=notifOn(k,{mode:"빈 잔량"});return `<div class="setrow"><span>${esc(L(k))}${k==="사료"?` <small class="sow-meta">(${t("잔량만, 입고는 안 보냄")})</small>`:""}</span><button class="sbtn ${on?"on":""}" type="button" data-a="syNotif" data-v="${k}">${on?t("보냄"):t("안 보냄")}</button></div>`}).join("")}</div>`}}
  h+=`<div class="note">${t("앱 빌드")} ${esc(ENV)} · ${esc(typeof BUILD_AT!=="undefined"?BUILD_AT:"-")} · ${t("설치 방법은 저장소의 server/설치안내 를 보세요. 서버 주소와 PIN 은 저장소에 올라가지 않습니다.")}</div>`;
  return h}
Object.assign(A,{
  syHello:async()=>{const u=($("#syUrl").value||"").trim();if(!/^(https:\/\/script\.google(usercontent)?\.com\/|http:\/\/localhost:)/.test(u)){ui.syMsg={t:t("Apps Script 웹 앱 주소(https://script.google.com/…/exec)를 넣어 주세요."),bad:1};render();return}
    SY.url=u;sySave();try{const r=await syCall({a:"hello"});ui.syHello=r;ui.syMsg={t:r.empty?t("연결됨 · 서버가 비어 있음(처음 설치)"):t("연결됨 · 기록이 있는 서버")};}catch(e){ui.syMsg={t:t("연결 실패")+": "+e.message,bad:1}}render()},
  syOff:()=>{if(!confirm(t("서버 연결을 끊을까요? 이 휴대폰의 기록은 그대로 남습니다.")))return;SY={snap:{rec:{},sow:{},key:{}},out:{},ph:{}};sySave();ui.syHello=null;ui.syMsg=null;render()},
  syInit:async()=>{const a=me();if(!a||a.role!=="admin"||!a.pin||a.pin.includes(PIN_MASK)){toast(t("대표 계정으로 로그인한 상태에서 하세요"));return}
    // 공개 저장소에 적힌 기본 PIN 그대로면 서버를 열지 않음 (누구나 로그인할 수 있으므로)
    const DEF=["9368","1234","1111","2222","3333","4444","0000"],weak=state.accounts.filter(x=>x.active!==false&&DEF.includes(x.pin));
    if(weak.length){ui.syMsg={t:`${t("기본 PIN 을 먼저 바꿔 주세요(설정 › 계정 관리)")}: ${weak.map(x=>x.name).join(", ")}`,bad:1};render();return}
    if(!confirm(t("이 휴대폰의 계정과 기록으로 서버를 시작할까요?")))return;
    const A2=state.accounts.filter(x=>x.pin&&!x.pin.includes(PIN_MASK)).map(x=>({id:x.id,name:x.name,role:x.role,farm:syFarm(),lang:x.lang,active:x.active!==false,ph:pinHash(x.id,x.pin),pinLen:x.pin.length}));
    try{let r=await syCall({a:"init",farm:syFarm(),accounts:A2});if(!r.ok)throw new Error(r.err);r=await syCall({a:"login",acc:a.id,ph:pinHash(a.id,a.pin),farm:syFarm()});if(!r.ok)throw new Error(r.err);
      SY.token=r.token;SY.acc=a.id;SY.farm=syFarm();SY.snap={rec:{},sow:{},key:{},acc:fnv(JSON.stringify(state.accounts))};SY.out={};SY.fresh=true;SY.cursor=0;sySave();ui.syHello=null;ui.syMsg={t:t("서버를 시작했습니다. 기록을 올리는 중…")};render();
      syDiff();syQ(()=>{}).then(()=>{ui.syMsg=syPending()?{t:`${t("아직 보낼 기록")} ${syPending()}${t("건")} · ${t("인터넷 연결 뒤 자동으로 이어서 보냅니다")}`,bad:1}:{t:t("올리기 완료")+" · "+(state.records||[]).length+t("건")};render()})}catch(e){ui.syMsg={t:t("실패")+": "+e.message,bad:1};render()}},
  syJoin:async(v,skip)=>{if(!skip&&!confirm(t("서버 기록으로 이 휴대폰 기록을 바꿀까요?")))return;
    try{const r=await syCall({a:"accounts"});if(!r.ok)throw new Error(r.err);state.accounts=r.accounts.map(a=>({...a,pin:PIN_MASK.repeat(a.pinLen||4)}));SY.farm=syFarm();SY.cursor=0;SY.snap={rec:{},sow:{},key:{}};SY.out={};SY.token=null;SY.join=true;sySave();
      ME=null;try{localStorage.removeItem(SKEY)}catch(e){}SYNC_MUTE=true;save();SYNC_MUTE=false;ui.syHello=null;tab="home";render();toast(t("내 계정을 고르고 PIN 을 넣으면 기록을 받아 옵니다"))}catch(e){ui.syMsg={t:t("실패")+": "+e.message,bad:1};render()}},
  syNow:()=>{syDiff();setTimeout(()=>syPull().then(()=>render()),1500)},
  syFull:()=>{if(!confirm(t("서버의 기록을 전부 다시 받을까요?")))return;SY.cursor=0;syPull(true).then(()=>{toast(t("다시 받았습니다"));render()})},
  syDc:async()=>{const u=($("#syDc").value||"").trim();const r=await syCall({a:"setDiscord",token:SY.token,url:u}).catch(e=>({ok:false,err:e.message}));if(r.ok){SY.discord=!!u;sySave();toast(t("디스코드 알림을 저장했습니다"))}else toast(t("실패")+": "+r.err);render()},
  syDcOff:async()=>{await syCall({a:"setDiscord",token:SY.token,url:""}).catch(()=>{});SY.discord=false;sySave();render()},
  syNotif:v=>{const o=state.notif=state.notif||{};o[v]=!notifOn(v,{mode:"빈 잔량"});save();render()}});
// 처음 연결(서버에서 받기) 뒤 첫 로그인: 서버 기록 전체로 이 휴대폰을 채움
const _syPull0=syPull;
syPull=async function(full){if(SY.join&&SY.token){SY.join=false;SY.replace=true;sySave();const c=await syQ(()=>syPull1(true));
    if(typeof migrate==="function")try{migrate()}catch(e){}SYNC_MUTE=true;save();SYNC_MUTE=false;render();return c}return _syPull0(full)};
// 설정 메뉴에 ‘서버 연결’
const _vSettings1=vSettings;
vSettings=function(){const P=ui.setPage||"main",back=`<div class="pagehd"><button class="back" type="button" data-a="setPage" data-v="main">‹ ${t("설정")}</button></div>`;
  if(P==="sync"&&can("admin"))return back+vSyncSet();const h=_vSettings1();if(P!=="main"||!can("admin"))return h;
  const mi=`<button class="mitem" type="button" data-a="setPage" data-v="sync"><span></span><span><b>☁ ${t("서버 연결")}</b><small>${SY.url?(syOn()?t("연결됨"):t("로그인 필요")):t("구글 시트 서버 · 여러 휴대폰 동기화 · 디스코드 알림")}</small></span><span>›</span></button>`;
  return h.replace('<button class="mitem" type="button" data-a="setPage" data-v="accounts">',mi+'<button class="mitem" type="button" data-a="setPage" data-v="accounts">')};
// 앱을 열 때: 연결돼 있으면 받아 오기
setTimeout(()=>{if(syOn()){syPull();if(syPending())syFlush()}},1500);
// 로그인 화면: 팀장·작업자 휴대폰도 대표 PIN 없이 서버에 연결 (서버에서 받기)
const _vLogin0=vLogin;
vLogin=function(){const h=_vLogin0();if(ui.loginId)return h;
  const box=ui.syLogin?`<div class="panel sy-login"><div class="f"><label for="syUrl">${t("서버 주소 (대표에게 받은 주소)")}</label><input type="url" id="syUrl" value="${esc(SY.url||"")}" placeholder="https://script.google.com/macros/s/…/exec"></div>
      <div class="acts"><button class="act pri" type="button" data-a="syHello">${t("연결 확인")}</button>${ui.syHello&&!ui.syHello.empty?`<button class="act pri" type="button" data-a="syJoin">${t("서버에서 받기")}</button>`:""}</div>
      ${ui.syMsg?`<div class="note" style="color:${ui.syMsg.bad?"var(--red)":"var(--good)"}">${esc(ui.syMsg.t)}</div>`:""}</div>`
    :`<button class="act" type="button" data-a="syLogin" style="margin:14px auto 0;display:block">☁ ${SY.url?t("서버 연결됨"):t("서버 연결")}</button>`;
  return h+box};
A.syLogin=()=>{ui.syLogin=true;render()};

// 시험용 표시: 주황 띠 + 제목
if(ENV==="test"){document.body.classList.add("env-test");const v=$("#hdVer");if(v)v.dataset.env="1"}

// ---- 초대 링크: 앱주소#join=<서버 주소> → 열면 서버 연결·받기 자동, 받은 사람은 계정·PIN 만 (입장 키 화면을 거쳐도 유지) ----
(()=>{const m=location.hash.match(/join=([^&]+)/);if(!m)return;try{sessionStorage.setItem("farm-join",decodeURIComponent(m[1]))}catch(e){}
  const h=location.hash.replace(/&?join=[^&]+/,"");history.replaceState(null,"",location.pathname+location.search+(h.length>1?h:""))})();
let syInvDone=false;function syInviteRun(){let u=null;try{u=sessionStorage.getItem("farm-join");sessionStorage.removeItem("farm-join")}catch(e){}
  if(!u||!/^(https:\/\/script\.google\.com\/|http:\/\/localhost:)/.test(u)||(SY.url===u&&SY.token))return;SY.url=u;sySave();A.syJoin(null,true)}
const _render90i=render;render=function(){const r=_render90i.apply(this,arguments);if(!syInvDone){syInvDone=true;setTimeout(syInviteRun,0)}return r};
function syInviteUrl(){return location.origin+location.pathname+"#join="+encodeURIComponent(SY.url)}
A.syInvite=()=>{const u=syInviteUrl();try{navigator.clipboard.writeText(u)}catch(e){}
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet"><div class="sh-hd"><h2>${t("초대 링크")}</h2></div>
  <p class="sow-meta">${t("링크를 복사했습니다. 그 사람에게만 따로 보내세요(단체방 금지). 열면 서버에 자동 연결되고, 자기 계정과 PIN 만 넣으면 됩니다. 현장에서는 아래 QR 을 휴대폰 카메라로 찍게 하세요.")}</p>
  <div id="syQr" style="background:#fff;padding:12px;border-radius:12px;width:max-content;margin:12px auto"></div>
  <button class="act pri" type="button" data-a="syInvCopy">${t("다시 복사")}</button></div></div>`;
  const draw=()=>{try{new QRCode($("#syQr"),{text:u,width:220,height:220,correctLevel:QRCode.CorrectLevel.M})}catch(e){}};
  if(window.QRCode)draw();else{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";sc.onload=draw;sc.onerror=()=>{const q=$("#syQr");if(q)q.textContent=t("QR 을 불러오지 못했습니다(인터넷 확인). 링크는 복사되었습니다.")};document.head.appendChild(sc)}};
A.syInvCopy=()=>{try{navigator.clipboard.writeText(syInviteUrl());toast(t("복사했습니다"))}catch(e){prompt(t("복사하세요"),syInviteUrl())}};
const _vSyncSet90i=vSyncSet;vSyncSet=function(){const h=_vSyncSet90i();return can("admin")&&SY.url&&SY.token?h.replace(`<div class="sec-t">${t("상태")}</div>`,`<div class="sec-t">${t("다른 휴대폰 초대")}</div><div class="panel"><p class="sow-meta">${t("링크나 QR 로 연결하면 계정·PIN 만 넣으면 됩니다.")}</p><button class="act pri" type="button" data-a="syInvite">📲 ${t("초대 링크·QR")}</button></div><div class="sec-t">${t("상태")}</div>`):h};
