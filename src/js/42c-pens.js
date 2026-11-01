/* ===== 돈군 돈사 배치도 (인큐베이터·자돈사·육성비육사, FARM.pens 05) =====
   대표 그림(2026-11-01)을 앱이 직접 그림. 방 = 돈군이 들어가는 칸. 방에 든 돈군 = state.penOf["돈사|방"] = 돈군 키
   배치도 탭에서 모돈 돈사와 같은 칩으로 고름 · act 를 주면 방을 눌러 고르기(돈군 추가) */
const PEN_BARNS = () => Object.keys(FARM.pens || {});
// 배율: 처음엔 휴대폰 폭에 맞춤, ＋－ 로 키움(ui.penZ = 맞춤의 몇 배)
const penZ = b => Math.max(8, Math.floor((Math.min(innerWidth, 720) - 50) / (FARM.pens[b].w + 1.2)) * (ui.penZ || 1));
function pensOf(b) {
  const L = FARM.pens[b],
    P = [];
  if (!L) return P;
  L.rows.forEach(r => {
    for (let k = 0; k < r.n; k++)
      P.push({
        id: r.id + (k + 1),
        x: r.v ? r.x : r.x + k * r.pw,
        y: r.v ? r.y + k * r.ph : r.y,
        w: r.pw,
        h: r.ph
      });
  });
  return P;
}
const penBatch = (b, id) => (state.penOf || {})[b + "|" + id] || "";
function vPenSvg(b, z, act) {
  const L = FARM.pens[b],
    M = v => v * z;
  let g = `<svg viewBox="${-0.6 * z} ${-0.6 * z} ${M(L.w + 1.2)} ${M(L.h + 1.2)}" width="${M(L.w + 1.2)}" class="bm-svg" role="img" aria-label="${esc(t(b))}"><rect x="0" y="0" width="${M(L.w)}" height="${M(L.h)}" class="bm-wall"/>`;
  (L.areas || []).forEach(
    a =>
      (g += `<rect x="${M(a.x)}" y="${M(a.y)}" width="${M(a.w)}" height="${M(a.h)}" class="bm-aisle"/>${a.l ? `<text x="${M(a.x + a.w / 2)}" y="${M(a.y + a.h / 2) + 4}" class="bm-al">${esc(t(a.l))}</text>` : ""}`)
  );
  pensOf(b).forEach(p => {
    const k = penBatch(b, p.id),
      x = k && liveBatches().find(y => y.k === k),
      cx = M(p.x + p.w / 2),
      cy = M(p.y + p.h / 2);
    g += `<g class="pen ${x ? "on" : ""}" data-a="${act || "penTap"}" data-v="${esc(b)}|${p.id}" role="button" tabindex="0"><rect x="${M(p.x) + 2}" y="${M(p.y) + 2}" width="${M(p.w) - 4}" height="${M(p.h) - 4}" rx="6"/><text x="${cx}" y="${cy - (x ? 6 : -6)}" class="pen-no">${p.id}${t("방")}</text>${x ? `<text x="${cx}" y="${cy + 16}" class="pen-in">${esc(bName(x.k).replace(" 돈군", ""))} · ${bHeads(x, bAge(x))}${t("두")}</text>` : ""}</g>`;
  });
  return g + bmDoors(L, M, z, 0) + `</svg>`;
}
// 배치도 탭에서 돈군 돈사를 고르면: 방 그림 + 이 돈사에 있는 돈군(주령으로 계산) 목록
function vPenMap(b) {
  const z = penZ(b),
    Bs = liveBatches().filter(x => stagePlan(bAge(x)) === b),
    hd = Bs.reduce((n, x) => n + bHeads(x, bAge(x)), 0),
    P = pensOf(b);
  return `<div class="bm-head"><span>${P.length}${t("방")} · ${t("방당")} ${FARM.pens[b].head}${t("두")} ${t("기준")} · ${t("지금")} ${hd}${t("두")} (${Bs.map(x => esc(bName(x.k).replace(" 돈군", ""))).join(", ") || t("비어 있음")})</span><span class="bm-z"><button type="button" class="sbtn" data-a="penZoom" data-v="-0.8" aria-label="${t("축소")}">－</button><button type="button" class="sbtn" data-a="penZoom" data-v="0.8" aria-label="${t("확대")}">＋</button></span></div><div class="bm-wrap">${vPenSvg(b, z)}</div><div class="note">${t("방 크기·번호 순서는 그림을 보고 짐작한 것입니다(확인 필요).")}</div>`;
}
Object.assign(A, {
  penZoom: v => {
    ui.penZ = Math.max(1, Math.min(4, (ui.penZ || 1) + +v));
    render();
  },
  penTap: v => {
    const [b, id] = v.split("|"),
      k = penBatch(b, id);
    toast(`${t(b)} ${id}${t("방")} · ${k ? bName(k) : t("비어 있음")}`);
  }
});
