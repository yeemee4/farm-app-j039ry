/* ================= 입력 양식 ================= */
const feedNames=()=>[...new Set(state.records.filter(r=>r.type==="사료").map(r=>r.data.kind))].sort();
const FORMS={
  폐사:{f:[{k:"barn",l:"돈사",t:"chips",o:BARNS,def:"분만사 1동"},{k:"stage",l:"단계",t:"chips",o:PIG_STAGES,def:"포유자돈"},{k:"n",l:"두수",t:"step",def:1,min:1},{k:"cause",l:"원인",t:"chips",o:CAUSES,def:"원인불명"}],
    warn:(d,wd)=>{const dup=state.records.find(r=>r.id!==EXCL&&r.type==="폐사"&&r.workDate===wd&&r.data.barn===d.barn&&r.data.cause===d.cause&&r.data.stage===d.stage&&(Date.now()-new Date(r.createdAt))<10*60e3);return dup?`10분 안에 같은 돈사·단계·원인으로 입력한 기록이 있습니다 (${kTime(dup.createdAt)}, ${dup.data.n}두). 중복 입력이 아닌지 확인해 주세요.`:null}},
  교배:{sow:{multi:true,target:true,filter:(i,wd)=>i.key==="후보"||i.key==="발정대기"||i.key==="재발공태"||(i.gilt&&i.key==="후보")||(i.stage==="교배"&&diff(i.mate,wd)<=2)},
    f:[{k:"round",l:"회차",t:"chips",o:["1차","2차","3차"],def:"1차"},{k:"semen",l:"웅돈 / 정액",t:"chips",o:()=>SEMENS,def:"듀록 정액"}],
    warn:(d,wd,s)=>{const i=sowState(s);if(d.round==="1차"&&i.stage==="교배"&&diff(i.mate,wd)<=3)return `${s}번은 ${kDate(i.mate)}에 이미 1차 교배 기록이 있습니다. 2차·3차라면 회차를 바꿔 주세요.`;return null}},
  임신확인:{sow:{multi:true,target:true,filter:(i,wd)=>i.stage==="교배"&&diff(i.mate,wd)>=CFG.returnCheck[0]},
    f:[{k:"result",l:"결과",t:"chips",o:["임신","재발","공태","유산"],def:"임신"}]},
  분만:{sow:{multi:false,target:true,filter:(i,wd)=>(i.stage==="임신"||i.stage==="교배")&&diff(i.mate,wd)>=CFG.gest-10},
    f:[{k:"live",l:"실산",t:"step",def:12,min:0},{k:"still",l:"사산",t:"step",def:0,min:0},{k:"mum",l:"미라",t:"step",def:0,min:0},{k:"_t",t:"calc",l:"총산 (자동)",calc:d=>(+d.live||0)+(+d.still||0)+(+d.mum||0)}],
    warn:(d,wd,s)=>{const i=sowState(s);if(i.mate){const g=diff(i.mate,wd);if(g<108||g>120)return `${s}번은 교배 후 ${g}일째입니다. 보통 ${CFG.gest}일 전후에 분만합니다.`}
      if(d.live+d.still+d.mum>22)return "총산이 22두를 넘습니다. 숫자를 확인해 주세요.";return null}},
  이유:{sow:{multi:false,target:true,filter:i=>i.stage==="포유"},
    f:[{k:"n",l:"이유두수",t:"step",def:11,min:0},{k:"_d",t:"calc",l:"포유일수 (자동)",calc:(d,wd,s)=>{const i=s?sowState(s):null;return i&&i.farrow?diff(i.farrow,wd)+"일":"-"}}],
    warn:(d,wd,s)=>{const i=sowState(s);if(i.live&&d.n>i.live+2)return `${s}번은 실산 ${i.live}두인데 이유두수가 ${d.n}두입니다. 양자를 받았다면 그대로 저장하세요.`;return null},
    pre:(d,wd,s)=>{const i=sowState(s);d.days=i.farrow?diff(i.farrow,wd):0}},
  백신:{sow:{multi:true,target:false,filter:()=>true},
    f:[{k:"kind",l:"구분",t:"chips",o:["백신","투약","구충"],def:"백신"},{k:"name",l:"백신·약품",t:"chips",o:["PED","대장균","돼지열병","일본뇌염","파보·단독","써코","구제역","기타"],def:"PED"},{k:"memo",l:"메모 (선택)",t:"text",opt:true,ph:"예: 2차 접종"}]},
  이동:{f:[{k:"from",l:"출발 돈사",t:"chips",o:BARNS,def:"분만사 1동"},{k:"to",l:"도착 돈사",t:"chips",o:BARNS,def:"자돈사 1동"},{k:"n",l:"두수",t:"step",def:100,min:1,big:10}],
    warn:d=>d.from===d.to?"출발과 도착 돈사가 같습니다.":null},
  출하:{f:[{k:"barn",l:"출하 돈사",t:"chips",o:()=>{const f=BARNS.filter(b=>b.includes("비육"));return f.length?f:BARNS},def:"비육사 1동"},{k:"n",l:"출하두수",t:"step",def:20,min:1},{k:"kg",l:"출하 평균체중 (kg)",t:"step",def:115,min:60},{k:"dest",l:"출하처",t:"chips",o:()=>DESTS,def:"○○도축장"}],
    warn:(d,wd)=>{const w=state.records.find(r=>r.type==="약품"&&r.data.barn===d.barn&&r.data.withdraw&&r.data.withdraw>wd);return w?`${d.barn}은 휴약 중입니다 (종료 ${kDate(w.data.withdraw)}). 출하해도 되는지 확인해 주세요.`:null}},
  사료:{f:[{k:"kind",l:"사료 이름 (직접 입력)",t:"text",ph:"예: 비육 전기",list:"feedList"},{k:"mode",l:"구분",t:"chips",o:["입고","빈 잔량"],def:"입고"},{k:"kg",l:"수량 (kg)",t:"step",def:5000,min:0,big:500}]},
  약품:{f:[{k:"kind",l:"구분",t:"chips",o:()=>CATS.filter(c=>c!=="백신"&&c!=="정액"),def:"항생제"},{k:"name",l:"품목 (약품·재고 탭에서 추가)",t:"chips",o:()=>itemNames(ui.in?ui.in.fv.kind:"항생제")},{k:"barn",l:"대상 돈사",t:"chips",o:BARNS,def:"비육사 1동"},{k:"qty",l:"사용량",t:"step",def:1,min:0},{k:"withdraw",l:"휴약 종료일 (항생제 · 자동 제안)",t:"date",opt:true}]},
  BCS:{sow:{multi:false,target:false,filter:()=>true},f:[{k:"score",l:"BCS 점수",t:"chips",o:["1","1.5","2","2.5","3","3.5","4","4.5","5"],def:"3"},{k:"when",l:"측정 시점",t:"chips",o:["교배 시","임신 중","분만 시","이유 시","기타"],def:"임신 중"},{k:"memo",l:"메모 (선택)",t:"text",opt:true}]},
  돈군백신:{f:[{k:"batch",l:"돈군",t:"chips",o:()=>liveBatches().map(b=>[b.k,`${bName(b.k)} · ${bAge(b)}주령`])},{k:"vax",l:"백신",t:"chips",o:()=>state.cfg.prog.map(p=>p.name)},{k:"_v",t:"calc",l:"추정 두수 / 이미 접종",calc:d=>{const b=batches().find(x=>x.k===d.batch),p=state.cfg.prog.find(x=>x.name===d.vax);if(!b||!p)return "-";const v=bVax(b,p);return `${v.need} / ${v.done}두`}},{k:"n",l:"이번에 접종한 두수",t:"step",def:0,min:0,big:10},{k:"lot",l:"제조번호 (선택)",t:"text",opt:true}],
    pre:d=>{d.prod=(state.cfg.prog.find(p=>p.name===d.vax)||{}).prod},
    warn:d=>{const b=batches().find(x=>x.k===d.batch),p=state.cfg.prog.find(x=>x.name===d.vax);if(b&&p){const v=bVax(b,p),left=Math.max(v.need-v.done,0);if(d.n>left+10)return `추정 남은 두수(${left}두)보다 많습니다. 숫자를 확인해 주세요.`;if(d.n<=0)return "접종 두수가 0입니다."}return null}},
  재고:{f:[{k:"item",l:"품목",t:"chips",o:()=>state.items.filter(i=>!i.hidden).map(i=>[i.id,i.name])},{k:"mode",l:"구분",t:"chips",o:["입고","사용","실사"],def:"입고"},{k:"qty",l:"수량 (실사는 실제로 센 수량)",t:"step",def:10,min:0},{k:"memo",l:"메모 (선택)",t:"text",opt:true}]},
  특이사항:{f:[{k:"barn",l:"돈사",t:"chips",o:BARNS,def:"분만사 1동"},{k:"text",l:"내용",t:"textarea",ph:"예: 2번 환풍기 소음, 급수기 누수"}]},
  도입:{f:[{k:"sowid",l:"후보돈 번호",t:"text",ph:"예: G305"},{k:"breed",l:"품종",t:"chips",o:["LYD","YL","LY","기타"],def:"LYD"},{k:"age",l:"도입 일령",t:"step",def:180,min:30,big:10}],
    err:d=>state.sows.some(s=>s.id===String(d.sowid).trim())?`${d.sowid}번은 이미 있는 번호입니다.`:null}
};

