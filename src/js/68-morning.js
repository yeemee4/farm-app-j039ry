/* ================= v0.4 · 아침 점검 ================= */
// state.am[날짜][돈사] = {time, temp, bad:[이상 항목], memo, user, at}
const amDay=d=>((state.am=state.am||{})[d]=state.am[d]||{});
function amProg(d=TODAY){const D=(state.am||{})[d]||{};return {done:FARM.morning.route.filter(r=>D[r.barn]).length,all:FARM.morning.route.length}}
const nowHM=()=>{const n=new Date();return pad(n.getHours())+":"+pad(n.getMinutes())};
function amTodos(){if(REF!==TODAY)return [];const D=amDay(TODAY),late=nowHM()>=FARM.morning.due;
  const left=FARM.morning.route.filter(r=>!D[r.barn]).map(r=>({am:r,label:`${FARM.morning.due}${t("까지")}`,sev:late?"bad":"ok"}));
  const bad=FARM.morning.route.filter(r=>D[r.barn]&&amIssues(r,D[r.barn]).length).map(r=>({am:r,label:amIssues(r,D[r.barn]).join(" · "),sev:"warn",issue:true}));
  return [{k:"am",t:"아침 점검",items:[...left,...bad],act:null}]}
function waterAvg(barn){const v=[];for(let i=1;i<=7;i++){const x=((state.am||{})[addDays(TODAY,-i)]||{})[barn];if(x&&x.water)v.push(+x.water)}return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
function amIssues(r,x){const a=[...(x.bad||[]).map(b=>t(b)+" "+t("이상"))];const wa=waterAvg(r.barn);if(x.water&&wa&&+x.water<wa*.8)a.push(`${t("급수량")} ↓ ${Math.round((1-x.water/wa)*100)}%`);if(x.temp!==""&&x.temp!=null&&r.temp){if(+x.temp<r.temp[0])a.push(`${x.temp}℃ ${t("낮음")}`);else if(+x.temp>r.temp[1])a.push(`${x.temp}℃ ${t("높음")}`)}return a}
function vMorning(){
  const D=amDay(TODAY),P=amProg(),late=nowHM()>=FARM.morning.due;
  let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="home">‹ ${t("홈")}</button><h2>${t("아침 점검")}</h2><span class="sow-meta" style="font-weight:700;color:${P.done===P.all?"var(--accent)":late?"var(--red)":"var(--ink)"}">${P.done}/${P.all} · ${FARM.morning.due}${t("까지")}</span></div>`;
  h+=`<div class="note">${t("도는 순서대로 적어 주세요. 문제가 있는 항목만 눌러 빨간색으로 바꾸면 됩니다.")}</div>`;
  if(P.done<P.all)h+=`<button class="act pri" type="button" data-a="amAllOk" style="width:100%;padding:12px">✓ ${t("남은 돈사 모두 이상 없음")} (${P.all-P.done})</button>`;
  FARM.morning.route.forEach((r,n)=>{const x=D[r.barn],O=ui.am&&ui.am.barn===r.barn?ui.am:null,iss=x?amIssues(r,x):[];
    h+=`<div class="card amcard ${x?"done":""}"><div class="sow-top"><b>${n+1}. ${esc(t(r.barn))}</b><span class="sow-meta">${t("목표")} ${r.temp[0]}~${r.temp[1]}℃</span></div>`;
    if(O){const its=[...FARM.morning.items,...(r.extra||[])];
      h+=`<div class="row2"><div class="f" style="flex:1"><label for="amTime">${t("들어간 시간")}</label><input type="time" id="amTime" value="${O.time}"></div><div class="f" style="flex:1"><label for="amTemp">${t("온도")} ℃</label><input type="number" id="amTemp" inputmode="decimal" step="0.5" value="${O.temp}" placeholder="${(r.temp[0]+r.temp[1])/2}"></div><div class="f" style="flex:1"><label for="amWater">${t("급수량")} (${t("톤")})</label><input type="number" id="amWater" inputmode="decimal" step="0.1" value="${O.water||""}" placeholder="${waterAvg(r.barn)?waterAvg(r.barn).toFixed(1):"-"}"></div></div>
        <div class="f"><span class="lb">${t("이상 있는 항목만 누르기")}</span><div class="chipwrap">${its.map(i=>`<button type="button" class="chip wrap ${O.bad.includes(i)?"on bad":""}" data-a="amBad" data-v="${esc(i)}">${O.bad.includes(i)?"✕ ":"✓ "}${esc(t(i))}</button>`).join("")}</div></div>
        <div class="f"><label for="amMemo">${t("메모 (선택)")}</label><input type="text" id="amMemo" value="${esc(O.memo)}" placeholder="${t("예: 3번 급수기 막힘 → 교체")}"></div>
        <div class="acts"><button class="act pri" type="button" data-a="amSave">${t("저장")}</button><button class="act" type="button" data-a="amCancel">${t("취소")}</button></div>`}
    else if(x)h+=`<div class="sow-meta">${x.time} · ${x.temp!==""?x.temp+"℃ · ":""}${esc(x.user)}${x.memo?" · "+esc(x.memo):""}</div><div class="sow-meta" style="font-weight:700;color:${iss.length?"var(--red)":"var(--accent)"}">${iss.length?iss.join(" · "):t("이상 없음")}</div><div class="acts"><button class="act" type="button" data-a="amOpen" data-v="${esc(r.barn)}">${t("고치기")}</button></div>`;
    else h+=`<div class="acts"><button class="act pri" type="button" data-a="amOpen" data-v="${esc(r.barn)}">${t("점검 기록")}</button></div>`;
    h+=`</div>`});
  return h}
function amHomeCard(){const P=amProg(),late=nowHM()>=FARM.morning.due,fin=P.done===P.all;
  return `<button class="todo ${fin?"alldone":""}" type="button" data-a="tab" data-v="morning"><span class="bar" style="background:${fin?"var(--accent)":late?"var(--red)":"var(--amber)"}"></span><span><b>${t("아침 점검")}</b><small>${fin?t("모두 완료"):`${FARM.morning.due}${t("까지")} · ${t("남은")} ${P.all-P.done}`}</small></span><span class="n">${P.done}<small>/${P.all}</small></span></button>`}
Object.assign(A,{
  amOpen:v=>{const x=amDay(TODAY)[v];ui.am={barn:v,time:x?x.time:nowHM(),temp:x?x.temp:"",water:x?x.water:"",bad:x?[...x.bad]:[],memo:x?x.memo:""};render()},
  amBad:v=>{const O=ui.am;O.time=$("#amTime").value;O.temp=$("#amTemp").value;O.water=$("#amWater").value;O.memo=$("#amMemo").value;O.bad=O.bad.includes(v)?O.bad.filter(x=>x!==v):[...O.bad,v];keepScroll(render)},
  amCancel:()=>{ui.am=null;render()},
  amSave:()=>{const O=ui.am;amDay(TODAY)[O.barn]={time:$("#amTime").value||nowHM(),temp:$("#amTemp").value,water:$("#amWater").value,bad:O.bad,memo:$("#amMemo").value.trim(),user:state.user,at:new Date().toISOString()};ui.am=null;save();toast(t("저장했습니다"));render()}
});
