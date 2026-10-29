/* ===== 당일 기록 마감 (기본 21:00 · 대표 설정 › 현황판 항목) =====
   마감 전: 홈 띠로 남은 기록 · 마감 후: '기록 누락' 할 일 묶음(지난 7일까지, 다음 날에도 리마인드) */
function closeBy(){return state.closeBy||FARM.closeBy||"21:00"}
function closeMiss(day){return day<(state.startDate||"")?[]:DAILY.filter(q=>dayStatus(day,q).s==="miss")}
function closeTodos(){if(REF!==TODAY)return [{k:"closemiss",t:"기록 누락",items:[],act:null}];const items=[];
  for(let i=7;i>=0;i--){const d=addDays(TODAY,-i);if(i===0&&nowHM()<closeBy())continue;
    closeMiss(d).forEach(q=>items.push({cm:{day:d,type:q},label:i===0?`${t("마감")} ${closeBy()} ${t("지남")}`:`${i}${t("일 전")} · ${t("누락")}`,sev:"bad"}))}
  return [{k:"closemiss",t:"기록 누락",items,act:null}]}
function closeBanner(){const m=closeMiss(TODAY),cb=closeBy(),now=nowHM(),late=now>=cb,[h0,m0]=cb.split(":").map(Number),soon=now>=pad(Math.max(0,h0-3))+":"+pad(m0);
  const past=[1,2,3,4,5,6,7].reduce((s,i)=>s+closeMiss(addDays(TODAY,-i)).length,0);let h="";
  if(m.length)h+=`<button class="banner ${late?"":soon?"warn-b":"info"}" type="button" data-a="goClose" data-v="${TODAY}"><b>${late?`${t("마감 지남")} · ${t("누락")} ${m.length}`:`${t("오늘 기록")} ${cb}${t("까지")} · ${t("남은")} ${m.length}`}</b><span>${m.map(q=>esc(L(q))).join(" · ")} ›</span></button>`;
  if(past)h+=`<button class="banner" type="button" data-a="tab" data-v="todo"><b>${t("지난 기록 누락")} ${past}</b><span>${t("할 일 › 기록 누락에서 입력하거나 ‘없음’으로 마감하세요")} ›</span></button>`;
  return h}
function closeBySet(){const c=closeBy();return `<div class="sec-t">${t("당일 기록 마감 시각")} <span>${t("지나면 ‘기록 누락’으로 다음 날 다시 알림")}</span></div><div class="panel"><div class="chipwrap">${["18:00","19:00","20:00","21:00","22:00"].map(v=>`<button type="button" class="chip wrap ${c===v?"on":""}" data-a="closeBy" data-v="${v}">${v}</button>`).join("")}</div></div>`}
Object.assign(A,{closeBy:v=>{state.closeBy=v;save();render()},cmZero:v=>{const [d,q]=v.split("|");(state.zero[d]=state.zero[d]||{})[q]=true;save();render();if(document.querySelector("#sheetRoot .sheet")&&typeof openTodo==="function")openTodo("closemiss")}});
