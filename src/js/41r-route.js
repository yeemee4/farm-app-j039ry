/* ===== 할 일 '걷는 순서' 보기 (2026-11-01 대표 선택: A안 · 묶어서 한 번에 체크) =====
   할 일을 돈사를 걷는 순서(FARM.barns → 그 밖 위치 → 사료 빈 → 사무실)로 묶는다. 한 줄 = 그 돈사의 같은 종류 일.
   줄을 누르면 그 돈사 것만 걸러 기존 할 일 창(openTodo(k, barn)), 오른쪽 동그라미 = 완료 체크(여러 두면 고르는 창, 기본 전부).
   보기 선택은 휴대폰마다(localStorage farm-todoview), 처음엔 작업자 = 걷는 순서, 대표·팀장 = 종류별 */
const RT_FEED = "사료 빈",
  RT_ETC = "사무실 · 기타";
// 할 일 종류 → [아이콘 종류, 짧은 이름]
const RT_KIND = {
  pending: ["폐사", "폐사 조치 판단"],
  handover: ["특이사항", "인계 메모"],
  closemiss: ["특이사항", "기록 누락"],
  binempty: ["사료", "빈 입고 확인"],
  regu: ["약품", "레규메이트 급여"],
  regumate: ["교배", "정시 교배"],
  feedchk: ["사료", "사료 잔량 점검"],
  feeddev: ["사료", "급여 점검"],
  gfchg: ["사료", "급여량 변경"],
  bcsdue: ["BCS", "BCS"],
  task: ["폐사", "폐사 후 조치"],
  am: ["특이사항", "아침 점검"],
  farrow: ["분만", "분만"],
  movein: ["이동", "분만사 입식"],
  lit: ["약품", "복별 처치"],
  svax: ["백신", "백신"],
  bvax: ["돈군백신", "돈군 백신"],
  annual: ["백신", "일괄 백신"],
  mate2: ["교배", "2차 교배"],
  mate: ["교배", "교배"],
  remate: ["교배", "재교배"],
  ret: ["임신확인", "임신 확인"],
  wean: ["이유", "이유"],
  order: ["재고", "정액 주문"],
  feedord: ["사료", "사료 주문"],
  feedchg: ["사료", "사료 변경"],
  stock: ["재고", "재고 부족"],
  withdraw: ["약품", "휴약 종료"],
  cull: ["도태", "도태"]
};
// 체크 칸이 없는 일(기록하면 저절로 없어짐) → 동그라미도 할 일 창을 연다
const RT_NOCK = ["pending", "am", "feedchk", "regu", "regumate", "closemiss"];
function todoView() {
  if (ui.todoView) return ui.todoView;
  let v = null;
  try {
    v = localStorage.getItem("farm-todoview");
  } catch (e) {}
  return v || ((me() || {}).role === "worker" ? "route" : "kind");
}
function routeBarn(it, k) {
  if (it.rg || it.rgm) return "교배사";
  if (it.s) return it.s.loc || RT_ETC;
  if (it.b) return stagePlan(bAge(it.b));
  if (it.fc) return stagePlan(bAge(it.fc.b));
  if (it.am) return it.am.barn;
  if (it.feed || it.fc2 || it.emp || it.fdv || k === "feedord") return RT_FEED;
  if (it.t) return FARM.barns.find(b => (it.t.title || "").includes(b)) || RT_ETC; // 폐사 후 조치: 제목에 든 돈사
  if (!it.pending && it.r && it.r.data && it.r.data.barn) return it.r.data.barn;
  return RT_ETC;
}
function routeGroups(todos) {
  const B = {};
  todos.forEach(x =>
    x.items.forEach(it => {
      const g = (B[routeBarn(it, x.k)] = B[routeBarn(it, x.k)] || {});
      (g[x.k] = g[x.k] || { x, items: [] }).items.push(it);
    })
  );
  const other = Object.keys(B)
    .filter(b => !FARM.barns.includes(b) && b !== RT_FEED && b !== RT_ETC)
    .sort();
  return [...FARM.barns, ...other, RT_FEED, RT_ETC].filter(b => B[b]).map(b => ({ b, rows: Object.values(B[b]) }));
}
const rtLeft = r =>
  RT_NOCK.includes(r.x.k) ? r.items.length : r.items.filter(it => !tdLog(tdKey(r.x.k, itemTarget(it)))).length;
const rtPlain = s => String(s || "").replace(/<[^>]+>/g, "");
function rtRow(r, b) {
  const k = r.x.k,
    [ic, nm] = RT_KIND[k] || ["조치", r.x.t],
    n = r.items.length,
    left = rtLeft(r),
    done = !left && !RT_NOCK.includes(k),
    ids = r.items.map(itemShort),
    shown = ids.slice(0, 6).join(" · ") + (n > 6 ? ` … (${n})` : ""),
    sub = n === 1 ? rtPlain(r.items[0].label) : left < n ? `${n - left}/${n} ${t("완료")}` : `${n}${t("건")}`,
    v = esc(k + "|" + b);
  return `<div class="rt-row${done ? " done" : ""}"><button type="button" class="rt-main" data-a="rtOpen" data-v="${v}">${icon(ic)}<span class="rt-tx"><b>${esc(shown)}</b><span>${esc(t(nm))}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</span></button><button type="button" class="rt-ck${done ? " on" : ""}" data-a="rtCk" data-v="${v}" aria-label="${t("완료")}">${done ? "✓" : ""}</button></div>`;
}
function vTodoRoute(todos) {
  const G = routeGroups(todos),
    rows = G.flatMap(g => g.rows),
    tot = rows.reduce((s, r) => s + r.items.length, 0),
    left = rows.reduce((s, r) => s + rtLeft(r), 0);
  let h = `<div class="rt-hd"><span><b>${tot - left}/${tot}</b> ${t("완료")} · ${t("돈사")} ${G.length}${t("곳")}</span><div class="rt-bar"><i style="width:${tot ? ((tot - left) / tot) * 100 : 0}%"></i></div></div>`;
  if (!G.length) return h + `<div class="empty">${t("오늘 할 일이 없습니다.")}</div>`;
  G.forEach((g, i) => {
    const gl = g.rows.reduce((s, r) => s + rtLeft(r), 0);
    h += `<div class="rt-barn"><div class="rt-bh"><span class="rt-no">${i + 1}</span><b>${esc(t(g.b))}</b><span class="rt-cnt${gl ? "" : " ok"}">${gl || "✓"}</span></div>${g.rows.map(r => rtRow(r, g.b)).join("")}</div>`;
  });
  return h;
}
function rtItems(k, b) {
  const x = buildTodos().find(q => q.k === k);
  return x ? { x, items: x.items.filter(it => routeBarn(it, k) === b) } : null;
}
// 여러 두 묶음 체크: 안 끝난 것은 기본 전부 선택, 빼고 싶은 것만 누름
function rtSheet(k, b) {
  const r = rtItems(k, b);
  if (!r) return;
  const nm = (RT_KIND[k] || [0, r.x.t])[1],
    rows = r.items
      .map(it => {
        const key = tdKey(k, itemTarget(it)),
          log = tdLog(key);
        return `<label class="ckbox rt-pick${log ? " done" : ""}"><input type="checkbox" data-rtk="${esc(key)}" ${log ? "checked disabled" : "checked"}><span><b>${esc(itemShort(it))}</b> ${log ? `· ${t("완료")} ${esc(log.user)}` : `<small>${esc(rtPlain(it.label))}</small>`}</span></label>`;
      })
      .join("");
  ctx = null;
  $("#sheetRoot").innerHTML =
    `<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t(nm))}"><div class="sh-hd"><h2>${esc(t(nm))} · ${esc(t(b))}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd"><div class="note">${t("끝낸 것만 체크된 채로 두고 완료를 누르세요.")}</div>${rows}<div class="acts"><button class="act pri" type="button" data-a="rtDone" data-v="${esc(k + "|" + b)}" style="flex:1;padding:14px">✓ ${t("완료")}</button><button class="act" type="button" data-a="rtOpen" data-v="${esc(k + "|" + b)}">${t("자세히 · 기록 입력")} ›</button></div></div></div></div>`;
}
Object.assign(A, {
  tdView: v => {
    ui.todoView = v;
    try {
      localStorage.setItem("farm-todoview", v);
    } catch (e) {}
    render();
  },
  rtOpen: v => {
    const i = v.indexOf("|");
    openTodo(v.slice(0, i), v.slice(i + 1));
  },
  rtCk: v => {
    const i = v.indexOf("|"),
      k = v.slice(0, i),
      b = v.slice(i + 1),
      r = rtItems(k, b);
    if (!r || !r.items.length) return;
    if (RT_NOCK.includes(k)) return openTodo(k, b);
    if (r.items.length > 1) return rtSheet(k, b);
    const it = r.items[0],
      key = tdKey(k, itemTarget(it));
    if (tdLog(key)) tdUnmark(key);
    else tdMark(key, r.x.t, tdName(it), it.s && it.s.id);
    save();
    render();
    toast(tdLog(key) ? t("조치 완료로 기록했습니다") : t("완료를 취소했습니다"));
  },
  rtDone: v => {
    const i = v.indexOf("|"),
      k = v.slice(0, i),
      r = rtItems(k, v.slice(i + 1));
    if (!r) return;
    const on = new Set([...document.querySelectorAll("[data-rtk]:checked:not(:disabled)")].map(e => e.dataset.rtk));
    let n = 0;
    r.items.forEach(it => {
      const key = tdKey(k, itemTarget(it));
      if (on.has(key) && !tdLog(key)) {
        tdMark(key, r.x.t, tdName(it), it.s && it.s.id);
        n++;
      }
    });
    save();
    closeSheet();
    render();
    if (n) toast(`${n}${t("건")} ${t("조치 완료로 기록했습니다")}`);
  }
});
