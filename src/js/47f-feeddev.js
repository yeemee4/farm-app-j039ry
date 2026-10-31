/* ===== 구간별 급여 점검: 실제 사용량(잔량 기록) vs 적정량(섭취량 기준표 × 두수, 학습 보정 없이) =====
   주문은 실제(학습 보정)를 따르고, 급여 판단은 적정량과 비교. 사료 = 주령 구간이라 사료별 편차가 곧 구간 편차.
   판정: ±10% 적정 · −10~−20% 부족 주의 · −20% 이하 부족 · +15% 이상 과다(허실 의심) */
const DEV_T = { warn: -0.1, bad: -0.2, over: 0.15 };
const FEED_ZONE = { 임신모돈: "교배사·임신사 모돈 (임신·공태)", 포유모돈: "분만사 포유 모돈" };
function feedZone(f) {
  if (FEED_ZONE[f]) return FEED_ZONE[f];
  const p = FARM.feed.piglet.find(x => x.feed === f);
  return p
    ? `${p.from}~${p.to > 500 ? "" : p.to - 1}${t("일령")}${p.note ? " · " + p.note.replace(/^[^·]*· ?/, "") : ""}`
    : "";
}
function devWin(f, a, b) {
  const O = feedObs(f).filter(o => o.d1 >= a && o.d2 <= b),
    act = O.reduce((s, o) => s + o.act, 0),
    pred = O.reduce((s, o) => s + o.pred, 0),
    days = O.reduce((s, o) => s + diff(o.d1, o.d2), 0);
  return days >= 3 && pred > 0 ? { act, pred, r: act / pred, days } : null;
}
function devJudge(r) {
  const d = r - 1;
  return d <= DEV_T.bad
    ? ["bad", "부족"]
    : d <= DEV_T.warn
      ? ["warn", "부족 주의"]
      : d >= DEV_T.over
        ? ["over", "과다"]
        : ["ok", "적정"];
}
function devTip(f, k) {
  const creep = ["특호", "1호"].includes(f);
  return k === "bad" || k === "warn"
    ? (creep
        ? t("입질사료는 조금씩 자주 · 급이판 청결 · 사료 신선도 확인 → 더 주세요")
        : t("급이기 막힘·급이 횟수·사료 상태·급수 확인 → 더 주세요")) +
        (k === "bad" ? " · " + t("건강 상태도 확인") : "")
    : k === "over"
      ? t("허실 확인(급이기 조절·흘림) · 이동·폐사 기록 누락 확인")
      : "";
}
// 최근 7일 = 마지막 잔량 기록일까지 7일 (기록이 끊겼으면 그 날짜를 보여줌)
const devEnd = f => {
  const O = feedObs(f);
  return O.length ? O[O.length - 1].d2 : TODAY;
};
function feedDevs() {
  return feedKinds().map(f => {
    const e = devEnd(f),
      w = devWin(f, addDays(e, -7), e);
    if (w) {
      w.end = e;
      w.stale = diff(e, TODAY);
    }
    if (!w) return { f, w: null };
    const [k, l] = devJudge(w.r);
    return { f, w, k, l };
  });
}
// 그 사료를 지금 먹는 돈군(주령별)
function devCohorts(f, r) {
  const I = fIntake(),
    out = [];
  liveBatches().forEach(b => {
    const age = diff(b.k, TODAY),
      fs = pigFeeds(age);
    if (!fs.some(p => p.feed === f)) return;
    const w = Math.floor(age / 7),
      n = bHeads(b, w),
      std = ((n * (I.pig[Math.min(I.pig.length - 1, w)] || 0)) / fs.length) * 7;
    out.push({ b, age, w, n, std, est: r ? std * r : null, barn: stagePlan(w) });
  });
  return out;
}
function devBar(r) {
  const p = Math.max(0, Math.min(1.6, r));
  return `<div class="dv-bar"><i style="width:${(p / 1.6) * 100}%" class="${devJudge(r)[0]}"></i><em style="left:${(1 / 1.6) * 100}%"></em></div>`;
}
function vFeedDev() {
  const D = feedDevs().filter(x => x.w);
  if (!D.length)
    return `<div class="sec-t">${t("구간별 급여 점검")}</div><div class="empty">${t("사료 잔량을 3일 이상 기록하면 적정량과 비교합니다.")}</div>`;
  return `<div class="sec-t">${t("구간별 급여 점검")} <span>${t("최근 7일 · 실제 ÷ 적정")}</span></div><div class="fplist">${D.map(x => `<button type="button" class="fp dv ${x.k}" data-a="chDetail" data-v="dev:${esc(x.f)}"><div class="fp-1"><b>${esc(x.f)}</b><small>${esc(feedZone(x.f))}</small><span><b class="dv-${x.k}">${x.r >= 1 ? "+" : ""}${Math.round((x.w.r - 1) * 100)}% · ${t(x.l)}</b></span></div>${devBar(x.w.r)}<div class="fp-3">${t("적정")} ${Math.round(x.w.pred).toLocaleString()}kg → ${t("실제")} <b>${Math.round(x.w.act).toLocaleString()}kg</b> (${kDate(addDays(x.w.end, -7)).replace(/\s*\(.*\)/, "")}~${kDate(x.w.end).replace(/\s*\(.*\)/, "")})${x.w.stale > 2 ? ` · <span class="dv-warn">${x.w.stale}${t("일 전 기록까지")}</span>` : ""}${devTip(x.f, x.k) ? `<br><span class="dv-tip">💡 ${devTip(x.f, x.k)}</span>` : ""}</div></button>`).join("")}</div><div class="note">${t("적정 = 섭취량 기준표 × 두수(학습 보정 없이). 주문은 실제 사용량을 따르므로 적게 먹어도 재고가 쌓이지 않게 맞춰집니다.")}</div>`;
}
function devTodos() {
  if (REF !== TODAY) return [{ k: "feeddev", t: "사료 급여 점검", items: [], act: null }];
  return [
    {
      k: "feeddev",
      t: "사료 급여 점검",
      items: feedDevs()
        .filter(x => x.w && x.k !== "ok")
        .map(x => ({
          fdv: x,
          label: `${feedZone(x.f)} · ${t("적정 대비")} ${x.w.r >= 1 ? "+" : ""}${Math.round((x.w.r - 1) * 100)}%`,
          sev: x.k === "bad" ? "bad" : "warn"
        })),
      act: null
    }
  ];
}
function devDetail(f) {
  const e = devEnd(f),
    W = [5, 4, 3, 2, 1, 0].map(i => {
      const b = addDays(e, -7 * i),
        a = addDays(b, -7);
      return { a, b, w: devWin(f, a, b) };
    }),
    r = (W[5].w || {}).r;
  return (
    linesSvg({
      title: "dev",
      labels: W.map(x => kDate(x.a).replace(/\s*\(.*\)/, "")),
      dp: 2,
      series: [{ l: t("실제"), v: W.map(x => (x.w ? x.w.r : null)), c: CC.a }],
      goals: [
        { l: "+15%", v: 1.15, c: "var(--amber)" },
        { l: t("적정"), v: 1, c: "var(--good)" },
        { l: "−10%", v: 0.9, c: "var(--amber)" }
      ]
    }) +
    `<div class="note">${esc(feedZone(f))}</div>` +
    cdTable(
      ["주", "적정 kg", "실제 kg", "차이", "판정"],
      W.slice()
        .reverse()
        .map(x =>
          x.w
            ? [
                kDate(x.a),
                Math.round(x.w.pred).toLocaleString(),
                Math.round(x.w.act).toLocaleString(),
                `${x.w.r >= 1 ? "+" : ""}${Math.round((x.w.r - 1) * 100)}%`,
                `<span class="dv-${devJudge(x.w.r)[0]}">${t(devJudge(x.w.r)[1])}</span>`
              ]
            : [kDate(x.a), "-", "-", "-", t("기록 부족")]
        )
    ) +
    (() => {
      const C = devCohorts(f, r);
      return C.length
        ? `<div class="sec-t">${t("이 사료를 먹는 돈군")} <span>${t("7일 적정 → 추정 실제")}</span></div>` +
            cdTable(
              ["돈군", "주령", "돈사", "두수", "적정 7일", "추정 실제"],
              C.map(c => [
                esc(bName(c.b.k)),
                `${c.w}${t("주령")} (${c.age}${t("일")})`,
                esc(t(c.barn)),
                c.n,
                `${Math.round(c.std).toLocaleString()}kg`,
                c.est != null ? `<b class="dv-${devJudge(r)[0]}">${Math.round(c.est).toLocaleString()}kg</b>` : "-"
              ])
            )
        : "";
    })()
  );
}
