/* ================= v0.5 · 현장 카드(모돈현황판 종이 양식) =================
   카드 한 장 = 4산(1~4산 파랑, 5~8산 보라, 9~12산 파랑…). 줄: 교배일자·웅돈번호·재발(점선으로 2칸) · 분만예정일 · 분만일 · 총산자수 · 포유개시두수 · 이유일자 · 이유두수 · 특이사항 */
const md=d=>{if(!d)return "";const [,m,dd]=d.split("-");return `${+m}/${+dd}`};
function cardCols(s){
  const ev=state.records.filter(r=>r.data&&(r.data.sow===s.id||(r.type==="양자"&&r.data.to===s.id))).sort((a,b)=>a.workDate.localeCompare(b.workDate)||a.createdAt.localeCompare(b.createdAt));
  const base=s.baseParity||0,C={};let far=0;
  const col=p=>C[p]||(C[p]={p,heats:[],ret:[],far:null,fo:0,wean:null,note:[]});
  ev.forEach(r=>{const d=r.data||{};
    if(r.type==="교배"){const c=col(base+far+1),h=c.heats[c.heats.length-1];
      if(h&&diff(h.d,r.workDate)<=3){h.n++;if(d.semen&&!h.sm.includes(d.semen))h.sm.push(d.semen)}else c.heats.push({d:r.workDate,n:1,sm:d.semen?[d.semen]:[]})}
    else if(r.type==="임신확인"&&d.result!=="임신")col(base+far+1).ret.push({d:r.workDate,k:d.result});
    else if(r.type==="분만"){far++;const c=col(base+far);c.far=r;if(d.ease&&d.ease!=="정상")c.note.push(d.ease);if(d.oxy==="씀")c.note.push("옥시토신")}
    else if(r.type==="양자"&&far){const c=col(base+far),n=+d.n||0,inn=d.to===s.id;if(!c.wean){c.fo+=inn?n:-n;c.note.push(`양자 ${inn?"+":"−"}${n}`)}}
    else if(r.type==="이유"&&far){const c=col(base+far);if(!c.wean)c.wean=r}
    else if(r.type==="도태")col(far&&!(C[base+far]||{}).wean?base+far:base+far+1).note.push("도태");
    if(d.memo&&["교배","분만","이유","임신확인"].includes(r.type))col(r.type==="교배"||r.type==="임신확인"?base+far+1:base+far).note.push(d.memo);
  });
  return C;
}
const SC_SHORT={"듀록 정액":"듀록"};
function vSowCard(s){
  const C=cardCols(s),i=statusOf(s),base=s.baseParity||0,cur=Math.max(1,i.gilt?1:i.parity+(["교배","임신","재교배"].includes(i.stage)||i.key==="발정대기"||i.key==="재발공태"?1:0));
  const last=Math.max(cur,...Object.keys(C).map(Number),1),pages=Math.ceil(last/4);
  let pg=ui.scPg&&ui.scPg.id===s.id?ui.scPg.p:Math.ceil(cur/4);pg=Math.min(Math.max(1,pg),pages);
  const ps=[1,2,3,4].map(k=>(pg-1)*4+k);
  const cell=(c,f)=>{if(!c)return "";return f(c)||""};
  const half=(a,b)=>`<div class="sc-h"><span>${a||""}</span><span>${b||""}</span></div>`;
  const R=[
    ["교배일자",c=>{const h=c.heats;if(!h.length)return "";const f=x=>md(x.d)+(x.n>1?`<sup>×${x.n}</sup>`:"");return half(f(h[0]),h.length>1?f(h[h.length-1]):"")}],
    ["웅돈번호",c=>{const h=c.heats;if(!h.length)return "";const f=x=>x.sm.map(v=>esc(SC_SHORT[v]||v)).join(",");return half(f(h[0]),h.length>1?f(h[h.length-1]):"")}],
    ["재 발",c=>c.ret.length?half(...c.ret.slice(0,2).map(x=>`<b class="sc-r">${md(x.d)}</b>${x.k!=="재발"?`<small>${x.k}</small>`:""}`)):""],
    ["분만예정일",c=>{const h=c.heats[c.heats.length-1];if(!h)return "";const d=addDays(h.d,CFG.gest);return c.far?md(d):`<b class="sc-due">${md(d)}</b>`}],
    ["분 만 일",c=>c.far?md(c.far.workDate):""],
    ["총산자수",c=>{if(!c.far)return "";const d=c.far.data,t=(+d.live||0)+(+d.still||0)+(+d.mum||0);return `<b>${t}</b>${t!==+d.live?`<small>실${d.live}</small>`:""}`}],
    ["포유개시두수",c=>c.far?`<b>${(+c.far.data.live||0)+c.fo}</b>`:""],
    ["이유일자",c=>c.wean?md(c.wean.workDate):""],
    ["이유두수",c=>c.wean?`<b>${c.wean.data.n}</b>`:""],
    ["특이사항",c=>c.note.length?`<small>${esc([...new Set(c.note)].join(" · "))}</small>`:""]];
  const colH=p=>{const pre=p<=base;return `<th class="${p===cur?"cur":""}">${p}산${pre?`<small>${t("앱 이전")}</small>`:p===cur?`<small>${t("지금")}</small>`:""}</th>`};
  const hd=`<div class="sc-hd">
    <div class="sc-t">${t("모돈현황판")}</div>
    <div class="sc-info">
      <div><small>${t("모돈번호")}</small><b>${esc(s.id)}</b></div><div><small>${t("품종")}</small><b>${esc(s.breed||"")}</b></div>
      <div><small>${t("생년월일")}</small><b>${s.birth?esc(s.birth.slice(2).replace(/-/g,".")):""}</b></div><div><small>${t("구입일")}</small><b>${s.intro?esc(s.intro.slice(2).replace(/-/g,".")):""}</b></div>
      <div><small>${t("구입처")}</small><b>${esc(s.src||"")}</b></div><div><small>${t("초교배예정일")}</small><b>${s.firstMate?esc(s.firstMate.slice(2).replace(/-/g,".")):""}</b></div>
    </div></div>`;
  const tb=`<table class="sc-tb"><thead><tr><th class="sc-l">${t("항목")} ╱ ${t("산차")}</th>${ps.map(colH).join("")}</tr></thead><tbody>${R.map(([l,f])=>`<tr><th class="sc-l">${t(l.replace(/ /g,""))}</th>${ps.map(p=>`<td class="${p===cur?"cur":""}${p<=base&&!C[p]?" pre":""}">${cell(C[p],f)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const nav=pages>1||pg>1?`<div class="sc-nav">${Array.from({length:Math.max(pages,pg)},(_,k)=>`<button type="button" class="chip ${k+1===pg?"on":""}" data-a="scPg" data-v="${s.id}|${k+1}">${k*4+1}~${k*4+4}${t("산")}</button>`).join("")}</div>`:"";
  return `<div class="sowcard ${pg%2?"blue":"violet"}">${hd}${tb}<div class="sc-foot">${t("점선 위 = 첫 교배, 아래 = 재발 후 마지막 교배 · ×2 = 같은 발정에 2번 교배 · 주황 날짜 = 아직 분만 전 예정")}</div></div>${nav}`;
}
function sowViewMode(){try{return localStorage.getItem("farm-sowcard")||"app"}catch(e){return "app"}}
const _vSowApp=vSow;
vSow=function(){
  const s=state.sows.find(x=>x.id===ui.sowId),html=_vSowApp();
  if(!s)return html;
  const m=sowViewMode(),seg=`<div class="seg sc-seg" role="group" aria-label="${t("보기")}"><button type="button" class="${m==="app"?"on":""}" data-a="sowView" data-v="app">${t("앱 보기")}</button><button type="button" class="${m==="card"?"on":""}" data-a="sowView" data-v="card">📋 ${t("현장 카드")}</button></div>`;
  const cut=html.indexOf('<div class="inputgrid">');
  if(cut<0)return html;
  const head=html.slice(0,cut);
  if(m!=="card")return head+seg+html.slice(cut);
  const i=statusOf(s),loc=`<div class="sc-now"><span class="stage ${i.cls}">${i.label}</span><span>${esc(i.sub||"")}</span><span>· ${esc(s.loc||"")}${s.stall?" "+esc(s.stall):""}</span></div>`;
  const ed=ui.pe?"":`<button class="act" type="button" data-a="scEdit">${t("카드 정보 수정")}</button>`;
  const form=ui.pe?`<div class="cullbox"><h4>${t("카드 정보 수정")}</h4>
    <div class="f"><label for="peBirth">${t("생년월일")}</label><input type="date" id="peBirth" value="${esc(ui.pe.birth||"")}"></div>
    <div class="f"><label for="peIntro">${t("구입일")}</label><input type="date" id="peIntro" value="${esc(ui.pe.intro||"")}"></div>
    <div class="f"><label for="peSrc">${t("구입처")}</label><input type="text" id="peSrc" value="${esc(ui.pe.src||"")}" placeholder="${t("예: ○○종돈")}"></div>
    <div class="f"><label for="peFm">${t("초교배예정일")}</label><input type="date" id="peFm" value="${esc(ui.pe.fm||"")}"></div>
    <div class="acts"><button class="act pri" type="button" data-a="peSave">${t("저장")}</button><button class="act" type="button" data-a="peCancel">${t("취소")}</button></div></div>`:"";
  return head+seg+loc+vSowCard(s)+`<div class="acts">${ed}</div>`+form;
};
/* 기본 정보에 생년월일·구입처·초교배예정일 추가 */
const _peKeep0=peKeep;
peKeep=function(){_peKeep0();const g=k=>{const e=$("#"+k);return e?e.value.trim():undefined},b=g("peBirth"),c=g("peSrc"),f=g("peFm");if(b!==undefined)ui.pe.birth=b;if(c!==undefined)ui.pe.src=c;if(f!==undefined)ui.pe.fm=f};
const _peOpen0=A.peOpen,_peSave0=A.peSave;
Object.assign(A,{
  sowView:v=>{try{localStorage.setItem("farm-sowcard",v)}catch(e){}ui.pe=null;render()},
  scPg:v=>{const [id,p]=v.split("|");ui.scPg={id,p:+p};render()},
  peOpen:()=>{_peOpen0();const s=state.sows.find(x=>x.id===ui.sowId);Object.assign(ui.pe,{birth:s.birth||"",src:s.src||"",fm:s.firstMate||""});render()},
  scEdit:()=>A.peOpen(),
  peSave:()=>{peKeep();const s=state.sows.find(x=>x.id===ui.sowId),p=ui.pe;if(!s||!p)return;
    const set=(k,v)=>{if(v)s[k]=v;else delete s[k]};set("birth",p.birth);set("src",p.src);set("firstMate",p.fm);_peSave0()}
});
