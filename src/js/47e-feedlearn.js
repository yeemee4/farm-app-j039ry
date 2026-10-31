/* ===== 사료 예측 학습: 잔량 기록으로 실제 사용량을 뽑아 모델(주령별 섭취량 × 두수)을 사료마다 보정 =====
   실제 = 앞 잔량 + 그 사이 입고 − 뒤 잔량. 보정값 = 최근일수록 무겁게 Σ실제 ÷ Σ예측 (허실·섭취 차이·두수 오차 포함).
   튀는 값(예측의 0.4배 이하·2.5배 이상)은 버림. 대표 설정에서 사료별 '다시 배우기'(그날 이후만 사용) */
let FLX={};
function rawPast(){const k=state.records.length+"|"+state.sows.length+"|"+TODAY+"|"+JSON.stringify(state.intake||{});if(FLX.k===k)return FLX.m;const D=feedPlanDays0(61,addDays(TODAY,-60)),m={};D.forEach(x=>m[x.d]=x.u);FLX={k,m,obs:{}};return m}
function feedObs(f){rawPast();if(FLX.obs[f])return FLX.obs[f];const M=FLX.m,from=(state.feedLearn||{})[f]||"0000",R=recsOf("사료").filter(r=>r.data.kind===f).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
  const rd=R.filter(r=>(r.data.mode==="빈 잔량"||r.data.mode==="잔량")&&r.data.kg!=null&&r.workDate>=from),out=[];
  for(let i=1;i<rd.length;i++){const a=rd[i-1],b=rd[i],g=diff(a.workDate,b.workDate);if(g<1||g>14)continue;
    const inn=R.filter(r=>r.data.mode==="입고"&&r.createdAt>a.createdAt&&r.createdAt<=b.createdAt).reduce((s,r)=>s+r.data.kg,0),act=a.data.kg+inn-b.data.kg;
    let pred=0,ok=true;for(let d=a.workDate;d<b.workDate;d=addDays(d,1)){if(!M[d]){ok=false;break}pred+=M[d][f]||0}
    if(!ok||pred<=0||act<=0||(typeof feedEmpty==='function'&&feedEmpty(f,b.data.kg)))continue;   // 뒤 잔량이 바닥이면 실제 사용량을 알 수 없음 → 배우지 않음
    const r=act/pred;if(r<.4||r>2.5)continue;out.push({d1:a.workDate,d2:b.workDate,act,pred,r})}
  return FLX.obs[f]=out}
function fitFactor(O){if(O.length<3)return null;let n=0,d=0;O.forEach((o,i)=>{const w=Math.pow(.88,O.length-1-i);n+=w*o.act;d+=w*o.pred});return Math.max(.5,Math.min(2,n/d))}
// 예측 오차는 주 단위(약 7일 묶음)로: 그 시점까지 배운 보정값으로 다음 한 주를 맞혀 본 결과
function feedLearn(f){const O=feedObs(f),fac=fitFactor(O),errs=[];let i=3;while(i<O.length){let j=i,g=0;while(j<O.length&&g<7){g+=diff(O[j].d1,O[j].d2);j++}if(g<5)break;const p=fitFactor(O.slice(0,i)),A=O.slice(i,j).reduce((x,o)=>x+o.act,0),P=O.slice(i,j).reduce((x,o)=>x+o.pred,0);errs.push(Math.abs(P*p-A)/A);i=j}
  const m=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;return {f,n:O.length,fac,err:m(errs.slice(-2)),err0:m(errs.slice(0,1)),raw:m(O.slice(-5).map(o=>Math.abs(o.r-1)))}}
const feedFactor=f=>{const L=feedLearn(f);return L.fac||1};
// 사료 계획에 보정 적용 (원래 feedPlanDays 를 감쌈)
function feedPlanDays(H=FP_H,S0=TODAY){const v=feedPlanBase(H,S0),F={};feedKinds().forEach(f=>F[f]=feedFactor(f));const ck=v.length+"|"+S0+"|"+JSON.stringify(F);if(v._ck===ck)return v._sc;
  const sc=v.map(x=>{const u={};Object.entries(x.u).forEach(([f,kg])=>u[f]=kg*(F[f]||1));return {d:x.d,u}});v._ck=ck;v._sc=sc;return sc}
function learnTag(f){const L=feedLearn(f);if(!L.fac)return `<small class="fl">${t("예측 학습 중")} · ${t("잔량 기록")} ${L.n}/3</small>`;
  return `<small class="fl">${t("학습 보정")} ×${L.fac.toFixed(2)} · ${L.n}${t("회")}${L.err!=null?` · ${t("주간 예측 오차")} ±${Math.round(L.err*100)}%${L.err0!=null&&L.err0>L.err?` (${t("처음")} ±${Math.round(L.err0*100)}%)`:""}`:""}</small>`}
function learnSet(){return `<div class="sec-t">${t("사료 예측 학습")} <span>${t("매일 잔량 기록으로 사료마다 스스로 보정")}</span></div><div class="panel">${feedKinds().map(f=>{const L=feedLearn(f),fr=(state.feedLearn||{})[f];
  return `<div class="setrow"><span><b>${esc(f)}</b> <small class="sow-meta">${L.fac?`×${L.fac.toFixed(2)} · ${L.n}${t("회")}${L.err!=null?` · ${t("오차")} ±${Math.round(L.err*100)}%`:""}`:`${t("기록 부족")} (${L.n}/3)`}${fr?` · ${kDate(fr)}${t("부터")}`:""}</small></span><button class="act" type="button" data-a="flReset" data-v="${esc(f)}">${t("다시 배우기")}</button></div>`}).join("")}<div class="note">${t("보정값 = 실제 사용량 ÷ 섭취량 기준 예측. 허실·실제 섭취·두수 차이가 모두 들어갑니다. 사료 배합이나 급이기를 바꿨으면 ‘다시 배우기’를 누르세요.")}</div></div>`}
Object.assign(A,{flReset:v=>{(state.feedLearn=state.feedLearn||{})[v]=TODAY;FLX={};save();render();toast(t("오늘부터 다시 배웁니다"))}});
