import { ItemSprites, VectorSprites } from "./assets.js";
import { getVectorColorInfo } from "./items.js";

const WALL_VARIANTS = [
  { src: "assets/map/wall_tree_a.png", weight: 3 }, // 가중치 3
  { src: "assets/map/wall_tree_b.png", weight: 2 },
  { src: "assets/map/wall_tree_c.png", weight: 1 },
  { src: "assets/map/wall_tree_d.png", weight: 1 },
];
const TOTAL_WALL_WEIGHT = WALL_VARIANTS.reduce(
  (acc, variant) => acc + variant.weight,
  0
);
const WALL_ROTATIONS = [0, 90, 180, 270];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickTreeFor(x, y, seed = 20250301) {
  const mix = ((x + 10007) * 73856093) ^ ((y + 10009) * 19349663) ^ seed;
  const random = mulberry32(mix);

  let pick = random() * (TOTAL_WALL_WEIGHT || 1);
  let chosen = WALL_VARIANTS[WALL_VARIANTS.length - 1].src;
  for (const variant of WALL_VARIANTS) {
    pick -= variant.weight;
    if (pick <= 0) {
      chosen = variant.src;
      break;
    }
  }

  const rot = 0; // 나무 이미지는 회전하지 않도록 고정
  const flip = random() < 0.5 ? -1 : 1;
  return { src: chosen, rot, flip };
}

export function applyWallSprites(root = document.getElementById("map-grid")) {
  const cells = root.querySelectorAll(".grid-cell");
  cells.forEach((cell) => {
    const x = Number(cell.dataset.x),
      y = Number(cell.dataset.y);
    if (cell.classList.contains("passable")) {
      cell.style.removeProperty("--wall-img");
      cell.style.removeProperty("--wall-rot");
      cell.style.removeProperty("--wall-flip");
    } else {
      const { src, rot, flip } = pickTreeFor(x, y);
      cell.style.setProperty("--wall-img", `url('${src}')`);
      cell.style.setProperty("--wall-rot", `${rot}deg`);
      cell.style.setProperty("--wall-flip", `${flip}`);
    }
  });
}

export function drawMapCoords(containerX, containerY, gridSize) {
  containerX.innerHTML = "";
  containerY.innerHTML = "";
  for (let i = 0; i < gridSize; i++) {
    const xEl = document.createElement("div");
    xEl.className = "map-coord font-orbitron";
    xEl.textContent = i;
    containerX.appendChild(xEl);
    const yEl = document.createElement("div");
    yEl.className = "map-coord";
    yEl.textContent = gridSize - 1 - i;
    containerY.appendChild(yEl);
  }
}

export function updateUI(
  { gridEl, gridSize, containerEl, playerEl, targetEl, state },
  renderMapItems
) {
  const ro = new ResizeObserver((entries) => {
    if (!entries.length || entries[0].contentRect.width === 0) return;
    const boxSize = entries[0].contentRect.width;
    const cellSize = boxSize / gridSize;
    containerEl.style.setProperty("--cell-size", `${cellSize}px`);
    playerEl.style.transform = `translate(${state.playerPos.x * cellSize}px, ${
      (gridSize - 1 - state.playerPos.y) * cellSize
    }px)`;
    targetEl.style.setProperty(
      "--tw-translate",
      `translate(${state.targetPos.x * cellSize}px, ${
        (gridSize - 1 - state.targetPos.y) * cellSize
      }px)`
    );
    renderMapItems(cellSize);
  });
  ro.observe(gridEl);
}

export function makeRenderMapItems({
  gridEl,
  itemsContainer,
  state,
  gridSize,
}) {
  return function renderMapItems(cellSize) {
    itemsContainer.innerHTML = "";
    const gridCells = gridEl.children;
    for (const cell of gridCells) {
      cell.classList.remove("passable");
    }

    const occupied = new Set();
    occupied.add(`${state.playerPos.x},${state.playerPos.y}`);
    occupied.add(`${state.targetPos.x},${state.targetPos.y}`);

    if (state.currentStageGem && !state.currentStageGem.collected) {
      const gem = state.currentStageGem;
      occupied.add(`${gem.x},${gem.y}`);
      const gemEl = document.createElement("div");
      gemEl.className = "map-item";
      gemEl.id = `gem-${gem.id}`;
      gemEl.style.transform = `translate(${gem.x * cellSize}px, ${
        (gridSize - 1 - gem.y) * cellSize
      }px)`;
      const img = document.createElement("img");
      img.src = ItemSprites.gems[gem.id];
      img.className = "w-3/4 h-3/4";
      gemEl.appendChild(img);
      itemsContainer.appendChild(gemEl);
    }

    state.mapItems.forEach((item) => {
      occupied.add(`${item.x},${item.y}`);
      const itemEl = document.createElement("div");
      itemEl.className = "map-item";
      itemEl.id = item.id;
      itemEl.style.transform = `translate(${item.x * cellSize}px, ${
        (gridSize - 1 - item.y) * cellSize
      }px)`;
      const img = document.createElement("img");
      img.className = "w-3/4 h-3/4";
      if (item.type === "pouch") img.src = ItemSprites.pouch;
      else if (item.type === "recycler") img.src = ItemSprites.recycler;
      else if (item.type === "vector")
        img.src = VectorSprites.pathFromVector(item.vector.x, item.vector.y);
      else if (item.type === "question_mark") img.src = ItemSprites.question;
      itemEl.appendChild(img);
      itemsContainer.appendChild(itemEl);
    });

    occupied.forEach((posStr) => {
      const [x, y] = posStr.split(",").map(Number);
      const displayY = gridSize - 1 - y;
      const index = displayY * gridSize + x;
      if (gridCells[index]) gridCells[index].classList.add("passable");
    });

    applyWallSprites(gridEl);
  };
}
