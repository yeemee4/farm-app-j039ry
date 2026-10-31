/* ================= 예시 데이터 ================= */
function seed() {
  let r = 7;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const recs = [],
    sows = [],
    zero = {};
  const at = (date, late) => {
    const d = new Date(toUTC(late ? addDays(date, 1) : date));
    const t = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), ri(7, 16), ri(0, 59));
    const now = new Date();
    return (t > now ? now : t).toISOString();
  };
  const add = (type, workDate, data, late) => {
    if (workDate > TODAY) return null;
    const rec = { id: newId(), type, workDate, createdAt: at(workDate, late), user: WORKERS[ri(0, 3)], data };
    recs.push(rec);
    return rec;
  };
  const BCS = ["2.5", "3", "3", "3.5", "3"];
  // 특이 개체: p=이유 후 경과일, 각종 누락 상황
  const SP = {
    2: { p: 6, skipMate: 1 },
    3: { p: 9, skipMate: 1, loc: "분만사" },
    4: { p: 16, skipMate: 1 },
    12: { p: 42, skipCheck: 1 },
    30: { p: 113 },
    31: { p: 117 },
    33: { p: 123, skipFarrow: 1 },
    39: { p: 163, skipWean: 1 }
  };
  for (let i = 0; i < 40; i++) {
    const id = String(2150 + i),
      sp = SP[i] || {};
    const p = sp.p !== undefined ? sp.p : Math.floor((i * 147) / 40) + ri(0, 2);
    const W0 = addDays(TODAY, -p);
    let loc = "교배사";
    const sow = { id, baseParity: ri(0, 4), loc, breed: "LYD", intro: addDays(TODAY, -ri(400, 900)) };
    const prevF = addDays(W0, -25);
    add("분만", prevF, { sow: id, live: ri(10, 15), still: ri(0, 2), mum: ri(0, 1) });
    add("이유", W0, { sow: id, n: ri(9, 13), days: 25 });
    add("BCS", W0, { sow: id, score: BCS[ri(0, 4)], when: "이유 시" });
    add("백신", addDays(prevF, -21), { sow: id, kind: "백신", name: "PED" });
    if (!sp.skipMate) {
      const M = addDays(W0, 4);
      if (M <= TODAY) {
        add("교배", M, { sow: id, round: "1차", semen: "듀록 정액" }, i % 11 === 3);
        add("BCS", addDays(M, 60), { sow: id, score: BCS[ri(0, 4)], when: "임신 중" });
        const dsm = diff(M, TODAY);
        if (i % 13 === 6 && dsm >= 30) {
          add("임신확인", addDays(M, 21), { sow: id, result: "재발" });
        } else {
          if (dsm >= 30 && !sp.skipCheck) {
            add("임신확인", addDays(M, 30), { sow: id, result: "임신" });
            loc = "임신사";
          }
          add("백신", addDays(M, 86), { sow: id, kind: "백신", name: "PED" });
          add("백신", addDays(M, 100), { sow: id, kind: "백신", name: "대장균" });
          const F = addDays(M, CFG.gest);
          if (dsm >= 107 && !(i % 3 === 0 && dsm < CFG.gest)) loc = "분만사";
          if (F <= TODAY && !sp.skipFarrow) {
            add("분만", F, { sow: id, live: ri(10, 15), still: ri(0, 2), mum: ri(0, 1) });
            loc = "분만사";
            const W1 = addDays(F, 25);
            if (W1 <= TODAY && !sp.skipWean) {
              add("이유", W1, { sow: id, n: ri(9, 13), days: 25 });
              loc = "교배사";
            }
          }
        }
      }
    }
    if (sp.loc) loc = sp.loc;
    sow.loc = loc;
    sows.push(sow);
  }
  // 후보돈 4두: 최근 도입 2, 첫 교배 1, 도입 후 70일 교배 없음 1
  [
    ["G301", 10],
    ["G302", 10],
    ["G303", 40],
    ["G304", 70]
  ].forEach(([id, d], k) => {
    const intro = addDays(TODAY, -d);
    sows.push({ id, baseParity: 0, loc: "후보돈사", gilt: true, breed: "LYD", intro });
    add("도입", intro, { sow: id, breed: "LYD", age: 180 });
    if (k === 2) add("교배", addDays(TODAY, -19), { sow: id, round: "1차", semen: "듀록 정액" });
  });
  // 도태된 모돈 1두, 도태 계획 1두
  const cid = "2120";
  sows.push({ id: cid, baseParity: 6, loc: "교배사", breed: "LYD", intro: addDays(TODAY, -1300) });
  add("분만", addDays(TODAY, -80), { sow: cid, live: 8, still: 2, mum: 1 });
  add("이유", addDays(TODAY, -55), { sow: cid, n: 7, days: 25 });
  add("교배", addDays(TODAY, -50), { sow: cid, round: "1차", semen: "듀록 정액" });
  add("임신확인", addDays(TODAY, -29), { sow: cid, result: "재발" });
  add("도태", addDays(TODAY, -12), { sow: cid, reason: "번식장애(재발·공태)" });
  sows.find(s => s.id === "2169").cullPlan = { reason: "번식장애(재발·공태)", date: addDays(TODAY, 5) };
  // 돈군 기록
  for (let d = 27; d >= 0; d--) {
    const day = addDays(TODAY, -d);
    const deaths = d === 0 ? 1 : ri(0, 2);
    for (let k = 0; k < deaths; k++) {
      const b = BARNS[ri(3, 10)];
      const st = b.startsWith("분만")
        ? "포유자돈"
        : b.startsWith("자돈")
          ? "이유자돈"
          : b === "육성사"
            ? "육성돈"
            : "비육돈";
      const rec = add("폐사", day, { barn: b, stage: st, n: ri(1, 2), cause: CAUSES[ri(0, 6)] });
      if (rec && d > 2) rec.data.decision = "none";
    }
    if (d % 4 === 1)
      add("사료", day, {
        kind: ["포유모돈", "이유자돈 1단계", "비육 전기", "임신모돈"][ri(0, 3)],
        mode: "입고",
        kg: ri(4, 12) * 1000
      });
    if (d % 7 === 2)
      add("출하", day, { barn: "비육사 " + ri(1, 3) + "동", n: ri(18, 26), kg: ri(113, 119), dest: "○○도축장" });
    if (d % 7 === 3)
      add("이동", day, { from: "분만사 " + ri(1, 2) + "동", to: "자돈사 " + ri(1, 2) + "동", n: ri(90, 125) });
    if (d === 5)
      add("약품", day, {
        kind: "항생제",
        barn: "비육사 3동",
        name: "호흡기 항생제",
        qty: 2,
        withdraw: addDays(TODAY, 5)
      });
    if (d === 9) add("특이사항", day, { barn: "분만사 2동", text: "3번 보온등 교체" });
  }
  for (let d = 27; d >= 1; d--) {
    const day = addDays(TODAY, -d);
    zero[day] = {};
    DAILY.forEach(t => {
      if (!recs.some(x => x.type === t && x.workDate === day) && !(d === 1 && (t === "이동" || t === "사료")))
        zero[day][t] = true;
    });
  }
  const items = [
    ["i1", "호흡기 항생제", "항생제", "병", 10, 28],
    ["i2", "설사 항생제", "항생제", "병", 8, 21],
    ["i3", "생균제", "사료첨가제", "kg", 50, 0],
    ["i4", "축사 소독제", "소독제", "L", 40, 0],
    ["i5", "주사기", "비품", "박스", 5, 0],
    ["i6", "써코·마이코", "백신", "두분", 600, 0],
    ["i7", "돼지열병", "백신", "두분", 800, 0],
    ["i8", "구제역", "백신", "두분", 700, 0],
    ["i9", "PED", "백신", "두분", 60, 0],
    ["i10", "대장균", "백신", "두분", 60, 0],
    ["i11", "듀록 정액", "정액", "개", 20, 0]
  ].map(([id, name, cat, unit, par, withdraw]) => ({ id, name, cat, unit, par, withdraw }));
  const prevYear = {};
  const ty = +TODAY.slice(0, 4);
  for (let y = ty - 1; y <= ty; y++)
    for (let m = 1; m <= 12; m++) {
      if (y === ty && m > 4) break;
      const far = ri(9, 12);
      prevYear[`${y}-${pad(m)}`] = {
        far,
        mates: ri(10, 13),
        frate: ri(80, 88),
        tot: +(13 + rnd()).toFixed(1),
        live: +(12 + rnd()).toFixed(1),
        wean: +(10.8 + rnd()).toFixed(1),
        surv: ri(87, 92),
        psy: +(24 + rnd() * 3).toFixed(1),
        msy: +(20 + rnd() * 3).toFixed(1),
        dead: ri(25, 40),
        ship: ri(70, 90),
        shipKg: ri(114, 117)
      };
    }
  return {
    v: 3,
    user: "김OO",
    sows,
    records: recs,
    zero,
    todoLog: {},
    tasks: [],
    cfgSt: { ...CFG.st },
    items,
    prevYear,
    memo: {},
    assign: {},
    cfg: {
      stage: [
        ["분만사", 4],
        ["자돈사", 6],
        ["육성사", 6],
        ["비육사", 10]
      ],
      prog: [
        { name: "써코·마이코", prod: "써코·마이코", age: 3 },
        { name: "돼지열병 1차", prod: "돼지열병", age: 6 },
        { name: "구제역 1차", prod: "구제역", age: 8 },
        { name: "돼지열병 2차", prod: "돼지열병", age: 10 },
        { name: "구제역 2차", prod: "구제역", age: 12 }
      ],
      semenPerSow: 2
    }
  };
}
