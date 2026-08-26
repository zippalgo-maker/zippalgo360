import type { ZipteriorApartmentType, ZipteriorComplexDetailOut } from "@/lib/types";

// 집테리어 지도(js/app.js)의 point()/arcPath()/selectedIcon()을 그대로
// 옮긴 것 — 마커 클릭 시 뜨는 "부챗살(fan)" 모양 SVG를 만든다. 원본과
// 똑같은 좌표계(중심 110,82 / 내경 31 / 외경 78)를 써서 시각적으로
// 동일하게 나오게 한다.
const FAN_COLORS = [
  "#173b31",
  "#21463b",
  "#2f5c4e",
  "#447466",
  "#5b8a79",
  "#1f5143",
  "#2d6555",
  "#3c7967",
  "#57907d",
  "#75a593",
];

function point(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r1: number, r2: number, start: number, end: number) {
  const p1 = point(cx, cy, r2, start);
  const p2 = point(cx, cy, r2, end);
  const p3 = point(cx, cy, r1, end);
  const p4 = point(cx, cy, r1, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string)
  );
}

function fanTypeLabel(type: ZipteriorApartmentType): string {
  return `${type.area}${type.type === "A" ? "" : type.type}`;
}

/** 지도 위 기본 마커("시공 N" 원형 배지) — 집테리어와 동일한 디자인. */
export function buildCountMarkerHtml(count: number, title?: string): string {
  return `<div class="zpi-count-marker"${title ? ` title="${escapeHtml(title)}"` : ""}><span class="zpi-marker-copy">시공</span><span class="zpi-marker-number">${count}</span></div>`;
}

/** 마커 클릭 시 뜨는 부챗살(fan) 마커 — 평형 타입별 조각으로 나뉜다. */
export function buildFanMarkerHtml(complex: ZipteriorComplexDetailOut, activeArea?: string | null): string {
  const shown = complex.apartment_types.slice(0, 10);
  const step = shown.length ? 360 / shown.length : 0;
  const wedges = shown
    .map((type, index) => {
      const start = -90 + index * step + 1;
      const end = -90 + (index + 1) * step - 1;
      const mid = (start + end) / 2;
      const pos = point(110, 82, 57, mid);
      const active = activeArea && `${type.area}|${type.type}` === activeArea;
      return `<g class="zpi-fan-sector${active ? " active" : ""}" data-area="${escapeHtml(type.area)}" data-type="${escapeHtml(type.type)}" role="button" tabindex="0">
        <path d="${arcPath(110, 82, 31, 78, start, end)}" fill="${FAN_COLORS[index % FAN_COLORS.length]}" stroke="#fff" stroke-width="1"/>
        <text class="zpi-fan-label" x="${pos.x}" y="${pos.y - 2}">${escapeHtml(fanTypeLabel(type))}</text>
        <text class="zpi-fan-label zpi-fan-count" x="${pos.x}" y="${pos.y + 9}">${type.count}건</text>
      </g>`;
    })
    .join("");
  const more =
    complex.apartment_types.length > 10
      ? `<button class="zpi-fan-more" type="button" data-fan-more="1">더보기 +${complex.apartment_types.length - 10}</button>`
      : "";
  return `<div class="zpi-selected-wrap">
    <div class="zpi-selected-name"><span data-fan-open-basic="1">${escapeHtml(complex.name)}</span><button class="zpi-fan-close" type="button" data-fan-close="1" aria-label="부챗살 마커 닫기">×</button></div>
    <svg class="zpi-fan-svg" viewBox="0 0 220 164">${wedges}</svg>
    <div class="zpi-selected-sign" data-fan-open-basic="1"><small>시공</small><span>${complex.portfolio_count}건</span></div>
    ${more}
  </div>`;
}
