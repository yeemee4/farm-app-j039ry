/* ================= v0.3 · 우리 농장 초기값 ================= */
function baseState() {
  return {
    accounts: FARM.accounts || [
      { id: "a1", name: "대표", role: "admin", pin: "9368", lang: "ko", active: true },
      { id: "a2", name: "조성훈 팀장", role: "leader", pin: "1234", lang: "ko", active: true },
      { id: "a3", name: "Nguyen", role: "worker", pin: "1111", lang: "vi", active: true },
      { id: "a4", name: "Ram", role: "worker", pin: "2222", lang: "ne", active: true },
      { id: "a5", name: "Sokha", role: "worker", pin: "3333", lang: "km", active: true },
      { id: "a6", name: "Somchai", role: "worker", pin: "4444", lang: "th", active: true }
    ],
    labels: { nav: {}, quick: {}, hide: {} },
    dayDec: {},
    mbatches: [],
    cfg: {
      stage: FARM.stage.map(x => x.slice()),
      prog: FARM.vax.piglet.map(p => ({ ...p })),
      semenPerSow: FARM.semen.perSow,
      deadOne: 3,
      deadDay: 3
    }
  };
}
const ITEM_DEF = () =>
  FARM.items.map(([name, cat, unit, par, withdraw], i) => ({ id: "i" + (i + 1), name, cat, unit, par, withdraw }));
const FARM_LISTS = () => ({
  barns: mkList(FARM.barns),
  causes: mkList(["압사", "설사·소화기", "호흡기", "허약", "외상", "원인불명", "기타"]),
  actions: mkList([
    "보온 확인",
    "환기 점검",
    "전해질 급여",
    "초유·젖 확인",
    "격리",
    "소독",
    "분만틀·보온등 점검",
    "수의사 연락",
    "부검·시료 채취",
    "투약",
    "재확인"
  ]),
  semens: mkList(["듀록 정액", "요크셔 정액", "랜드레이스 정액", "자연교배"]),
  dests: mkList(["○○도축장", "△△공판장"]),
  cull: mkList(["번식장애(재발·공태)", "산자수 저조", "지제·다리 불량", "노산", "질병", "기타"])
});
// 예시 기록 만들기. 농장마다 다른 숫자는 FARM.seed(05·06) — 없으면 비담 값
const SEED0 = { fw: 4, live: [10, 14], stillP: 0.45, mumP: 0.15, loss: 0.06, retP: 0.12, openP: 0.05, bpMax: 5, wmi: [4, 8], days: 548, takeover: true, forward: false, n: 300, cullPar: 7, cullP: 0.06, users: ["대표", "조성훈 팀장", "Nguyen", "Ram", "Sokha", "Somchai"], pig: [0.02, 0.015, 0.015, 0.015], feedIn: 1, prev: { far: 16, frate: 84, live: 12, wean: 10.9, psy: 24, msy: 21, surv: 89 } };
function seedFarm() {
  const S = { ...SEED0, ...(FARM.seed || {}) },
    q = n => Math.max(1, Math.round((n * S.fw) / 4));   // 비담(주 4복) 기준 두수를 이 농장 규모로
  let r = 5;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647,
    ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)),
    pick = a => a[ri(0, a.length - 1)];
  const H0 = addDays(TODAY, -S.days),
    TAKE = addDays(TODAY, -14),
    G = CFG.gest,
    wk0 = weekStart(TODAY),
    recs = [],
    sows = [];
  const USERS = S.users;
  const at = wd => {
    const t0 = new Date(toUTC(wd));
    const t = new Date(t0.getUTCFullYear(), t0.getUTCMonth(), t0.getUTCDate(), ri(7, 17), ri(0, 59));
    const now = new Date();
    return (t > now ? new Date(now.getTime() - ri(5, 90) * 60e3) : t).toISOString();
  };
  const add = (type, wd, data) => {
    if (wd < H0 || wd > TODAY) return null;
    const x = { id: newId(), type, workDate: wd, createdAt: at(wd), user: pick(USERS), data };
    recs.push(x);
    return x;
  };
  const fBarn = d => "분만사";
  const deaths = {}; // "날짜|돈사|단계|원인" → 두수
  const dead = (wd, barn, stage, cause, n = 1) => {
    if (wd < H0 || wd > TODAY) return;
    const k = `${wd}|${barn}|${stage}|${cause}`;
    deaths[k] = (deaths[k] || 0) + n;
  };
  const litterDeaths = (F, lost, days) => {
    for (let i = 0; i < lost; i++) {
      const d = Math.min(days, Math.floor(rnd() * rnd() * days));
      const c = rnd();
      dead(
        addDays(F, d),
        fBarn(F),
        "포유자돈",
        c < 0.4 ? "압사" : c < 0.65 ? "허약" : c < 0.9 ? "설사·소화기" : "원인불명"
      );
    }
  };
  const farrow = (id, F, weanDays) => {
    const live = ri(S.live[0], S.live[1]);
    add("분만", F, { sow: id, live, still: rnd() < S.stillP ? ri(1, 2) : 0, mum: rnd() < S.mumP ? 1 : 0 });
    const lost = Math.max(0, Math.round(live * (S.loss + rnd() * S.loss)));
    if (weanDays !== null) {
      const W = addDays(F, weanDays);
      litterDeaths(F, lost, weanDays - 1);
      add("이유", W, { sow: id, n: live - lost, days: weanDays });
      add("BCS", W, { sow: id, score: pick(["2.5", "2.5", "3", "3", "3.5"]), when: "이유 시" });
    } else {
      const sofar = diff(F, TODAY);
      litterDeaths(F, Math.round(lost * Math.min(1, sofar / 26)), Math.max(0, sofar));
    }
    return live;
  };
  const mate = (id, M, ok = true) => {
    add("교배", M, { sow: id, round: "1차", semen: "듀록 정액" });
    add("교배", addDays(M, 1), { sow: id, round: "2차", semen: "듀록 정액" });
    if (ok) {
      if (diff(M, TODAY) >= 28) add("임신확인", addDays(M, 28), { sow: id, result: "임신" });
      FARM.vax.late.forEach(v =>
        add("백신", addDays(M, G - v.wk * 7 + ri(-1, 1)), { sow: id, kind: "백신", name: v.name })
      );
      if (diff(M, TODAY) >= 60)
        add("BCS", addDays(M, 60), { sow: id, score: pick(["3", "3", "3.5", "3.5", "4"]), when: "임신 중" });
    }
  };
  // 이전 생산 주기를 거꾸로 만든다 (M = 이번 주기 교배일)
  const cycleBack = (id, M) => {
    let m = M;
    for (let n = 0; n < 6; n++) {
      const W = addDays(m, -ri(S.wmi[0], S.wmi[1])),
        wd = ri(26, 28),
        F = addDays(W, -wd);
      if (F < addDays(H0, -40)) break;
      farrow(id, F, wd);
      let Mp = addDays(F, -G);
      if (rnd() < S.retP) {
        mate(id, addDays(Mp, -21), false);
        add("임신확인", Mp, { sow: id, result: "재발" });
        Mp = addDays(Mp, -21);
      } else if (rnd() < S.openP) {
        mate(id, addDays(Mp, -40), false);
        add("임신확인", addDays(Mp, -12), { sow: id, result: "공태" });
        Mp = addDays(Mp, -40);
      }
      mate(id, Mp, true);
      m = Mp;
      if (Mp < H0) break;
    }
  };
  let no = 1;
  const mk = loc => {
    const bp = ri(0, S.bpMax),
      id = FARM.sowPrefix + String(no++).padStart(3, "0");
    sows.push({ id, baseParity: bp, loc, breed: FARM.breed });
    return id;
  };
  // 앞으로 돌려 만들기(시연 농장 FARM.seed.forward): 300두를 과거부터 하루씩 교배→임신→분만→이유→재교배, 늙거나 탈난 모돈은 도태·후보돈으로 채움 → 달마다 성적이 고르게
  const simForward = () => {
    const L0 = addDays(H0, -260), cyc = G + 27 + 7, ev = [];   // [날짜, 모돈, 할 일]
    const st = {};   // 모돈별 산차·최근 일
    const push = (d, id, k) => {   // 날짜 순서를 지키며 끼워 넣기
      let i = ev.length;
      while (i > 0 && ev[i - 1][0] > d) i--;
      ev.splice(i, 0, [d, id, k]);
    };
    const newSow = (d, gilt) => {
      const id = mk("교배사");
      st[id] = { par: gilt ? 0 : ri(0, S.bpMax) };
      if (gilt) add("도입", d, { sow: id, breed: FARM.breed, kind: "후보돈" });
      return id;
    };
    for (let i = 0; i < S.n; i++) push(addDays(L0, Math.floor((i * cyc) / S.n)), newSow(L0, false), "mate");
    ev.sort((a, b) => a[0].localeCompare(b[0]));
    while (ev.length) {
      const [d, id, k] = ev.shift();
      if (d > TODAY) continue;
      const o = st[id];
      if (k === "mate") {
        const x = rnd();
        if (x < S.retP) { mate(id, d, false); add("임신확인", addDays(d, ri(19, 23)), { sow: id, result: "재발" }); push(addDays(d, ri(20, 23)), id, "mate") }
        else if (x < S.retP + S.openP) { mate(id, d, false); add("임신확인", addDays(d, 28), { sow: id, result: "공태" }); push(addDays(d, ri(38, 45)), id, "mate") }
        else { mate(id, d, true); push(addDays(d, G + ri(-1, 1)), id, "farrow") }
      } else if (k === "farrow") {
        const wd = ri(26, 28), W = addDays(d, wd);
        farrow(id, d, W <= TODAY ? wd : null);
        o.par++;
        if (W <= TODAY) push(W, id, "wean");
      } else if (k === "wean") {
        // 도태: 높은 산차·가끔 다른 사유 → 같은 날 후보돈 도입(약 3주 순치 후 교배)
        if ((o.par >= S.cullPar && rnd() < 0.6) || rnd() < S.cullP) {
          add("도태", addDays(d, ri(1, 5)), { sow: id, reason: o.par >= S.cullPar ? "고산차" : pick(["번식 장애", "지제", "산자수 낮음"]) });
          push(addDays(d, ri(18, 26)), newSow(d, true), "mate");
        } else push(addDays(d, ri(S.wmi[0], S.wmi[1])), id, "mate");
      }
    }
    // 산차: 기록 시작 전 분만은 baseParity 로 · 지금 있는 곳(배치도·모돈 탭): 오늘 상태로
    sows.forEach(s => {
      s.baseParity = st[s.id].par - recs.filter(r => r.type === "분만" && r.data.sow === s.id).length;
      const R = recs.filter(r => r.data && r.data.sow === s.id).sort((a, b) => a.workDate.localeCompare(b.workDate)), last = R[R.length - 1];
      if (!last) return;
      const g = diff(last.workDate, TODAY);
      s.loc = last.type === "분만" ? "분만사" : last.type === "이유" ? "교배사" : last.type === "교배" && g >= 100 ? "분만사" : last.type === "교배" && g >= 28 ? (g < 65 ? "임신사 1동" : "임신사 2동") : last.type === "임신확인" && R.filter(r => r.type === "교배").pop() && diff(R.filter(r => r.type === "교배").pop().workDate, TODAY) >= 28 ? (diff(R.filter(r => r.type === "교배").pop().workDate, TODAY) < 65 ? "임신사 1동" : diff(R.filter(r => r.type === "교배").pop().workDate, TODAY) >= 100 ? "분만사" : "임신사 2동") : "교배사";
    });
  };
  if (S.forward) simForward();
  else {
    // 분만사 30 = 분만 대기 8 + 포유 16 + 이유 직후 2 + 분만사에서 교배 4
    for (let k = 0; k < q(8); k++) {
      const id = mk("분만사"),
        M = addDays(TODAY, -(100 + Math.round((k * 13) / (q(8) - 1)) + ri(0, 1)));
      mate(id, M);
      cycleBack(id, M);
    }
    for (let w = 0; w < 4; w++)
      for (let k = 0; k < S.fw; k++) {
        const back = diff(wk0, TODAY);
        const F = addDays(wk0, -7 * w + (w === 0 ? ri(0, back) : ri(0, 6)));
        if (F > TODAY) continue;
        const id = mk("분만사"),
          M = addDays(F, -G);
        mate(id, M);
        farrow(id, F, null);
        cycleBack(id, M);
      }
    for (let k = 0; k < q(2); k++) {
      const id = mk("분만사"),
        W = addDays(TODAY, -ri(0, 2)),
        F = addDays(W, -28),
        M = addDays(F, -G);
      mate(id, M);
      farrow(id, F, 28);
      cycleBack(id, M);
    }
    for (let k = 0; k < q(4); k++) {
      const id = mk("분만사"),
        M = addDays(TODAY, -(3 + Math.round((k * 20) / q(4)) + ri(0, 2)));
      mate(id, M, false);
      cycleBack(id, M);
    }
    // 임신사 40 (교배 30~99일)
    for (let w = 0; w < 10; w++)
      for (let k = 0; k < S.fw; k++) {
        const id = mk(w < 5 ? "임신사 1동" : "임신사 2동"),
          M = addDays(TODAY, -(30 + 7 * w + Math.round((k * 7) / S.fw)));
        mate(id, M);
        cycleBack(id, M);
      }
    // 교배사 22 = 이유 후 대기 3 + 교배 후 확인 전 15 + 재발 3 + 공태 1
    for (let k = 0; k < q(3); k++) {
      const id = mk("교배사"),
        W = addDays(TODAY, -(2 + (k % 3))),
        F = addDays(W, -28),
        M = addDays(F, -G);
      mate(id, M);
      farrow(id, F, 28);
      cycleBack(id, M);
    }
    for (let k = 0; k < q(15); k++) {
      const id = mk("교배사"),
        M = addDays(TODAY, -Math.round((k * 25) / q(15)));
      mate(id, M, false);
      cycleBack(id, M);
    }
    for (let k = 0; k < q(4); k++) {
      const id = mk("교배사"),
        M = addDays(TODAY, -ri(26, 40));
      mate(id, M, false);
      add("임신확인", addDays(M, ri(19, 24)), { sow: id, result: k < q(3) ? "재발" : "공태" });
      cycleBack(id, M);
    }
  }
  // 이유 날짜가 미래가 되지 않게 · 확인 전 모돈의 미래 백신 제거
  for (let i = recs.length - 1; i >= 0; i--) if (recs[i].workDate > TODAY) recs.splice(i, 1);
  // 돈군: 분만 주차별로 이동 · 폐사 · 출하. W33 이전 돈군은 전 주인 시절(정상 출하 → 인수 때 일괄 판매)
  const cut = addDays(wk0, -7 * 11),
    SH = 26;
  const byW = {};
  recs
    .filter(x => x.type === "분만")
    .forEach(f => {
      const k = weekStart(f.workDate);
      (byW[k] = byW[k] || []).push(f);
    });
  const bulk = {};
  Object.keys(byW)
    .sort()
    .forEach(k => {
      const wn = recs.filter(
        x =>
          x.type === "이유" &&
          byW[k].some(f => f.data.sow === x.data.sow && x.workDate > f.workDate && diff(f.workDate, x.workDate) <= 30)
      );
      let n = wn.reduce((s, x) => s + x.data.n, 0);
      if (!n) return;
      const old = !S.takeover || k < cut,
        ship = addDays(k, SH * 7 + ri(0, 4)),
        end = old ? (ship <= TAKE ? ship : TAKE) : TODAY;
      const fb = "육성비육사";
      const phase = [
        [28, 42, "인큐베이터", "이유자돈", S.pig[0], ["설사·소화기", "설사·소화기", "허약", "원인불명"]],
        [42, 70, "자돈사", "이유자돈", S.pig[1], ["설사·소화기", "호흡기", "허약", "원인불명"]],
        [70, 112, "군사방", "육성돈", S.pig[2], ["호흡기", "호흡기", "외상", "원인불명"]],
        [112, SH * 7, fb, "비육돈", S.pig[3], ["호흡기", "외상", "원인불명", "기타"]]
      ];
      let from = fBarn(k);
      for (const [a, b, barn, stage, rate, causes] of phase) {
        const mv = addDays(k, a + ri(0, 1));
        if (mv > end) break;
        add("이동", mv, { from, to: barn, n });
        from = barn;
        const nl = Math.round(n * (rate * 0.7 + rnd() * rate * 0.6));
        for (let q = 0; q < nl; q++) {
          const d = addDays(k, ri(a + 1, b - 1));
          if (d < end) {
            dead(d, barn, stage, pick(causes));
            n--;
          }
        }
      }
      if (!old) return;
      if (!S.takeover && ship > TODAY) return;   // 계속 키우는 농장: 아직 출하 전
      if (ship <= TAKE)
        add("출하", ship, { barn: fb, n, kg: ri(113, 119), dest: rnd() < 0.8 ? "○○도축장" : "△△공판장" });
      else {
        const age = diff(k, TAKE),
          bb = age < 42 ? "인큐베이터" : age < 70 ? "자돈사" : age < 112 ? "군사방" : fb;
        bulk[bb] = bulk[bb] || { n: 0, w: 0 };
        bulk[bb].n += n;
        bulk[bb].w += n * Math.max(25, Math.round(age * 0.62));
      }
    });
  // 계속 키우는 농장: 기록 시작 전에 태어난 돈군도 기간 안에 출하(성적 MSY 가 앞쪽 몇 달 비지 않게)
  if (!S.takeover) {
    const wean = ((S.live[0] + S.live[1]) / 2) * (1 - 1.5 * S.loss),
      surv = S.pig.reduce((x, r) => x * (1 - r), 1);
    for (let k = addDays(weekStart(H0), -SH * 7); k < weekStart(H0); k = addDays(k, 7)) {
      const ship = addDays(k, SH * 7 + ri(0, 4));
      if (ship >= H0 && ship <= TODAY) add("출하", ship, { barn: "육성비육사", n: Math.round(S.fw * wean * surv * (0.95 + rnd() * 0.1)), kg: ri(113, 119), dest: rnd() < 0.8 ? "○○도축장" : "△△공판장" });
    }
  }
  Object.entries(bulk).forEach(([barn, v]) =>
    add("출하", TAKE, { barn, n: v.n, kg: Math.round(v.w / v.n), dest: "△△공판장 (인수 시 일괄 판매)", bulk: true })
  );
  if (S.takeover) add("특이사항", TAKE, {
    barn: "육성비육사",
    text: "농장 인수 · 전 주인이 육성·비육돈 일괄 판매. 육성비육사 비어 있음"
  });
  // 폐사 기록 (같은 날·돈사·단계·원인은 한 건으로)
  Object.entries(deaths).forEach(([k, n]) => {
    const [wd, barn, stage, cause] = k.split("|");
    add("폐사", wd, { barn, stage, n, cause });
  });
  // 사료 입고 · 약품
  const FK = [...FARM.feed.bins.map(b => [b.feed, 3000 * S.feedIn, 7000 * S.feedIn]), ...FARM.feed.bags.map(b => [b.feed, 200 * S.feedIn, 600 * S.feedIn])];
  for (let d = S.days; d >= 11; d -= ri(2, 4)) {
    const f = pick(FK);
    add("사료", addDays(TODAY, -d), { kind: f[0], mode: "입고", kg: Math.round(ri(f[1], f[2]) / 100) * 100 });
  }
  [
    [60, "설사 항생제", "분만사"],
    [38, "호흡기 항생제", "자돈사"],
    [17, "설사 항생제", "인큐베이터"]
  ].forEach(([d, name, barn]) =>
    add("약품", addDays(TODAY, -d), { kind: "항생제", name, barn, qty: ri(1, 2), withdraw: addDays(TODAY, -d + 21) })
  );
  const B = baseState();
  const prevYear = {};
  for (let y = +H0.slice(0, 4) - 1; y <= +H0.slice(0, 4); y++)
    for (let m = 1; m <= 12; m++) {
      if (`${y}-${pad(m)}` >= H0.slice(0, 7)) break;
      const P = S.prev,
        far = ri(q(P.far), q(P.far + 2));
      prevYear[`${y}-${pad(m)}`] = {
        far,
        mates: ri(q(P.far + 2), q(P.far + 4)),
        frate: ri(P.frate, P.frate + 5),
        tot: +(P.live + 1.2 + rnd() * 0.8).toFixed(1),
        live: +(P.live + rnd() * 0.8).toFixed(1),
        wean: +(P.wean + rnd() * 0.7).toFixed(1),
        surv: ri(P.surv, P.surv + 3),
        psy: +(P.psy + rnd() * 2).toFixed(1),
        msy: +(P.msy + rnd() * 2).toFixed(1),
        dead: ri(q(60), q(90)),
        ship: ri(q(160), q(190)),
        shipKg: ri(115, 118)
      };
    }
  return {
    v: 7,
    user: "대표",
    sows,
    records: recs,
    zero: {},
    todoLog: {},
    tasks: [],
    cfgSt: { ...CFG.st },
    items: ITEM_DEF(),
    prevYear,
    memo: {},
    assign: {},
    lists: FARM_LISTS(),
    startDate: H0,
    batchCut: cut,
    takeover: TAKE,
    ...B,
    mbatches: [4, 5, 6, 7, 8, 9, 10, 11].map(w => ({
      k: addDays(wk0, -7 * w),
      age: w,
      n: 50,
      litters: 4,
      note: "인수 시 실사"
    }))
  };
}
function seedFarmPost() {
  const USERS = ["대표", "조성훈 팀장", "Nguyen", "Ram"];
  let u = 0;
  const at = wd => new Date(toUTC(wd) + (9 + (u % 6)) * 36e5).toISOString();
  // 지난 돈군 백신 (이번 주 예정분은 남겨 둠)
  batches()
    .filter(b => b.k >= addDays(state.startDate, -40))
    .forEach(b =>
      state.cfg.prog.forEach(p => {
        const due = addDays(b.k, p.day),
          end = b.k < state.batchCut ? state.takeover : TODAY;
        if (due >= weekStart(TODAY) || due > end || due < state.startDate) return;
        const wd = addDays(due, 2);
        state.records.push({
          id: newId(),
          type: "돈군백신",
          workDate: wd,
          createdAt: at(wd),
          user: USERS[u++ % 4],
          data: { batch: b.k, vax: p.name, prod: p.prod, n: bVax(b, p).need }
        });
      })
    );
  // 복별 처치: 어제까지 할 것은 체크 완료로
  activeSows().forEach(s => {
    const i = statusOf(s);
    if (i.stage !== "포유") return;
    FARM.vax.litter.forEach(v => {
      const on = addDays(i.farrow, v.day);
      if (on < TODAY)
        state.todoLog[tdKey("lit", `${s.id}|${i.farrow}|${v.day}`)] = {
          memo: "",
          user: USERS[u++ % 4],
          at: at(on),
          rec: null
        };
    });
  });
  // 지난 폐사는 판단 완료로
  state.records.forEach(x => {
    if (x.type === "폐사" && x.workDate < TODAY && x.data.n >= state.cfg.deadOne) x.data.decision = "none";
  });
  const g = {};
  recsOf("폐사")
    .filter(x => x.workDate < TODAY)
    .forEach(x => {
      const k = x.workDate + "|" + x.data.barn;
      g[k] = (g[k] || 0) + x.data.n;
    });
  Object.entries(g).forEach(([k, n]) => {
    if (n >= state.cfg.deadDay)
      state.dayDec[k] = { decision: "none", total: n, at: new Date().toISOString(), user: "조성훈 팀장" };
  });
  // 매일 마감: 기록 없는 항목은 ‘오늘 없음’
  const has = new Set(state.records.map(x => x.type + "|" + x.workDate));
  for (let d = addDays(TODAY, -1); d >= state.startDate; d = addDays(d, -1)) {
    DAILY.forEach(t2 => {
      if (!has.has(t2 + "|" + d)) (state.zero[d] = state.zero[d] || {})[t2] = true;
    });
  }
  // 재고: 30일 전 실사 + 입고
  const q = {},
    d30 = addDays(TODAY, -30),
    d12 = addDays(TODAY, -12);
  state.items.forEach((it, i) => {
    q[it.id] = Math.round(it.par * (i % 5 === 3 ? 0.9 : 1.6 + (i % 3) * 0.4)) + (it.cat === "백신" ? it.par : 0);
    state.records.push({
      id: newId(),
      type: "재고",
      workDate: d30,
      createdAt: at(d30),
      user: "대표",
      data: { item: it.id, mode: "실사", qty: q[it.id] }
    });
  });
  [
    [itemId("FMD(구제역)"), 200],
    [itemId("마이코·글레서"), 200],
    [itemId("듀록 정액"), 40],
    [itemId("대장균+TR"), 40]
  ].forEach(([id, qty]) =>
    state.records.push({
      id: newId(),
      type: "재고",
      workDate: d12,
      createdAt: at(d12),
      user: "조성훈 팀장",
      data: { item: id, mode: "입고", qty }
    })
  );
  // 사료: 10일 전 잔량 + 이후 입고 (2호·임신모돈은 주문 시점이 되게)
  const fu = feedUse(),
    d10 = addDays(TODAY, -10),
    d5 = addDays(TODAY, -5);
  feedKinds().forEach((f, i) => {
    const use = fu[f] || 0;
    if (!use) return;
    const low = f === "2호" || f === "임신모돈";
    state.records.push({
      id: newId(),
      type: "사료",
      workDate: d10,
      createdAt: at(d10),
      user: "조성훈 팀장",
      data: { kind: f, mode: "빈 잔량", kg: Math.max(100, Math.round((use * (low ? 13 : 9 + (i % 4))) / 10) * 10) }
    });
    if (!low)
      state.records.push({
        id: newId(),
        type: "사료",
        workDate: d5,
        createdAt: at(d5),
        user: "조성훈 팀장",
        data: { kind: f, mode: "입고", kg: Math.max(200, Math.round((use * 10) / 100) * 100) }
      });
  });
  // 사료 학습용: 10일 전 잔량 앞으로 35일 동안 매일 아침 잔량(일요일 빼고)과 입고. 실제 사용 = 모델 × 사료별 숨은 배율 × 하루 흔들림
  {
    const d45 = addDays(TODAY, -46);
    state.records = state.records.filter(
      r => !(r.type === "사료" && r.data.mode === "입고" && r.workDate >= d45 && r.workDate < d10)
    );
    const raw = feedPlanDays0(37, d45),
      TF = {
        임신모돈: 1.06,
        포유모돈: 0.93,
        젖먹이: 0.78,
        육성: 0.97,
        특호: 1.35,
        "1호": 1.25,
        "2호": 1.15,
        "3호": 1.08
      };
    let seedN = 7;
    const rnd = () => {
      seedN = (seedN * 9301 + 49297) % 233280;
      return seedN / 233280;
    };
    feedKinds().forEach(f => {
      const r10 = recsOf("사료").find(r => r.data.kind === f && r.workDate === d10 && r.data.mode === "빈 잔량");
      if (!r10) return;
      const bin = feedBin(f),
        bag = feedBag(f),
        hi = bin ? bin.cap * 0.95 : Math.max(400, (fu[f] || 1) * 30),
        lo = bin ? bin.cap * 0.25 : (fu[f] || 1) * 6;
      let S = r10.data.kg;
      for (let k = 1; k <= 35; k++) {
        const d = addDays(d10, -k),
          x = raw.find(z => z.d === d),
          use = ((x && x.u[f]) || 0) * (TF[f] || 1) * (1 + (rnd() - 0.5) * 0.12);
        let c = S + use;
        if (c > hi) {
          const q = bag ? Math.round((c - lo) / bag.kg) * bag.kg : Math.round((c - lo) / 500) * 500;
          state.records.push({
            id: newId(),
            type: "사료",
            workDate: addDays(d, 1),
            createdAt: new Date(toUTC(addDays(d, 1)) + 7 * 36e5).toISOString(),
            user: "조성훈 팀장",
            data: { kind: f, mode: "입고", kg: q }
          });
          c -= q;
        }
        S = c;
        if (dow(d) !== 0)
          state.records.push({
            id: newId(),
            type: "사료",
            workDate: d,
            createdAt: new Date(toUTC(d) + 8.5 * 36e5).toISOString(),
            user: "조성훈 팀장",
            data: {
              kind: f,
              mode: "빈 잔량",
              kg: Math.max(0, Math.round(S + (bin ? (rnd() - 0.5) * bin.cap * 0.02 : 0)))
            }
          });
      }
    });
  }
  // 오늘 아침 점검: 앞의 5곳 완료, 분만사 보온등 이상
  state.am = { [TODAY]: {} };
  // 지난 7일 아침 점검 (급수량 평균용)
  for (let i = 1; i <= 7; i++) {
    const d = addDays(TODAY, -i);
    state.am[d] = {};
    FARM.morning.route.forEach((r, n) => {
      state.am[d][r.barn] = {
        time: "07:20",
        temp: String((r.temp[0] + r.temp[1]) / 2),
        water: String((2 + n * 0.6 + ((i * 7 + n) % 5) * 0.1).toFixed(1)),
        bad: [],
        memo: "",
        user: "조성훈 팀장",
        at: at(d)
      };
    });
  }
  FARM.morning.route.slice(0, 5).forEach((r, n) => {
    state.am[TODAY][r.barn] = {
      time: `07:${pad(10 + n * 9)}`,
      temp: String((r.temp[0] + r.temp[1]) / 2 + (n === 3 ? -3 : 0)),
      bad: n === 3 ? ["보온등"] : [],
      memo: n === 3 ? "보온등 1개 나감 → 교체 예정" : "",
      user: "조성훈 팀장",
      at: at(TODAY)
    };
  });
  // 육성비육사 첫 입식 준비 할 일
  const oldest = liveBatches().slice(-1)[0],
    now = new Date().toISOString();
  if (oldest) {
    const fin = addDays(oldest.k, state.cfg.stage.slice(0, -1).reduce((a, x) => a + x[1], 0) * 7);
    state.tasks.push({
      id: newId(),
      src: null,
      title: "육성비육사 청소·소독·급이·급수 점검 (첫 입식 준비)",
      acts: ["소독", "환기 점검"],
      due: addDays(fin, -3),
      who: "조성훈 팀장",
      memo: `첫 입식 ${kDate(fin)} 주 · 육성비육사 비어 있음`,
      createdAt: now,
      user: "대표"
    });
  }

  // 사료 빈 잔량 예시에 양쪽 게이지(기울기)
  try {
    const R = recsOf("사료").filter(r => r.data.mode === "빈 잔량" && r.data.lL == null);
    FARM.feed.bins.forEach((b, bi) => {
      let td = [0.06, -0.05, 0.08, -0.04][bi % 4];
      R.filter(r => r.data.kind === b.feed).forEach(r => {
        td = Math.max(-0.1, Math.min(0.1, td + (Math.random() - 0.5) * 0.03));
        const tv = Math.max(0, Math.min(b.cap, r.data.kg)) / 1000 / binDens(b),
          f = m => binVol(b, Math.max(0, Math.min(1, m - td)), Math.max(0, Math.min(1, m + td)));
        let a = -0.2,
          c = 1.2;
        for (let k = 0; k < 22; k++) {
          const m = (a + c) / 2;
          f(m) < tv ? (a = m) : (c = m);
        }
        const m = (a + c) / 2;
        r.data.lL = +Math.max(0, Math.min(1, m - td)).toFixed(3);
        r.data.lR = +Math.max(0, Math.min(1, m + td)).toFixed(3);
        r.data.gauge = "잔량";
      });
    });
  } catch (e) {}
  save();
}
function upgradeDemo(st) {
  const B = baseState();
  Object.assign(st, {
    v: 7,
    lists: {
      barns: mkList([
        "교배사",
        "임신사 1동",
        "임신사 2동",
        "분만사 1동",
        "분만사 2동",
        "자돈사 1동",
        "자돈사 2동",
        "육성사",
        "비육사 1동",
        "비육사 2동",
        "비육사 3동"
      ]),
      causes: FARM_LISTS().causes,
      actions: FARM_LISTS().actions,
      semens: FARM_LISTS().semens,
      dests: FARM_LISTS().dests,
      cull: FARM_LISTS().cull
    },
    startDate: addDays(TODAY, -60),
    accounts: B.accounts,
    labels: B.labels,
    dayDec: {},
    mbatches: []
  });
  st.cfg.deadOne = 3;
  st.cfg.deadDay = 3;
  return st;
}
function makeState(kind, keep) {
  if (kind === "farm") {
    state = seedFarm();
    syncLists();
    seedFarmPost();
  } else if (kind === "demo") {
    const L0 = BARNS.slice();
    BARNS.length = 0;
    [
      "교배사",
      "임신사 1동",
      "임신사 2동",
      "분만사 1동",
      "분만사 2동",
      "자돈사 1동",
      "자돈사 2동",
      "육성사",
      "비육사 1동",
      "비육사 2동",
      "비육사 3동"
    ].forEach(x => BARNS.push(x));
    state = upgradeDemo(seed());
    seedPost();
  } else {
    const k = keep;
    state = {
      v: 7,
      user: k.user,
      sows: [],
      records: [],
      zero: {},
      todoLog: {},
      tasks: [],
      cfgSt: k.cfgSt,
      items: k.items,
      prevYear: {},
      memo: {},
      assign: {},
      lists: k.lists,
      startDate: TODAY,
      accounts: k.accounts,
      labels: k.labels,
      dayDec: {},
      mbatches: [],
      cfg: k.cfg
    };
  }
  syncLists();
  save();
}
