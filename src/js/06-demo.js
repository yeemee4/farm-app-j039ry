/* ================= 시연용 가상 농장 ‘햇살농장’ (demo/ 빌드에서만, ENV="demo") =================
   국내 상위 10% 수준: 모돈 300두 · 주 13복 분만 · 실산 약 13 · 포유 폐사 약 7% · 분만율 약 90% · PSY 27~28 · MSY 24~25
   비담 설정(05) 위에 이 농장에 다른 값만 바꿔 씀. 예시 기록은 seedFarm 이 FARM.seed 로 만듦 */
const IS_DEMO = ENV === "demo";
if (IS_DEMO) {
  // 줄 n개 × 칸 m개 배치도(m 단위). vertical = 세로 줄
  const grid = (rows, per, vertical) => {
    const cw = 0.6, cd = 2.2, gap = 1.2, len = per * cw + 0.8, R = [];
    for (let i = 0; i < rows; i++) {
      const off = 0.4 + i * (cd + (i % 2 ? gap : 0.2)) + Math.floor(i / 2) * 0;
      R.push(vertical ? { id: "ABCDEFGH"[i], x: off, y: 0.4, n: per, cw, cd, v: 1, from: "bottom", head: i % 2 ? "left" : "right" }
                      : { id: "ABCDEFGH"[i], x: 0.4, y: off, n: per, cw, cd, from: "left", head: i % 2 ? "up" : "down" });
    }
    const span = 0.4 + rows * cd + Math.ceil(rows / 2) * gap + rows * 0.1;
    return vertical ? { sure: true, w: span, h: len + 1, rows: R, areas: [], doors: [{ x: span / 2, y: len + 1, dir: "up" }] }
                    : { sure: true, w: len + 1, h: span, rows: R, areas: [], doors: [{ x: 0, y: span / 2, dir: "right" }] };
  };
  Object.assign(FARM, {
    name: "햇살농장",
    place: "충남 홍성 (가상)",
    lat: 36.6,
    lon: 126.66,
    sowPrefix: "S-",
    confirm: [],
    goal: { psy: 28, msy: 25, npd: 30, fcr: 2.9, fcrB: 2.6 },
    weekGoal: { 교배: 15, 분만: 13, 이유: 13, 임신확인: 14 },
    layout: { 교배사: grid(4, 18), "임신사 1동": grid(4, 17, 1), "임신사 2동": grid(4, 17, 1), 분만사: grid(4, 25) },
    seed: { fw: 13, live: [11, 15], stillP: 0.3, mumP: 0.08, loss: 0.075, retP: 0.12, openP: 0.04, wmi: [4, 7], days: 395, takeover: false, forward: true, n: 300, cullPar: 7, cullP: 0.05,
      users: ["대표", "김민수 팀장", "Nguyen", "Ram", "Sokha"], pig: [0.012, 0.01, 0.01, 0.01], feedIn: 3.25,
      prev: { far: 16, frate: 88, live: 13, wean: 12, psy: 27, msy: 24, surv: 91 } },
    accounts: [
      { id: "a1", name: "대표", role: "admin", pin: "0000", lang: "ko", active: true },
      { id: "a2", name: "김민수 팀장", role: "leader", pin: "0000", lang: "ko", active: true },
      { id: "a3", name: "Nguyen", role: "worker", pin: "0000", lang: "vi", active: true },
      { id: "a4", name: "Ram", role: "worker", pin: "0000", lang: "ne", active: true },
      { id: "a5", name: "Sokha", role: "worker", pin: "0000", lang: "km", active: true }
    ]
  });
  FARM.feed.bins = [
    { name: "임신사 빈", feed: "임신모돈", spec: 12 },
    { name: "분만사 빈", feed: "포유모돈", spec: 10 },
    { name: "자돈사 빈", feed: "젖먹이", spec: 10 },
    { name: "비육사 빈", feed: "육성", spec: 20 }
  ];
  document.body.classList.add("env-demo");
}
