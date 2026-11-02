/* ===== 돈군 탭 › + 돈군 추가 (대표 그림 2026-11-01, 모돈 추가 61a 와 같은 흐름) =====
   돈사 고르기 → 배치도(42c)에서 방 누르기 → 돈군 카드(태어난 날·이 방 두수·복수·평균 체중·이미 맞은 백신·메모) → 저장.
   한 돈군(분만 주)이 여러 방에 나뉠 수 있어 두수는 방마다(state.penN["돈사|방"]), 돈군 전체 = 그 돈군 방들의 합 → state.mbatches.
   맞은 백신은 '돈군백신' 기록(data.init)으로. 숫자 칸은 앱 숫자판(61a saPadHtml). 저장 안 하고 나가면 물음 */
// 태어난 날 ‘1/2’ → 오늘 이전 가장 가까운 그 날(올해 또는 작년)
function baDate(v) {
  const md = saMD(v);
  if (!md) return "";
  let d = `${TODAY.slice(0, 4)}-${md.slice(0, 2)}-${md.slice(2)}`;
  if (d > TODAY) d = `${+TODAY.slice(0, 4) - 1}-${md.slice(0, 2)}-${md.slice(2)}`;
  return d;
}
function baPenSum(k) {
  return Object.entries(state.penOf || {})
    .filter(([, x]) => x === k)
    .reduce((s, [pk]) => s + (+(state.penN || {})[pk] || 0), 0);
}
// 나이·계획 위치 (태어난 날을 바꾸면 이 칸만 다시 씀 — 화면 전체를 다시 그리면 숫자판 초점이 사라짐)
function baInfo() {
  const W = ui.ba,
    born = baDate(W.d.born),
    age = born ? Math.floor(diff(weekStart(born), TODAY) / 7) : null,
    plan = age != null ? stagePlan(age) : "";
  return `${born ? `${kDate(born)} · ${age}${t("주령")} · ${esc(bName(weekStart(born)))} · ${t("계획")} ${esc(t(plan))}${plan !== W.b ? ` <b class="dv-warn">(${t("지금 방과 다름")})</b>` : ""}` : `<span class="sow-meta">${t("태어난 날을 넣으면 계산됩니다")}</span>`}`;
}
function vBatchAdd() {
  const W = ui.ba,
    hd = (back, ti) =>
      `<div class="pagehd"><button class="back" type="button" data-a="baBack" data-v="${back}">‹ ${t(back === "x" ? "돈군" : "이전")}</button><h2>${ti}</h2></div>`;
  if (W.step === "barn")
    return (
      hd("x", t("돈군 추가")) +
      `<div class="su-q">${t("어느 돈사에 있나요?")}</div><div class="sa-barns">${PEN_BARNS()
        .map(b => `<button type="button" class="act" data-a="baBarn" data-v="${esc(b)}">${esc(t(b))}</button>`)
        .join("")}</div>`
    );
  if (W.step === "pen")
    return (
      hd("barn", esc(t(W.b))) +
      `<div class="su-q">${t("이 돈군이 있는 방을 누르세요")}</div><div class="bm-head"><span>${t("돈군이 있는 방은 이름이 보입니다 · 누르면 고칩니다")}</span><span class="bm-z"><button type="button" class="sbtn" data-a="penZoom" data-v="-1" aria-label="${t("축소")}">－</button><button type="button" class="sbtn" data-a="penZoom" data-v="1" aria-label="${t("확대")}">＋</button></span></div><div class="bm-wrap">${vPenSvg(W.b, penZ(W.b), "baPen")}</div>`
    );
  // 카드
  const d = W.d,
    num = (k, l, u, ph) =>
      `<tr><th class="sc-l">${t(l)}</th><td><div class="ba-row"><input class="sa-in ba-in" size="1" type="text" inputmode="none" data-numpad="1" data-ba="${k}" value="${esc(d[k] ?? "")}" placeholder="${ph || ""}" aria-label="${t(l)}">${u ? `<small>${t(u)}</small>` : ""}</div></td></tr>`;
  let h = hd("pen", `${esc(t(W.b))} ${esc(W.pen)}${t("방")}`);
  h += `<div class="sowcard"><div class="sc-hd"><div class="sc-t">${t("돈군 카드")}</div></div><table class="sc-tb sa-tb ba-tb"><tbody>
    ${num("born", "태어난 날", "", t("월/일"))}
    <tr><th class="sc-l">${t("나이·계획 위치")}</th><td class="ba-info">${baInfo()}</td></tr>
    ${num("n", "이 방 두수", "두")}
    ${num("litters", "복수(선택)", "복")}
    ${num("kg", "평균 체중(선택)", "kg")}
    <tr><th class="sc-l">${t("맞은 백신")}</th><td class="ba-vax">${state.cfg.prog
      .map(
        p =>
          `<label class="ckbox"><input type="checkbox" data-bav="${esc(p.name)}" ${(d.vax || []).includes(p.name) ? "checked" : ""}><span>${esc(p.name)} <small class="sow-meta">${p.day}${t("일령")}</small></span></label>`
      )
      .join("")}</td></tr>
    <tr><th class="sc-l">${t("메모")}</th><td><input class="sa-in" size="1" type="text" data-ba="memo" value="${esc(d.memo || "")}" aria-label="${t("메모")}"></td></tr>
  </tbody></table></div>`;
  h += `<div class="acts sa-save"><button class="act pri" type="button" data-a="baSave" style="flex:1;padding:14px">${t("저장")}</button></div>`;
  return h + saPadHtml();
}
// 저장: 이 방 = 이 돈군(penOf·penN) → 돈군 전체 두수 = 방들의 합 → mbatches · 맞은 백신 → 돈군백신 기록
function baCommit() {
  const W = ui.ba,
    d = W.d,
    born = baDate(d.born),
    n = +d.n || 0;
  if (!born || !n) {
    toast(t("태어난 날과 이 방 두수를 넣어 주세요"));
    return false;
  }
  const k = weekStart(born),
    pk = W.b + "|" + W.pen,
    old = (state.penOf || {})[pk];
  state.penOf = state.penOf || {};
  state.penN = state.penN || {};
  state.penOf[pk] = k;
  state.penN[pk] = n;
  const fix = kk => {
    const tot = baPenSum(kk),
      m = (state.mbatches || []).find(x => x.k === kk);
    state.mbatches = (state.mbatches || []).filter(x => x.k !== kk);
    if (tot) state.mbatches.push({ ...(m || {}), k: kk, age: Math.floor(diff(kk, TODAY) / 7), n: tot });
  };
  fix(k);
  if (old && old !== k) fix(old);
  const m = state.mbatches.find(x => x.k === k);
  if (+d.litters) m.litters = +d.litters;
  if (+d.kg) m.kg = +d.kg;
  if (d.memo) m.memo = d.memo;
  // 맞은 백신: 돈군 하나에 한 번씩(다시 저장해도 안 겹침)
  const want = new Set(d.vax || []);
  state.records = state.records.filter(
    r => !(r.type === "돈군백신" && r.data.init && r.data.batch === k && !want.has(r.data.vax))
  );
  state.cfg.prog.forEach(p => {
    if (!want.has(p.name) || recsOf("돈군백신").some(r => r.data.batch === k && r.data.vax === p.name)) return;
    const wd = addDays(k, p.day) > TODAY ? TODAY : addDays(k, p.day);
    state.records.push({
      id: "bi" + fnvS(k + p.name),
      type: "돈군백신",
      workDate: wd,
      createdAt: new Date().toISOString(),
      user: state.user,
      data: { batch: k, vax: p.name, prod: p.prod, n: m.n, init: true }
    });
  });
  save();
  W.dirty = false;
  toast(`${bName(k)} · ${W.pen}${t("방")} ${n}${t("두")} ${t("저장했습니다")}`);
  return true;
}
function baLeave(go) {
  const W = ui.ba;
  if (W && W.dirty && confirm(t("저장하지 않은 내용이 있습니다. 저장할까요?")) && !baCommit()) return;
  if (W) W.dirty = false;
  go();
  render();
  window.scrollTo(0, 0);
}
BEFORE_RENDER.push(() => {
  if (ui.ba && tab !== "batch") {
    if (ui.ba.dirty && confirm(t("저장하지 않은 내용이 있습니다. 저장할까요?"))) baCommit();
    ui.ba = null;
  }
});
document.addEventListener("input", e => {
  const x = e.target;
  if (!ui.ba || !ui.ba.d || !x.dataset) return;
  if (x.dataset.ba) {
    const k = x.dataset.ba;
    if (k === "n" || k === "litters") x.value = x.value.replace(/\D/g, "");
    else if (k === "kg") x.value = x.value.replace(/[^0-9.]/g, "");
    else if (k === "born") x.value = x.value.replace(/[^0-9/.\- ]/g, "");
    ui.ba.d[k] = x.value;
    ui.ba.dirty = true;
  }
});
document.addEventListener("change", e => {
  const x = e.target;
  if (!ui.ba || !ui.ba.d || !x.dataset) return;
  if (x.dataset.bav != null) {
    const v = new Set(ui.ba.d.vax || []);
    x.checked ? v.add(x.dataset.bav) : v.delete(x.dataset.bav);
    ui.ba.d.vax = [...v];
    ui.ba.dirty = true;
  } else if (x.dataset.ba === "born") {
    const c = document.querySelector(".ba-info");
    if (c) c.innerHTML = baInfo();
  }
});
Object.assign(A, {
  batchAdd: () => {
    ui.ba = { step: "barn" };
    render();
    window.scrollTo(0, 0);
  },
  baBack: v =>
    baLeave(() => {
      if (v === "x") ui.ba = null;
      else ui.ba.step = v;
    }),
  baBarn: v => {
    ui.ba.b = v;
    ui.ba.step = "pen";
    render();
    window.scrollTo(0, 0);
  },
  baPen: v => {
    const [b, pen] = v.split("|"),
      pk = v,
      k = (state.penOf || {})[pk],
      m = k && (state.mbatches || []).find(x => x.k === k);
    ui.ba.pen = pen;
    ui.ba.d = k
      ? {
          born: +k.slice(5, 7) + "/" + +k.slice(8, 10),
          n: String((state.penN || {})[pk] || ""),
          litters: m && m.litters ? String(m.litters) : "",
          kg: m && m.kg ? String(m.kg) : "",
          memo: (m && m.memo) || "",
          vax: recsOf("돈군백신")
            .filter(r => r.data.batch === k)
            .map(r => r.data.vax)
        }
      : { born: "", n: "", vax: [] };
    ui.ba.dirty = false;
    ui.ba.step = "card";
    render();
    window.scrollTo(0, 0);
  },
  baSave: () => {
    if (!baCommit()) return;
    ui.ba.step = "pen";
    render();
    window.scrollTo(0, 0);
  }
});
