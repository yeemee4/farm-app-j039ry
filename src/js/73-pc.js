/* ===== PC 화면 (설정 › 화면 배치 · 상단 📱/🖥 버튼, 이 기기에만 저장) =====
   넓은 화면 규칙은 build.py 의 pc_css 가 html[data-pc] 로 켜고 끔 */
const PC_MODES = [
  ["auto", "자동"],
  ["off", "휴대폰"],
  ["on", "PC"]
];
function pcMode() {
  try {
    return localStorage.getItem("farm-pc") || "auto";
  } catch (e) {
    return "auto";
  }
}
function isPC() {
  const m = pcMode();
  return m === "on" || (m === "auto" && innerWidth >= 1024);
}
function pcSet() {
  const m = pcMode();
  return `<div class="f"><span class="lb">${t("화면 배치")} <small class="sow-meta">${t("자동 = 창 너비에 맞춤")}</small></span><div class="chipwrap">${PC_MODES.map(([k, n]) => `<button type="button" class="chip wrap ${m === k ? "on" : ""}" data-a="pcMode" data-v="${k}">${t(n)}</button>`).join("")}</div></div>`;
}
Object.assign(A, {
  pcMode: v => {
    try {
      localStorage.setItem("farm-pc", v);
    } catch (e) {}
    render();
  },
  pcTog: () => A.pcMode(isPC() ? "off" : "on")
});
addEventListener("resize", () => {
  if (pcMode() === "auto") applySkin();
});
