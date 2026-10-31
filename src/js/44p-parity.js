/* ===== 산차 구성 (성적 그래프 · 현황판 칸 · 성적 TV · 누르면 상세) =====
   권장 비율(어린 축 후보~2산 / 중심 3~6산 / 노산 7산~)은 대표 설정 › 현황판 항목 */
const PAR_B = ["후보", "0", "1", "2", "3", "4", "5", "6", "7", "8+"];
const PAR_G0 = { young: 35, core: 50, old: 15 };
function parGoal() {
  return { ...PAR_G0, ...(state.parGoal || {}) };
}
const parGrp = b => (b === "후보" || +b <= 2 ? "young" : b === "7" || b === "8+" ? "old" : "core");
const PAR_C = { young: "var(--c-a)", core: "var(--good)", old: "var(--amber)" },
  PAR_N = { young: "후보~2산", core: "3~6산", old: "7산 이상" };
function parBucket(s) {
  const i = statusOf(s);
  if (i.key === "도태됨") return null;
  return i.gilt ? "후보" : i.parity >= 8 ? "8+" : String(i.parity);
}
function parityDist() {
  const c = Object.fromEntries(PAR_B.map(b => [b, []]));
  activeSows().forEach(s => {
    const b = parBucket(s);
    if (b) c[b].push(s);
  });
  const tot = PAR_B.reduce((a, b) => a + c[b].length, 0) || 1,
    g = { young: 0, core: 0, old: 0 };
  PAR_B.forEach(b => (g[parGrp(b)] += c[b].length));
  return { c, tot, g };
}
const parLab = b => (b === "후보" ? t("후보") : b + t("산"));
// 권장 대비 띠 (실제 / 권장)
function parBand(D) {
  const G = parGoal();
  return (
    `<div class="pband">${[
      ["실제", k => (D.g[k] / D.tot) * 100],
      ["권장", k => G[k]]
    ]
      .map(
        ([l, f]) =>
          `<div class="pb-r"><span>${t(l)}</span><div class="pb-t">${["young", "core", "old"].map(k => `<i style="width:${f(k)}%;background:${PAR_C[k]}" title="${t(PAR_N[k])} ${Math.round(f(k))}%">${f(k) >= 9 ? Math.round(f(k)) + "%" : ""}</i>`).join("")}</div></div>`
      )
      .join("")}</div>` + legendH(["young", "core", "old"].map(k => [PAR_C[k], t(PAR_N[k])]))
  );
}
function parBars(D, big) {
  const mx = Math.max(1, ...PAR_B.map(b => D.c[b].length));
  return `<div class="pbars${big ? " big" : ""}">${PAR_B.map(b => {
    const n = D.c[b].length;
    return `<div class="pbar" title="${parLab(b)} ${n}${t("두")} · ${Math.round((n / D.tot) * 100)}%"><b>${n}</b><div class="pb-c"><i style="height:${Math.max(n ? 3 : 0, (n / mx) * 100)}%;background:${PAR_C[parGrp(b)]}"></i></div><span>${b === "후보" ? t("후보") : b}</span></div>`;
  }).join("")}</div>`;
}
function parityCard() {
  const D = parityDist();
  return `<div class="card"><h3>${t("산차 구성")}<small>${D.tot}${t("두")} · ${t("막대 = 두수 · 아래 띠 = 권장 대비")}</small></h3>${parBars(D)}${parBand(D)}</div>`;
}
// 상세: 산차별 두수 · 평균 실산·이유 · 모돈 번호
function parityDetail() {
  const D = parityDist(),
    st = {};
  state.sows.forEach(s =>
    sowCycles(s.id).forEach(c => {
      const b = c.parity >= 8 ? "8+" : String(c.parity),
        o = (st[b] = st[b] || { n: 0, l: 0, wn: 0, w: 0 });
      o.n++;
      o.l += c.f.data.live || 0;
      if (c.w) {
        o.wn++;
        o.w += c.w.data.n || 0;
      }
    })
  );
  return (
    parBars(D, 1) +
    parBand(D) +
    cdTable(
      ["산차", "두수", "비율", "분만 기록", "평균 실산", "평균 이유", "모돈"],
      PAR_B.map(b => {
        const o = st[b];
        return [
          parLab(b),
          D.c[b].length,
          Math.round((D.c[b].length / D.tot) * 100) + "%",
          o ? o.n : "-",
          o ? f1(o.l / o.n) : "-",
          o && o.wn ? f1(o.w / o.wn) : "-",
          `<span class="pids">${D.c[b].map(s => s.id).join(", ")}</span>`
        ];
      })
    )
  );
}
function parGoalSet() {
  const G = parGoal();
  return `<div class="sec-t">${t("산차 구성 권장 비율")} <span>${t("합계")} ${G.young + G.core + G.old}%</span></div><div class="panel">${["young", "core", "old"].map(k => `<div class="setrow"><span>${t(PAR_N[k])}</span><div class="stepper"><button type="button" data-a="parG" data-v="${k}" data-k="-5" aria-label="−">−</button><input type="number" value="${G[k]}" readonly aria-label="${t(PAR_N[k])}"><button type="button" data-a="parG" data-v="${k}" data-k="5" aria-label="+">+</button></div></div>`).join("")}</div>`;
}
Object.assign(A, {
  parG: (v, el) => {
    const g = (state.parGoal = state.parGoal || {});
    g[v] = Math.max(0, Math.min(100, parGoal()[v] + Number(el.dataset.k)));
    save();
    render();
  }
});
