/* ================= v0.5 · 사진 첨부 · 말로 입력 ================= */
// 14. 사진: 휴대폰 카메라로 찍어 640px JPEG로 줄여 기록에 붙임 (기기 저장 공간 아끼기)
function photoField(f,d){const v=d[f.k];return `<div class="f"><span class="lb">${esc(t(f.l))}</span><div class="photo-f">${v?`<img src="${v}" alt=""><button type="button" class="act" data-a="photoDel" data-v="${f.k}">${t("사진 빼기")}</button>`:`<label class="act photo-btn">📷 ${t("사진 찍기·고르기")}<input type="file" accept="image/*" capture="environment" data-photo="${f.k}" hidden></label>`}</div></div>`}
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.photo,fl=e.target.files&&e.target.files[0];if(!k||!fl)return;
  const img=new Image(),url=URL.createObjectURL(fl);img.onload=()=>{const M=640,s=Math.min(1,M/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    ui.in.fv[k]=c.toDataURL("image/jpeg",.62);render()};img.src=url});
// 15. 말로 입력: 브라우저 음성 인식이 있으면 🎤 버튼 (없으면 휴대폰 키보드의 마이크를 쓰면 됨)
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const SR_LANG={ko:"ko-KR",vi:"vi-VN",ne:"ne-NP",km:"km-KH",th:"th-TH"};
function micBtn(id){return SR?`<button type="button" class="mic" data-a="mic" data-v="${id}" aria-label="${t("말로 입력")}">🎤</button>`:""}
let recog=null;
Object.assign(A,{
  photoDel:v=>{delete ui.in.fv[v];render()},
  photoView:v=>{const r=state.records.find(x=>x.id===v);if(!r)return;$("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet"><div class="sh-hd"><h2>${esc(summary(r))}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd"><img src="${r.data.photo}" alt="" style="width:100%;border-radius:12px"></div></div></div>`},
  mic:(v,el)=>{if(!SR)return;const inp=document.getElementById(v);if(recog){recog.stop();recog=null;el.classList.remove("on");return}
    recog=new SR();recog.lang=SR_LANG[LANG]||"ko-KR";recog.interimResults=false;el.classList.add("on");
    recog.onresult=e=>{const txt=[...e.results].map(r=>r[0].transcript).join(" ");inp.value=(inp.value?inp.value+" ":"")+txt;inp.dispatchEvent(new Event("input",{bubbles:true}))};
    recog.onend=()=>{el.classList.remove("on");recog=null};recog.onerror=()=>{toast(t("음성 인식을 쓸 수 없습니다. 키보드의 마이크를 눌러 주세요."))};recog.start()}
});
