/* ================= v0.5 · 2차 교배 할 일 · 복별 처치 항목 · 돈사별 실사 · 급수량 ================= */
// 10. 어제(또는 그제) 1차 교배하고 2차가 없는 모돈 → 할 일
function mate2Todos() {
  const y1 = addDays(REF, -1),
    y2 = addDays(REF, -2),
    items = [];
  activeSows().forEach(s => {
    const rs = recsOf("교배").filter(r => r.data.sow === s.id && r.workDate >= y2 && r.workDate <= REF);
    const f = rs.find(r => r.data.round === "1차" && r.workDate < REF);
    if (f && !rs.some(r => r.data.round !== "1차" && r.workDate > f.workDate))
      items.push({
        s,
        i: statusOf(s),
        label: `1차 ${kDate(f.workDate)} · ${t("오늘 2차")}`,
        sev: f.workDate < y1 ? "bad" : "warn"
      });
  });
  return [{ k: "mate2", t: "2차 교배 (어제 1차)", items, act: "교배" }];
}
// 11. 복별 처치: 항목 칩 (누르면 메모가 바뀜)
const litTasks = name =>
  String(name)
    .split("·")
    .slice(1)
    .map(x => x.trim())
    .filter(Boolean);
function litChips(it, key) {
  const tasks = litTasks(it.name);
  return `<div class="chipwrap littask" data-k="${esc(key)}">${tasks.map(x => `<button type="button" class="chip wrap on" data-a="litTask" data-v="${esc(x)}">✓ ${esc(x)}</button>`).join("")}</div>`;
}
// 12. 돈사별 재고두수 실사
function barnEst() {
  const o = {},
    L2 = liveBatches();
  state.cfg.stage.forEach(([n]) => {
    o[n] = L2.filter(b => stagePlan(bAge(b)) === n).reduce((s, b) => s + bHeads(b, bAge(b)), 0);
  });
  return o;
}
function lastCount(barn) {
  return recsOf("실사")
    .filter(r => r.data.barn === barn)
    .sort((a, b) => b.workDate.localeCompare(a.workDate))[0];
}
function vCount() {
  const E = barnEst(),
    C = (ui.cnt = ui.cnt || {});
  let h = `<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="batch">‹ ${t("돈군")}</button><h2>${t("재고두수 실사")}</h2></div><div class="note">${t("돈사마다 실제로 센 두수를 넣으세요. 장부(기록으로 계산한 두수)와 차이가 성적 그래프에 나옵니다. 월 1회 권장.")}</div><div class="panel">`;
  Object.keys(E).forEach(b => {
    const v = C[b] !== undefined ? C[b] : E[b],
      lc = lastCount(b);
    h += `<div class="setrow"><span><b>${esc(t(b))}</b><br><small class="sow-meta">${t("장부")} ${E[b]}${t("두")}${lc ? ` · ${t("지난 실사")} ${kDate(lc.workDate)} ${lc.data.n}${t("두")}` : ""}</small></span><div class="stepper"><button type="button" data-a="cntN" data-v="${esc(b)}" data-k="-1">−</button><input type="number" inputmode="numeric" value="${v}" data-cnt="${esc(b)}" aria-label="${esc(b)}"><button type="button" data-a="cntN" data-v="${esc(b)}" data-k="1">+</button></div></div>`;
  });
  return h + `</div><button class="save" type="button" data-a="cntSave">${t("실사 저장")}</button>`;
}
// 성적 그래프: 장부 vs 실사 (가장 최근 실사)
function countChart() {
  const E = barnEst(),
    rows = Object.keys(E)
      .map(b => {
        const lc = lastCount(b);
        return lc ? { b, d: lc.data.n - lc.data.est, n: lc.data.n, est: lc.data.est, dt: lc.workDate } : null;
      })
      .filter(Boolean);
  if (!rows.length) return "";
  const mx = Math.max(1, ...rows.map(r => Math.abs(r.d)));
  return `<div class="hbars">${rows.map(r => `<div class="hb"><span class="hb-l">${esc(t(r.b))}</span><div class="hb-t" style="position:relative"><i style="position:absolute;left:50%;top:-3px;bottom:-3px;width:1.5px;background:var(--muted)"></i><div class="hb-f" style="position:absolute;height:100%;${r.d < 0 ? `right:50%;border-radius:4px 0 0 4px` : `left:50%`};width:${(Math.abs(r.d) / mx) * 50}%;background:${r.d < 0 ? "var(--red)" : "var(--c-a)"}" title="${esc(t(r.b))} ${t("실사")} ${r.n} / ${t("장부")} ${r.est}"></div></div><span class="hb-v">${r.d > 0 ? "+" : ""}${r.d}${t("두")}</span></div>`).join("")}</div><div class="note">${t("가운데 선 = 장부와 같음 · 왼쪽 빨강 = 실사가 적음(폐사 누락 의심)")}</div>`;
}
Object.assign(A, {
  litTask: (v, el) => {
    el.classList.toggle("on");
    el.textContent = (el.classList.contains("on") ? "✓ " : "") + v;
    const w = el.closest(".littask"),
      k = w.dataset.k,
      on = [...w.querySelectorAll(".chip.on")].map(b => b.textContent.replace("✓ ", ""));
    const m = [...document.querySelectorAll("[data-tdm]")].find(e => e.dataset.tdm === k);
    if (m) m.value = on.length ? on.join("·") + " " + t("완료") : "";
  },
  cntN: (v, el) => {
    const C = (ui.cnt = ui.cnt || {}),
      E = barnEst();
    C[v] = Math.max(0, (C[v] !== undefined ? C[v] : E[v]) + Number(el.dataset.k));
    keepScroll(render);
  },
  cntSave: () => {
    const E = barnEst(),
      C = ui.cnt || {};
    document.querySelectorAll("[data-cnt]").forEach(i => (C[i.dataset.cnt] = +i.value));
    const ids = Object.keys(E).map(
      b => addRecord("실사", TODAY, { barn: b, n: C[b] !== undefined ? C[b] : E[b], est: E[b] }).id
    );
    ui.cnt = null;
    save();
    go("batch");
    undoToast(t("재고두수 실사") + " " + t("저장했습니다"), ids);
  }
});
