/* ================= v0.5 · 모돈 탭: 2칸 카드 · 정렬 · 돈사 필터 ================= */
const SOW_SORTS=[["번호","번호순"],["임신","임신일령 ↑"],["발정","발정 D-day 순"],["분만","분만 예정 순"],["산차","산차 많은 순"]];
// 발정 예상까지 남은 일수: 이유 후 5일 · 교배 후 21일(재발 확인) · 재발·공태는 바로
function heatLeft(i){if(i.stage==="이유")return 5-i.d;if(i.stage==="교배")return CFG.returnCheck[0]+3-i.d;if(i.stage==="재교배")return 0;if(i.key==="후보")return 0;return null}
function sortSows(list){const k=ui.sowSort||"번호",big=1e6,v=x=>{const i=x.i;
  if(k==="임신")return i.stage==="임신"||i.stage==="교배"?i.d:big;
  if(k==="발정"){const h=heatLeft(i);return h===null?big:Math.abs(h)*(h<0?.5:1)}
  if(k==="분만")return i.stage==="임신"?CFG.gest-i.d:big;
  if(k==="산차")return -(i.parity||0);return 0};
  return [...list].sort((a,b)=>v(a)-v(b)||a.s.id.localeCompare(b.s.id))}
function sowTools(){const L=["전체",...SOW_LOCS];
  return `<div class="sowtools"><label class="sel"><span>${t("정렬")}</span><select data-ch="sowSort" aria-label="${t("정렬")}">${SOW_SORTS.map(([k,l])=>`<option value="${k}" ${(ui.sowSort||"번호")===k?"selected":""}>${t(l)}</option>`).join("")}</select></label><label class="sel"><span>${t("돈사")}</span><select data-ch="sowLoc" aria-label="${t("돈사")}">${L.map(l=>`<option value="${esc(l)}" ${(ui.sowLoc||"전체")===l?"selected":""}>${t(l)}</option>`).join("")}</select></label></div>`}
function sowTile(s,i){const h=heatLeft(i);
  return `<button type="button" class="stile ${i.key==="도태됨"?"culled":""}" data-a="sowd" data-v="${s.id}"><span class="st-top"><b>${s.id}</b><span class="stage ${i.cls}">${i.label}</span></span><span class="st-sub">${i.sub}</span><span class="st-meta">${i.gilt?t("후보돈"):i.parity+t("산")} · ${esc(t(s.loc))}${i.heat?` · <em>${t("발정 관찰")}</em>`:""}${s.cullPlan&&i.key!=="도태됨"?` · <em>${t("도태 예정")}</em>`:""}${ui.sf==="도태후보"?`<br><em>${esc(cullWhy(s)||"")}</em>`:""}</span></button>`}
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.ch;if(k==="sowSort"||k==="sowLoc"){ui[k]=e.target.value;render()}});
