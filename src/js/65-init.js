/* ===== 설정 › 초기 입력 (대표, 2026-11-01 대표 선택: 앱 안에서 차례로) =====
   앱이 모으는 시작 자료를 한 화면씩 순서대로: 계정 → 모돈 → 돈군 → 사료 → 재고 → 지난 성적 → 목표 → 기준값 → 확인 필요.
   각 단계는 있던 설정 화면을 그대로 불러 씀(새로 만든 것은 '재고 시작 수량' 칸뿐). 단계 = ui.initStep, ✓ = 그 자료가 있음 */
const INIT_STEPS = [
  ["acc", "계정", "함께 쓰는 사람의 이름·언어·PIN을 맞추세요. 안 쓰는 예시 계정은 지웁니다."],
  ["sow", "모돈", "모돈 번호와 지금 상태를 넣습니다. 현장 카드가 있으면 📋 초기 등록이 가장 정확합니다."],
  ["batch", "돈군", "지금 있는 자돈·육성돈 무리를 태어난 주와 두수로 넣습니다."],
  ["feed", "사료", "사료 빈 4개 게이지와 포대 수를 넣습니다. 남은 일수·주문일 계산이 여기서 시작합니다."],
  ["stock", "재고", "약품·백신·주사침·정액의 지금 수량을 넣습니다. 빈칸은 건너뜁니다."],
  ["past", "지난 성적", "앱을 쓰기 전 달별 성적(한돈팜스·장부)을 넣으면 성적 비교에 쓰입니다. 없으면 건너뛰세요."],
  ["goal", "목표", "현황판 주간 목표와 성적 목표(그래프 점선)를 정합니다."],
  ["crit", "기준값", "돈사별 머무는 주 수, 백신 프로그램, 정액을 확인합니다."],
  ["confirm", "확인 필요", "아직 임시 값인 것들입니다. 알려 주시면 고칩니다."]
];
function initDone(k) {
  if (k === "acc") return (state.accounts || []).filter(a => a.active).length > 1;
  if (k === "sow") return state.sows.length > 0;
  if (k === "batch") return liveBatches().length > 0;
  if (k === "feed") return recsOf("사료").length > 0;
  if (k === "stock") return recsOf("재고").some(r => r.data.mode === "실사");
  if (k === "past") return Object.keys(state.prevYear || {}).length > 0;
  if (k === "goal") return !!(state.sgoal || (state.dash && state.dash.goal));
  if (k === "confirm") return !FARM.confirm.length;
  return true;
}
// 재고 시작 수량: 품목마다 지금 수량 → '재고' 실사 기록
function initStock() {
  return `<div class="panel">${state.items
    .map(it => {
      const s = stockOf(it);
      return `<div class="setrow"><span>${esc(it.name)} <small class="sow-meta">${s.qty === null ? "" : `${t("지금")} ${s.qty}${esc(it.unit)}`}</small></span><span class="row2" style="gap:6px;flex:none;align-items:center"><input type="number" inputmode="decimal" data-ist="${it.id}" style="width:90px" aria-label="${esc(it.name)}"><small>${esc(it.unit)}</small></span></div>`;
    })
    .join(
      ""
    )}</div><button class="act pri" type="button" data-a="initStock" style="width:100%;padding:14px">${t("수량 저장")}</button>`;
}
function initBody(k) {
  if (k === "acc") return vAccounts();
  if (k === "sow") return "";
  if (k === "batch") return vBatchInit();
  if (k === "feed")
    return `<div class="acts"><button class="act pri" type="button" data-a="tab" data-v="feedchk" style="flex:1;padding:14px">${t("사료 잔량 입력")} ›</button></div>`;
  if (k === "stock") return initStock();
  if (k === "past") {
    if (!ui.pyf) ui.pyf = { ym: addDays(TODAY.slice(0, 7) + "-01", -1).slice(0, 7) };
    return prevYearForm();
  }
  if (k === "goal") return dashGoalSet();
  if (k === "crit") return vCriteria();
  return FARM.confirm.length
    ? `<div class="panel">${FARM.confirm.map(x => `<div class="setrow"><span>${esc(x)}</span></div>`).join("")}</div>`
    : `<div class="empty">${t("확인할 것이 없습니다.")}</div>`;
}
function vInit() {
  // 처음엔 고르는 메뉴(대표 요청: 모돈 정보 입력, 돈군 정보 입력 … 중 고름) → 고른 화면 하나
  if (ui.initStep == null || ui.initStep < 0)
    return `<div class="pagehd"><button class="back" type="button" data-a="setPage" data-v="main">‹ ${t("설정")}</button><h2>${t("초기 입력")}</h2></div><div class="note">${t("넣을 것을 고르세요. 넣은 것은 ✓ 표시됩니다.")}</div><div class="more">${INIT_STEPS.map(
      ([k, l, d], i) =>
        `<button class="mitem" type="button" data-a="${k === "sow" ? "initSow" : "initGo"}" data-v="${i}"><span class="su-n ${initDone(k) ? "ok" : ""}">${initDone(k) ? "✓" : i + 1}</span><span><b>${t(l)}</b><small>${t(d)}</small></span><span>›</span></button>`
    ).join("")}</div>`;
  const n = Math.min(Math.max(ui.initStep || 0, 0), INIT_STEPS.length - 1),
    [k, ti, d] = INIT_STEPS[n];
  let h = `<div class="pagehd"><button class="back" type="button" data-a="initGo" data-v="-1">‹ ${t("초기 입력")}</button><h2>${t(ti)}</h2></div>`;
  h += `<div class="sec-t">${n + 1}. ${t(ti)} ${initDone(k) ? `<span style="color:var(--accent)">✓</span>` : ""}</div><div class="note">${t(d)}</div>`;
  h += initBody(k);
  if (!["stock", "past"].includes(k))
    h += `<div class="note">${t("이 화면은 바꾸는 즉시 저장됩니다.")}</div><button class="act pri" type="button" data-a="initGo" data-v="-1" style="width:100%;padding:14px">${t("저장하고 돌아가기")}</button>`;
  return h;
}
// 재고·지난 성적 칸에 쓰고 저장 안 한 채 나가면 묻기
document.addEventListener("input", e => {
  if (e.target.dataset && (e.target.dataset.ist || e.target.dataset.py)) ui.initDirty = true;
});
Object.assign(A, {
  initGo: v => {
    if (ui.initDirty && confirm(t("저장하지 않은 내용이 있습니다. 저장할까요?"))) {
      if (document.querySelector("[data-ist]")) A.initStock();
      else if (document.querySelector("[data-py]")) A.pySave();
    }
    ui.initDirty = false;
    ui.initStep = +v;
    ui.pyf = null;
    render();
    window.scrollTo(0, 0);
  },
  initSow: () => {
    tab = "sows";
    A.sowAdd();
  },
  initStock: () => {
    let n = 0;
    document.querySelectorAll("[data-ist]").forEach(e => {
      if (e.value === "") return;
      addRecord("재고", TODAY, { item: e.dataset.ist, mode: "실사", qty: +e.value });
      n++;
    });
    if (!n) return toast(t("넣은 수량이 없습니다"));
    ui.initDirty = false;
    save();
    render();
    toast(`${n}${t("개 품목 수량을 저장했습니다")}`);
  }
});
