/* ===== 임신돈 급여 가이드: 모돈마다 오늘 권장 급여량 = 임신 일수 단계 + BCS + 산차 + 돈사 온도 =====
   임신사 1·2동 = 자동 급이기(눈금), 교배사 = 수동(바가지). 단위 환산(1눈금·1바가지 = kg)은 대표 설정.
   어제와 달라진 모돈은 할 일 '급여량 변경'으로. 매주 조절 제안(대표). 기준값은 일반 범위의 기본값 */
function gCfg(){const G=FARM.gest,o=state.gest||{};return {...G,...o,phases:G.phases.map((p,i)=>({...p,...((o.phases||[])[i]||{})})),bcs:{...G.bcs,...(o.bcs||{})},barns:Object.fromEntries(Object.entries(G.barns).map(([k,v])=>[k,{...v,...((o.barns||{})[k]||{})}]))}}
const GF_BARNS=()=>Object.keys(gCfg().barns);
function lastBCS(id,before){const r=state.records.filter(x=>x.type==="BCS"&&x.data.sow===id&&x.workDate<=before).sort((a,b)=>b.workDate.localeCompare(a.workDate))[0];return r?{score:r.data.score,d:r.workDate}:null}
function barnTemp(barn,d){const a=(state.am||{})[d];const v=a&&a[barn]&&parseFloat(a[barn].temp);if(!isNaN(v))return v;if(d===TODAY&&typeof wxDay==="function"){const w=wxDay(0);if(w)return null}return null}
// 모돈 한 마리의 그날 권장량
function gestFeed(s,d=TODAY){const C=gCfg(),st=sowState(s.id),i=statusOf(s);if(i.key==="도태됨"||!GF_BARNS().includes(s.loc))return null;
  let base,phase,gd=null;
  if(st.stage==="후보"){base=C.gilt;phase="후보돈"}
  else if(st.stage==="이유"||st.stage==="재교배"){base=C.flush;phase=st.stage==="이유"?"이유 후 교배 전":"재발·공태"}
  else if((st.stage==="교배"||st.stage==="임신")&&st.mate){gd=diff(st.mate,d);const p=C.phases.find(x=>gd<=x.to)||C.phases[C.phases.length-1];base=p.kg;phase=p.l}
  else return null;
  const why=[`${t(phase)}${gd!=null?` ${gd}${t("일")}`:""} ${base.toFixed(1)}`];let kg=base;
  const b=lastBCS(s.id,d);if(b&&C.bcs[b.score]){kg+=C.bcs[b.score];why.push(`BCS ${b.score} ${C.bcs[b.score]>0?"+":""}${C.bcs[b.score]}`)}
  if(i.parity<=1&&!i.gilt&&st.stage!=="후보"&&C.parity1){kg+=C.parity1;why.push(`${t("초산")} +${C.parity1}`)}
  const tp=barnTemp(s.loc,d);if(tp!=null&&tp<C.lct){const add=kg*C.tempPct*(C.lct-tp);kg+=add;why.push(`${tp}℃ +${add.toFixed(1)}`)}
  kg=Math.round(Math.max(C.min,Math.min(C.max,kg))*10)/10;
  // 배치도에서 수동 조정한 값 (임신 단계가 바뀌면 풀림)
  const ov=(state.gfOv||{})[s.id];if(ov&&ov.phase===phase&&ov.at<=d){why.push(`${t("수동 조정")} ${ov.kg.toFixed(1)}${ov.why?" ("+t(ov.why)+")":""}`);return {s,kg:ov.kg,phase,gd,bcs:b,why,ov:true,calc:kg}}
  return {s,kg,phase,gd,bcs:b,why}}
function gfUnit(barn,kg){const B=gCfg().barns[barn];if(!B||!B.kgPer)return "";const v=kg/B.kgPer;return B.mode==="auto"?`${t("눈금")} ${Math.round(v*10)/10}`:`${t("바가지")} ${Math.round(v*4)/4}`}
function gestToday(){const out=[];activeSows().forEach(s=>{const a=gestFeed(s,TODAY);if(!a)return;const y=gestFeed(s,addDays(TODAY,-1));a.prev=y?y.kg:null;a.chg=y&&Math.abs(y.kg-a.kg)>=.05?a.kg-y.kg:0;out.push(a)});return out}
// 할 일: 오늘 급여량이 바뀐 모돈 (급이기 눈금 다시 맞추기)
function gfTodos(){if(REF!==TODAY)return [{k:"gfchg",t:"임신돈 급여량 변경",items:[],act:null}];
  return [{k:"gfchg",t:"임신돈 급여량 변경",items:gestToday().filter(a=>a.chg).map(a=>({s:a.s,gf:a,label:`${t(a.s.loc)} · ${a.prev.toFixed(1)} → ${a.kg.toFixed(1)}kg${gfUnit(a.s.loc,a.kg)?" ("+gfUnit(a.s.loc,a.kg)+")":""} · ${esc(a.why[a.why.length-1])}`,sev:"warn"})),act:null},
    {k:"bcsdue",t:"BCS 측정",items:bcsDue(),act:null}]}
// BCS 측정 시점: 교배 0~3일, 임신 28~32일, 83~87일, 이유 당일~3일 · 최근 7일 안에 측정 없으면
function bcsDue(){const L=[];activeSows().forEach(s=>{const st=sowState(s.id);let when=null;if((st.stage==="교배"||st.stage==="임신")&&st.mate){const g=diff(st.mate,TODAY);when=g<=3?"교배 시":g>=28&&g<=32?"임신 30일":g>=83&&g<=87?"임신 85일":null}else if(st.stage==="이유"&&diff(st.since,TODAY)<=3)when="이유 시";
  if(!when)return;const b=lastBCS(s.id,TODAY);if(b&&diff(b.d,TODAY)<=7)return;L.push({s,label:`${t(when)} · ${t("최근 BCS")} ${b?b.score+" ("+kDate(b.d)+")":"-"}`,sev:"warn"})});return L}
function vGestFeed(){const A=gestToday(),C=gCfg();let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="home">‹ ${t("홈")}</button><h2>${t("임신돈 급여표")}</h2></div>`;
  const ch=A.filter(a=>a.chg).length;h+=`<div class="banner ${ch?"warn-b":"info"}"><b>${ch?`${t("오늘 바뀜")} ${ch}${t("두")}`:t("어제와 같음")}</b><span>${t("임신 일수·BCS·산차·돈사 온도로 계산 · 바뀐 모돈만 급이기를 다시 맞추세요")}</span></div>`;
  GF_BARNS().forEach(barn=>{const L=A.filter(a=>a.s.loc===barn);if(!L.length)return;const B=C.barns[barn],G={};L.forEach(a=>(G[a.kg.toFixed(1)]=G[a.kg.toFixed(1)]||[]).push(a));
    h+=`<div class="sec-t">${esc(t(barn))} <span>${B.mode==="auto"?t("자동 급이기"):t("수동 급여")}${B.kgPer?"":` (${t(B.unit)} ${t("단위 설정 전")})`} · ${L.length}${t("두")} · ${t("합계")} ${L.reduce((x,a)=>x+a.kg,0).toFixed(0)}kg</span></div><div class="gf">`+
    Object.keys(G).sort((a,b)=>a-b).map(k=>`<div class="gf-r"><div class="gf-k"><b>${k}kg</b><small>${gfUnit(barn,+k)}</small></div><div class="gf-s">${G[k].sort((a,b)=>a.s.id.localeCompare(b.s.id)).map(a=>`<button type="button" class="gf-c ${a.chg?(a.chg>0?"up":"dn"):""}" data-a="sowd" data-v="${a.s.id}" title="${esc(a.why.join(" · "))}">${a.s.id}${a.chg?`<i>${a.chg>0?"▲":"▼"}${Math.abs(a.chg).toFixed(1)}</i>`:""}</button>`).join("")}</div></div>`).join("")+`</div>`});
  if(can("admin"))h+=gfWeekly(A);
  return h+`<div class="note">${t("숫자를 누르면 그 모돈 상세로 갑니다. 기준값은 일반적인 범위의 기본값이라 사료회사·수의사 기준으로 대표 설정에서 고치세요.")}</div>`}
// 매주 조절 제안 (대표)
function gfWeekly(A){const C=gCfg(),S=[],noB=A.filter(a=>!a.bcs||diff(a.bcs.d,TODAY)>60).length,fat=A.filter(a=>a.bcs&&+a.bcs.score>=4).length,thin=A.filter(a=>a.bcs&&+a.bcs.score<=2).length;
  const late7=activeSows().filter(s=>{const st=sowState(s.id);if(!(st.stage==="임신"||st.stage==="교배")||!st.mate)return false;const g=diff(st.mate,TODAY);return g<85&&g>=78}).length;
  if(noB)S.push(`${t("BCS 기록이 없거나 60일 지난 모돈")} ${noB}${t("두")} → ${t("BCS를 재야 급여량 보정이 됩니다")}`);
  if(late7)S.push(`${t("다음 7일 안에 85일(후기 증량) 들어가는 모돈")} ${late7}${t("두")} → ${C.phases[2].kg}kg${t("으로 올릴 준비")}`);
  if(fat)S.push(`BCS 4 ${t("이상")} ${fat}${t("두")} → ${t("감량 적용 중 · 2주 뒤 BCS 다시 확인")}`);if(thin)S.push(`BCS 2 ${t("이하")} ${thin}${t("두")} → ${t("증량 적용 중 · 2주 뒤 BCS 다시 확인")}`);
  if(typeof wxDay==="function"){let mn=99;for(let i=0;i<7;i++){const w=wxDay(i);if(w)mn=Math.min(mn,w.min)}if(mn<5)S.push(`${t("이번 주 최저기온")} ${mn}℃ → ${t("돈사 온도가")} ${C.lct}℃ ${t("아래로 내려가면 자동 증량 · 아침 점검 온도를 꼭 입력")}`)}
  const F=state.records.filter(r=>r.type==="분만"&&r.workDate>=addDays(TODAY,-90));if(F.length>=5){const lo=F.filter(r=>r.data.live<=9).map(r=>lastBCS(r.data.sow,addDays(r.workDate,-5))).filter(Boolean),loT=lo.filter(b=>+b.score<=2.5).length;if(lo.length>=3&&loT/lo.length>=.5)S.push(`${t("최근 90일 실산 9두 이하 분만의 절반 이상이 분만 전 BCS 2.5 이하")} → ${t("임신 후기 증량을 0.2~0.3kg 더 올리는 것을 검토")}`)}
  return `<div class="sec-t">${t("이번 주 급여 조절 제안")}</div><div class="panel gfw">${S.length?S.map(x=>`<div>💡 ${x}</div>`).join(""):`<div>${t("특별히 조절할 점이 없습니다.")}</div>`}<button class="act" type="button" data-a="tab" data-v="gestset">${t("급여 기준 고치기")} ›</button></div>`}
// 대표 설정: 임신돈 급여 기준
function vGestSet(){const C=gCfg(),st=(path,v,step)=>`<div class="stepper"><button type="button" data-a="gSet" data-v="${path}" data-k="${-step}" aria-label="−">−</button><input type="number" value="${(+v).toFixed(step<1?(step<.1?2:1):0)}" readonly><button type="button" data-a="gSet" data-v="${path}" data-k="${step}" aria-label="+">+</button></div>`;
  let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="gfeed">‹ ${t("임신돈 급여표")}</button><h2>${t("임신돈 급여 기준")}</h2></div><div class="note">${t("일반적인 범위의 기본값입니다. 사료 에너지·품종에 따라 다르니 사료회사·수의사 기준으로 고치세요.")}</div>`;
  h+=`<div class="sec-t">${t("임신 일수별 (kg/일, BCS 3 기준)")}</div><div class="panel">${C.phases.map((p,i)=>`<div class="setrow"><span>${t(p.l)} <small class="sow-meta">~${p.to>500?t("분만사 이동"):p.to+t("일")}</small></span>${st("phases."+i+".kg",p.kg,.1)}</div>`).join("")}
    <div class="setrow"><span>${t("이유 후 교배 전")}</span>${st("flush",C.flush,.1)}</div><div class="setrow"><span>${t("후보돈")}</span>${st("gilt",C.gilt,.1)}</div><div class="setrow"><span>${t("초산돈 추가")}</span>${st("parity1",C.parity1,.1)}</div></div>`;
  h+=`<div class="sec-t">${t("BCS 보정 (kg)")}</div><div class="panel">${Object.keys(C.bcs).map(k=>`<div class="setrow"><span>BCS ${k}</span>${st("bcs."+k,C.bcs[k],.05)}</div>`).join("")}</div>`;
  h+=`<div class="sec-t">${t("온도 보정")}</div><div class="panel"><div class="setrow"><span>${t("기준 온도 (℃)")} <small class="sow-meta">${t("이 아래면 증량")}</small></span>${st("lct",C.lct,1)}</div><div class="setrow"><span>${t("1℃당 증량 (%)")}</span>${st("tempPct",C.tempPct*100,.5).replace(/data-v="tempPct"/g,'data-v="tempPctP"')}</div></div>`;
  h+=`<div class="sec-t">${t("급이 단위")} <span>${t("한 번 재서 넣으면 눈금·바가지로도 보여줌")}</span></div><div class="panel">${Object.entries(C.barns).map(([b,B])=>`<div class="setrow"><span>${esc(t(b))} <small class="sow-meta">${B.mode==="auto"?t("자동 급이기"):t("수동")} · 1${t(B.unit)} = ${B.kgPer?B.kgPer.toFixed(2)+"kg":t("모름")}</small></span>${st("barns."+b+".kgPer",B.kgPer||0,.05)}</div>`).join("")}</div>`;
  return h+`<div class="acts"><button class="act" type="button" data-a="gReset">${t("기본값으로")}</button></div>`}
Object.assign(A,{gSet:(v,el)=>{const o=state.gest=state.gest||{},C=gCfg(),k=Number(el.dataset.k),P=v.split(".");
    if(v==="tempPctP"){o.tempPct=Math.max(0,Math.round((C.tempPct*100+k)*10)/1000)}
    else if(P[0]==="phases"){o.phases=o.phases||[];o.phases[+P[1]]={...(o.phases[+P[1]]||{}),kg:Math.max(1,Math.round((C.phases[+P[1]].kg+k)*10)/10)}}
    else if(P[0]==="bcs"){o.bcs=o.bcs||{};o.bcs[P[1]]=Math.round((C.bcs[P[1]]+k)*100)/100}
    else if(P[0]==="barns"){o.barns=o.barns||{};const b=P.slice(1,-1).join(".");o.barns[b]={...(o.barns[b]||{}),kgPer:Math.max(0,Math.round(((C.barns[b].kgPer||0)+k)*100)/100)||null}}
    else o[v]=Math.round((C[v]+k)*100)/100;save();render()},
  gReset:()=>{state.gest={};save();render()}});
