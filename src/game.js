import { VectorSprites, ItemSprites } from "./assets.js";
import {
  createVectorItemHTML,
  createPouchItemHTML,
  createResidueItemHTML,
  createRecyclerItemHTML,
  createScalarItemHTML,
  createObstacleItemHTML,
  getStageColorPalette,
  getVectorColorInfo,
  REMOVER_COLORS,
} from "./items.js";
import { drawMapCoords, updateUI, makeRenderMapItems } from "./map.js";

/** Constants & State **/
const GRID_SIZE = 11;
const BOARD_SIZE = 4;
const BASE_VECTORS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];
const state = {
  playerPos: { x: 0, y: 0 },
  targetPos: { x: 0, y: 0 },
  dragged: { element: null, sourceSlot: null, originalItem: null },
  mapItems: [],
  gemsCollected: new Set(),
  currentStageGem: null,
  stageCount: 1,
  hearts: 5,
  maxHearts: 5,
};

const GEMS = [
  { id: "red_diamond", color: "red-500" },
  { id: "blue_emerald", color: "blue-400" },
  { id: "green_triangle", color: "green-400" },
  { id: "yellow_oval", color: "yellow-400" },
  { id: "purple_heart", color: "purple-500" },
  { id: "cyan_star", color: "cyan-400" },
];

/** DOM Refs **/
const mapContainer = document.getElementById("map-container");
const mapGrid = document.getElementById("map-grid");
const mapItemsContainer = document.getElementById("map-items-container");
const playerEl = document.getElementById("player");
const targetEl = document.getElementById("target");
const boardSlots = document.querySelectorAll(".board-slot");
const inventorySlots = document.querySelectorAll(".inventory-slot");
const allSlots = document.querySelectorAll(".slot");
const gemCollectionContainer = document.getElementById(
  "gem-collection-container"
);
const endingPopup = document.getElementById("ending-popup");
const gameoverPopup = document.getElementById("gameover-popup");
const confirmResetPopup = document.getElementById("confirm-reset-popup");
const restartBtn = document.getElementById("restart-game-btn");
const resetStageBtn = document.getElementById("reset-stage-btn");
const confirmFullResetBtn = document.getElementById("confirm-full-reset-btn");
const cancelResetBtn = document.getElementById("cancel-reset-btn");
const confirmFinalResetBtn = document.getElementById("confirm-final-reset-btn");
const cancelFullResetBtn = document.getElementById("cancel-full-reset-btn");
const stageCounterEl = document.getElementById("stage-counter");
const mapCoordsX = document.getElementById("map-coords-x");
const mapCoordsY = document.getElementById("map-coords-y");
const helpBtn = document.getElementById("help-btn");
const helpModal = document.getElementById("help-modal");
const closeHelpBtn = document.getElementById("close-help-btn");
const fullResetBtn = document.getElementById("full-reset-btn");

/** Utilities **/
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
function randInt(max) {
  return Math.floor(Math.random() * max);
}
function showMessage(msg, type) {
  const box = document.getElementById("message-box");
  box.textContent = msg;
  box.className = `message-box p-3 rounded-lg text-white font-bold shadow-lg show ${
    type === "success" ? "bg-green-600" : "bg-red-600"
  }`;
  setTimeout(() => box.classList.remove("show"), 2000);
}

/** Save/Load **/
function loadProgress() {
  const savedState = getCookie("vectorMergeState");
  if (savedState) {
    try {
      const loaded = JSON.parse(savedState);
      state.gemsCollected = new Set(loaded.gemsCollected);
      state.stageCount = loaded.stageCount;
      state.hearts = loaded.hearts;
      restoreGameState(loaded);
    } catch (e) {
      console.error("Failed to load saved state:", e);
      setupLevel();
    }
  } else {
    setupLevel();
  }
}
function saveProgress() {
  try {
    const gameState = {
      workbench: Array.from(boardSlots).map(serializeSlot),
      inventory: Array.from(inventorySlots).map(serializeSlot),
      mapItems: state.mapItems,
      playerPos: state.playerPos,
      targetPos: state.targetPos,
      currentStageGem: state.currentStageGem,
      gemsCollected: [...state.gemsCollected],
      stageCount: state.stageCount,
      hearts: state.hearts,
    };
    setCookie("vectorMergeState", JSON.stringify(gameState), 365);
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

/** Serialization **/
function createItemHTMLFromData(data) {
  switch (data.itemType) {
    case "vector":
      return createVectorItemHTML(parseInt(data.vx), parseInt(data.vy));
    case "pouch":
      return createPouchItemHTML(parseInt(data.count));
    case "residue":
      return createResidueItemHTML(parseInt(data.tier));
    case "recycler":
      return createRecyclerItemHTML(parseInt(data.tier), parseInt(data.count));
    case "scalar":
      return createScalarItemHTML(parseInt(data.value));
    case "obstacle":
      const colorName = data.colorName;
      const colorInfo = colorName.startsWith("color-")
        ? {
            name: colorName,
            bg: `background-color: hsl(${parseInt(
              colorName.split("-")[1]
            )}, 80%, 55%);`,
            border: `border-color: hsl(${parseInt(
              colorName.split("-")[1]
            )}, 80%, 70%);`,
          }
        : {
            name: colorName,
            bg: "background-color: #4B5563;",
            border: "border-color: #6B7280;",
          };
      try {
        return createObstacleItemHTML(
          colorInfo,
          decodeURIComponent(escape(atob(data.hiddenItem)))
        );
      } catch (e) {
        console.error("Error decoding hidden item:", data.hiddenItem, e);
        return "";
      }
    default:
      return "";
  }
}
function serializeSlot(slot) {
  const item = slot.firstElementChild;
  if (!item) return null;
  return { ...item.dataset };
}

/** UI helpers **/
function updateGemCollectionUI() {
  gemCollectionContainer.innerHTML = "";
  GEMS.forEach((gem) => {
    const collected = state.gemsCollected.has(gem.id);
    const wrapper = document.createElement("div");
    wrapper.className = "w-10 h-10 flex items-center justify-center";
    const img = document.createElement("img");
    img.src = ItemSprites.gems[gem.id];
    img.className = "w-full h-full";
    img.style.filter = collected ? "" : "grayscale(1) brightness(0.5)";
    wrapper.appendChild(img);
    gemCollectionContainer.appendChild(wrapper);
  });
}

function updateInventoryUI() {
  const slotsToShow = Math.min(10, 4 + state.gemsCollected.size);
  inventorySlots.forEach((slot, index) => {
    if (index < slotsToShow) slot.classList.remove("hidden");
    else slot.classList.add("hidden");
  });
}
function updateHeartUI() {
  const heartContainer = document.getElementById("heart-container");
  heartContainer.innerHTML = "";
  for (let i = 0; i < state.maxHearts; i++) {
    const heart = document.createElement("span");
    heart.innerHTML = i < state.hearts ? "❤️" : "🖤";
    heart.style.fontSize = "20px";
    heartContainer.appendChild(heart);
  }
  if (state.hearts <= 0) {
    resetStageBtn.disabled = true;
    resetStageBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    resetStageBtn.disabled = false;
    resetStageBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

/** Level setup & restore **/
function setupLevel(isReset = true) {
  if (isReset) {
    allSlots.forEach((slot) => (slot.innerHTML = ""));
    state.mapItems = [];
    state.currentStageGem = null;
    const occupied = new Set();
    let playerPos, targetPos, targetDistance;
    do {
      playerPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
      targetPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
      targetDistance =
        Math.abs(playerPos.x - targetPos.x) +
        Math.abs(playerPos.y - targetPos.y);
    } while (targetDistance < 16);
    state.playerPos = playerPos;
    state.targetPos = targetPos;
    occupied.add(`${playerPos.x},${playerPos.y}`);
    occupied.add(`${targetPos.x},${targetPos.y}`);

    const uncollectedGems = GEMS.filter(
      (gem) => !state.gemsCollected.has(gem.id)
    );
    if (uncollectedGems.length > 0) {
      const gemToPlace = uncollectedGems[randInt(uncollectedGems.length)];
      let gemPos,
        gemDistance,
        attempts = 0;
      do {
        gemPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
        gemDistance =
          Math.abs(playerPos.x - gemPos.x) + Math.abs(playerPos.y - gemPos.y);
        attempts++;
      } while (
        (occupied.has(`${gemPos.x},${gemPos.y}`) || gemDistance < 16) &&
        attempts < 100
      );
      if (attempts >= 100) {
        do {
          gemPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
        } while (occupied.has(`${gemPos.x},${gemPos.y}`));
      }
      occupied.add(`${gemPos.x},${gemPos.y}`);
      state.currentStageGem = {
        ...gemToPlace,
        x: gemPos.x,
        y: gemPos.y,
        collected: false,
      };
    }

    const requiredItems = [
      ...Array(3).fill("pouch"),
      ...Array(2).fill("recycler"),
      ...Array(2).fill("vector"),
      ...Array(1).fill("question_mark"),
    ];
    const totalMapItems = requiredItems.length + randInt(2);

    for (let i = 0; i < totalMapItems; i++) {
      let itemType =
        i < requiredItems.length
          ? requiredItems[i]
          : ["pouch", "recycler", "vector", "question_mark"][randInt(4)];
      let pos,
        itemDistance,
        attempts = 0;
      do {
        pos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
        itemDistance =
          Math.abs(playerPos.x - pos.x) + Math.abs(playerPos.y - pos.y);
        attempts++;
      } while (
        (occupied.has(`${pos.x},${pos.y}`) || itemDistance >= targetDistance) &&
        attempts < 100
      );
      if (attempts >= 100) continue;
      occupied.add(`${pos.x},${pos.y}`);
      state.mapItems.push({
        id: `map-item-${Date.now()}-${i}`,
        x: pos.x,
        y: pos.y,
        type: itemType.replace("remover", "recycler"),
        tier: itemType === "recycler" ? 1 + randInt(2) : undefined,
        count:
          itemType === "pouch"
            ? 5 + randInt(6)
            : itemType === "recycler"
            ? 3 + randInt(3)
            : undefined,
        vector: itemType === "vector" ? BASE_VECTORS[randInt(4)] : undefined,
      });
    }

    const boardIndices = [...Array(16).keys()];
    const stageColorPalette = getStageColorPalette(state.stageCount);
    const obstacleCount = 2;
    for (let i = 0; i < obstacleCount; i++) {
      if (!boardIndices.length) break;
      const pos = boardIndices.splice(randInt(boardIndices.length), 1)[0];

      let hiddenItem;
      const rand = randInt(3);
      if (rand === 0) hiddenItem = createPouchItemHTML(5);
      else if (rand === 1)
        hiddenItem = createVectorItemHTML(
          BASE_VECTORS[randInt(4)].x,
          BASE_VECTORS[randInt(4)].y
        );
      else hiddenItem = createRecyclerItemHTML(1);

      const colorInfo = stageColorPalette[randInt(stageColorPalette.length)];
      boardSlots[pos].innerHTML = createObstacleItemHTML(colorInfo, hiddenItem);
    }
    const pouchStartPos = boardIndices.splice(
      randInt(boardIndices.length),
      1
    )[0];
    boardSlots[pouchStartPos].innerHTML = createPouchItemHTML(20);
    attachItemListeners(boardSlots[pouchStartPos].firstElementChild);
  }

  stageCounterEl.textContent = state.stageCount;
  updateGemCollectionUI();
  updateInventoryUI();
  updateHeartUI();
  uiUpdater();
  saveProgress();
}

function restoreGameState(loadedState) {
  state.playerPos = loadedState.playerPos;
  state.targetPos = loadedState.targetPos;
  state.mapItems = loadedState.mapItems;
  state.currentStageGem = loadedState.currentStageGem;

  const deserializeAndPlace = (slots, data) => {
    slots.forEach((slot, index) => {
      const itemData = data[index];
      if (itemData) {
        slot.innerHTML = createItemHTMLFromData(itemData);
        attachItemListeners(slot.firstElementChild);
      }
    });
  };
  deserializeAndPlace(boardSlots, loadedState.workbench);
  deserializeAndPlace(inventorySlots, loadedState.inventory);

  setupLevel(false);
}

/** Map & UI **/
mapGrid.style.setProperty("--grid-size", GRID_SIZE);
mapGrid.innerHTML = Array(GRID_SIZE * GRID_SIZE)
  .fill('<div class="grid-cell"></div>')
  .join("");

drawMapCoords(mapCoordsX, mapCoordsY, GRID_SIZE);
const renderMapItems = makeRenderMapItems({
  gridEl: mapGrid,
  itemsContainer: mapItemsContainer,
  state,
  gridSize: GRID_SIZE,
});
const uiUpdater = () =>
  updateUI(
    {
      gridEl: mapGrid,
      gridSize: GRID_SIZE,
      containerEl: mapContainer,
      playerEl,
      targetEl,
      state,
    },
    renderMapItems
  );

/** Drag & Interaction **/
let isDragging = false;
let startPos = { x: 0, y: 0 };
let lastPointerPos = { x: 0, y: 0 };
let activeTouchId = null;
const DRAG_THRESHOLD = 10;

function attachItemListeners(item) {
  if (!item || item.dataset.itemType === "obstacle") return;
  item.setAttribute("draggable", "false");
  item.addEventListener("dragstart", (evt) => evt.preventDefault());
  item.querySelectorAll("img").forEach((img) => {
    img.setAttribute("draggable", "false");
    img.addEventListener("dragstart", (evt) => evt.preventDefault());
  });
  item.addEventListener("mousedown", handleInteractionStart);
  item.addEventListener("touchstart", handleInteractionStart, {
    passive: false,
  });
}

function getPointFromEvent(e) {
  if (e.type.startsWith("touch")) {
    let touchList = e.touches && e.touches.length ? e.touches : null;
    if (
      (!touchList || !touchList.length) &&
      e.changedTouches &&
      e.changedTouches.length
    ) {
      touchList = e.changedTouches;
    }
    if (!touchList || !touchList.length) return null;
    let chosen = null;
    if (activeTouchId !== null) {
      for (let i = 0; i < touchList.length; i++) {
        if (touchList[i].identifier === activeTouchId) {
          chosen = touchList[i];
          break;
        }
      }
    }
    if (!chosen) chosen = touchList[0];
    return {
      clientX: chosen.clientX,
      clientY: chosen.clientY,
      identifier: chosen.identifier,
    };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

function handleInteractionStart(e) {
  const originalItem = e.currentTarget;
  if (isDragging || state.dragged.originalItem) return;
  if (!originalItem) return;
  if (e.type === "touchstart") e.preventDefault();
  isDragging = false;
  state.dragged.originalItem = originalItem;
  state.dragged.sourceSlot = originalItem.parentElement;
  const point = getPointFromEvent(e);
  if (!point) return;
  startPos = { x: point.clientX, y: point.clientY };
  lastPointerPos = { ...startPos };
  if (point.identifier !== undefined) activeTouchId = point.identifier;
  document.addEventListener("mousemove", handleInteractionMove, {
    passive: false,
  });
  document.addEventListener("touchmove", handleInteractionMove, {
    passive: false,
  });
  document.addEventListener("mouseup", handleInteractionEnd);
  document.addEventListener("touchend", handleInteractionEnd);
  document.addEventListener("touchcancel", handleInteractionEnd);
}

function startDrag() {
  if (!state.dragged.originalItem || isDragging) return;
  isDragging = true;
  const originalItem = state.dragged.originalItem;
  const ghostItem = originalItem.cloneNode(true);
  const rect = originalItem.getBoundingClientRect();
  ghostItem.classList.add("ghost-item");
  ghostItem.style.width = `${rect.width}px`;
  ghostItem.style.height = `${rect.height}px`;
  ghostItem.style.left = `${lastPointerPos.x}px`;
  ghostItem.style.top = `${lastPointerPos.y}px`;
  document.body.appendChild(ghostItem);
  state.dragged.element = ghostItem;
  originalItem.classList.add("dragging-source");
}

function handleInteractionMove(e) {
  if (!state.dragged.originalItem) return;
  e.preventDefault();
  const point = getPointFromEvent(e);
  if (!point) return;
  if (
    activeTouchId !== null &&
    point.identifier !== undefined &&
    point.identifier !== activeTouchId
  )
    return;
  lastPointerPos = { x: point.clientX, y: point.clientY };
  if (!isDragging) {
    const dx = point.clientX - startPos.x;
    const dy = point.clientY - startPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      startDrag();
    }
  }
  if (isDragging && state.dragged.element) {
    state.dragged.element.style.left = `${point.clientX}px`;
    state.dragged.element.style.top = `${point.clientY}px`;
    state.dragged.element.style.display = "none";
    const elementBelow = document.elementFromPoint(
      point.clientX,
      point.clientY
    );
    state.dragged.element.style.display = "";
    allSlots.forEach((s) => s.classList.remove("over"));
    const targetSlot = elementBelow?.closest(".slot");
    if (targetSlot) targetSlot.classList.add("over");
  }
}

function handleInteractionEnd(e) {
  document.removeEventListener("mousemove", handleInteractionMove);
  document.removeEventListener("touchmove", handleInteractionMove);
  document.removeEventListener("mouseup", handleInteractionEnd);
  document.removeEventListener("touchend", handleInteractionEnd);
  document.removeEventListener("touchcancel", handleInteractionEnd);
  const wasDragging = isDragging;
  if (isDragging) {
    if (state.dragged.element) state.dragged.element.style.display = "none";
    const point = getPointFromEvent(e) || {
      clientX: lastPointerPos.x,
      clientY: lastPointerPos.y,
    };
    const targetSlot = document
      .elementFromPoint(point.clientX, point.clientY)
      ?.closest(".slot");
    if (targetSlot) {
      handleDrop(targetSlot);
    }
  } else if (!wasDragging) {
    const item = state.dragged.originalItem;
    if (item) {
      const itemType = item.dataset.itemType;
      if (itemType === "vector")
        useVector(item, parseInt(item.dataset.vx), parseInt(item.dataset.vy));
      else if (itemType === "pouch") handlePouchClick({ currentTarget: item });
    }
  }
  if (state.dragged.element) document.body.removeChild(state.dragged.element);
  if (state.dragged.originalItem)
    state.dragged.originalItem.classList.remove("dragging-source");
  isDragging = false;
  activeTouchId = null;
  allSlots.forEach((s) => s.classList.remove("over"));
  state.dragged = { element: null, sourceSlot: null, originalItem: null };
  saveProgress();
}

/** Item usage **/
function handlePouchClick(e) {
  const pouchEl = e.currentTarget;
  const pouchSlot = pouchEl.parentElement;
  if (!pouchSlot.classList.contains("board-slot")) {
    showMessage("소환구슬은 작업대 위에서만 사용할 수 있습니다.", "error");
    return;
  }
  let count = parseInt(pouchEl.dataset.count);
  if (count <= 0) return;
  const emptySlots = [...boardSlots].filter((slot) => !slot.children.length);
  if (emptySlots.length === 0) {
    showMessage("벡터를 소환할 공간이 없습니다.", "error");
    return;
  }
  const targetSlot = emptySlots[randInt(emptySlots.length)];
  count--;
  pouchEl.dataset.count = count;
  pouchEl.querySelector(".count-badge").textContent = count;
  if (count === 0) {
    pouchSlot.innerHTML = "";
    showMessage("소환구슬의 에너지가 모두 소진되었습니다.", "error");
  }
  const spawnableItems = [
    ...Array(21).fill(BASE_VECTORS[0]),
    ...Array(21).fill(BASE_VECTORS[1]),
    ...Array(21).fill(BASE_VECTORS[2]),
    ...Array(21).fill(BASE_VECTORS[3]),
    ...Array(8).fill("recycler"),
    ...Array(8).fill("scalar"),
  ];
  const itemToSpawn = spawnableItems[randInt(spawnableItems.length)];
  let newItemHTML;
  if (itemToSpawn === "recycler") {
    newItemHTML = createRecyclerItemHTML(1);
  } else if (itemToSpawn === "scalar") {
    newItemHTML = createScalarItemHTML(-1);
  } else {
    newItemHTML = createVectorItemHTML(itemToSpawn.x, itemToSpawn.y);
  }
  const pouchRect = pouchSlot.getBoundingClientRect();
  const slotRect = targetSlot.getBoundingClientRect();
  const flyingItem = document.createElement("div");
  flyingItem.innerHTML = newItemHTML;
  flyingItem.style.cssText = `position:fixed; left:${pouchRect.left}px; top:${pouchRect.top}px; width:${pouchRect.width}px; height:${pouchRect.height}px; transition:all .4s cubic-bezier(.5,-.5,.5,1.5); z-index:1000;`;
  document.body.appendChild(flyingItem);
  flyingItem.getBoundingClientRect();
  flyingItem.style.transform = `translate(${
    slotRect.left - pouchRect.left
  }px, ${slotRect.top - pouchRect.top}px) scale(1)`;
  setTimeout(() => {
    document.body.removeChild(flyingItem);
    targetSlot.innerHTML = newItemHTML;
    attachItemListeners(targetSlot.firstElementChild);
    saveProgress();
  }, 400);
}

function useVector(element, vx, vy) {
  const dest = { x: state.playerPos.x + vx, y: state.playerPos.y + vy };
  if (
    state.currentStageGem &&
    !state.currentStageGem.collected &&
    dest.x === state.currentStageGem.x &&
    dest.y === state.currentStageGem.y
  ) {
    state.currentStageGem.collected = true;
    state.playerPos = dest;
    element.parentElement.innerHTML = "";
    showMessage("보석을 획득했습니다! 아공간이 1칸 확장됩니다.", "success");
    state.gemsCollected.add(state.currentStageGem.id);
    updateInventoryUI();
    updateGemCollectionUI();
    saveProgress();
    uiUpdater();
    return;
  }
  if (dest.x === state.targetPos.x && dest.y === state.targetPos.y) {
    state.playerPos = dest;
    element.parentElement.innerHTML = "";
    if (state.currentStageGem && state.currentStageGem.collected)
      state.gemsCollected.add(state.currentStageGem.id);
    if (state.hearts < state.maxHearts) {
      state.hearts++;
    }
    if (state.gemsCollected.size === GEMS.length) {
      showSpecialEnding();
    } else {
      showMessage("이동 성공! 다음 목표가 설정됩니다.", "success");
      state.stageCount++;
      setupLevel();
    }
    return;
  }
  const targetItemIndex = state.mapItems.findIndex(
    (item) => item.x === dest.x && item.y === dest.y
  );
  if (targetItemIndex > -1) {
    const collectedItem = state.mapItems[targetItemIndex];
    const emptyInvSlot = [...inventorySlots].find(
      (s) => !s.classList.contains("hidden") && !s.children.length
    );
    if (!emptyInvSlot) {
      showMessage("아이템을 획득했지만 보관함이 가득 찼습니다!", "error");
      return;
    }
    state.playerPos = dest;
    element.parentElement.innerHTML = "";
    if (collectedItem.type === "question_mark") {
      const spawnableItems = [...BASE_VECTORS, "recycler"];
      const itemToSpawn = spawnableItems[randInt(spawnableItems.length)];
      if (itemToSpawn === "recycler")
        emptyInvSlot.innerHTML = createRecyclerItemHTML(1);
      else
        emptyInvSlot.innerHTML = createVectorItemHTML(
          itemToSpawn.x,
          itemToSpawn.y
        );
    } else if (collectedItem.type === "pouch")
      emptyInvSlot.innerHTML = createPouchItemHTML(collectedItem.count);
    else if (collectedItem.type === "recycler")
      emptyInvSlot.innerHTML = createRecyclerItemHTML(1, collectedItem.count);
    else if (collectedItem.type === "vector")
      emptyInvSlot.innerHTML = createVectorItemHTML(
        collectedItem.vector.x,
        collectedItem.vector.y
      );
    attachItemListeners(emptyInvSlot.firstElementChild);
    state.mapItems.splice(targetItemIndex, 1);
    showMessage("맵에서 아이템을 획득했습니다!", "success");
    saveProgress();
    uiUpdater();
    return;
  }
  showMessage("벡터가 목표 지점과 일치하지 않습니다.", "error");
}

function checkAndClearObstacles(mergedSlot) {
  const mergedItem = mergedSlot.firstElementChild;
  if (!mergedItem || mergedItem.dataset.itemType !== "vector") return;
  const vx = parseInt(mergedItem.dataset.vx),
    vy = parseInt(mergedItem.dataset.vy);
  const mergedVectorColorName =
    vx === 0 && vy === 0 ? "any" : getVectorColorInfo(vx, vy).name;
  const mergedIndex = parseInt(mergedSlot.dataset.index);
  const adjacentIndices = [
    mergedIndex - BOARD_SIZE,
    mergedIndex + BOARD_SIZE,
    mergedIndex % BOARD_SIZE !== 0 ? mergedIndex - 1 : -1,
    mergedIndex % BOARD_SIZE !== BOARD_SIZE - 1 ? mergedIndex + 1 : -1,
  ].filter((i) => i >= 0 && i < 16);
  adjacentIndices.forEach((index) => {
    const adjacentSlot = boardSlots[index];
    if (!adjacentSlot) return;
    const obstacle = adjacentSlot.querySelector('[data-item-type="obstacle"]');
    if (
      obstacle &&
      (obstacle.dataset.colorName === mergedVectorColorName ||
        (state.stageCount >= 10 && mergedVectorColorName === "any"))
    ) {
      const hiddenItemHTML = decodeURIComponent(
        escape(atob(obstacle.dataset.hiddenItem))
      );
      adjacentSlot.innerHTML = hiddenItemHTML;
      attachItemListeners(adjacentSlot.firstElementChild);
      showMessage(`방해물이 제거되었습니다!`, "success");
    }
  });
}

function handleDrop(targetSlot) {
  if (!targetSlot) return;
  const originalItem = state.dragged.originalItem;
  const sourceSlot = state.dragged.sourceSlot;
  if (!originalItem || !sourceSlot || targetSlot === sourceSlot) return;
  const targetItem = targetSlot.querySelector(".item");

  if (!targetItem) {
    targetSlot.appendChild(originalItem);
  } else {
    const sourceType = originalItem.dataset.itemType;
    const targetType = targetItem.dataset.itemType;

    if (
      sourceType === "vector" &&
      targetType === "vector" &&
      targetSlot.classList.contains("board-slot") &&
      sourceSlot.classList.contains("board-slot")
    ) {
      const v1 = {
        x: parseInt(originalItem.dataset.vx),
        y: parseInt(originalItem.dataset.vy),
      };
      const v2 = {
        x: parseInt(targetItem.dataset.vx),
        y: parseInt(targetItem.dataset.vy),
      };
      const newV = { x: v1.x + v2.x, y: v1.y + v2.y };
      targetSlot.innerHTML = createVectorItemHTML(newV.x, newV.y);
      attachItemListeners(targetSlot.firstElementChild);
      if (newV.x === 0 && newV.y === 0) {
        sourceSlot.innerHTML = "";
      } else {
        sourceSlot.innerHTML = createResidueItemHTML(1);
        attachItemListeners(sourceSlot.firstElementChild);
      }
      checkAndClearObstacles(targetSlot);
    } else if (sourceType === "residue" && targetType === "residue") {
      const tier1 = parseInt(originalItem.dataset.tier);
      const tier2 = parseInt(targetItem.dataset.tier);
      if (tier1 === tier2) {
        targetSlot.innerHTML = createResidueItemHTML(tier1 + 1);
        attachItemListeners(targetSlot.firstElementChild);
        sourceSlot.innerHTML = "";
      }
    } else if (sourceType === "recycler" && targetType === "recycler") {
      const tier1 = parseInt(originalItem.dataset.tier);
      const tier2 = parseInt(targetItem.dataset.tier);
      if (tier1 === tier2) {
        const count1 = parseInt(originalItem.dataset.count);
        const count2 = parseInt(targetItem.dataset.count);
        targetSlot.innerHTML = createRecyclerItemHTML(
          tier1 + 1,
          Math.min(count1, count2)
        );
        attachItemListeners(targetSlot.firstElementChild);
        sourceSlot.innerHTML = "";
      }
    } else if (sourceType === "recycler" && targetType === "residue") {
      const recyclerTier = parseInt(originalItem.dataset.tier);
      const residueTier = parseInt(targetItem.dataset.tier);
      if (recyclerTier >= residueTier) {
        const recycler = originalItem;
        let count = parseInt(recycler.dataset.count) - 1;
        if (residueTier === 1) {
          targetSlot.innerHTML = "";
        } else {
          const pouchesToSpawn = Math.pow(2, residueTier - 2);
          targetSlot.innerHTML = createPouchItemHTML(pouchesToSpawn);
          attachItemListeners(targetSlot.firstElementChild);
        }
        if (count > 0) {
          sourceSlot.innerHTML = createRecyclerItemHTML(recyclerTier, count);
          attachItemListeners(sourceSlot.firstElementChild);
        } else {
          sourceSlot.innerHTML = "";
        }
        showMessage(`Lv.${residueTier} 정령 결정을 재활용했습니다.`, "success");
      }
    } else if (sourceType === "scalar" && targetType === "vector") {
      const scalarValue = parseInt(originalItem.dataset.value);
      const v = {
        x: parseInt(targetItem.dataset.vx),
        y: parseInt(targetItem.dataset.vy),
      };
      const newV = { x: v.x * scalarValue, y: v.y * scalarValue };
      targetSlot.innerHTML = createVectorItemHTML(newV.x, newV.y);
      attachItemListeners(targetSlot.firstElementChild);
      sourceSlot.innerHTML = "";
    } else if (sourceType === "scalar" && targetType === "scalar") {
      const val1 = parseInt(originalItem.dataset.value);
      const val2 = parseInt(targetItem.dataset.value);
      if (val1 === -1 && val2 === -1) {
        targetSlot.innerHTML = "";
        sourceSlot.innerHTML = "";
        showMessage("스칼라가 상쇄되었습니다.", "success");
      }
    }
  }
}

/** Legends, Modals, Theme **/
function initLegends() {
  const removerLegendContainer = document.getElementById(
    "remover-legend-colors"
  );
  removerLegendContainer.innerHTML = "";
  REMOVER_COLORS.forEach((color, index) => {
    const colorEl = document.createElement("div");
    colorEl.className = `w-4 h-4 ${color.bg} ${color.border} rounded-sm flex items-center justify-center text-white text-[10px] font-bold shadow-inner`;
    colorEl.textContent = index + 1;
    removerLegendContainer.appendChild(colorEl);
    if (index < REMOVER_COLORS.length - 1) {
      const arrowEl = document.createElement("span");
      arrowEl.className = "text-gray-500";
      arrowEl.textContent = "→";
      removerLegendContainer.appendChild(arrowEl);
    }
  });
}

const themeToggle = document.getElementById("theme-toggle");
const darkIcon = document.getElementById("theme-toggle-dark-icon");
const lightIcon = document.getElementById("theme-toggle-light-icon");

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
  darkIcon.classList.add("hidden");
  lightIcon.classList.remove("hidden");
}
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  darkIcon.classList.toggle("hidden");
  lightIcon.classList.toggle("hidden");
  if (document.body.classList.contains("light-mode")) {
    localStorage.setItem("theme", "light");
  } else {
    localStorage.removeItem("theme");
  }
});

helpBtn.addEventListener("click", () => {
  helpModal.classList.remove("hidden", "invisible", "opacity-0");
  populateHelp();
});
closeHelpBtn.addEventListener("click", () => {
  helpModal.classList.add("hidden", "invisible", "opacity-0");
});
helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal)
    helpModal.classList.add("hidden", "invisible", "opacity-0");
});

function populateHelp() {
  const el = document.getElementById("help-content");
  el.innerHTML = `
    <div>
      <h3 class="font-bold text-main mb-1">게임 목표</h3>
      <p>작업대에서 벡터를 조합하여 플레이어(<img src="${ItemSprites.ui.player}" class="inline-block w-4 h-4" />)를 포털(<img src="${ItemSprites.ui.portal}" class="inline-block w-4 h-4" />) 지점으로 이동시키는 것입니다. 맵에 있는 아이템 지점으로 이동하여 도움을 받을 수도 있습니다.</p>
    </div>
    <div>
      <h3 class="font-bold text-main mb-1">벡터 사용</h3>
      <p>벡터는 현재 위치에서 목표 지점(포털, 아이템, 보석)까지 정확히 도달할 수 있는 벡터만 사용 가능합니다. 벡터를 클릭하여 사용하세요.</p>
    </div>
    <div>
      <h3 class="font-bold text-main mb-1">벡터 조합과 정령 결정</h3>
      <p>작업대 위에서 두 벡터를 합치면 두 벡터의 x, y 성분이 더해집니다. 영벡터(0,0)가 아닌 경우 드래그를 시작한 위치에 '정령 결정'이 남습니다.</p>
    </div>
    <div>
      <h3 class="font-bold text-main mb-1">아이템 종류</h3>
      <ul class="list-disc list-inside space-y-2">
        <li><b>소환구슬:</b> 빈 공간에 랜덤 아이템(기본 벡터, 1레벨 마법서, 스칼라)을 소환합니다.</li>
        <li><b>랜덤 아이템(?):</b> 맵에서 획득 시 기본 벡터 또는 1레벨 마법서 중 하나를 무작위로 얻습니다.</li>
        <li><b>정령 결정:</b> 같은 레벨끼리 합치면 성장하며, 마법서로 소환구슬으로 바꿀 수 있습니다.</li>
        <li><b>마법서:</b> 정령 결정 위로 드래그하여 제거/재활용할 수 있습니다. 자신보다 같거나 낮은 레벨의 정령 결정만 처리 가능하며, 같은 레벨끼리 합치면 성장합니다.</li>
        <li><b>방해물:</b> 인접한 칸에서 방해물과 같은 색의 벡터를 합성하면 사라지며, 밑에 숨겨진 아이템이 나타납니다. (스테이지 10 이상에서는 영벡터로도 제거 가능)</li>
        <li><b>보석:</b> 획득하면 아공간이 영구적으로 1칸 확장됩니다. (최대 10칸)</li>
      </ul>
    </div>
    <div>
      <h3 class="font-bold text-main mb-1">하트와 초기화</h3>
      <p>하트는 '맵 초기화'에 사용되는 자원입니다. 맵 초기화 시 1개씩 소모되며, 스테이지 클리어 시 1개씩 회복됩니다.</p>
    </div>
  `;
}

/** Reset Buttons **/
restartBtn?.addEventListener("click", () => {
  endingPopup.classList.add("invisible", "opacity-0");
  endingPopup.querySelector("div").classList.remove("scale-100");
  fullReset();
});
resetStageBtn.addEventListener("click", () => {
  if (resetStageBtn.disabled) return;
  if (state.hearts > 0) {
    state.hearts--;
    updateHeartUI();
    showMessage("현재 맵을 초기화합니다.", "success");
    setupLevel();
  } else {
    gameoverPopup.classList.remove("invisible", "opacity-0");
    gameoverPopup.querySelector("div").classList.add("scale-100");
  }
});
cancelResetBtn.addEventListener("click", () => {
  gameoverPopup.classList.add("invisible", "opacity-0");
  gameoverPopup.querySelector("div").classList.remove("scale-100");
});
confirmFullResetBtn.addEventListener("click", () => {
  gameoverPopup.classList.add("invisible", "opacity-0");
  gameoverPopup.querySelector("div").classList.remove("scale-100");
  fullReset();
});
fullResetBtn.addEventListener("click", () => {
  confirmResetPopup.classList.remove("invisible", "opacity-0");
});
cancelFullResetBtn.addEventListener("click", () => {
  confirmResetPopup.classList.add("invisible", "opacity-0");
});
confirmFinalResetBtn.addEventListener("click", () => {
  confirmResetPopup.classList.add("invisible", "opacity-0");
  fullReset();
});

function fullReset() {
  setCookie("vectorMergeState", "", -1);
  state.gemsCollected.clear();
  state.stageCount = 1;
  state.hearts = state.maxHearts;
  setupLevel();
}

/** Init **/
function init() {
  // grid scaffold
  mapGrid.style.setProperty("--grid-size", GRID_SIZE);
  const cells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // displayY is used for visual layout (top to bottom)
      const displayY = GRID_SIZE - 1 - y;
      cells.push(
        `<div class="grid-cell" data-x="${x}" data-y="${displayY}"></div>`
      );
    }
  }
  mapGrid.innerHTML = cells.join("");
  drawMapCoords(mapCoordsX, mapCoordsY, GRID_SIZE);
  initLegends();
  window.addEventListener("resize", handleResize);
  handleResize();
  loadProgress();
}
function handleResize() {
  const workbenchPanel = document.getElementById("workbench-panel");
  const mapPanel = document.getElementById("map-panel");
  const desktopParent = document.getElementById("desktop-parent-container");
  const legendPanel = document.getElementById("legend-panel");
  const gemCollectionPanel = document.getElementById("gem-collection-panel");
  const resetBtn = document.getElementById("reset-stage-btn");
  if (window.innerWidth < 1024) {
    if (workbenchPanel.parentElement !== mapPanel) {
      mapPanel.appendChild(workbenchPanel);
    }
    if (legendPanel.parentElement !== workbenchPanel) {
      workbenchPanel.appendChild(legendPanel);
      legendPanel.insertAdjacentElement("afterend", resetBtn);
      workbenchPanel.appendChild(gemCollectionPanel);
    }
    workbenchPanel.classList.remove("hidden");
    workbenchPanel.classList.add("flex");
  } else {
    if (workbenchPanel.parentElement !== desktopParent) {
      desktopParent.appendChild(workbenchPanel);
      mapPanel.appendChild(legendPanel);
      workbenchPanel.appendChild(resetBtn);
      mapPanel.appendChild(gemCollectionPanel);
    }
    workbenchPanel.classList.remove("hidden");
    workbenchPanel.classList.add("lg:flex");
  }
}

// kick off
init();
