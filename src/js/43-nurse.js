/* ================= v0.4 · 대리모 · 이유 보류 (팀장·대표) ================= */
// 대리모이거나 이유 보류 중이면 이유 알림·장기 무변동에서 뺀다
const weanSkip=s=>!!s.nurse||!!(s.weanHold&&s.weanHold.until>=REF);
const HOLD_REASONS=["자돈 체중 미달","자돈 허약·질병","모돈 치료 중","분만사 자리 여유","기타"];
function vLacBox(s,i){
  if(i.stage!=="포유"||!can("cull"))return "";
  const H=ui.hold&&ui.hold.id===s.id?ui.hold:null,wh=s.weanHold&&s.weanHold.until>=REF?s.weanHold:null;
  let h=`<div class="sec-t">${t("포유 관리")}</div><div class="panel">`;
  h+=`<div class="setrow"><span><b>${t("대리모")}</b><br><small class="sow-meta">${t("다른 복 자돈을 맡아 키우는 중 · 이유 알림에서 빠짐")}</small></span><button class="act ${s.nurse?"warn":""}" type="button" data-a="nurseTog" data-v="${s.id}">${s.nurse?t("대리모 해제"):t("대리모로 지정")}</button></div>`;
  if(H)h+=`<div class="f"><span class="lb">${t("보류 사유")}</span><div class="chipwrap">${HOLD_REASONS.map(r=>`<button type="button" class="chip wrap ${H.reason===r?"on":""}" data-a="holdReason" data-v="${r}">${t(r)}</button>`).join("")}</div></div>
    <div class="f"><span class="lb">${t("언제까지")}</span><div class="chipwrap">${[3,7,10,14].map(n=>`<button type="button" class="chip wrap ${H.days===n?"on":""}" data-a="holdDays" data-v="${n}">${n}${t("일")} (${kDate(addDays(REF,n))})</button>`).join("")}</div></div>
    <div class="acts"><button class="act pri" type="button" data-a="holdSave">${t("저장")}</button><button class="act" type="button" data-a="holdCancel">${t("취소")}</button></div>`;
  else if(wh)h+=`<div class="setrow"><span><b>${t("이유 보류")} ~${kDate(wh.until)}</b><br><small class="sow-meta">${esc(t(wh.reason))} · ${esc(wh.user)}</small></span><button class="act" type="button" data-a="holdOff" data-v="${s.id}">${t("보류 해제")}</button></div>`;
  else h+=`<div class="setrow"><span><b>${t("이유 보류")}</b><br><small class="sow-meta">${t("정해진 날 이유하지 않을 때 · 사유와 날짜를 남김")}</small></span><button class="act" type="button" data-a="holdOpen" data-v="${s.id}">${t("이유 보류")}</button></div>`;
  const F=ui.fos&&ui.fos.id===s.id?ui.fos:null,others=activeSows().filter(x=>x.id!==s.id&&sowState(x.id).stage==="포유").map(x=>x.id);
  if(F)h+=`<div class="f"><span class="lb">${t("양자 보낼 모돈")}</span><div class="chipwrap">${others.map(o=>`<button type="button" class="chip wrap ${F.to===o?"on":""}" data-a="fosTo" data-v="${o}">${o}</button>`).join("")}</div></div><div class="setrow"><span>${t("두수")}</span><div class="stepper"><button type="button" data-a="fosN" data-v="-1">−</button><input type="number" value="${F.n}" readonly><button type="button" data-a="fosN" data-v="1">+</button></div></div><div class="acts"><button class="act pri" type="button" data-a="fosSave" ${F.to?"":"disabled"}>${t("저장")}</button><button class="act" type="button" data-a="fosCancel">${t("취소")}</button></div>`;
  else h+=`<div class="setrow"><span><b>${t("양자 (위탁 포유)")}</b><br><small class="sow-meta">${t("자돈을 다른 모돈에게 보낼 때 · 복별 두수가 맞춰짐")}</small></span><button class="act" type="button" data-a="fosOpen" data-v="${s.id}">${t("양자 보내기")}</button></div>`;
  return h+`</div>`}
Object.assign(A,{
  nurseTog:v=>{const s=state.sows.find(x=>x.id===v);s.nurse=s.nurse?null:{since:REF,user:state.user};save();render()},
  fosOpen:v=>{ui.fos={id:v,to:null,n:1};render()},fosTo:v=>{ui.fos.to=v;render()},fosN:v=>{ui.fos.n=Math.max(1,ui.fos.n+Number(v));render()},fosCancel:()=>{ui.fos=null;render()},
  fosSave:()=>{const F=ui.fos;const r=addRecord("양자",TODAY,{sow:F.id,to:F.to,n:F.n});ui.fos=null;save();render();undoToast(`${t("양자")} ${F.id} → ${F.to} ${F.n}${t("두")}`,[r.id])},
  holdOpen:v=>{ui.hold={id:v,reason:HOLD_REASONS[0],days:7};render()},
  holdReason:v=>{ui.hold.reason=v;render()},
  holdDays:v=>{ui.hold.days=+v;render()},
  holdCancel:()=>{ui.hold=null;render()},
  holdSave:()=>{const H=ui.hold,s=state.sows.find(x=>x.id===H.id);s.weanHold={reason:H.reason,until:addDays(REF,H.days),user:state.user,at:new Date().toISOString()};ui.hold=null;save();toast(t("이유 보류를 저장했습니다"));render()},
  holdOff:v=>{const s=state.sows.find(x=>x.id===v);s.weanHold=null;save();render()}
});
