/* ================= v0.3 · 동작 ================= */
function migrateName(k,oldN,newN){
  const F=LISTFIELDS[k]||[];
  state.records.forEach(r=>{F.forEach(f=>{if(r.data&&r.data[f]===oldN)r.data[f]=newN})});
  if(k==="actions")(state.tasks||[]).forEach(tk=>{tk.acts=tk.acts.map(a=>a===oldN?newN:a)});
  if(k==="cull")state.sows.forEach(s=>{if(s.cullPlan&&s.cullPlan.reason===oldN)s.cullPlan.reason=newN});
  if(k==="causes"&&REC[oldN]){REC[newN]=REC[oldN];delete REC[oldN]}
  if(k==="actions")Object.keys(REC).forEach(c=>REC[c]=REC[c].map(a=>a===oldN?newN:a));
  if(k==="barns"&&state.dayDec){Object.keys(state.dayDec).forEach(key=>{const [d,...b]=key.split("|");if(b.join("|")===oldN){state.dayDec[d+"|"+newN]=state.dayDec[key];delete state.dayDec[key]}})}
}
Object.assign(A,{
  loginLang:v=>{ui.loginLang=v;render()},
  loginPick:v=>{ui.loginId=v;ui.pin="";ui.pinErr=false;render()},
  loginBack:()=>{ui.loginId=null;ui.pin="";ui.pinErr=false;render()},
  pinKey:v=>{const a=state.accounts.find(x=>x.id===ui.loginId);ui.pinErr=false;ui.pin=(ui.pin||"")+v;
    if(ui.pin.length>=a.pin.length){if(ui.pin===a.pin){ME=a.id;try{localStorage.setItem(SKEY,ME)}catch(e){}ui.pin="";ui.loginId=null;tab="home";ui.setPage="main";render();window.scrollTo(0,0)}else{ui.pin="";ui.pinErr=true}}
    if(!me())render()},
  pinDel:()=>{ui.pin=(ui.pin||"").slice(0,-1);render()},
  logout:()=>{ME=null;try{localStorage.removeItem(SKEY)}catch(e){}ui.loginLang=null;closeSheet();document.body.classList.remove("tv");render();window.scrollTo(0,0)},
  myLang:v=>{me().lang=v;save();render()},
  myPin:()=>{ui.myPin=true;render()},
  myPinSave:()=>{const v=($("#myPin").value||"").trim();if(!/^\d{4,6}$/.test(v)){toast("PIN은 숫자 4~6자리입니다");return}me().pin=v;ui.myPin=false;save();render();toast(t("저장"))},
  setPage:v=>{ui.setPage=v||"main";ui.bulk=ui.bulk&&v==="bulk"?ui.bulk:null;render();window.scrollTo(0,0)},
  goSettings:()=>{ui.setPage="main";go("settings")},
  accRole:v=>{const a=state.accounts.find(x=>x.id===v);if(a.id===ME){toast("내 권한은 바꿀 수 없습니다");return}const o=["worker","leader","admin"];a.role=o[(o.indexOf(a.role)+1)%3];save();render()},
  accLang:v=>{const a=state.accounts.find(x=>x.id===v),o=LANGS.map(l=>l[0]);a.lang=o[(o.indexOf(a.lang)+1)%o.length];save();render()},
  accPin:v=>{const a=state.accounts.find(x=>x.id===v);a.pin="0000";save();render();toast(`${a.name} PIN을 0000으로 초기화했습니다`)},
  accActive:v=>{const a=state.accounts.find(x=>x.id===v);a.active=!a.active;save();render()},
  naOpen:()=>{ui.newAcc={role:"worker",lang:"vi"};render()},
  naRole:v=>{ui.newAcc.name=$("#naName").value;ui.newAcc.pin=$("#naPin").value;ui.newAcc.role=v;render()},
  naLang:v=>{ui.newAcc.name=$("#naName").value;ui.newAcc.pin=$("#naPin").value;ui.newAcc.lang=v;render()},
  naCancel:()=>{ui.newAcc=null;render()},
  naSave:()=>{const name=$("#naName").value.trim(),pin=$("#naPin").value.trim();if(!name){toast("이름을 입력하세요");return}if(!/^\d{4,6}$/.test(pin)){toast("PIN은 숫자 4~6자리입니다");return}
    if(state.accounts.some(a=>a.name===name)){toast("같은 이름이 있습니다");return}
    state.accounts.push({id:"a"+newId(),name,role:ui.newAcc.role,lang:ui.newAcc.lang,pin,active:true});ui.newAcc=null;save();render();toast(`${name} 계정을 추가했습니다`)},
  listK:v=>{ui.listK=v;render()},
  listHide:(v,el)=>{const x=state.lists[el.dataset.k][+v];x.h=!x.h;save();render()},
  listAdd:v=>{const n=($("#listNew").value||"").trim();if(!n)return;if(state.lists[v].some(x=>x.n===n)){toast("이미 있는 이름입니다");return}state.lists[v].push({n,h:false});save();render();toast(`${n} 추가`)},
  qHide:v=>{const H=state.labels.hide||(state.labels.hide={});H[v]=!H[v];save();render()},
  cfgDead:(v,el)=>{const k=el.dataset.k;state.cfg[k]=Math.max(1,state.cfg[k]+Number(v));save();render()},
  bkSt:v=>{bkKeep();ui.bulk.st=v;ui.bulk.loc={임신:"임신사",확인전:"교배사",포유:"분만사",이유:"교배사",재발:"교배사",후보:"후보돈사"}[v];render()},
  bkBp:v=>{bkKeep();ui.bulk.bp=Math.max(0,ui.bulk.bp+Number(v));render()},
  bkLive:v=>{bkKeep();ui.bulk.live=Math.max(0,ui.bulk.live+Number(v));render()},
  bkLoc:v=>{bkKeep();ui.bulk.loc=v;render()},
  bkSave:()=>{bkKeep();const B=ui.bulk,ids=(B.ids||"").split(/[\s,]+/).map(x=>x.trim()).filter(Boolean),D=B.date||TODAY;let ok=[],skip=[];
    ids.forEach(id=>{if(state.sows.some(s=>s.id===id)){skip.push(id);return}
      const s={id,baseParity:B.bp,loc:B.loc,breed:"LYD"};const add=(type,wd,data)=>state.records.push({id:newId(),type,workDate:wd,createdAt:new Date().toISOString(),user:state.user,data:{...data,sow:id,init:true}});
      if(B.st==="임신"){add("교배",D,{round:"1차",semen:SEMENS[0]||"듀록 정액"});if(diff(D,TODAY)>=28)add("임신확인",addDays(D,28),{result:"임신"})}
      if(B.st==="확인전")add("교배",D,{round:"1차",semen:SEMENS[0]||"듀록 정액"});
      if(B.st==="포유"){s.baseParity=Math.max(0,B.bp-1);add("분만",D,{live:B.live,still:0,mum:0})}
      if(B.st==="이유")add("이유",D,{n:0,days:0});
      if(B.st==="재발"){add("교배",addDays(D,-21),{round:"1차",semen:SEMENS[0]||"듀록 정액"});add("임신확인",D,{result:"재발"})}
      if(B.st==="후보"){s.gilt=true;s.intro=D;s.baseParity=0;add("도입",D,{breed:"LYD",age:180})}
      state.sows.push(s);ok.push(id)});
    B.res=`${ok.length}두 등록${skip.length?` · 이미 있는 번호 ${skip.length}두 건너뜀 (${skip.slice(0,5).join(", ")}${skip.length>5?" …":""})`:""}`;if(ok.length)B.ids="";save();render()},
  mbAdd:()=>{const d=$("#mbDate").value,n=+$("#mbN").value,l=+$("#mbL").value;if(!d||!n){toast("날짜와 두수를 입력하세요");return}const k=weekStart(d);
    state.mbatches=(state.mbatches||[]).filter(m=>m.k!==k);state.mbatches.push({k,age:Math.floor(diff(k,TODAY)/7),n,litters:l||0});save();render();toast(`${bName(k)} 등록`)},
  mbDel:v=>{state.mbatches=state.mbatches.filter(m=>m.k!==v);save();render()},
  bkCopy:()=>{const txt=JSON.stringify(state),msg=$("#bkMsg");navigator.clipboard.writeText(txt).then(()=>{msg.textContent="복사했습니다. 안전한 곳에 붙여 두세요."}).catch(()=>{const o=$("#bkOut");o.focus();o.select();msg.textContent="내용을 선택해 두었습니다. 직접 복사하세요."})},
  restoreAsk:()=>{ui.restoreTxt=$("#bkIn").value;ui.restoreAsk=true;render();const i=$("#bkIn");if(i)i.value=ui.restoreTxt},
  restoreNo:()=>{ui.restoreAsk=false;render()},
  restoreOk:()=>{try{const s=JSON.parse(ui.restoreTxt||"");if(!s||!s.sows||!s.records)throw 0;state=s;if(state.v!==6)upgradeDemo(state);syncLists();save();ui.restoreAsk=false;toast("복원했습니다");render()}catch(e){ui.restoreAsk=false;render();toast("복원할 수 없는 내용입니다. 백업한 글자 전체를 붙여 넣어 주세요.")}},
  resetPick:v=>{ui.resetPick=v||null;render()},
  resetDo:v=>{const keep=state;makeState(v,keep);if(!me()){ME=null;try{localStorage.removeItem(SKEY)}catch(e){}}ui.resetPick=null;ui.setPage="main";tab=me()?"home":tab;render();toast("초기화했습니다")},
  judge:v=>{openInput("폐사",{date:String(v).replace(/^d:/,"")})},
  decNone:v=>{if(String(v).startsWith("day|")){const k=v.slice(4),g=state.records.filter(r=>r.type==="폐사"&&r.workDate+"|"+r.data.barn===k);state.dayDec=state.dayDec||{};state.dayDec[k]={decision:"none",total:g.reduce((s,r)=>s+r.data.n,0),at:new Date().toISOString(),user:state.user}}
    else{const r=state.records.find(x=>x.id===v);r.data.decision="none"}save();render();toast(t("조치 필요 없음"))},
  decNeed:v=>{let causes;if(String(v).startsWith("day|")){const k=v.slice(4);causes=[...new Set(state.records.filter(r=>r.type==="폐사"&&r.workDate+"|"+r.data.barn===k).map(r=>r.data.cause))]}else{causes=[state.records.find(x=>x.id===v).data.cause]}
    ui.dec={id:v,acts:[...new Set(causes.flatMap(c=>REC[c]||[]))].filter(a=>ACTIONS.includes(a)),when:"오늘 중",who:state.user,memo:""};render()},
  decSave:()=>{const D=ui.dec;if(!D.acts.length)return;const due=D.when==="내일"?addDays(TODAY,1):D.when==="모레"?addDays(TODAY,2):TODAY,memo=(($("#decMemo")||{}).value||"").trim();
    let title,src=null;
    if(String(D.id).startsWith("day|")){const k=D.id.slice(4),[d,...b]=k.split("|"),g=state.records.filter(r=>r.type==="폐사"&&r.workDate+"|"+r.data.barn===k),total=g.reduce((s,r)=>s+r.data.n,0);title=`${b.join("|")} 하루 폐사 ${total}두`;const tk={id:newId(),src:k,title,acts:D.acts,due,who:D.who,memo,createdAt:new Date().toISOString(),user:state.user};state.tasks.push(tk);state.dayDec=state.dayDec||{};state.dayDec[k]={decision:tk.id,total,at:tk.createdAt,user:state.user}}
    else{const r=state.records.find(x=>x.id===D.id);title=`${r.data.barn} ${r.data.stage} ${r.data.cause}`;const tk={id:newId(),src:r.id,title,acts:D.acts,due,who:D.who,memo,createdAt:new Date().toISOString(),user:state.user};state.tasks.push(tk);r.data.decision=tk.id}
    ui.dec=null;save();render();toast(`${t("할 일에 추가")} · ${t(D.when)} · ${D.who}`)}
});
function bkKeep(){const a=$("#bkIds"),b=$("#bkDate");if(a)ui.bulk.ids=a.value;if(b&&b.value)ui.bulk.date=b.value}
document.addEventListener("change",e=>{const x=e.target;
  if(x.dataset&&x.dataset.list){const k=x.dataset.list,i=+x.dataset.i,it=state.lists[k][i],n=x.value.trim();if(!n||n===it.n){x.value=it.n;return}if(state.lists[k].some(y=>y.n===n)){toast("같은 이름이 있습니다");x.value=it.n;return}
    migrateName(k,it.n,n);it.n=n;save();syncLists();toast(`이름을 ‘${n}’(으)로 바꿨습니다. 지난 기록도 바뀌었습니다.`)}
  if(x.dataset&&x.dataset.lab){const L3=state.labels[x.dataset.lab];const v=x.value.trim();if(v)L3[x.dataset.k]=v;else delete L3[x.dataset.k];save();renderTabs();toast("이름을 저장했습니다")}
});

function peKeep(){const a=$("#peIntro"),b=$("#peMemo"),c=$("#peId");if(a)ui.pe.intro=a.value;if(b)ui.pe.memo=b.value;if(c)ui.pe.id=c.value.trim()}
Object.assign(A,{
  tab:v=>{closeSheet();if(v==="settings")ui.setPage="main";go(v)},
  peSave:()=>{peKeep();const s=state.sows.find(x=>x.id===ui.sowId),nid=ui.pe.id||s.id;
    if(nid!==s.id){if(state.sows.some(x=>x.id===nid)){toast("이미 있는 번호입니다");return}
      state.records.forEach(r=>{if(r.data&&r.data.sow===s.id)r.data.sow=nid});s.id=nid;ui.sowId=nid}
    s.breed=ui.pe.breed;s.baseParity=ui.pe.bp;if(ui.pe.intro)s.intro=ui.pe.intro;s.memo=(ui.pe.memo||"").trim();ui.pe=null;save();render();toast("기본 정보를 저장했습니다")}
});

