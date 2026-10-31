// ---- 휴대폰 보관 기간(저장 용량 한도 약 5MB): 매일 기록은 최근 12개월만 휴대폰에, 그 전은 서버(구글 시트)와 드라이브 백업에만 ----
// 모돈 번식 기록(모돈 번호가 붙은 기록·KEEP_T)은 현장 카드 8산 때문에 항상 남김. 서버 Code.gs 의 KEEP_T·oldDaily 와 같은 규칙
const KEEP_T=["교배","임신확인","분만","이유","양자","도태","도입","BCS","동기화","레규급여"];
const keepAlways=r=>KEEP_T.includes(r.type)||!!(r.data&&r.data.sow);
const arcCut=()=>addDays(TODAY,-365);
// 빼도 되는 것만 뺌: 서버에 이미 있는 그대로(보낼 목록에 없고, 마지막으로 주고받은 내용과 같음)인 오래된 매일 기록. 스냅숏에서도 지워 '삭제'로 보내지 않음
function syPrune(){if(!syOn()||!SY.token||SY.join||SY.replace||!SY.snap)return 0;const cut=arcCut(),S=SY.snap.rec;let n=0;
  state.records=state.records.filter(r=>{if(r._old||keepAlways(r)||!(r.workDate<cut)||SY.out["rec|"+r.id]||S[r.id]!==fnv(JSON.stringify(r)))return true;delete S[r.id];n++;return false});
  if(n){sySave();SYNC_MUTE=true;save();SYNC_MUTE=false}return n}
// ---- 예전 기간 보기(보기 전용): 서버에서 받아 성적·타임라인·그래프에 보여 주고, 휴대폰·서버에는 저장 안 함(다시 열면 사라짐) ----
let OLDV=null;
async function oldLoad(f,t2){const r=await syCall({a:"range",token:SY.token,farm:syFarm(),f,t:t2});if(!r.ok)throw new Error(r.err);
  const have=new Set(state.records.map(x=>x.id)),add=r.recs.filter(x=>!have.has(x.id)).map(x=>({...x,_old:1}));
  oldClear();state.records.push(...add);OLDV={f,t:t2,n:add.length};return add.length}
function oldClear(){if(state.records.some(r=>r._old))state.records=state.records.filter(r=>!r._old);OLDV=null}
Object.assign(A,{
  oldOpen:()=>{const m=TODAY.slice(0,7),y=addDays(TODAY,-730).slice(0,7);$("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet"><div class="sh-hd"><h2>${t("예전 기록 보기")}</h2></div>
    <p class="sow-meta">${t("휴대폰에는 최근 12개월 매일 기록만 있습니다. 고른 기간을 서버에서 받아 성적·타임라인에 보여 줍니다. 보기 전용이며 앱을 다시 열면 사라집니다.")}</p>
    <div class="setrow"><span>${t("시작 달")}</span><input id="oldF" type="month" value="${y}"></div><div class="setrow"><span>${t("끝 달")}</span><input id="oldT" type="month" value="${addDays(TODAY,-366).slice(0,7)}"></div>
    <button class="act pri" type="button" data-a="oldGo">${t("불러오기")}</button></div></div>`},
  oldGo:async()=>{const f=($("#oldF").value||"")+"-01",m=$("#oldT").value||"";if(!m||f<"2000")return;const [y,mo]=m.split("-").map(Number),t2=m+"-"+String(new Date(Date.UTC(y,mo,0)).getUTCDate()).padStart(2,"0");
    toast(t("불러오는 중…"));try{const n=await oldLoad(f,t2);$("#sheetRoot").innerHTML="";toast(`${n}${t("건 불러옴")}`);render()}catch(e){toast(t("불러오지 못했습니다(인터넷·서버 연결 확인)"))}},
  oldOff:()=>{oldClear();render()}});
function oldBar(){if(!syOn()||!SY.token)return "";return OLDV?`<div class="banner info"><b>📂</b><span>${OLDV.f.slice(0,7)} ~ ${OLDV.t.slice(0,7)} ${t("예전 기록")} ${OLDV.n}${t("건 보는 중 · 보기 전용")}</span><button class="act" type="button" data-a="oldOff">${t("닫기")}</button></div>`
  :`<div style="text-align:right;margin:0 0 6px"><button class="act" type="button" data-a="oldOpen">📂 ${t("예전 기록 보기")}</button></div>`}
// 보기 전용 기록은 고치기·지우기 막음
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-a]");if(!b||!OLDV)return;const id=b.dataset.v,r=id&&state.records.find(x=>x.id===id&&x._old);
  if(r&&/edit|del|Del|Edit/.test(b.dataset.a)){e.stopImmediatePropagation();e.preventDefault();toast(t("예전 기록은 보기 전용입니다"))}},true);
// ---- 서버에 연결된 휴대폰의 '데이터 초기화': 이 휴대폰만 서버에서 다시 받기 · 대표만 '서버 새로 시작'(지우지 않고 보관 시트로)·'되돌리기' — 계정·PIN 은 그대로 ----
let ARC=null;
function syAfterSwap(msg){SY.out={};SY.replace=true;SY.cursor=0;sySave();return syPull(true).then(()=>{toast(msg);render()})}
function vResetSynced(){
  let h=`<h2>${t("데이터 초기화")}</h2><div class="panel"><b>${t("이 휴대폰만 다시 받기")}</b><div class="sow-meta">${t("이 휴대폰의 기록을 비우고 서버 기록으로 다시 받습니다. 서버와 다른 휴대폰은 그대로입니다.")}</div><button class="act" type="button" data-a="syReDown">${t("다시 받기")}</button></div>`;
  if(can("admin")){if(!ARC){ARC={list:[]};syCall({a:"archives",token:SY.token,farm:syFarm()}).then(r=>{if(r.ok){ARC.list=r.list;render()}}).catch(()=>{})}
    h+=`<div class="sec-t">${t("서버 새로 시작 (대표)")}</div><div class="panel"><div class="sow-meta">${t("서버의 이 농장 기록을 지우지 않고 보관 시트로 옮긴 뒤 빈 상태로 시작합니다. 드라이브 백업을 먼저 만들고, 계정·PIN 은 그대로입니다. 아래 '되돌리기'로 언제든 원래대로 돌릴 수 있습니다.")}</div>
    <div class="setrow"><span>${t("확인: 농장 이름 입력")} <b>${esc(FARM.name||"")}</b></span><input id="frYes" type="text" placeholder="${esc(FARM.name||"")}" autocomplete="off"></div><button class="act bad" type="button" data-a="srvFresh">${t("서버 새로 시작")}</button></div>
    <div class="sec-t">${t("이전 기록으로 되돌리기 (대표)")}</div><div class="panel">${ARC.list.length?ARC.list.slice().reverse().map(n=>`<div class="setrow"><span>${esc(n.replace("보관 "+syFarm()+" ",""))} ${t("까지의 기록")}</span><button class="act" type="button" data-a="srvBack" data-v="${esc(n)}">${t("되돌리기")}</button></div>`).join(""):`<div class="sow-meta">${t("보관된 기록이 없습니다")}</div>`}</div>`}
  return h}
Object.assign(A,{
  // 못 보낸 기록이 있으면 먼저 보내고, 남아 있으면 멈춤(지우지 않음)
  syReDown:async()=>{if(!confirm(t("이 휴대폰 기록을 비우고 서버에서 다시 받을까요?")))return;await syFlush();if(syPending()){toast(t("아직 못 보낸 기록이 있습니다. 인터넷 연결 뒤 다시 하세요"));return}await syAfterSwap(t("다시 받았습니다"))},
  srvFresh:async()=>{const y=($("#frYes").value||"").trim();if(y!==(FARM.name||"")){toast(t("농장 이름이 맞지 않습니다"));return}
    if(!confirm(t("서버의 지금 기록을 보관 시트로 옮기고 빈 상태로 시작할까요? (되돌리기 가능)")))return;
    toast(t("백업하고 옮기는 중…"));try{const r=await syCall({a:"fresh",token:SY.token,farm:syFarm(),yes:syFarm()});if(!r.ok)throw new Error(r.err);ARC=null;await syAfterSwap(t("서버를 새로 시작했습니다"))}catch(e){toast(t("실패")+": "+e.message)}},
  srvBack:async v=>{if(!confirm(t("이 보관 기록으로 되돌릴까요? 지금 기록은 다시 보관됩니다(지워지지 않음).")))return;
    toast(t("백업하고 되돌리는 중…"));try{const r=await syCall({a:"rollback",token:SY.token,farm:syFarm(),name:v});if(!r.ok)throw new Error(r.err);ARC=null;await syAfterSwap(t("되돌렸습니다"))}catch(e){toast(t("실패")+": "+e.message)}}});
