/* ================= 번식 탭: 번식 사이클 한 화면 (위 = 오늘 할 일, 아래 = 목표·성적) =================
   사이클 띠(단계별 두수, 누르면 그 단계 목록) · 오늘 번식 할 일 묶음 · 다음 2주 일정 · 이번 주 목표 · 최근 90일 성적 */
const BR_STAGES = [
  ["후보", "후보돈"],
  ["발정대기", "발정 대기"],
  ["재발공태", "재발·공태"],
  ["확인전", "교배·확인 전"],
  ["임신", "임신"],
  ["분만임박", "분만 임박"],
  ["포유", "포유"]
];
const BR_TODO = ["regumate", "regu", "mate2", "mate", "remate", "ret", "movein", "farrow", "wean", "order"];
const BR_EV = ["교배", "임신확인", "분만", "이유"];
// 최근 90일 성적: 첫 교배(같은 발정 3일 안은 하나) → 결과(임신·재발·공태·유산) · 재귀일수 · 정액별
function breedStats(days = 90) {
  const from = addDays(TODAY, -days),
    R = [...state.records].sort((a, b) => a.workDate.localeCompare(b.workDate)),
    by = {};
  R.forEach(r => {
    const s = r.data && r.data.sow;
    if (s && BR_EV.concat("임신확인").includes(r.type)) (by[s] = by[s] || []).push(r);
  });
  const M = [],
    ret = [];
  let lv = 0,
    nf = 0;
  Object.values(by).forEach(L => {
    let last = null,
      lastW = null;
    L.forEach(r => {
      if (r.type === "이유") lastW = r.workDate;
      if (r.type === "교배") {
        if (last && diff(last.d, r.workDate) <= 3) return;
        last = { d: r.workDate, semen: r.data.semen || "-", res: null };
        if (r.workDate >= from && diff(r.workDate, TODAY) >= 25) M.push(last);
        if (lastW && r.workDate >= from && diff(lastW, r.workDate) <= 60) ret.push(diff(lastW, r.workDate));
        lastW = null;
      } else if (r.type === "임신확인" && last && !last.res) last.res = r.data.result === "임신" ? "임신" : "사고";
      else if (r.type === "분만" && last) {
        if (!last.res) last.res = "임신";
        if (r.workDate >= from) {
          lv += +r.data.live || 0;
          nf++;
        }
      }
    });
  });
  const done = M.filter(m => m.res),
    ok = done.filter(m => m.res === "임신").length,
    sem = {};
  done.forEach(m => {
    const o = (sem[m.semen] = sem[m.semen] || { n: 0, ok: 0 });
    o.n++;
    if (m.res === "임신") o.ok++;
  });
  console.assert(ok <= done.length && done.length <= M.length, "breedStats");
  return {
    n: done.length,
    rate: done.length ? (ok / done.length) * 100 : null,
    ret: ret.length ? ret.reduce((a, b) => a + b, 0) / ret.length : null,
    live: nf ? lv / nf : null,
    sem
  };
}
function vBreed() {
  const S = activeSows().map(s => [s, statusOf(s)]),
    cnt = k => S.filter(([, i]) => i.key === k).length,
    sel = ui.brStage || "";
  let h = `<div class="pagehd"><h2>${t("번식")}</h2></div>`;
  // 1. 사이클 띠
  h += `<div class="br-cycle"><button type="button" class="${sel === "동기화" ? "on" : ""}" data-a="brStage" data-v="동기화"><b>${reguSows().size}</b><span>${t("동기화 중")}</span></button>${BR_STAGES.map(([k, l]) => `<button type="button" class="${sel === k ? "on" : ""}" data-a="brStage" data-v="${k}"><b>${cnt(k)}</b><span>${t(l)}</span></button>`).join("")}</div>`;
  // 2. 고른 단계의 모돈
  if (sel) {
    const L = S.filter(([s, i]) => (sel === "동기화" ? reguSows().has(s.id) : i.key === sel));
    h += `<div class="sec-t">${t((BR_STAGES.find(x => x[0] === sel) || [])[1] || (sel === "동기화" ? "동기화 중" : sel))} <span>${L.length}${t("두")} · <button type="button" class="linkbtn" data-a="brStage" data-v="">${t("닫기")}</button></span></div><div class="sowtiles">${L.map(([s, i]) => sowTile(s, i)).join("") || `<div class="empty">${t("없음")}</div>`}</div>`;
  }
  // 3. 오늘 번식 할 일
  const td = buildTodos().filter(x => BR_TODO.includes(x.k) && x.items.length);
  h +=
    vRegu() +
    `<div class="sec-t">${t("오늘 번식 할 일")} <span>${td.reduce((s, x) => s + bLeft(x), 0)}${t("묶음")}</span></div>`;
  h += td.length
    ? `<div class="todolist">${td.map(todoBtn).join("")}</div>`
    : `<div class="empty">${t("오늘 번식 할 일이 없습니다.")}</div>`;
  // 4. 다음 2주 일정 (번식만)
  const { ev } = calEvents(),
    days = Object.keys(ev)
      .filter(d => d >= TODAY)
      .sort()
      .map(d => [d, ev[d].filter(([k]) => BR_EV.includes(k))])
      .filter(x => x[1].length);
  h += `<div class="sec-t">${t("다음 2주 일정")} <span><button type="button" class="linkbtn" data-a="tab" data-v="cal">${t("주간 달력")} ›</button></span></div><div class="panel br-days">${
    days
      .map(([d, E]) => {
        const c = {};
        E.forEach(([k]) => (c[k] = (c[k] || 0) + 1));
        return `<div class="setrow"><span><b>${kDate(d)}</b></span><span class="sow-meta">${Object.entries(c)
          .map(([k, n]) => `${t(L(k))} ${n}`)
          .join(" · ")}</span></div>`;
      })
      .join("") || `<div class="empty">${t("없음")}</div>`
  }</div>`;
  // 5. 이번 주 목표 (현황판 카드와 같은 그림)
  h += `<div class="sec-t">${t("이번 주 목표")}</div><div class="panel">${DASH_P.breed()[2]}</div>`;
  // 6. 최근 90일 성적
  const B = breedStats(),
    f1 = v => (v == null ? "-" : v.toFixed(1));
  h += `<div class="sec-t">${t("번식 성적")} <span>${t("최근 90일")}</span></div><div class="kv kv4">
    <div><small>${t("수태율")}</small><b>${B.rate == null ? "-" : Math.round(B.rate) + "%"}</b><small>${B.n}${t("복 판정")}</small></div>
    <div><small>${t("재귀 일수")}</small><b>${f1(B.ret)}${t("일")}</b><small>${t("이유 → 교배")}</small></div>
    <div><small>${t("복당 실산")}</small><b>${f1(B.live)}</b><small>${t("두")}</small></div>
    <div><small>${t("재발·공태")}</small><b>${cnt("재발공태")}</b><small>${t("지금")}</small></div></div>`;
  const sem = Object.entries(B.sem).sort((a, b) => b[1].n - a[1].n);
  if (sem.length)
    h += `<div class="panel">${sem.map(([k, o]) => `<div class="setrow"><span>${esc(k)}</span><span><b>${Math.round((o.ok / o.n) * 100)}%</b> <small class="sow-meta">${o.ok}/${o.n}${t("복")}</small></span></div>`).join("")}</div>`;
  return h;
}
Object.assign(A, {
  brStage: v => {
    ui.brStage = ui.brStage === v ? "" : v;
    render();
  }
});
// 들어가는 곳: 더보기 · 모돈 탭 위 · 현황판 ‘이번 주 번식’

// ---- 발정동기화 (레규메이트): 묶음 시작(동기화 기록 1건) → 18일 매일 정한 시각·양 급여 확인(레규급여) → 끝난 뒤 4~7일 발정 예상 ----
const REGU0 = { days: 18, ml: 5, at: "08:00", from: 4, to: 7, late: 60 }; // 1두 mL · 급여 시각 · 발정 예상(끝난 다음 날부터 4~7일) · 시각 허용(분)
const reguCfg = () => ({ ...REGU0, ...(state.regu || {}) });
const reguFeeds = id => recsOf("레규급여").filter(r => r.data.batch === id);
function reguBatches() {
  return recsOf("동기화")
    .slice()
    .map(r => {
      const d = r.data,
        end = addDays(d.start, d.days - 1),
        day = diff(d.start, TODAY) + 1,
        F = reguFeeds(r.id),
        fed = new Set(F.map(x => x.workDate));
      const miss = [];
      for (let k = 0; k < Math.min(day - 1, d.days); k++) {
        const x = addDays(d.start, k);
        if (!fed.has(x)) miss.push(x);
      }
      const off = F.filter(x => x.data.off || x.data.ml !== d.ml).length;
      return {
        r,
        d,
        end,
        day,
        on: day >= 1 && day <= d.days,
        todayFed: fed.has(TODAY),
        miss,
        off,
        est: [addDays(end, 1 + reguCfg().from - 1), addDays(end, 1 + reguCfg().to - 1)]
      };
    })
    .filter(b => b.day <= b.d.days + reguCfg().to + 1);
}
function reguSows() {
  const s = new Set();
  reguBatches()
    .filter(b => b.on)
    .forEach(b => b.d.sows.forEach(x => s.add(x)));
  return s;
}
// 할 일: 오늘 아직 안 먹인 동기화 묶음 (꼭 할 일)
function reguTodos() {
  let it = [];
  try {
    it = reguBatches()
      .filter(b => b.on && !b.todayFed)
      .map(b => ({
        rg: b.r.id,
        label: `${b.day}/${b.d.days}${t("일째")} · ${b.d.sows.length}${t("두")} · ${t("1두")} ${b.d.ml}mL · ${b.d.at}${b.miss.length ? ` · ${t("빠진 날")} ${b.miss.length}${t("일")}` : ""}`,
        sev: b.miss.length || nowHM() > addMin(b.d.at, reguCfg().late) ? "bad" : "warn"
      }));
  } catch (e) {}
  return [{ k: "regu", t: "레규메이트 급여 (발정동기화)", items: it, act: null }];
}
function addMin(hm, m) {
  const [h, mm] = hm.split(":").map(Number),
    x = h * 60 + mm + m;
  return `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}
function vRegu() {
  const B = reguBatches(),
    C = reguCfg();
  let h = `<div class="sec-t">${t("발정동기화 (레규메이트)")} <span><button type="button" class="linkbtn" data-a="reguNew">+ ${t("동기화 시작")}</button></span></div>`;
  if (ui.reguNew) {
    const N = ui.reguNew,
      cand = activeSows().filter(
        s => ["후보", "발정대기", "재발공태"].includes(statusOf(s).key) && !reguSows().has(s.id)
      );
    h += `<div class="panel"><div class="f"><span class="lb">${t("대상")} (${N.sows.length}${t("두")})</span><div class="chipwrap">${cand.map(s => `<button type="button" class="chip wrap ${N.sows.includes(s.id) ? "on" : ""}" data-a="reguPick" data-v="${s.id}">${s.id} <small>${t(statusOf(s).label)}</small></button>`).join("") || `<span class="sow-meta">${t("후보돈·발정 대기·재발 모돈이 없습니다")}</span>`}</div></div>
      <div class="f"><label for="rgStart">${t("시작일 (1일째)")}</label><input type="date" id="rgStart" value="${esc(N.start)}"></div>
      <div class="setrow"><span>${t("1두 급여량")} (mL)</span><input type="number" id="rgMl" value="${N.ml}" min="1" step="0.5" style="width:90px"></div>
      <div class="setrow"><span>${t("매일 급여 시각")}</span><input type="time" id="rgAt" value="${esc(N.at)}"></div>
      <div class="note">${t("끝나는 날")}: ${kDate(addDays(N.start, C.days - 1))} · ${t("발정 예상")}: ${kDate(addDays(N.start, C.days - 1 + C.from))} ~ ${kDate(addDays(N.start, C.days - 1 + C.to))}</div>
      <div class="acts"><button class="act pri" type="button" data-a="reguSave" ${N.sows.length ? "" : "disabled"}>${t("시작")}</button><button class="act" type="button" data-a="reguNew">${t("취소")}</button></div></div>`;
  }
  h += B.length
    ? B.map(b => {
        const pct = Math.min(100, Math.max(0, (b.day / b.d.days) * 100)),
          st = b.on
            ? `${b.day}/${b.d.days}${t("일째")}`
            : b.day > b.d.days
              ? `${t("투여 끝")} · ${t("발정 예상")} ${sd(b.est[0])}~${sd(b.est[1])}`
              : `${t("시작 전")}`;
        return `<div class="panel rg-b"><div class="setrow"><span><b>${kDate(b.d.start)} ${t("시작")}</b> · ${b.d.sows.length}${t("두")} · ${b.d.ml}mL · ${b.d.at}</span><span>${b.on ? (b.todayFed ? `<span style="color:var(--good)">✓ ${t("오늘 급여")}</span>` : `<button class="act pri" type="button" data-a="reguFeed" data-v="${b.r.id}">${t("급여 완료")}</button>`) : ""}</span></div>
      <div class="prog-bar"><i style="width:${pct}%"></i></div><div class="sow-meta">${st} · ${t("끝나는 날")} ${kDate(b.end)}${b.miss.length ? ` · <b style="color:var(--red)">${t("빠진 날")} ${b.miss.map(x => kDate(x).replace(/\s*\(.*\)/, "")).join(", ")}</b>` : ""}${b.off ? ` · <b style="color:var(--amber)">${t("시각·양 벗어남")} ${b.off}${t("회")}</b>` : ""}</div>
      <div class="sow-meta">${b.d.sows.join(", ")}</div></div>`;
      }).join("")
    : `<div class="note">${t("진행 중인 동기화 그룹이 없습니다. 후보돈 여러 두를 한 번에 발정 오게 할 때 씁니다.")}</div>`;
  const MT = { mateAm: "08:00", matePm: "17:00", ...(state.regu || {}) },
    done = reguGroups()
      .filter(g => addDays(g.data.start, g.data.days - 1) < TODAY && g.data.start >= addDays(TODAY, -365))
      .sort((a, b) => b.data.start.localeCompare(a.data.start));
  if (done.length)
    h += `<div class="sec-t">${t("끝난 동기화 그룹")} <span>${t("최근 1년")}</span></div><div class="panel">${done
      .map(g => {
        const s = reguSummary(g);
        return `<div class="setrow" style="flex-wrap:wrap"><span><b>${kDate(g.data.start)} ${t("시작")}</b> · ${s.n}${t("두")}</span><span class="sow-meta">${t("교배")} ${s.mated}${t("두")} · ${t("임신")} ${s.preg}/${s.checked || "-"}${s.checked ? ` (${Math.round((s.preg / s.checked) * 100)}%)` : ""} · ${t("분만")} ${s.farrow}${t("복")}${s.live != null ? ` · ${t("복당 실산")} ${s.live.toFixed(1)}` : ""}${s.miss || s.off ? ` · <b style="color:var(--amber)">⚠ ${t("급여 빠진 날")} ${s.miss}${t("일")}${s.off ? ` · ${t("벗어남")} ${s.off}${t("회")}` : ""}</b>` : ""}</span></div>`;
      })
      .join("")}</div>`;
  if (can("admin"))
    h += `<div class="setrow"><span>${t("정시 교배 시각")} (${t("4·5일째")})</span><span class="row2" style="gap:6px;flex:none"><input type="time" value="${MT.mateAm}" data-rgset="mateAm"><input type="time" value="${MT.matePm}" data-rgset="matePm"></span></div>`;
  return h;
}
Object.assign(A, {
  reguNew: () => {
    ui.reguNew = ui.reguNew ? null : { sows: [], start: TODAY, ml: reguCfg().ml, at: reguCfg().at };
    render();
  },
  reguPick: v => {
    const L2 = ui.reguNew.sows,
      i = L2.indexOf(v);
    i < 0 ? L2.push(v) : L2.splice(i, 1);
    render();
  },
  reguSave: () => {
    const N = ui.reguNew,
      start = $("#rgStart").value || TODAY,
      ml = +$("#rgMl").value || reguCfg().ml,
      at = $("#rgAt").value || reguCfg().at;
    if (!N.sows.length) return;
    state.regu = { ...(state.regu || {}), ml, at };
    addRecord("동기화", start, { sows: N.sows.slice(), start, ml, at, days: reguCfg().days });
    ui.reguNew = null;
    save();
    render();
    toast(`${t("발정동기화 시작")} · ${N.sows.length}${t("두")}`);
  },
  reguFeed: v => {
    const b = reguBatches().find(x => x.r.id === v);
    if (!b) return;
    const now = nowHM(),
      late = Math.abs(diff0(now, b.d.at)) > reguCfg().late;
    const ml = prompt(
      `${b.d.sows.length}${t("두")} · ${t("1두 급여량")} (mL)${late ? `\n⚠ ${t("정한 시각")} ${b.d.at} · ${t("지금")} ${now}` : ""}`,
      String(b.d.ml)
    );
    if (ml === null) return;
    const m = +ml;
    if (!(m > 0)) {
      toast(t("양을 숫자로 넣어 주세요"));
      return;
    }
    addRecord("레규급여", TODAY, {
      batch: v,
      day: b.day,
      ml: m,
      time: now,
      n: b.d.sows.length,
      off: late || m !== b.d.ml
    });
    closeSheet();
    render();
    toast(
      `${t("레규메이트 급여")} ${b.day}/${b.d.days}${t("일째")} ✓${late || m !== b.d.ml ? " · " + t("시각·양 벗어남 기록") : ""}`
    );
  }
});
function diff0(a, b) {
  const f = x => {
    const [h, m] = x.split(":").map(Number);
    return h * 60 + m;
  };
  return f(a) - f(b);
}
// 할 일 시트·이름
// 기록 글귀
// 번식 탭에 넣기: 사이클 띠 맨 앞 ‘동기화 중’ + 아래 칸

// ---- 정시 교배: 투약 끝 다음 날 = 1일, 4·5일째 오전·오후 4회 (시각은 대표 설정, 1팩 = 2회분 → 1두 2팩) ----
function reguMating(d) {
  const C = { mateAm: "08:00", matePm: "17:00", mateDay: 4, ...(state.regu || {}) },
    end = addDays(d.start, d.days - 1),
    d1 = addDays(end, C.mateDay),
    d2 = addDays(d1, 1);
  return [
    [d1, C.mateAm],
    [d1, C.matePm],
    [d2, C.mateAm],
    [d2, C.matePm]
  ].map(([date, time], i) => ({ n: i + 1, date, time }));
}
// 급여 늦음 알림 단계: 정한 시각에서 1·4·8·11시간 지나면 1·2·3·4 (먹였으면 0). 서버 Code.gs 의 REGU_STEPS 와 같은 규칙
const REGU_STEPS = [60, 240, 480, 660];
function reguAlertStage(at, now, fed) {
  if (fed) return 0;
  const late = diff0(now, at);
  return REGU_STEPS.filter(m => late >= m).length;
}
// 끝난 동기화 그룹 성적: 교배(투약 끝 뒤 1~10일) · 그 뒤 임신확인 · 분만 · 복당 실산 · 급여 빠진 날·벗어남
function reguSummary(g) {
  const d = g.data,
    end = addDays(d.start, d.days - 1),
    win = [addDays(end, 1), addDays(end, 10)],
    F = reguFeeds(g.id),
    fed = new Set(F.map(x => x.workDate)),
    R = state.records;
  let mated = 0,
    checked = 0,
    preg = 0,
    farrow = 0,
    live = 0;
  d.sows.forEach(s => {
    const m = R.find(r => r.type === "교배" && r.data.sow === s && r.workDate >= win[0] && r.workDate <= win[1]);
    if (!m) return;
    mated++;
    const c = R.filter(r => r.type === "임신확인" && r.data.sow === s && r.workDate > m.workDate).sort((a, b) =>
      a.workDate.localeCompare(b.workDate)
    )[0];
    if (c) {
      checked++;
      if (c.data.result === "임신") preg++;
    }
    const f = R.find(
      r =>
        r.type === "분만" &&
        r.data.sow === s &&
        diff(m.workDate, r.workDate) >= 105 &&
        diff(m.workDate, r.workDate) <= 125
    );
    if (f) {
      farrow++;
      live += +f.data.live || 0;
    }
  });
  let miss = 0;
  for (let k = 0; k < d.days; k++) if (addDays(d.start, k) < TODAY && !fed.has(addDays(d.start, k))) miss++;
  return {
    n: d.sows.length,
    mated,
    checked,
    preg,
    farrow,
    live: farrow ? live / farrow : null,
    miss,
    off: F.filter(x => x.data.off).length
  };
}

// ---- 화면 연결: 정시 교배 할 일 · (레규) 표시 · 정액 주문 · 급여 늦음 빨간 띠 · 끝난 그룹 성적 · 교배 시각 설정 ----
function reguGroups() {
  return recsOf("동기화").slice();
}
// 오늘 할 정시 교배 회차(아직 기록 안 한 것)
function reguMateDue() {
  const out = [];
  reguGroups().forEach(g =>
    reguMating(g.data).forEach(m => {
      if (m.date !== TODAY) return;
      const done = recsOf("교배").some(r => r.data.rg === g.id && r.data.session === m.n);
      if (!done) out.push({ g, m });
    })
  );
  return out;
}
function reguMateTodos() {
  let it = [];
  try {
    it = reguMateDue().map(({ g, m }) => ({
      rgm: g.id + "|" + m.n,
      label: `${t("동기화 그룹 교배")} (${t("레규")}) ${m.n}/4${t("회")} · ${g.data.sows.length}${t("두")} · ${m.time}`,
      sev: nowHM() >= m.time ? "bad" : "warn"
    }));
  } catch (e) {}
  return [{ k: "regumate", t: "정시 교배 (레규 동기화 그룹)", items: it, act: null }];
}
// 기존 교배 대상에도 보이되, 정시 교배 날(4·5일째) 앞뒤의 같은 모돈이면 (레규)
function reguMateSows() {
  const s = new Set();
  reguGroups().forEach(g => {
    const M = reguMating(g.data);
    if (TODAY >= addDays(M[0].date, -3) && TODAY <= M[3].date) g.data.sows.forEach(x => s.add(x));
  });
  return s;
}
// 정액: 정시 교배 첫날 전날, 그 그룹 두수도 내일 교배 예정에 더함 (1두 2팩 = 4회분)
function reguMateTomorrow() {
  const tmr = addDays(TODAY, 1);
  let add = 0;
  reguGroups().forEach(g => {
    if (reguMating(g.data)[0].date === tmr) add += g.data.sows.length;
  });
  return add;
}
// 정시 교배 기록: 그룹 모돈 칩(빠진 모돈은 눌러서 빼기) → 회차(1차~4차)로 한 번에
function reguMateSheet(id) {
  const [gid, n] = id.split("|"),
    g = reguGroups().find(x => x.id === gid);
  if (!g) return;
  ui.rgm = ui.rgm && ui.rgm.id === id ? ui.rgm : { id, skip: [] };
  const S = ui.rgm.skip,
    M = reguMating(g.data)[+n - 1];
  $("#sheetRoot").innerHTML =
    `<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="sh-hd"><h2>${t("정시 교배")} (${t("레규")}) ${n}/4${t("회")} · ${M.time}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">
    <div class="note">${t("이번에 교배하지 않은 모돈만 눌러서 빼세요.")}</div><div class="chipwrap">${g.data.sows.map(s => `<button type="button" class="chip wrap ${S.includes(s) ? "" : "on"}" data-a="rgmSkip" data-v="${s}">${s}</button>`).join("")}</div>
    <div class="acts"><button class="act pri" type="button" data-a="rgmSave">${g.data.sows.length - S.length}${t("두")} ${t("교배 기록")}</button></div></div></div></div>`;
}
Object.assign(A, {
  rgmOpen: v => reguMateSheet(v),
  rgmSkip: v => {
    const S = ui.rgm.skip,
      i = S.indexOf(v);
    i < 0 ? S.push(v) : S.splice(i, 1);
    reguMateSheet(ui.rgm.id);
  },
  rgmSave: () => {
    const [gid, n] = ui.rgm.id.split("|"),
      g = reguGroups().find(x => x.id === gid);
    const L2 = g.data.sows.filter(s => !ui.rgm.skip.includes(s));
    L2.forEach(s => addRecord("교배", TODAY, { sow: s, round: n + "차", semen: SEMENS[0], rg: gid, session: +n }));
    ui.rgm = null;
    closeSheet();
    save();
    render();
    toast(`${t("정시 교배")} ${n}/4${t("회")} · ${L2.length}${t("두")} ✓`);
  }
});
// 급여 늦음: 모든 화면 맨 위 빨간 띠 (1시간 지나면)
AFTER_RENDER.push(() => {
  let b = $("#reguBand");
  const late = me()
    ? reguBatches()
        .filter(x => x.on && !x.todayFed)
        .map(x => [x, reguAlertStage(x.d.at, nowHM(), false)])
        .filter(x => x[1] > 0)
    : [];
  if (late.length) {
    if (!b) {
      b = document.createElement("button");
      b.id = "reguBand";
      b.type = "button";
      b.dataset.a = "tab";
      b.dataset.v = "breed";
      document.querySelector(".app").prepend(b);
    }
    const [x, st] = late[0];
    b.textContent = `⚠ ${t("레규메이트 급여 시각")} ${x.d.at} ${t("지남")} ${Math.floor(diff0(nowHM(), x.d.at) / 60)}${t("시간")} · ${x.d.sows.length}${t("두")}${st >= 3 ? " · " + t("대표 확인 필요") : ""} — ${t("12시간 넘기지 마세요")}`;
  } else if (b) b.remove();
});
setInterval(() => {
  if (me() && reguBatches().some(x => x.on && !x.todayFed)) render();
}, 5 * 60e3);
// 번식 탭: 끝난 동기화 그룹 성적(최근 1년) + 정시 교배 시각 설정(대표)
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.rgset;
  if (k) {
    state.regu = { ...(state.regu || {}), [k]: e.target.value };
    save();
    toast(t("저장했습니다"));
  }
});
// 현황판 카드: 동기화 그룹(레규메이트) — 급여 진행(일째·오늘 급여·빠짐·시각 벗어남) → 끝나면 정시 교배 4회 진행·발정 예상
DASH_P.regu = () => {
  const B = reguBatches(),
    now = nowHM();
  if (!B.length)
    return [
      t("동기화 그룹 (레규)"),
      t("진행 중인 그룹 없음"),
      `<div class="d-mu">${t("진행 중인 동기화 그룹이 없습니다")}</div>`
    ];
  const rows = B.map(b => {
    const d = b.d,
      M = reguMating(d),
      done = M.filter(m => recsOf("교배").some(r => r.data.rg === b.r.id && r.data.session === m.n)).length;
    const sd = x => +x.slice(5, 7) + "/" + +x.slice(8),
      head = `<div class="rg-h">${sd(d.start)}~ · ${d.sows.length}${t("두")}</div>`;
    if (b.on) {
      const st = reguAlertStage(d.at, now, b.todayFed),
        fed = b.todayFed
          ? `<span style="color:var(--good)">✓ ${t("오늘 급여")}</span>`
          : `<span style="color:${st ? "var(--red)" : "var(--amber)"}">${st ? "⚠ " : ""}${t("오늘 급여 전")} · ${d.at}</span>`;
      return `${head}<div class="d-bar"><span>${t("급여")}</span><div class="d-track"><div class="d-fill" style="width:${(b.day / d.days) * 100}%;background:var(--good)"></div></div><span class="d-v"><b>${b.day}</b>/${d.days}</span></div>
      <div class="d-mu">${fed}${b.miss.length ? ` · <span style="color:var(--red)">${t("빠짐")} ${b.miss.length}${t("일")}</span>` : ""}${b.off ? ` · ${t("시각·양 벗어남")} ${b.off}` : ""} · ${t("정시 교배")} ${sd(M[0].date)}</div>`;
    }
    const nx = M.find(m => !recsOf("교배").some(r => r.data.rg === b.r.id && r.data.session === m.n));
    return `${head}<div class="d-bar"><span>${t("교배")}</span><div class="d-track"><div class="d-fill" style="width:${(done / 4) * 100}%;background:var(--accent,#2b8a3e)"></div></div><span class="d-v"><b>${done}</b>/4</span></div>
    <div class="d-mu">${t("급여 끝")} ${sd(b.end)}${b.miss.length ? ` · <span style="color:var(--red)">${t("빠짐")} ${b.miss.length}${t("일")}</span>` : ""} · ${nx ? `${t("다음 교배")} ${sd(nx.date)} ${nx.time} (${nx.n}${t("차")})` : t("정시 교배 끝")} · ${t("발정 예상")} ${sd(b.est[0])}~${sd(b.est[1])}</div>`;
  });
  return [
    t("동기화 그룹 (레규)"),
    `${B.filter(b => b.on).length}${t("그룹 급여 중")}`,
    `<div class="d-bars rg-bars">${rows.join("")}</div>`
  ];
};
// 레규 대상이 없으면 카드를 한 줄로 작게("없음") — 있으면 위 카드 그대로
DASH_MIN.regu = () => !reguBatches().length; // 그룹이 없으면 한 줄 '없음' 카드
