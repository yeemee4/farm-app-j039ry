/* ================= 입장 키 (링크를 받은 사람만) ================= */
const GATE = "%GATE%";
async function sha(x) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, "0")).join("");
}
async function gateOK(raw) {
  try {
    if (localStorage.getItem("farm-gate") === GATE) return true;
  } catch (e) {}
  const src = raw !== undefined ? raw : location.hash,
    m =
      String(src).match(/key=([A-Za-z0-9]+)/) ||
      (raw !== undefined
        ? String(raw)
            .trim()
            .match(/^([A-Za-z0-9]{4,})$/)
        : null);
  if (m && (await sha(m[1])) === GATE) {
    try {
      localStorage.setItem("farm-gate", GATE);
    } catch (e) {}
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    return true;
  }
  return false;
}
function renderGate(err) {
  document.body.classList.add("login");
  $("#view").innerHTML =
    `<div class="login-box"><div class="login-brand"><img src="logo.png" alt="비담농장" class="login-logo"></div><div class="panel"><b>농장에서 받은 링크로만 열 수 있습니다.</b><div class="sow-meta">대표님께 받은 링크를 다시 눌러 주세요. 또는 대표님께 받은 입장 키를 아래에 입력하세요.</div><input type="text" id="gateIn" placeholder="입장 키 또는 받은 링크" inputmode="numeric" aria-label="받은 링크 또는 입장 키">${err ? `<div class="errbox">입장 키가 맞지 않습니다.</div>` : ""}<button class="save" type="button" id="gateBtn">열기</button></div></div>`;
  $("#gateBtn").onclick = async () => {
    if (await gateOK($("#gateIn").value)) {
      render();
    } else renderGate(true);
  };
}
