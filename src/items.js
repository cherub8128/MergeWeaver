import { VectorSprites, ItemSprites } from "./assets.js";
import { ARROW_COLOR } from "./arrowColors.js";

export const COLOR_PALETTE = Array.from({ length: 40 }, (_, i) => {
  const hue = i * 9;
  return {
    name: `color-${hue}`,
    bg: `background-color: hsl(${hue}, 80%, 55%);`,
    border: `border-color: hsl(${hue}, 80%, 70%);`,
  };
});

export function getVectorColorInfo(vx, vy) {
  if (vx === 0 && vy === 0) {
    return {
      name: "gray",
      bg: "background-color: #4B5563;",
      border: "border-color: #6B7280;",
    };
  }
  const angle = ((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360;
  const index = Math.round(angle / 9) % 40;
  return COLOR_PALETTE[index];
}

export function getStageColorPalette(stage) {
  const colorCount = Math.min(40, 4 + Math.floor((stage - 1) / 10) * 4);
  const step = Math.floor(40 / colorCount);
  return Array.from({ length: colorCount }, (_, i) => COLOR_PALETTE[i * step]);
}

export const REMOVER_COLORS = [
  { bg: "bg-green-900/50", border: "border-green-500" },
  { bg: "bg-green-800/50", border: "border-green-400" },
  { bg: "bg-green-700/50", border: "border-green-300" },
  { bg: "bg-emerald-700/50", border: "border-emerald-300" },
  { bg: "bg-teal-700/50", border: "border-teal-300" },
  { bg: "bg-cyan-700/50", border: "border-cyan-300" },
  { bg: "bg-sky-700/50", border: "border-sky-300" },
];

export function createVectorItemHTML(vx, vy) {
  const angle = ((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360;
  const index = Math.round(angle / 9) % 40;
  const color = ARROW_COLOR[index] || "rgba(0,0,0,.35)";
  const shadow =
    vx === 0 && vy === 0
      ? "filter: drop-shadow(0 0 8px rgba(0,0,0,.35));"
      : `filter: drop-shadow(0 0 10px ${color}) drop-shadow(0 2px 2px rgba(0,0,0,.10));`;
  const path = VectorSprites.pathFromVector(vx, vy);
  const onerr = "this.onerror=null; this.src='assets/vectors/arrow_000.png';";
  if (vx === 0 && vy === 0) {
    return `<div class="item vector shadow-lg text" data-item-type="vector" data-vx="0" data-vy="0">
      <img src="${path}" onerror="${onerr}" alt="(0,0) vector" style="${shadow}"/>
      <span class="text-[10px] font-bold opacity-70">(0,0)</span>
    </div>`;
  }
  return `<div class="item vector shadow-lg text" data-item-type="vector" data-vx="${vx}" data-vy="${vy}">
    <img src="${path}" onerror="${onerr}" alt="(${vx},${vy})" style="${shadow}"/>
    <span class="text-[10px] font-bold opacity-70">(${vx},${vy})</span>
  </div>`;
}

export function createPouchItemHTML(c = 10) {
  return `<div class="item pouch" data-item-type="pouch" data-count="${c}">
    <div class="count-badge"> ${c} </div>
    <img src="${ItemSprites.pouch}" alt="pouch"/>
    <span class="item-name text-xs font-bold">소환구슬</span>
  </div>`;
}

export function createResidueItemHTML(t) {
  const tierClass = `residue-${Math.min(t, 3)}`;
  return `<div class="item shadow-inner ${tierClass}" data-item-type="residue" data-tier="${t}">
    <div class="count-badge">Lv.${t}</div>
    <img src="${ItemSprites.crystal}" alt="residue"/>
    <span class="item-name text-xs font-bold">정령 결정</span>
  </div>`;
}

export function createRecyclerItemHTML(t, c) {
  const count = c || 3;
  return `<div class="item shadow-lg recycler" data-item-type="recycler" data-tier="${t}" data-count="${count}">
    <div class="count-badge">x${count}</div>
    <img src="${ItemSprites.recycler}" alt="recycler"/>
    <span class="item-name text-xs font-bold">마법서 Lv.${t}</span>
  </div>`;
}

export function createScalarItemHTML(v) {
  const key = v === -1 ? "scalar_n1" : "scalar_n1";
  return `<div class="item scalar text-gray-800" data-item-type="scalar" data-value="${v}">
    <img src="${ItemSprites[key]}" alt="scalar ${v}"/>
    <span class="text-xs font-bold">거울</span>
  </div>`;
}

export function createObstacleItemHTML(c, h) {
  const e = btoa(unescape(encodeURIComponent(h)));
  let arrowIndex = null;
  if (c?.name?.startsWith("color-")) {
    const hue = Number(c.name.split("-")[1]);
    if (!Number.isNaN(hue)) {
      arrowIndex = Math.round(hue / 9) % 40;
    }
  }
  const arrowColor =
    typeof arrowIndex === "number" ? ARROW_COLOR[arrowIndex] : null;
  const backgroundStyle = arrowColor
    ? `background-color: ${arrowColor};`
    : c.bg || "";
  const borderStyle = c.border || "";
  return `<div class="item border-4 shadow-lg" style="${backgroundStyle} ${borderStyle}" data-item-type="obstacle" data-color-name="${c.name}" data-hidden-item="${e}">
    <img src="${ItemSprites.obstacle}" alt="obstacle"/>
  </div>`;
}
