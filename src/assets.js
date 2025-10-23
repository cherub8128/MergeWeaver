export const VectorSprites = {
  pathFromVector(vx, vy) {
    if (vx === 0 && vy === 0) return 'assets/vectors/no_arrow.png';  // ⭐ 예외
    const angle = (Math.atan2(vy, vx) * 180 / Math.PI + 360) % 360;
    const idx = Math.round(angle / 9) % 40;
    const ccw = (idx * 9) % 360; // atan2로 얻은 반시계 각
    const cw = (360 - ccw) % 360;
    return `assets/vectors/arrow_${String(cw).padStart(3,'0')}.png`;
  }
};

export const ItemSprites = {
  pouch: "assets/items/pouch.png",
  recycler: "assets/items/recycler.png",
  scalar_n1: "assets/items/scalar_n1.png",
  obstacle: "assets/items/obstacle.png",
  crystal: "assets/items/crystal.png",
  question: "assets/items/question.png",
  gems: {
    red_diamond: "assets/items/red_diamond.png",
    blue_emerald: "assets/items/blue_emerald.png",
    green_triangle: "assets/items/green_triangle.png",
    yellow_oval: "assets/items/yellow_oval.png",
    purple_heart: "assets/items/purple_heart.png",
    cyan_star: "assets/items/cyan_star.png",
  },
  ui: {
    player: "assets/ui/player.png",
    portal: "assets/ui/portal.png",
  },
  map: {
    passable: "assets/map/tile_passable.png",
    blocked: "assets/map/tile_blocked.png",
  },
};
