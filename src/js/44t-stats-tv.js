/* ===== 성적 TV 화면 (16:9 한 화면 · 성적 › 📺 TV로 보기) ===== */
const STV_KPI=["psy","msy","frate","live","wean","surv","dead","ship"];
function vStatsTV(){const S=ui.st,P=statPeriod(),cur=rangeMetrics(P.f,P.t),cmp=P.cmp?rangeMetrics(P.cmp[0],P.cmp[1]):null,now=new Date(),G=sGoal();
  const nav=S.mode==="월"||S.mode==="분기"?`<button type="button" data-a="stNav" data-v="-1" aria-label="${t("이전")}">‹</button><b>${esc(P.label)}</b><button type="button" data-a="stNav" data-v="1" aria-label="${t("다음")}">›</button>`:`<b>${esc(P.label)}</b>`;
  let h=`<div class="stv"><header class="stv-top"><div class="stv-ttl"><h2>${t("성적")}</h2><div class="stv-nav">${nav}</div></div><div class="stv-ctl">${["월","분기","연간"].map(m=>`<button type="button" class="${S.mode===m?"on":""}" data-a="stMode" data-v="${m}">${t(m==="월"?"월간":m)}</button>`).join("")}<span class="stv-clock">${pad(now.getHours())}:${pad(now.getMinutes())}</span><button type="button" data-a="tvMode">${t("TV 끄기")}</button></div></header>`;
  h+=`<div class="stv-kpi">${STV_KPI.map(k=>{const m=MET.find(x=>x[0]===k),[,l,u,dp,dir]=m,v=cur?cur[k]:null,c=cmp?cmp[k]:null,g=k==="psy"||k==="msy"?G[k]:null;let dl="";
    if(okv(v)&&okv(c)){const d=v-c,good=dir===0||Math.abs(d)<1e-9?null:(d>0)===(dir>0);dl=`<span class="dlt ${good===null?"":good?"up":"down"}">${d>0?"▲":d<0?"▼":"–"} ${Math.abs(d).toFixed(dp)}${u==="%"?"%p":""}</span>`}
    return `<div class="stv-k${g&&okv(v)?(v>=g?" ok":" lo"):""}${S.metric===k?" sel":""}" data-a="stMetric" data-v="${k}" role="button" tabindex="0"><small>${t(l)}</small><b>${fmtV(v,dp)}<i>${t(u)}</i></b>${dl}${g?`<em>${t("목표")} ${g}</em>`:""}</div>`}).join("")}</div>`;
  // 8칸: 그래프 6 + 고른 지표 월별 추이 + 재고두수 실사 (칸을 누르면 상세 그래프·기록 표)
  const md=MET.find(m=>m[0]===S.metric)||MET[7],endYm=S.mode==="월"?S.ym:TODAY.slice(0,7),pts=months12(endYm).map(([y,m])=>{const v=rangeMetrics(...monthRange(y,m));return {y,m,v:v?v[md[0]]:null,src:v?v.src:null}});
  const C=chartCards();C[6]=`<div class="card"><h3>${t("월별 추이")} · ${t(md[1])}<small>${t("위 숫자를 누르면 바뀝니다")}</small></h3>${lineSvg(pts,md)}</div>`;
  const z=ui.stvZ;
  return h+`<div class="stv-grid${z!=null?" zoom":""}">${C.map((c,i)=>z!=null&&z!==i?"":`<div class="stv-c" data-a="chDetail" data-v="${i===6?"trend":CD_KEYS[i]}">${c}</div>`).join("")}</div></div>`}
Object.assign(A,{stvZoom:v=>{ui.stvZ=ui.stvZ===+v?null:+v;render()}});
