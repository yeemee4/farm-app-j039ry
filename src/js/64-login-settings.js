/* ================= v0.3 · 로그인 ================= */
function vLogin(){
  const L2=ui.loginLang||"ko",sel=ui.loginId?state.accounts.find(a=>a.id===ui.loginId):null,pin=ui.pin||"";
  let h=`<div class="login-box"><div class="login-brand"><img src="logo.png" alt="비담농장" class="login-logo"><small class="ver">${APP_VER}</small></div>
    <div class="chips" style="justify-content:center;flex-wrap:wrap">${LANGS.map(([c,n])=>`<button type="button" class="chip ${L2===c?"on":""}" data-a="loginLang" data-v="${c}">${n}</button>`).join("")}</div>`;
  if(!sel){
    h+=`<h2 style="text-align:center;margin:8px 0 0">${t("이름을 고르세요")}</h2><div class="acclist">${state.accounts.filter(a=>a.active).map(a=>`<button type="button" class="accbtn" data-a="loginPick" data-v="${a.id}"><b>${esc(a.name)}</b><small>${t(ROLE[a.role])} · ${(LANGS.find(l=>l[0]===a.lang)||["","한국어"])[1]}</small></button>`).join("")}</div>`;
    h+=`<div class="note" style="text-align:center">PIN은 대표님께 받으세요.</div>`;
  }else{
    h+=`<h2 style="text-align:center;margin:8px 0 0">${esc(sel.name)}</h2><div class="small" style="text-align:center">${t("PIN 번호")}</div>
      <div class="pindots">${[0,1,2,3,4,5].slice(0,Math.max(4,sel.pin.length)).map(i=>`<i class="${i<pin.length?"on":""}"></i>`).join("")}</div>
      ${ui.pinErr?`<div class="errbox" style="text-align:center">${t("PIN이 맞지 않습니다")}</div>`:""}
      <div class="pinpad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-a="pinKey" data-v="${n}">${n}</button>`).join("")}<button type="button" data-a="loginBack">‹</button><button type="button" data-a="pinKey" data-v="0">0</button><button type="button" data-a="pinDel">⌫</button></div>`;
  }
  return h+`</div>`;
}

/* ================= v0.3 · 설정 ================= */
function vSettings(){
  const P=ui.setPage||"main",m=me();
  const back=`<div class="pagehd"><button class="back" type="button" data-a="setPage" data-v="main">‹ ${t("설정")}</button></div>`;
  if(P==="guide")return back+vGuide();
  if(P==="hus")return back+vHusbandry();
  if(P!=="main"&&!can("admin"))return back;
  if(P==="accounts")return back+vAccounts();
  if(P==="lists")return back+vLists();
  if(P==="labels")return back+vLabels();
  if(P==="criteria")return back+vCriteria();
  if(P==="bulk")return back+vBulk();
  if(P==="binit")return back+vBatchInit();
  if(P==="backup")return back+vBackup();
  if(P==="reset")return back+vReset();
  let h=`<div class="pagehd"><h2>${t("설정")}</h2></div>`;
  h+=`<div class="panel"><div class="sow-top"><b style="font-size:16px">${esc(m.name)}</b><span class="stage c-preg">${t(ROLE[m.role])}</span></div>
    <div class="f"><span class="lb">${t("언어")}</span><div class="chipwrap">${LANGS.map(([c,n])=>`<button type="button" class="chip wrap ${m.lang===c?"on":""}" data-a="myLang" data-v="${c}">${n}</button>`).join("")}</div></div>
    ${ui.myPin?`<div class="row2"><input type="password" id="myPin" inputmode="numeric" placeholder="${t("새 PIN (4~6자리)")}" aria-label="${t("새 PIN (4~6자리)")}"><button class="act pri" type="button" data-a="myPinSave">${t("저장")}</button></div>`:`<div class="acts"><button class="act" type="button" data-a="myPin">${t("PIN 변경")}</button><button class="act bad" type="button" data-a="logout">${t("로그아웃")}</button></div>`}</div>`;
  const menu=(k,ti,d)=>`<button class="mitem" type="button" data-a="setPage" data-v="${k}"><span></span><span><b>${ti}</b><small>${d}</small></span><span>›</span></button>`;
  h+=`<div class="more">${menu("guide",t("앱 가이드"),"상황별 사용 방법")}${menu("hus",t("사양관리 가이드"),"임신기간, 포유, 온도, 급수 등 기본 기준")}</div>`;
  if(can("admin")&&FARM.confirm.length)h+=`<div class="sec-t">확인 필요 <span>${FARM.confirm.length}</span></div><div class="panel"><div class="note">아래 값은 임시로 넣어 두었습니다. 알려 주시면 바로 고칩니다.</div>${FARM.confirm.map(x=>`<div class="setrow"><span>${esc(x)}</span></div>`).join("")}</div>`;
  if(can("admin")){
    h+=`<div class="sec-t">관리자 설정 <span>대표 계정에서만 보입니다</span></div><div class="more">
      ${menu("accounts","계정 관리","직원 추가 · 권한 · 언어 · PIN · 정지")}
      ${menu("lists","목록·이름 관리","돈사, 폐사 원인, 조치, 정액, 출하처, 도태 사유")}
      ${menu("labels","메뉴·버튼 이름","탭 이름, 홈 입력 버튼 이름과 표시 여부")}
      ${menu("criteria","기준값","폐사 알림 기준, 무변동 기준, 돈사별 주 수, 백신 프로그램, 정액")}
      ${menu("bulk","모돈 일괄 등록","번호를 붙여 넣고 현재 상태와 날짜로 등록")}
      ${menu("binit","돈군 초기 등록","분만 주차별 현재 두수")}
      ${menu("backup","백업·복원","기록을 복사해 두고 다시 붙여 넣기")}
      ${menu("reset","데이터 초기화","우리 농장 초기값 · 예시 농장 · 빈 농장")}</div>`;
  }
  return h;
}
function vAccounts(){
  const N=ui.newAcc;
  let h=`<h2>계정 관리</h2><div class="note">작업자는 기록 입력과 자기 기록 수정, 할 일 체크만 할 수 있습니다. 팀장은 삭제, 담당 지정, 도태까지 할 수 있습니다. 설정은 대표만 바꿉니다. 퇴사자는 정지하면 로그인만 막히고 기록은 남습니다.</div>`;
  h+=state.accounts.map(a=>`<div class="setrow" style="flex-wrap:wrap;${a.active?"":"opacity:.55"}"><span><b>${esc(a.name)}</b> <span class="sow-meta">${ROLE[a.role]} · ${(LANGS.find(l=>l[0]===a.lang)||["",""])[1]} · PIN ${"•".repeat(a.pin.length)}</span></span>
    <span class="acts"><button class="sbtn" type="button" data-a="accRole" data-v="${a.id}">권한 바꾸기</button><button class="sbtn" type="button" data-a="accLang" data-v="${a.id}">언어</button><button class="sbtn" type="button" data-a="accPin" data-v="${a.id}">PIN 초기화</button>${a.id===ME?"":`<button class="sbtn ${a.active?"bad":""}" type="button" data-a="accActive" data-v="${a.id}">${a.active?"정지":"다시 사용"}</button>`}</span></div>`).join("");
  h+=N?`<div class="panel"><h3 style="margin:0">직원 추가</h3><div class="f"><label for="naName">이름</label><input type="text" id="naName" value="${esc(N.name||"")}" placeholder="예: Tran Van B"></div>
    <div class="f"><span class="lb">권한</span><div class="chipwrap">${Object.entries(ROLE).map(([k,v])=>`<button type="button" class="chip wrap ${N.role===k?"on":""}" data-a="naRole" data-v="${k}">${v}</button>`).join("")}</div></div>
    <div class="f"><span class="lb">언어</span><div class="chipwrap">${LANGS.map(([c,n])=>`<button type="button" class="chip wrap ${N.lang===c?"on":""}" data-a="naLang" data-v="${c}">${n}</button>`).join("")}</div></div>
    <div class="f"><label for="naPin">PIN (4~6자리 숫자)</label><input type="text" id="naPin" inputmode="numeric" value="${esc(N.pin||"")}"></div>
    <div class="acts"><button class="act pri" type="button" data-a="naSave">추가</button><button class="act" type="button" data-a="naCancel">취소</button></div></div>`:`<button class="act pri" type="button" data-a="naOpen" style="justify-self:start">+ 직원 추가</button>`;
  return h;
}
function vLists(){
  const k=ui.listK||"barns",L2=state.lists[k];
  let h=`<h2>목록·이름 관리</h2><div class="chips">${Object.entries(LISTDEF).map(([kk,[n]])=>`<button type="button" class="chip ${k===kk?"on":""}" data-a="listK" data-v="${kk}">${n}</button>`).join("")}</div>
    <div class="note">이름을 고치고 칸 밖을 누르면 저장됩니다. 지난 기록도 새 이름으로 바뀝니다. 기록에 쓰인 항목은 지우지 않고 숨깁니다. 숨긴 항목은 새 입력에만 안 보입니다.</div>`;
  h+=L2.map((x,i)=>`<div class="setrow"><input type="text" value="${esc(x.n)}" data-list="${k}" data-i="${i}" aria-label="${esc(x.n)} 이름" style="${x.h?"opacity:.5":""}"><button class="sbtn" type="button" data-a="listHide" data-k="${k}" data-v="${i}">${x.h?"보이기":"숨기기"}</button></div>`).join("");
  h+=`<div class="row2"><input type="text" id="listNew" placeholder="새 항목 이름" aria-label="새 항목 이름"><button class="act pri" type="button" data-a="listAdd" data-v="${k}">추가</button></div>`;
  return h;
}
function vLabels(){
  const Lb=state.labels;
  let h=`<h2>메뉴·버튼 이름</h2><div class="note">비워 두면 기본 이름을 씁니다. 바꾼 이름은 모든 직원 화면에 그대로 보입니다(번역되지 않습니다).</div><div class="sec-t">탭 이름</div>`;
  h+=NAV.map(([k,l])=>`<div class="setrow"><span>${l}</span><input type="text" value="${esc(Lb.nav[k]||"")}" placeholder="${l}" data-lab="nav" data-k="${k}" aria-label="${l} 탭 이름" style="max-width:55%"></div>`).join("");
  h+=`<div class="sec-t">홈 입력 버튼 (이름 · 표시)</div>`;
  h+=QUICK.map(q=>`<div class="setrow"><span>${LABEL[q]||q}</span><span class="row2" style="max-width:65%"><input type="text" value="${esc(Lb.quick[q]||"")}" placeholder="${LABEL[q]||q}" data-lab="quick" data-k="${q}" aria-label="${LABEL[q]||q} 버튼 이름"><button class="sbtn" type="button" data-a="qHide" data-v="${q}">${(Lb.hide||{})[q]?"보이기":"숨기기"}</button></span></div>`).join("");
  return h;
}
function vCriteria(){
  const T=state.cfgSt,C=state.cfg;
  const stp=(a,k,v,lab)=>`<div class="stepper"><button type="button" data-a="${a}" data-k="${k}" data-v="-1" aria-label="${lab} 줄이기">−</button><input type="number" value="${v}" readonly aria-label="${lab}"><button type="button" data-a="${a}" data-k="${k}" data-v="1" aria-label="${lab} 늘리기">+</button></div>`;
  let h=`<h2>기준값</h2><div class="sec-t">폐사 조치 판단 알림</div>
    <div class="setrow"><span>한 번 입력에 이 두수 이상</span>${stp("cfgDead","deadOne",C.deadOne,"한 번 기준")}</div>
    <div class="setrow"><span>같은 돈사 하루 합계가 이 두수 이상</span>${stp("cfgDead","deadDay",C.deadDay,"하루 기준")}</div>
    <div class="note">기준 미만 폐사는 알림 없이 ‘조치 추가’ 버튼만 보입니다.</div>`;
  h+=`<div class="sec-t">장기 무변동 기준 (일)</div>`+Object.keys(ST_LABEL).map(k=>`<div class="setrow"><span>${ST_LABEL[k]}</span>${stp("stStep",k,T[k],ST_LABEL[k])}</div>`).join("");
  h+=`<div class="sec-t">돈사별 머무는 주 수</div>`+C.stage.map(([n,w],i)=>`<div class="setrow"><span>${n}</span>${stp("cfgStage",i,w,n)}</div>`).join("")+`<div class="note">출하 ${shipAge()}주령</div>`;
  h+=`<div class="sec-t">돈군 백신 프로그램 (분만 주 월요일부터 일수)</div>`+C.prog.map((p,i)=>`<div class="setrow"><span>${p.name}</span>${stp("cfgProg",i,p.day,p.name)}</div>`).join("");
  h+=`<div class="sec-t">정액</div><div class="setrow"><span>모돈 1두당 교배 횟수</span>${stp("cfgSemen",0,C.semenPerSow,"교배 횟수")}</div>`;
  return h;
}
const BULK_ST=[["임신","임신 중","마지막 교배일"],["확인전","교배 후 확인 전","교배일"],["포유","포유 중","분만일"],["이유","이유 후 발정 대기","이유일"],["재발","재발·공태","확인한 날"],["후보","후보돈","도입일"]];
function vBulk(){
  const B=ui.bulk||(ui.bulk={st:"임신",date:addDays(TODAY,-40),bp:2,loc:"임신사 1동",live:12,res:null});
  const st=BULK_ST.find(x=>x[0]===B.st);
  let h=`<h2>모돈 일괄 등록</h2><div class="note">모돈 번호를 줄마다 하나씩 붙여 넣고, 같은 상태·같은 날짜인 모돈끼리 한 번에 등록합니다. 상태가 다르면 나눠서 여러 번 등록하세요. 등록한 모돈은 바로 할 일과 일정 계산에 들어갑니다.</div>
    <div class="f"><label for="bkIds">모돈 번호 (줄마다 하나)</label><textarea id="bkIds" placeholder="2301&#10;2302&#10;2303">${esc(B.ids||"")}</textarea></div>
    <div class="f"><span class="lb">현재 상태</span><div class="chipwrap">${BULK_ST.map(([k,l])=>`<button type="button" class="chip wrap ${B.st===k?"on":""}" data-a="bkSt" data-v="${k}">${l}</button>`).join("")}</div></div>
    <div class="f"><label for="bkDate">${st[2]}</label><input type="date" id="bkDate" value="${B.date}" max="${TODAY}"></div>
    <div class="setrow"><span>현재 산차 ${B.st==="포유"?"(이번 분만 포함)":""}</span><div class="stepper"><button type="button" data-a="bkBp" data-v="-1" aria-label="줄이기">−</button><input type="number" value="${B.bp}" readonly aria-label="산차"><button type="button" data-a="bkBp" data-v="1" aria-label="늘리기">+</button></div></div>
    ${B.st==="포유"?`<div class="setrow"><span>실산 (복당)</span><div class="stepper"><button type="button" data-a="bkLive" data-v="-1" aria-label="줄이기">−</button><input type="number" value="${B.live}" readonly aria-label="실산"><button type="button" data-a="bkLive" data-v="1" aria-label="늘리기">+</button></div></div>`:""}
    <div class="f"><span class="lb">위치</span><div class="chipwrap">${SOW_LOCS.map(l=>`<button type="button" class="chip wrap ${B.loc===l?"on":""}" data-a="bkLoc" data-v="${l}">${l}</button>`).join("")}</div></div>
    <button class="save" type="button" data-a="bkSave">등록</button>`;
  if(B.res)h+=`<div class="banner info"><b>결과</b><span>${B.res}</span></div>`;
  return h;
}
function vBatchInit(){
  const mb=state.mbatches||[];
  let h=`<h2>돈군 초기 등록</h2><div class="note">분만 기록이 없는 돈군(앱 사용 전에 태어난 자돈·육성돈)을 분만 주차별 현재 두수로 등록합니다. 앱에서 분만을 입력한 주차는 자동으로 만들어지므로 넣지 않아도 됩니다.</div>`;
  h+=mb.length?`<div class="dtbl"><table><thead><tr><th>분만 주차</th><th>등록 당시 주령</th><th>두수</th><th>복수</th><th></th></tr></thead><tbody>${[...mb].sort((a,b)=>b.k.localeCompare(a.k)).map(m=>`<tr><td>${bName(m.k)}</td><td>${m.age}주</td><td>${m.n}</td><td>${m.litters||"-"}</td><td><button class="sbtn bad" type="button" data-a="mbDel" data-v="${m.k}">삭제</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">등록한 돈군이 없습니다.</div>`;
  h+=`<div class="panel"><div class="f"><label for="mbDate">분만한 주의 아무 날짜</label><input type="date" id="mbDate" max="${TODAY}"></div>
    <div class="row2"><div class="f" style="flex:1"><label for="mbN">현재 두수</label><input type="number" id="mbN" inputmode="numeric" value="50"></div><div class="f" style="flex:1"><label for="mbL">분만 복수</label><input type="number" id="mbL" inputmode="numeric" value="4"></div></div>
    <button class="act pri" type="button" data-a="mbAdd" style="justify-self:start">돈군 추가</button></div>`;
  return h;
}
function vBackup(){
  let h=`<h2>백업·복원</h2><div class="note">시제품은 기록이 이 휴대폰 브라우저 안에만 저장됩니다. 아래 ‘백업 복사’를 눌러 카카오톡 나에게 보내기나 메모장에 붙여 두세요. 휴대폰을 바꾸거나 기록이 지워졌을 때 ‘붙여 넣어 복원’으로 되살립니다.</div>
    <div class="acts"><button class="act pri" type="button" data-a="bkCopy">백업 복사</button><span class="sow-meta" id="bkMsg"></span></div>
    <textarea id="bkOut" readonly style="min-height:90px;font-family:var(--mono);font-size:11px" aria-label="백업 내용">${esc(JSON.stringify(state))}</textarea>
    <div class="sec-t">붙여 넣어 복원</div><textarea id="bkIn" placeholder="백업 내용을 붙여 넣으세요" aria-label="복원할 내용"></textarea>`;
  h+=ui.restoreAsk?`<div class="warnbox"><span><b>지금 기록을 모두 바꿉니다.</b> 복원하시겠습니까?</span><div class="acts"><button class="act bad" type="button" data-a="restoreOk">복원</button><button class="act" type="button" data-a="restoreNo">취소</button></div></div>`:`<button class="act" type="button" data-a="restoreAsk" style="justify-self:start">복원</button>`;
  return h;
}
function vReset(){
  const R=ui.resetPick;
  const opts=[["farm","우리 농장 초기값","모돈 92두(분만사 30 · 임신사 40 · 교배사 22), 돈군 12개(W33~W44), 비육 0두. 계정과 설정도 처음 값으로 돌아갑니다."],["demo","예시 농장","v0.2와 같은 가상 농장. 기능을 둘러볼 때 씁니다."],["empty","빈 농장","모돈·기록을 모두 지우고 시작합니다. 계정, 목록, 기준값은 그대로 둡니다."]];
  let h=`<h2>데이터 초기화</h2>`+opts.map(([k,ti,d])=>`<div class="panel" style="${R===k?"border-color:var(--red)":""}"><div><b>${ti}</b><div class="sow-meta">${d}</div></div>${R===k?`<div class="warnbox"><span><b>정말 바꾸시겠습니까?</b> 지금 기록은 사라집니다. 필요하면 먼저 백업하세요.</span><div class="acts"><button class="act bad" type="button" data-a="resetDo" data-v="${k}">초기화</button><button class="act" type="button" data-a="resetPick" data-v="">취소</button></div></div>`:`<button class="act" type="button" data-a="resetPick" data-v="${k}" style="justify-self:start">이 상태로 시작</button>`}</div>`).join("");
  return h;
}

