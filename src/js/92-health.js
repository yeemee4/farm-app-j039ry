// ---- 데이터 상태 감시(저사양 기기): 기록 수 · 이 휴대폰 저장 용량(브라우저 한도 약 5MB) · 화면 그리기 시간 → 대표 설정에 표시, 주의면 하루 한 번 알림 ----
function health() {
  let kb = 0;
  try {
    kb = Math.round(((localStorage.getItem(KEY) || "").length * 2) / 1024);
  } catch (e) {} // 브라우저는 글자당 2바이트로 셈
  const ms = RT.length ? Math.round(RT.slice().sort((a, b) => a - b)[Math.floor(RT.length / 2)]) : 0,
    n = state.records.length;
  const warn = [
    kb > 3500 && t("저장 용량이 한도(약 5MB)에 가깝습니다"),
    ms > 700 && t("화면이 느려졌습니다"),
    n > 15000 && t("기록이 많습니다")
  ].filter(Boolean);
  return { n, kb, ms, warn };
}
function healthBox() {
  const H = health(),
    c = H.warn.length ? "var(--red)" : "var(--good)";
  return `<div class="sec-t">${t("데이터 상태")}</div><div class="panel"><div class="setrow"><span>${t("기록")}</span><b>${H.n.toLocaleString()}${t("건")}</b></div>
  <div class="setrow"><span>${t("이 휴대폰 저장 용량")}</span><b>${(H.kb / 1024).toFixed(1)}MB / ${t("약")} 5MB</b></div>
  <div class="setrow"><span>${t("화면 그리기")}</span><b>${H.ms}ms</b></div>
  <p class="sow-meta" style="color:${c}">${H.warn.length ? "⚠ " + H.warn.join(" · ") + " — " + t("오래된 기록 보관함을 검토할 때입니다") : t("정상입니다")}</p></div>`;
}
setTimeout(() => {
  try {
    const H = health(),
      k = KEY + "-healthwarn";
    if (H.warn.length && can("admin") && localStorage.getItem(k) !== TODAY) {
      localStorage.setItem(k, TODAY);
      toast("⚠ " + H.warn.join(" · ") + " · " + t("설정 › 데이터 상태"));
    }
  } catch (e) {}
}, 8000);
