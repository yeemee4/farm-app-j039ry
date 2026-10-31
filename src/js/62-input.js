/* ================= v0.3 · 입력 페이지 (번역 · 폐사 기준) ================= */
function fieldHtml(f, d, sowForCalc) {
  const I = ui.in,
    lb = esc(t(f.l));
  if (f.t === "chips") {
    const opts = (typeof f.o === "function" ? f.o() : f.o).map(o => (Array.isArray(o) ? o : [o, o]));
    return `<div class="f"><span class="lb">${lb}</span>${opts.length ? `<div class="chipwrap">${opts.map(([v, l]) => `<button type="button" class="chip wrap ${d[f.k] === v ? "on" : ""}" data-a="fv" data-k="${f.k}" data-v="${esc(v)}">${esc(t(l))}</button>`).join("")}</div>` : `<div class="empty">-</div>`}</div>`;
  }
  if (f.t === "step")
    return `<div class="f"><label for="f-${f.k}">${lb}</label><div class="stepper"><button type="button" data-a="step" data-k="${f.k}" data-v="-1" aria-label="-">−</button><input type="number" inputmode="numeric" id="f-${f.k}" data-num="${f.k}" value="${d[f.k] ?? ""}"><button type="button" data-a="step" data-k="${f.k}" data-v="1" aria-label="+">+</button></div></div>`;
  if (f.t === "calc")
    return `<div class="calc"><span>${lb}</span><b data-calc="${f.k}">${f.calc(d, I.date, sowForCalc)}</b></div>`;
  if (f.t === "text")
    return `<div class="f"><label for="f-${f.k}">${lb}${micBtn("f-" + f.k)}</label><input type="text" id="f-${f.k}" data-txt="${f.k}" value="${esc(d[f.k] || "")}" placeholder="${esc(f.ph || "")}" ${f.list ? `list="${f.list}" autocomplete="off"` : ""}>${f.list ? `<datalist id="${f.list}"></datalist>` : ""}</div>`;
  if (f.t === "textarea")
    return `<div class="f"><label for="f-${f.k}">${lb}${micBtn("f-" + f.k)}</label><textarea id="f-${f.k}" data-txt="${f.k}" placeholder="${esc(f.ph || "")}">${esc(d[f.k] || "")}</textarea></div>`;
  if (f.t === "photo") return photoField(f, d);
  if (f.t === "date")
    return `<div class="f"><label for="f-${f.k}">${lb}</label><input type="date" id="f-${f.k}" data-txt="${f.k}" value="${d[f.k] || ""}"></div>`;
  return "";
}
function needMsg() {
  const I = ui.in,
    F = FORMS[I.type];
  if (F.sow && !I.sel.length) return t("모돈을 선택하세요");
  const mc = F.f.find(f => f.t === "chips" && !f.opt && !I.fv[f.k]);
  if (mc) return `${t("항목을 선택하세요")}: ${t(mc.l)}`;
  const miss = F.f.find(f => (f.t === "text" || f.t === "textarea") && !f.opt && !String(I.fv[f.k] || "").trim());
  if (miss) return `${t("내용을 입력하세요")}: ${t(miss.l)}`;
  return null;
}
function saveLabel() {
  const I = ui.in,
    n = needMsg();
  if (n) return n;
  if (I.editId) return t("수정 저장");
  return FORMS[I.type].sow && I.sel.length > 1 ? `${I.sel.length}${t("두")} ${t("저장")}` : t("저장");
}
function vInput() {
  const I = ui.in,
    F = FORMS[I.type],
    late = I.date < TODAY;
  let left = `<div class="pagehd"><button class="back" type="button" data-a="back">‹ ${t("뒤로")}</button><h2>${icon(I.type)}${esc(L(I.type))}</h2></div>`;
  if (I.type === "BCS" && !I.editId)
    left += `<div class="acts"><button class="act pri" type="button" data-a="tab" data-v="bcsmap">🗺 ${t("배치도로 입력")} ›</button><button class="act" type="button" data-a="tab" data-v="gfeed">${t("임신돈 급여표")} ›</button></div>`;
  if (I.editId)
    left += `<div class="editbar"><span>${t("기록 수정 중")}</span><button class="sbtn" type="button" data-a="editCancel">${t("수정 취소")}</button></div>`;
  left += `<div class="panel"><div class="f"><label for="in-date">${t("작업일")} ${late ? `<span class="late-note">${t("지연 입력 · 해당 날짜 성적에 반영")}</span>` : ""}</label><input type="date" id="in-date" value="${I.date}" max="${TODAY}"></div>`;
  const sowForCalc = I.sel[0] || null;
  if (F.sow && !I.editId) {
    const c = candidates(),
      leftN = Math.max(c.targetN - c.doneN, 0);
    if (F.sow.target)
      left += `<div class="target"><span class="big">${I.date === TODAY ? t("오늘") : kDate(I.date)} ${t("대상")} ${c.targetN}${t("두")} · ${t("입력")} ${c.doneN} · ${t("남은")} <b class="${leftN ? "" : "ok"}">${leftN}</b></span></div><div class="prog-bar"><i style="width:${c.targetN ? Math.min(100, (c.doneN / c.targetN) * 100) : 0}%"></i></div>`;
    const pm = (() => {
      try {
        return localStorage.getItem("farm-pickmap") !== "0";
      } catch (e) {
        return true;
      }
    })();
    left += `<div class="chips"><button type="button" class="chip ${pm ? "on" : ""}" data-a="pickView" data-v="1">🗺 ${t("배치도")}</button><button type="button" class="chip ${pm ? "" : "on"}" data-a="pickView" data-v="0">${t("목록")}</button>${I.sel.length ? `<span class="sow-meta" style="align-self:center">${t("선택")} <b>${I.sel.join(", ")}</b></span>` : ""}</div>`;
    if (pm) left += vPickMap();
    else {
      left += `<div class="row2"><input type="search" id="in-q" inputmode="numeric" pattern="[0-9]*" placeholder="${t("번호 숫자만 (예: 8 → 6-008)")}" value="${esc(I.q)}" aria-label="${t("번호로 찾기 (대상 외 모돈 포함)")}"><button type="button" class="toggle ${I.all ? "on" : ""}" data-a="toggleAll">${I.all ? t("대상만") : t("전체 모돈")}</button></div>`;
      left += `<div class="f"><span class="lb">${t("모돈 선택")} ${F.sow.multi ? `(${t("여러 두 선택 가능")})` : ""} <span>${I.sel.length ? `${t("선택")} ${I.sel.join(", ")}` : ""}</span></span>${c.list.length ? sowPickGroups(c) : `<div class="empty">${I.q ? t("번호에 맞는 모돈이 없습니다.") : t("오늘 대상 모돈이 없습니다. ‘전체 모돈’을 눌러 찾을 수 있습니다.")}</div>`}</div>`;
    }
  } else if (F.sow && I.editId) {
    const s = state.sows.find(x => x.id === I.sel[0]);
    left += `<div class="f"><span class="lb">${t("모돈")}</span>${s ? sowCard(s, { noLoc: true, noLink: true }) : ""}</div>`;
  }
  const dock = F.sow && !I.editId; // 모돈 입력: 입력 칸·저장을 아래 고정 패널로
  if (dock)
    left += `<div class="dock ${I.sel.length ? "" : "min"}"><div class="dock-hd">${I.sel.length ? `${t("선택")} <b>${I.sel.join(", ")}</b>` : `<span class="sow-meta">${t("위에서 모돈을 고르세요")}</span>`}</div><div class="dock-bd">`;
  left += F.f.map(f => fieldHtml(f, I.fv, sowForCalc)).join("");
  if (I.err) left += `<div class="errbox">${esc(I.err)}</div>`;
  if (I.warn)
    left += `<div class="warnbox"><span><b>${t("확인해 주세요.")}</b><br>${I.warn.map(esc).join("<br>")}</span><div class="acts"><button class="act" type="button" data-a="warnCancel">${t("고치기")}</button><button class="act pri" type="button" data-a="force">${t("그래도 저장")}</button></div></div>`;
  const nm = needMsg();
  if (dock) left += `</div>`;
  left += `<button class="save" type="button" data-a="save" ${nm ? "disabled" : ""}>${esc(saveLabel())}</button>${dock ? "</div>" : ""}</div>`;
  const recs = state.records
    .filter(r => r.type === I.type && r.workDate === I.date)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let tot = "";
  if (I.type === "폐사" || I.type === "출하" || I.type === "이유")
    tot = ` · ${t("합계")} ${recs.reduce((s, r) => s + (r.data.n || 0), 0)}${t("두")}`;
  if (I.type === "분만") tot = ` · ${t("실산")} ${recs.reduce((s, r) => s + r.data.live, 0)}${t("두")}`;
  let right = `<div class="stackhd"><b>${I.date === TODAY ? t("오늘") : kDate(I.date)} · ${recs.length}${t("건")}${tot}</b></div>`;
  if (I.type === "폐사") {
    const g = {};
    recs.forEach(r => {
      (g[r.data.barn] = g[r.data.barn] || []).push(r);
    });
    Object.entries(g).forEach(([barn, rs]) => {
      const day = dayGroup(I.date + "|" + barn, rs);
      if (day.pending)
        right += `<div class="srow" style="border-color:var(--amber)"><div class="txt"><b>${esc(barn)} · ${t("하루 합계")} ${day.total}${t("두")} (${rs.length}${t("건")})</b></div>${decBox("day|" + day.k, [...new Set(rs.map(r => r.data.cause))])}</div>`;
    });
  }
  right += recs.length
    ? recs.map(stackRow).join("")
    : `<div class="empty">${t("아직 입력한 기록이 없습니다. 저장하면 여기에 쌓입니다.")}</div>`;
  return `<div class="inputgrid"><div>${left}</div><div>${right}</div></div>`;
}
function stackRow(r) {
  const I = ui.in,
    flash = I.flash.includes(r.id),
    late = r.workDate < localDateOf(r.createdAt);
  let h = `<div class="srow ${flash ? "flash" : ""}" id="r-${r.id}"><div class="top"><span class="tm">${kTime(r.createdAt)}</span><div class="txt">${esc(summary(r))}${r.data && r.data.photo ? `<button type="button" class="pthumb" data-a="photoView" data-v="${r.id}"><img src="${r.data.photo}" alt=""></button>` : ""}<div class="who2">${esc(r.user)}${late ? " · " + t("지연 입력") : ""}${r.edited ? " · " + t("수정됨") : ""}</div></div>
    <div class="rbtns">${ui.delId === r.id ? `<button class="sbtn bad" type="button" data-a="delOk" data-v="${r.id}">${t("삭제 확정")}</button><button class="sbtn" type="button" data-a="delNo">${t("취소")}</button>` : `${can("edit", r) ? `<button class="sbtn" type="button" data-a="edit" data-v="${r.id}">${t("수정")}</button>` : ""}${can("delete") ? `<button class="sbtn" type="button" data-a="del" data-v="${r.id}">${t("삭제")}</button>` : ""}`}</div></div>`;
  if (r.type === "폐사") h += decisionHtml(r);
  return h + `</div>`;
}
function decBox(id, causes) {
  const D = ui.dec && ui.dec.id === id ? ui.dec : null;
  if (D && D.acts) {
    const rec = [...new Set(causes.flatMap(c => REC[c] || []))];
    return `<div class="dec"><span class="q">${t("필요한 조치를 고르세요 (여러 개)")}</span><div class="chipwrap">${ACTIONS.map(a => `<button type="button" class="chip wrap ${D.acts.includes(a) ? "on" : ""} ${rec.includes(a) ? "rec" : ""}" data-a="decAct" data-v="${esc(a)}">${esc(t(a))}</button>`).join("")}</div>
      <span class="q" style="color:var(--muted)">${t("언제")}</span><div class="chipwrap">${["오늘 중", "내일", "모레"].map(w => `<button type="button" class="chip wrap ${D.when === w ? "on" : ""}" data-a="decWhen" data-v="${w}">${t(w)}</button>`).join("")}</div>
      <span class="q" style="color:var(--muted)">${t("담당")}</span><div class="chipwrap">${WORKERS.map(w => `<button type="button" class="chip wrap ${D.who === w ? "on" : ""}" data-a="decWho" data-v="${esc(w)}">${esc(w)}</button>`).join("")}</div>
      <input type="text" id="decMemo" placeholder="${t("메모 (선택)")}" value="${esc(D.memo)}" aria-label="${t("메모 (선택)")}">
      <div class="acts"><button class="act pri" type="button" data-a="decSave" ${D.acts.length ? "" : "disabled style='opacity:.45'"}>${t("할 일에 추가")}</button><button class="act" type="button" data-a="decCancel">${t("취소")}</button></div></div>`;
  }
  return `<div class="dec"><span class="q">${t("조치가 필요한가요?")}</span><div class="acts"><button class="act" type="button" data-a="decNone" data-v="${esc(id)}">${t("필요 없음")}</button><button class="act pri" type="button" data-a="decNeed" data-v="${esc(id)}">${t("조치 필요")}</button></div></div>`;
}
function decisionHtml(r) {
  const d = r.data,
    big = d.n >= state.cfg.deadOne;
  if (ui.dec && ui.dec.id === r.id) return decBox(r.id, [d.cause]);
  if (!d.decision)
    return big
      ? decBox(r.id, [d.cause])
      : `<div><button class="sbtn" type="button" data-a="decNeed" data-v="${r.id}">+ ${t("조치 추가")}</button></div>`;
  if (d.decision === "none")
    return `<div style="display:flex;gap:8px;align-items:center"><span class="dstate ds-none">${t("조치 필요 없음")}</span><button class="sbtn" type="button" data-a="decReset" data-v="${r.id}">${t("변경")}</button></div>`;
  const tk = (state.tasks || []).find(x => x.id === d.decision);
  if (!tk) return "";
  const done = tdLog(tdKey("task", tk.id));
  return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${done ? `<span class="dstate ds-done">${t("조치 완료")} ✓</span>` : `<span class="dstate ds-task">${t("조치 예정")} · ${tk.due === TODAY ? t("오늘") : kDate(tk.due)} · ${esc(tk.who)}</span>`}<span class="sow-meta">${tk.acts.map(t).join(", ")}</span></div>`;
}
function recRow(r) {
  return `<div class="srow"><div class="top">${icon(r.type, 1)}<div class="txt">${esc(summary(r))}${r.data && r.data.photo ? `<button type="button" class="pthumb" data-a="photoView" data-v="${r.id}"><img src="${r.data.photo}" alt=""></button>` : ""}<div class="who2">${kDate(r.workDate)} · ${esc(r.user)}${r.edited ? " · " + t("수정됨") : ""}</div></div>
  <div class="rbtns">${ui.delId === r.id ? `<button class="sbtn bad" type="button" data-a="delOk" data-v="${r.id}">${t("삭제 확정")}</button><button class="sbtn" type="button" data-a="delNo">${t("취소")}</button>` : `${EDITABLE(r.type) && can("edit", r) ? `<button class="sbtn" type="button" data-a="editRec" data-v="${r.id}">${t("수정")}</button>` : ""}${can("delete") ? `<button class="sbtn" type="button" data-a="del" data-v="${r.id}">${t("삭제")}</button>` : ""}`}</div></div></div>`;
}

/* ================= v0.3 · 돈군 · 재고 보조 ================= */
function survF(age) {
  let f = 1,
    a = age;
  state.cfg.stage.forEach(([n, len], i) => {
    if (a <= 0) return;
    f *= 1 - (LOSS[i] * Math.min(a, len)) / len;
    a -= len;
  });
  return f;
}
function batches() {
  const g = {};
  recsOf("분만")
    .slice()
    .forEach(f => {
      const k = weekStart(f.workDate);
      (g[k] = g[k] || { k, f: [] }).f.push(f);
    });
  const out = Object.values(g).map(b => ({ ...b, live: b.f.reduce((s, f) => s + f.data.live, 0) }));
  (state.mbatches || []).forEach(m => {
    const live = Math.round(m.n / survF(m.age));
    const ex = out.find(b => b.k === m.k);
    if (ex) {
      ex.live = live;
      ex.fixed = m.n;
    } else out.push({ k: m.k, f: [], live, manual: true, litters: m.litters || 0, n0: m.n });
  });
  return out.sort((a, b) => b.k.localeCompare(a.k));
}
function stockOf(it) {
  const rs = stockRecs(it).sort(
    (a, b) => a.workDate.localeCompare(b.workDate) || a.createdAt.localeCompare(b.createdAt)
  );
  if (!rs.some(r => r.type === "재고")) return { qty: null, avg: 0, days: null };
  let q = 0,
    used = 0;
  const from = addDays(TODAY, -27);
  rs.forEach(r => {
    if (r.type === "재고" && r.data.mode === "실사") {
      q = r.data.qty;
      return;
    }
    const d = delta(r);
    q += d;
    if (d < 0 && r.workDate >= from) used -= d;
  });
  const avg = used / 28;
  return { qty: Math.round(q * 10) / 10, avg, days: avg > 0 ? Math.floor(q / avg) : null };
}
const stockSt = (it, s) => (s.qty === null ? "none" : s.qty < it.par ? "bad" : s.qty < it.par * 1.3 ? "warn" : "ok");

/* v0.5 모돈 고르기: 돈사별 묶음(접기) · 작은 칸 4열 */
function sowPickGroups(c) {
  const I = ui.in,
    q = I.q.trim(),
    fold = (I.fold = I.fold || {}),
    all = activeSows().length,
    sub = c.targetN && c.targetN < all;
  const G = {},
    DONE = "오늘 입력 완료";
  c.list.forEach(x => {
    const k = x.done && !q ? DONE : x.s.loc;
    (G[k] = G[k] || []).push(x);
  });
  const keys = [
    ...SOW_LOCS.filter(l => G[l]),
    ...Object.keys(G).filter(l => !SOW_LOCS.includes(l) && l !== DONE),
    ...(G[DONE] ? [DONE] : [])
  ];
  return keys
    .map(l => {
      const L = G[l],
        tg = L.filter(x => x.target && !x.done).length,
        hasSel = L.some(x => I.sel.includes(x.s.id));
      const open =
        fold[l] !== undefined ? !fold[l] : l === DONE ? false : !!q || c.list.length <= 24 || hasSel || (sub && tg > 0);
      return `<div class="spg"><button type="button" class="spg-h ${open ? "open" : ""}" data-a="pickFold" data-v="${esc(l)}" data-open="${open ? 1 : 0}"><span>${open ? "▾" : "▸"} ${esc(t(l))}</span><small>${sub && tg ? `${t("대상")} ${tg} · ` : ""}${L.length}${t("두")}</small></button>${open ? `<div class="sowpick sp4">${L.map(x => `<button type="button" class="${I.sel.includes(x.s.id) ? "on" : ""} ${x.done ? "done" : ""} ${x.target && sub ? "tg" : ""}" data-a="pick" data-v="${x.s.id}"><b>${x.s.id}</b><small>${x.i.sub}${x.i.heat ? " ♦" : ""}</small></button>`).join("")}</div>` : ""}</div>`;
    })
    .join("");
}
Object.assign(A, {
  pickFold: (v, el) => {
    const f = (ui.in.fold = ui.in.fold || {});
    f[v] = el.dataset.open === "1";
    render();
  }
});
// ---- 입력 화면 아래 고정 칸(.dock) 접기/펴기: 화면을 가릴 때 머리줄만 남김 · 이 휴대폰에 기억 ----
let dockHid = (() => {
  try {
    return localStorage.getItem(KEY + "-dockhid") === "1";
  } catch (e) {
    return false;
  }
})();
A.dockTg = () => {
  dockHid = !dockHid;
  try {
    localStorage.setItem(KEY + "-dockhid", dockHid ? "1" : "");
  } catch (e) {}
  dockApply();
};
function dockApply() {
  document.querySelectorAll(".dock").forEach(d => {
    d.classList.toggle("hid", dockHid);
    const h = d.querySelector(".dock-hd");
    if (!h) return;
    let b = h.querySelector(".dock-tg");
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "dock-tg";
      b.dataset.a = "dockTg";
      h.appendChild(b);
    }
    b.textContent = dockHid ? "▲ " + t("펼치기") : "▼ " + t("접기");
  });
}
AFTER_RENDER.push(dockApply);
