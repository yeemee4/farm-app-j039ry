/* ================= v0.4 · 백신 엔진 (모돈·후보돈·연간·복별 처치) ================= */
// 기록 이름 → 재고 품목 이름들
function vaxProds(name){const all=[...FARM.vax.annual,...FARM.vax.gilt,...FARM.vax.late,...FARM.vax.piglet],v=all.find(x=>x.name===name);return v?[].concat(v.prod):[name]}
const sowVaxDone=(id,name,from)=>state.records.some(r=>r.type==="백신"&&r.data.sow===id&&r.data.name===name&&r.workDate>=from);
// 연간 일괄: 그 달 n째 주 월요일
function annualDate(y,m,w){return addDays(weekStart(`${y}-${pad(m)}-01`),(w-1)*7+(weekStart(`${y}-${pad(m)}-01`)<`${y}-${pad(m)}-01`?7:0))}
function vaxTodos(){
  const lit=[],svax=[],ann=[];
  activeSows().forEach(s=>{const i=statusOf(s);
    // 복별 처치 (포유 중)
    if(i.stage==="포유")FARM.vax.litter.forEach(v=>{const d=diff(i.farrow,REF);if(d<v.day)return;
      const key=`${s.id}|${i.farrow}|${v.day}`,lg=tdLog(tdKey("lit",key));if(lg&&localDateOf(lg.at)!==TODAY)return;
      lit.push({s,i,lit:key,name:v.name,label:`${v.name} · 분만 ${kDate(i.farrow)} (${d}일령)`,sev:d>v.day+1?"bad":"warn"})});
    // 임신 말기 (분만 예정일 기준)
    if(i.stage==="임신"||(i.stage==="교배"&&i.d>=FARM.pregDays[0])){const due=addDays(i.mate,CFG.gest);
      FARM.vax.late.forEach(v=>{const on=addDays(due,-v.wk*7);if(REF<addDays(on,-2)||sowVaxDone(s.id,v.name,i.mate))return;
        svax.push({s,i,vx:v,label:`${v.name} · ${kDate(on)}${v.note?" · "+v.note:""}`,sev:REF>addDays(on,3)?"bad":"warn"})})}
    // 후보돈 입식 백신
    if(s.gilt&&s.intro&&i.key==="후보")FARM.vax.gilt.forEach(v=>{const on=addDays(s.intro,v.day);if(REF<addDays(on,-1)||sowVaxDone(s.id,v.name,s.intro))return;
      svax.push({s,i,vx:v,label:`후보 ${v.name} · 입식 ${v.day}일 (${kDate(on)})`,sev:REF>addDays(on,3)?"bad":"warn"})});
  });
  // 연간 일괄 (웅돈·모돈·후보돈 전체)
  const y=+REF.slice(0,4);[y-1,y].forEach(yy=>FARM.vax.annual.forEach(v=>v.when.forEach(([m,w,r])=>{const on=annualDate(yy,m,w);
    if(REF<on||diff(on,REF)>21)return;const key=`${v.name}|${on}`,lg=tdLog(tdKey("annual",key));if(lg&&localDateOf(lg.at)!==TODAY)return;
    ann.push({ann:{key,name:`${v.name} ${r}`,on},label:`${kDate(on)} 주 · 웅돈·모돈·후보돈 ${activeSows().length}두`,sev:diff(on,REF)>6?"bad":"warn"})})));
  return [
    {k:"lit",t:"복별 처치 (1일·3일)",items:lit,act:null},
    {k:"svax",t:"모돈·후보돈 백신",items:svax,act:"백신"},
    {k:"annual",t:"연간 일괄 백신",items:ann,act:null}
  ];
}
