/* ================= 아이콘 · 테스트 라벨 ================= */
// 아이콘: src/icons/<종류>.svg 파일 하나 = 아이콘 하나. 파일이 없으면 TYPES 의 글자(s)로 표시.
// 아이콘 스타일 (설정 › 화면 디자인): pic 그림 타일 · circle 동그라미 그림 · cut 오려낸 그림 · line 초록 선 · duo 투톤 · glyph 앱 아이콘형
const ICON_STYLES=[["poly","폴리곤"],["pic","그림 타일"],["circle","동그라미 그림"],["cut","오려낸 그림"],["line","초록 선"],["duo","투톤"],["glyph","앱 아이콘형"]];
function iconStyle(){try{return localStorage.getItem("farm-icon")||FARM.iconStyle}catch(e){return FARM.iconStyle}}
function icon(type,sm){const T=TYPES[type]||{c:"var(--muted)",s:"?"},svg=ICON_SVG[type],st=iconStyle(),cl=`ic${sm?" sm":""}`;
  if(st==="poly"&&ICON_POLY[type])return `<span class="${cl} ipoly">${ICON_POLY[type]}</span>`;
  if(st==="circle"&&ICON_IMG[type])return `<span class="${cl} icirc"><img src="${ICON_IMG[type]}" alt=""></span>`;
  if(st==="cut"&&ICON_CUT[type])return `<span class="${cl} icut"><img src="${ICON_CUT[type]}" alt=""></span>`;
  if(st==="line"&&svg)return `<span class="${cl} iline">${svg}</span>`;
  if(st==="duo"&&svg)return `<span class="${cl} iduo">${svg.replace("<svg",'<svg class="u"')}${svg}</span>`;
  if(st==="glyph"&&svg)return `<span class="${cl} iglyph" style="--g:${T.c}">${svg}</span>`;
  if(st==="pic"&&ICON_IMG[type])return `<span class="ic${sm?" sm":""} tile"><img src="${ICON_IMG[type]}" alt=""></span>`;  // 그림 아이콘 src/icons/<종류>.png
  const tile=svg&&svg.includes('data-tile');  // 배경까지 그린 그림 아이콘(귀여운 그림 스타일)
  return `<span class="ic${sm?" sm":""}${svg?" svg":""}${tile?" tile":""}" style="background:${tile?"transparent":T.c}">${svg||T.s}</span>`}

// 테스트 라벨(포스트잇): 화면 구역마다 H3, P2 같은 번호를 붙여 "여기!"라고 지목하기 쉽게 한다.
// 정식 배포 때는 python3 tools/build.py --no-tags 로 빼고 만든다.
const TAG_SEL=".pagehd,.sec-t,.panel,.card,.banner,.warnbox,.datebar,.seg,.chipwrap,.dtbl,.setrow,.qgrid>*,.more>*,.sowgrid,.statusrow,.sh-hd,.wxcard,.d-card,.d-top,.todo,.srow,.bd-head,.bd-kpi,.bd-main>*,.bd-side>*,.bd-right>*,.bd-foot,[data-tagme]";
const TAG_PRE={home:"H",sows:"M",sow:"MD",input:"I",batch:"G",stats:"S",board:"TV",settings:"E",more:"R",drug:"Y",timeline:"T",criteria:"C",guide:"GU",morning:"AM",cal:"CA",count:"CN"};
let tagOn=(()=>{try{const v=localStorage.getItem("farm-tags");return v?v==="1":BUILD_TAGS}catch(e){return BUILD_TAGS}})(),tagRaf=0;
function tagsApply(){tagRaf=0;document.body.classList.toggle("tagson",tagOn);const tb=$("#tagBtn");if(tb)tb.hidden=!BUILD_TAGS;if(!tagOn)return;
  const pre=document.body.classList.contains("login")?"L":(TAG_PRE[typeof tab!=="undefined"?tab:""]||String(tab||"X").slice(0,2).toUpperCase());
  const run=(root,p)=>{let n=0;if(root)root.querySelectorAll(TAG_SEL).forEach(el=>{const v=p+(++n);if(el.dataset.tag!==v)el.dataset.tag=v})};
  run($("#view"),pre);run($("#sheetRoot"),"P");
  let n=0;document.querySelectorAll(".tabs .in>*").forEach(el=>{const v="탭"+(++n);if(el.dataset.tag!==v)el.dataset.tag=v});
  const h=$(".hd");if(h&&h.dataset.tag!=="상단")h.dataset.tag="상단"}
function tagsToggle(){tagOn=!tagOn;try{localStorage.setItem("farm-tags",tagOn?"1":"0")}catch(e){}tagsApply()}
new MutationObserver(()=>{if(!tagRaf)tagRaf=requestAnimationFrame(tagsApply)}).observe(document.body,{childList:true,subtree:true});
