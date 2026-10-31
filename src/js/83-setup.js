/* ================= v0.6 · 초기 등록 (본서버 첫 실제 자료) =================
   휴대폰 하나 들고 돈사를 돌며: 칸 → 모돈 번호 → 현장 카드(모돈현황판) 그대로 한 산차씩 → 저장 → 다음 칸.
   큰 숫자 버튼(한 손), 날짜는 카드처럼 ‘1023’ 네 자리(연도는 산차 순서로 자동), 입력한 만큼 바로 저장(state.setup).
   ‘기록 만들기’를 누르면 카드 → 교배·재발·임신확인·분만·양자·이유 기록 + 모돈(위치·칸·산차) 생성. 다시 눌러도 겹치지 않음(data.setup). */
const SU_F = [
  ["m1", "교배일", "date"],
  ["s1", "웅돈", "semen"],
  ["r1", "재발일", "date"],
  ["m2", "재발 후 교배일", "date"],
  ["s2", "웅돈 (재교배)", "semen"],
  ["r2", "두 번째 재발일", "date"],
  ["f", "분만일", "date"],
  ["tot", "총산자수", "num"],
  ["still", "사산 (카드에 없으면 건너뛰기)", "num"],
  ["nurse", "포유개시두수", "num"],
  ["w", "이유일", "date"],
  ["wn", "이유두수", "num"],
  ["note", "특이사항", "note"]
];
const SU_NOTE = ["난산", "유산", "조산", "무유", "도태 예정", "다리 문제"];
function suS() {
  const s = (state.setup = state.setup || {});
  s.cards = s.cards || {};
  return s;
}
function suCard(id) {
  const C = suS().cards;
  return (C[id] = C[id] || { id, breed: FARM.breed || "LY", cols: {} });
}
const suMD = v => (v && v.length === 4 ? `${+v.slice(0, 2)}/${+v.slice(2)}` : "");
// 연도 붙이기: 카드 날짜를 산차·칸 순서대로 놓고, 마지막 날짜가 오늘(분만예정 등 미래는 +150일까지)을 넘지 않게 뒤에서부터 연도를 정함
function suDates(c) {
  const L = [];
  Object.keys(c.cols)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(p => {
      const o = c.cols[p];
      ["m1", "r1", "m2", "r2", "f", "w"].forEach(k => {
        if (o[k] && /^\d{4}$/.test(o[k])) L.push({ p, k, md: o[k] });
      });
    });
  let nx = null;
  const lim = addDays(TODAY, 0);
  for (let i = L.length - 1; i >= 0; i--) {
    const mm = +L[i].md.slice(0, 2),
      dd = +L[i].md.slice(2);
    let y = +TODAY.slice(0, 4) + 1,
      d;
    do {
      y--;
      d = `${y}-${pad(mm)}-${pad(dd)}`;
    } while (d > (nx || lim));
    L[i].d = d;
    nx = d;
  }
  const m = {};
  L.forEach(x => (m[x.p + "|" + x.k] = x.d));
  return m;
}
function suBad(c) {
  const D = suDates(c),
    w = [];
  Object.keys(c.cols)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(p => {
      const o = c.cols[p],
        g = k => D[p + "|" + k];
      if ((o.m1 && !/^\d{4}$/.test(o.m1)) || (o.f && !/^\d{4}$/.test(o.f)))
        w.push(`${p}${t("산")} ${t("날짜는 네 자리")}`);
      const mt = g("m2") || g("m1");
      if (mt && g("f")) {
        const gd = diff(mt, g("f"));
        if (gd < 108 || gd > 122) w.push(`${p}${t("산")} ${t("임신")} ${gd}${t("일")}?`);
      }
      if (g("f") && g("w")) {
        const ld = diff(g("f"), g("w"));
        if (ld < 14 || ld > 45) w.push(`${p}${t("산")} ${t("포유")} ${ld}${t("일")}?`);
      }
      if (o.tot != null && o.nurse != null && +o.nurse > +o.tot + 4)
        w.push(`${p}${t("산")} ${t("포유개시가 총산보다 많음")}`);
      if (o.wn != null && o.nurse != null && +o.wn > +o.nurse)
        w.push(`${p}${t("산")} ${t("이유두수가 포유개시보다 많음")}`);
      const n = Number(o.still || 0);
      if (o.tot != null && n > +o.tot) w.push(`${p}${t("산")} ${t("사산이 총산보다 많음")}`);
      if (mt && !g("f") && !g(o.m2 ? "r2" : "r1") && addDays(mt, CFG.gest + 7) < TODAY)
        w.push(`${p}${t("산")} ${t("분만 예정이 지났는데 분만일이 없음")}`);
    });
  return w;
}

// ---- 허브 ----
function vSetup() {
  const S = suS(),
    C = Object.values(S.cards),
    done = C.filter(c => c.done).length,
    gen = state.records.filter(r => r.data && r.data.setup).length;
  const step = (n, ti, sub, act, ok) =>
    `<button type="button" class="mitem su-step" ${act}><span class="su-n ${ok ? "ok" : ""}">${ok ? "✓" : n}</span><span><b>${t(ti)}</b><small>${sub}</small></span><span>›</span></button>`;
  let h = `<div class="pagehd">${IS_SETUP ? `<a class="back" href="../">${t("본 앱 열기")} ›</a>` : `<button class="back" type="button" data-a="tab" data-v="settings">‹ ${t("설정")}</button>`}<h2>📋 ${t("초기 등록")}</h2></div>
  <div class="note">${t("본서버를 처음 시작할 때 실제 자료를 넣는 곳입니다. 휴대폰 하나로 돈사를 돌며 현장 카드를 보고 입력하세요. 인터넷이 없어도 됩니다.")}</div><div class="more">`;
  h += step(
    1,
    "빈 농장으로 시작",
    state.sows.length
      ? `${t("지금 모돈")} ${state.sows.length}${t("두")} · ${t("예시 자료면 먼저 비우기")}`
      : t("비어 있음 ✓"),
    `data-a="suEmpty"`,
    !state.sows.length || gen > 0
  );
  h += step(
    2,
    "계정 · PIN",
    `${state.accounts.filter(a => a.active !== false).length}${t("명")} · ${t("이름·PIN 바꾸기")}`,
    `data-a="suGo" data-v="accounts"`,
    false
  );
  h += step(
    3,
    "돈사 돌며 카드 입력",
    `${t("카드")} ${done}${t("장 입력")}${C.length > done ? ` · ${t("입력 중")} ${C.length - done}` : ""}`,
    `data-a="suWalk"`,
    done > 0
  );
  h += step(
    4,
    "기록 만들기",
    gen ? `${t("만든 기록")} ${gen}${t("건")} · ${t("카드를 고치면 다시 누르기")}` : t("카드 → 교배·분만·이유 기록"),
    `data-a="suReview"`,
    gen > 0
  );
  h += step(
    5,
    "돈군 (분만 주차별 두수)",
    t("설정 › 돈군 초기 등록"),
    `data-a="suGo" data-v="binit"`,
    (state.mbatches || []).length > 0
  );
  h += step(
    6,
    "사료 잔량 · 포대",
    t("오늘 입력 › 사료"),
    `data-a="tab" data-v="feedchk"`,
    state.records.some(r => r.type === "사료")
  );
  h += step(
    7,
    "서버 시작",
    typeof syOn === "function" && syOn() ? t("연결됨 ✓") : t("설정 › 서버 연결"),
    `data-a="suGo" data-v="sync"`,
    typeof syOn === "function" && syOn()
  );
  return h + `</div>`;
}

// ---- 칸 걷기: 돈사 고르기 → 칸 → 번호 ----
function suStalls(b) {
  const L = FARM.layout[b];
  if (!L) return [];
  return stallsOf(b)
    .map(x => x.id)
    .sort(
      (a, c) =>
        a.replace(/\d+/, "").localeCompare(c.replace(/\d+/, "")) ||
        parseInt(a.replace(/\D/g, "")) - parseInt(c.replace(/\D/g, ""))
    );
}
function suAt(b, st) {
  return Object.values(suS().cards).find(c => c.barn === b && c.stall === st);
}
function vSuWalk() {
  const W = ui.su || (ui.su = {});
  const B = BM_BARNS();
  W.b = W.b || B[0];
  const S = suStalls(W.b);
  if (W.i == null) W.i = 0;
  W.i = Math.max(0, Math.min(S.length - 1, W.i));
  const st = S[W.i],
    c = suAt(W.b, st);
  if (W.card) return vSuCard();
  let h = `<div class="pagehd"><button class="back" type="button" data-a="suHub">‹ ${t("초기 등록")}</button><h2>${t("돈사 돌며 입력")}</h2></div>
  <div class="chips">${B.map(x => {
    const n = suStalls(x).filter(s => suAt(x, s)).length;
    return `<button type="button" class="chip ${x === W.b ? "on" : ""}" data-a="suBarn" data-v="${esc(x)}">${esc(t(x))} <small>${n}/${suStalls(x).length}</small></button>`;
  }).join("")}</div>`;
  h += `<div class="su-here"><button type="button" class="su-arrow" data-a="suStep" data-v="-1" ${W.i === 0 ? "disabled" : ""}>‹</button><div><small>${esc(t(W.b))}</small><b>${esc(st || "-")}</b><em>${W.i + 1} / ${S.length}</em></div><button type="button" class="su-arrow" data-a="suStep" data-v="1" ${W.i >= S.length - 1 ? "disabled" : ""}>›</button></div>`;
  if (c)
    h += `<div class="su-got"><b>${esc(c.id)}</b> ${c.done ? "✓ " + t("입력 끝") : t("입력 중")} · ${Object.keys(c.cols).length}${t("산")}<div class="acts"><button class="act pri" type="button" data-a="suOpen" data-v="${esc(c.id)}">${t("카드 고치기")}</button><button class="act" type="button" data-a="suStep" data-v="1">${t("다음 칸")} ›</button></div></div>`;
  else
    h +=
      `<div class="su-q">${t("이 칸 모돈 번호는?")}</div><div class="su-disp">${esc(suNo(W.num || "")) || `<span class="sow-meta">${t("숫자만 · 예: 85 → 6-085")}</span>`}</div>` +
      suPad("no") +
      `<button type="button" class="act su-empty" data-a="suEmptyStall">${t("빈 칸 · 다음")} ›</button>`;
  h += `<div class="su-strip">${S.map((s, i) => {
    const x = suAt(W.b, s);
    return `<button type="button" class="${i === W.i ? "on" : ""} ${x ? (x.done ? "ok" : "half") : ""} ${(W.skip || []).includes(W.b + "|" + s) ? "skip" : ""}" data-a="suJump" data-v="${i}">${esc(s)}</button>`;
  }).join("")}</div>`;
  return h;
}
const suNo = v => (v ? `${FARM.sowPrefix || "6-"}${String(v).padStart(3, "0")}` : "");
function suPad(mode) {
  const k = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
  return `<div class="su-pad">${k.map(x => `<button type="button" data-a="suKey" data-v="${x}" data-m="${mode}" class="${x === "✓" ? "go" : ""}">${x === "✓" ? (mode === "no" ? t("열기") : t("다음")) : x}</button>`).join("")}</div>`;
}

// ---- 카드: 한 산차씩, 칸 하나씩 ----
function vSuCard() {
  const W = ui.su,
    c = suCard(W.card),
    p = W.p || 1,
    o = c.cols[p] || {},
    D = suDates(c),
    fk = W.f || "m1",
    bad = suBad(c);
  const fv = (k, typ) => {
    const v = o[k];
    if (v == null || v === "") return "";
    if (typ === "date") return suMD(v) + (D[p + "|" + k] ? ` <small>${D[p + "|" + k].slice(0, 4)}</small>` : "");
    return esc(v);
  };
  const due = (() => {
    const m = D[p + "|m2"] || D[p + "|m1"];
    return m ? kDate(addDays(m, CFG.gest)) : "";
  })();
  let h = `<div class="pagehd"><button class="back" type="button" data-a="suCardClose">‹ ${esc(t(c.barn || ""))} ${esc(c.stall || "")}</button><h2>${esc(c.id)}</h2></div>`;
  h += `<div class="chips su-pars">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .slice(0, Math.max(8, Math.max(0, ...Object.keys(c.cols).map(Number)) + 1))
    .map(
      n =>
        `<button type="button" class="chip ${n === p ? "on" : ""} ${c.cols[n] && Object.keys(c.cols[n]).length ? "has" : ""}" data-a="suPar" data-v="${n}">${n}${t("산")}</button>`
    )
    .join("")}</div>`;
  h += `<div class="su-fields">${SU_F.map(([k, l, typ]) => {
    const skip = (k === "m2" || k === "s2" || k === "r2") && !o.r1;
    if (skip) return "";
    return `<button type="button" class="su-f ${k === fk ? "on" : ""} ${o[k] != null && o[k] !== "" ? "has" : ""}" data-a="suField" data-v="${k}"><span>${t(l)}</span><b>${fv(k, typ)}</b></button>`;
  }).join("")}
    ${due ? `<div class="su-due">${t("분만 예정")} ${due}</div>` : ""}</div>`;
  if (bad.length) h += `<div class="warnbox" style="display:block">${bad.map(esc).join("<br>")}</div>`;
  const typ = (SU_F.find(x => x[0] === fk) || [])[2];
  h += `<div class="su-dock">`;
  if (typ === "semen")
    h += `<div class="su-chips">${SEMENS.map(s => `<button type="button" class="chip wrap ${o[fk] === s ? "on" : ""}" data-a="suChip" data-v="${esc(s)}">${esc(s)}</button>`).join("")}<button type="button" class="chip wrap" data-a="suNext">${t("건너뛰기")}</button></div>`;
  else if (typ === "note")
    h += `<div class="su-chips">${SU_NOTE.map(s => `<button type="button" class="chip wrap ${(o.note || "").split(",").includes(s) ? "on" : ""}" data-a="suNote" data-v="${s}">${t(s)}</button>`).join("")}</div>`;
  else
    h +=
      `<div class="su-disp sm">${esc(t((SU_F.find(x => x[0] === fk) || [])[1] || ""))}: <b>${typ === "date" ? esc(suMD((W.buf || "").padEnd(4, "_").slice(0, 4).replace(/_/g, "")) || W.buf || "") : esc(W.buf || "")}</b>${typ === "date" ? ` <small class="sow-meta">${t("월일 네 자리")}</small>` : ""}</div>` +
      suPad("f");
  h += `<div class="acts su-end"><button class="act" type="button" data-a="suPar" data-v="${p + 1}">${p}${t("산 끝")} → ${p + 1}${t("산")}</button><button class="act pri" type="button" data-a="suDone">✓ ${t("카드 끝 · 다음 칸")}</button></div></div>`;
  h += `<details class="su-top"><summary>${t("카드 위 칸")} (${t("품종·생년월일·구입일·구입처")})</summary><div class="chipwrap">${["LY", "LYD", "YL", "기타"].map(b => `<button type="button" class="chip wrap ${c.breed === b ? "on" : ""}" data-a="suBreed" data-v="${b}">${b}</button>`).join("")}</div>
    <div class="f"><label for="suBirth">${t("생년월일")}</label><input type="date" id="suBirth" value="${esc(c.birth || "")}" data-su="birth"></div><div class="f"><label for="suIntro">${t("구입일")}</label><input type="date" id="suIntro" value="${esc(c.intro || "")}" data-su="intro"></div><div class="f"><label for="suSrc">${t("구입처")}</label><input type="text" id="suSrc" value="${esc(c.src || "")}" data-su="src"></div></details>`;
  return h;
}
function suNextField(c, p, k) {
  const o = c.cols[p] || {},
    L = SU_F.map(x => x[0]).filter(x => !((x === "m2" || x === "s2" || x === "r2") && !o.r1));
  const i = L.indexOf(k);
  return L[i + 1] || null;
}
function suPut(v) {
  const W = ui.su,
    c = suCard(W.card),
    p = W.p || 1,
    o = (c.cols[p] = c.cols[p] || {}),
    k = W.f || "m1";
  if (v === "" || v == null) delete o[k];
  else o[k] = v;
  c.done = false;
  W.buf = "";
  const n = suNextField(c, p, k);
  if (n) W.f = n;
  else {
    W.p = p + 1;
    W.f = "m1";
  }
  save();
}
Object.assign(A, {
  suHub: () => {
    ui.su = null;
    go("setup");
  },
  suWalk: () => {
    ui.su = ui.su || {};
    ui.su.card = null;
    go("suwalk");
  },
  suGo: v => {
    tab = "settings";
    ui.setPage = v;
    render();
  },
  suEmpty: () => {
    if (
      state.records.some(r => !(r.data && r.data.setup)) &&
      !confirm(t("지금 앱의 모돈·기록을 모두 지우고 빈 농장으로 시작할까요? 계정·목록·기준값은 남습니다."))
    )
      return;
    const keep = state,
      cards = (state.setup || {}).cards;
    makeState("empty", keep);
    if (cards) state.setup = { cards };
    save();
    render();
    toast(t("빈 농장으로 바꿨습니다"));
  },
  suBarn: v => {
    ui.su.b = v;
    ui.su.i = 0;
    ui.su.num = "";
    render();
  },
  suStep: v => {
    ui.su.i += Number(v);
    ui.su.num = "";
    render();
  },
  suJump: v => {
    ui.su.i = +v;
    ui.su.num = "";
    render();
  },
  suEmptyStall: () => {
    const W = ui.su,
      S = suStalls(W.b);
    W.skip = W.skip || [];
    W.skip.push(W.b + "|" + S[W.i]);
    W.i++;
    W.num = "";
    render();
  },
  suKey: (v, el) => {
    const W = ui.su,
      m = el.dataset.m;
    if (m === "no") {
      if (v === "⌫") W.num = (W.num || "").slice(0, -1);
      else if (v === "✓") {
        if (!W.num) return;
        A.suOpen(suNo(W.num), true);
        return;
      } else if ((W.num || "").length < 3) W.num = (W.num || "") + v;
      render();
      return;
    }
    const typ = (SU_F.find(x => x[0] === (W.f || "m1")) || [])[2];
    if (v === "⌫") {
      if (W.buf) W.buf = W.buf.slice(0, -1);
      else {
        const c = suCard(W.card),
          o = c.cols[W.p || 1] || {};
        delete o[W.f || "m1"];
        save();
      }
      render();
      return;
    }
    if (v === "✓") {
      if (typ === "date" && W.buf && W.buf.length !== 4) {
        toast(t("월일 네 자리로 (예: 1023)"));
        return;
      }
      suPut(W.buf === "" ? ((suCard(W.card).cols[W.p || 1] || {})[W.f || "m1"] ?? "") : W.buf);
      render();
      return;
    }
    W.buf = (W.buf || "") + v;
    if (typ === "date" && W.buf.length === 4) {
      const mm = +W.buf.slice(0, 2),
        dd = +W.buf.slice(2);
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
        toast(t("날짜를 확인하세요"));
        W.buf = "";
        render();
        return;
      }
      suPut(W.buf);
    } else if (typ === "num" && W.buf.length > 2) W.buf = W.buf.slice(0, 2);
    render();
  },
  suOpen: (id, fromStall) => {
    const W = ui.su;
    const c = suCard(id);
    if (fromStall) {
      const S = suStalls(W.b);
      const other = suAt(W.b, S[W.i]);
      if (other && other.id !== id) delete other.stall;
      c.barn = W.b;
      c.stall = S[W.i];
    }
    W.card = id;
    W.num = "";
    W.buf = "";
    const ps = Object.keys(c.cols).map(Number);
    W.p = ps.length ? Math.max(...ps) : 1;
    W.f = ps.length ? suNextField(c, W.p, Object.keys(c.cols[W.p]).pop() || "m1") || "m1" : "m1";
    save();
    render();
    window.scrollTo(0, 0);
  },
  suCardClose: () => {
    ui.su.card = null;
    render();
  },
  suPar: v => {
    ui.su.p = Math.max(1, +v);
    ui.su.f = "m1";
    ui.su.buf = "";
    render();
  },
  suField: v => {
    ui.su.f = v;
    ui.su.buf = "";
    render();
  },
  suChip: v => {
    suPut(v);
    render();
  },
  suNext: () => {
    suPut("");
    render();
  },
  suNote: v => {
    const W = ui.su,
      c = suCard(W.card),
      o = (c.cols[W.p || 1] = c.cols[W.p || 1] || {}),
      L = (o.note || "").split(",").filter(Boolean),
      i = L.indexOf(v);
    i < 0 ? L.push(v) : L.splice(i, 1);
    if (L.length) o.note = L.join(",");
    else delete o.note;
    save();
    render();
  },
  suBreed: v => {
    suCard(ui.su.card).breed = v;
    save();
    render();
  },
  suDone: () => {
    const W = ui.su,
      c = suCard(W.card);
    Object.keys(c.cols).forEach(p => {
      if (!Object.keys(c.cols[p]).length) delete c.cols[p];
    });
    c.done = true;
    save();
    W.card = null;
    W.i++;
    W.num = "";
    render();
    window.scrollTo(0, 0);
    toast(`${c.id} ${t("카드 저장")}`);
  },
  suReview: () => go("sureview")
});
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.su;
  if (k && ui.su && ui.su.card) {
    suCard(ui.su.card)[k] = e.target.value.trim();
    save();
  }
});

// ---- 기록 만들기 (확인) ----
function suBuild(dry) {
  const C = Object.values(suS().cards).filter(c => Object.keys(c.cols).length || c.barn),
    recs = [],
    sows = [],
    warn = [];
  const mk = (type, d, data) =>
    recs.push({
      id: "su" + fnvS(type + data.sow + d + (data.round || "") + (data.result || "")),
      type,
      workDate: d,
      createdAt: d + "T03:00:00.000Z",
      user: state.user || "초기 등록",
      data: { ...data, setup: true }
    });
  C.forEach(c => {
    const D = suDates(c),
      ps = Object.keys(c.cols)
        .map(Number)
        .sort((a, b) => a - b);
    const b = suBad(c);
    if (b.length) warn.push([c.id, b]);
    const first = ps[0] || 1;
    ps.forEach(p => {
      const o = c.cols[p],
        g = k => D[p + "|" + k],
        sow = c.id;
      if (g("m1")) mk("교배", g("m1"), { sow, round: "1차", semen: o.s1 || "듀록 정액" });
      if (g("r1")) mk("임신확인", g("r1"), { sow, result: "재발" });
      if (g("m2")) mk("교배", g("m2"), { sow, round: "1차", semen: o.s2 || o.s1 || "듀록 정액" });
      if (g("r2")) mk("임신확인", g("r2"), { sow, result: "재발" });
      const last = g("m2") || g("m1");
      if (last && !g(g("m2") ? "r2" : "r1") && (g("f") || diff(last, TODAY) >= 25))
        mk("임신확인", g("f") && diff(last, g("f")) < 25 ? g("f") : addDays(last, 25), { sow, result: "임신" });
      if (g("f")) {
        const tot = +(o.tot || 0),
          st = Math.min(tot, +(o.still || 0)),
          live = tot - st,
          nn = o.nurse != null && o.nurse !== "" ? +o.nurse : live,
          notes = (o.note || "").split(",").filter(Boolean);
        mk("분만", g("f"), { sow, live, still: st, mum: 0, ...(notes.includes("난산") ? { ease: "난산" } : {}) });
        if (nn !== live)
          mk("양자", g("f"), {
            sow: nn > live ? null : sow,
            to: nn > live ? sow : null,
            n: Math.abs(nn - live),
            memo: t("현장 카드 포유개시")
          });
      }
      if (g("w")) mk("이유", g("w"), { sow, n: +(o.wn || 0), days: g("f") ? diff(g("f"), g("w")) : 0 });
    });
    const lastP = ps[ps.length - 1];
    sows.push({
      id: c.id,
      breed: c.breed || FARM.breed,
      baseParity: Math.max(0, first - 1),
      intro: c.intro || "",
      birth: c.birth || undefined,
      src: c.src || undefined,
      loc: c.barn || "교배사",
      stall: c.stall || undefined,
      gilt: !ps.length,
      memo: ""
    });
    if (lastP && (c.cols[lastP].note || "").includes("도태 예정"))
      sows[sows.length - 1].cullPlan = { date: TODAY, reason: t("현장 카드 특이사항") };
  });
  return { recs, sows, warn, cards: C.length };
}
function fnvS(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function vSuReview() {
  const B = suBuild(true),
    by = {};
  B.recs.forEach(r => (by[r.type] = (by[r.type] || 0) + 1));
  let h = `<div class="pagehd"><button class="back" type="button" data-a="suHub">‹ ${t("초기 등록")}</button><h2>${t("기록 만들기")}</h2></div>
  <div class="panel"><div class="setrow"><span>${t("카드")}</span><b>${B.cards}${t("장")}</b></div>${Object.entries(by)
    .map(([k, n]) => `<div class="setrow"><span>${esc(L(k))}</span><b>${n}${t("건")}</b></div>`)
    .join("")}</div>`;
  if (B.warn.length)
    h +=
      `<div class="sec-t">${t("확인할 카드")} <span>${B.warn.length}${t("장")}</span></div>` +
      B.warn
        .map(
          ([id, w]) =>
            `<button type="button" class="srow su-warn" data-a="suFix" data-v="${esc(id)}"><b>${esc(id)}</b><span>${w.map(esc).join(" · ")}</span><i>›</i></button>`
        )
        .join("");
  h += `<div class="note">${t("카드에 실산이 없으면 ‘총산 − 사산’을 실산으로, 포유개시와 다르면 그 차이를 양자로 기록합니다. 교배 후 25일이 지났고 재발이 없으면 임신으로 봅니다. 연도는 산차 순서로 정했습니다.")}</div>
  <div class="acts"><button class="act pri" type="button" data-a="suApply">${t("기록 만들기")} (${B.recs.length}${t("건")})</button></div>`;
  const ex = state.sows.filter(s => B.sows.some(x => x.id === s.id)).slice(0, 40);
  if (ex.length)
    h += `<div class="sec-t">${t("만든 뒤 상태")}</div><div class="panel">${ex
      .map(s => {
        const i = statusOf(s);
        return `<div class="setrow"><span><b>${esc(s.id)}</b> <small class="sow-meta">${esc(t(s.loc))} ${esc(s.stall || "")}</small></span><span class="stage ${i.cls}">${esc(i.label)}</span></div>`;
      })
      .join("")}</div>`;
  return h;
}
Object.assign(A, {
  suFix: v => {
    ui.su = ui.su || {};
    A.suOpen(v);
    go("suwalk");
  },
  suApply: () => {
    const B = suBuild();
    state.records = state.records.filter(r => !(r.data && r.data.setup)).concat(B.recs);
    B.sows.forEach(n => {
      const s = state.sows.find(x => x.id === n.id);
      if (s) Object.assign(s, Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)));
      else state.sows.push(Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)));
    });
    if (!state.startDate || state.startDate > TODAY) state.startDate = TODAY;
    save();
    render();
    toast(`${t("기록")} ${B.recs.length}${t("건 · 모돈")} ${B.sows.length}${t("두를 만들었습니다")}`);
  }
});
const suGuard = f => () => (can("admin") ? f() : `<div class="empty">${t("대표 계정에서만 쓸 수 있습니다.")}</div>`);
// ---- 별도 ‘초기 등록 앱’ (setup/ 주소): 첫 화면 = 초기 등록, 메뉴 탭 숨김, 허용 화면만 ----
const IS_SETUP = typeof MODE !== "undefined" && MODE === "setup",
  SETUP_OK = ["setup", "suwalk", "sureview", "settings", "feedchk", "sow"]; // 초기 등록 앱에서 갈 수 있는 화면(go 가 이 밖이면 초기 등록으로)
if (IS_SETUP) {
  document.body.classList.add("mode-setup");
  BEFORE_RENDER.push(() => {
    if (me() && !SETUP_OK.includes(tab)) tab = "setup";
    if (tab === "settings" && !["accounts", "binit", "sync", "main"].includes(ui.setPage || "main"))
      ui.setPage = "main";
    if (tab === "settings" && (ui.setPage || "main") === "main") tab = "setup";
  });
}
