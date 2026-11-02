import {
  type GameState,
  type Palette,
  groundY,
  playerX,
  trailFor,
} from "./game";

type Ctx = CanvasRenderingContext2D;
const INK = "#303d36";
function path(
  c: Ctx,
  points: number[][],
  fill?: string,
  stroke?: string,
  close = true,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function ellipse(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}

export function drawMouse(
  c: Ctx,
  x: number,
  y: number,
  scale = 1,
  time = 0,
  airborne = false,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineWidth = 2.3;
  c.lineJoin = "round";
  c.lineCap = "round";
  if (airborne) c.rotate(-0.12);
  // Wheels, spokes and the very dependable little bicycle.
  for (const wx of [-38, 41]) {
    ellipse(c, wx, -18, 20, 20, "#39433a");
    ellipse(c, wx, -18, 15.8, 15.8, "#ebdfc5");
    c.save();
    c.translate(wx, -18);
    c.rotate(time * 8);
    for (let i = 0; i < 6; i++) {
      c.rotate(Math.PI / 3);
      path(
        c,
        [
          [0, 0],
          [14, 0],
        ],
        undefined,
        "#8d947f",
        false,
      );
    }
    c.restore();
    ellipse(c, wx, -18, 3, 3, "#39433a");
  }
  c.lineWidth = 4;
  path(
    c,
    [
      [-38, -18],
      [-16, -49],
      [7, -18],
      [-38, -18],
      [25, -48],
      [7, -18],
    ],
    undefined,
    "#b35335",
    false,
  );
  path(
    c,
    [
      [41, -18],
      [23, -64],
      [34, -69],
    ],
    undefined,
    INK,
    false,
  );
  path(
    c,
    [
      [-16, -49],
      [-20, -57],
      [-30, -57],
    ],
    undefined,
    INK,
    false,
  );
  c.lineWidth = 2.3;
  // Tail, boots, body and a trail-ready satchel.
  c.beginPath();
  c.moveTo(-27, -74);
  c.bezierCurveTo(-62, -68, -65, -107, -83, -91);
  c.strokeStyle = "#b79b80";
  c.stroke();
  path(
    c,
    [
      [-15, -69],
      [3, -51],
      [9, -39],
      [19, -38],
    ],
    undefined,
    INK,
    false,
  );
  ellipse(c, -19, -79, 19, 25, "#e8cea4", INK);
  path(
    c,
    [
      [-31, -90],
      [-38, -87],
      [-36, -62],
      [-17, -63],
      [-16, -86],
    ],
    "#667f70",
    INK,
  );
  path(
    c,
    [
      [-34, -78],
      [-20, -78],
    ],
    undefined,
    "#34463e",
    false,
  );
  // Ears sit behind the head; the peach inserts keep the silhouette friendly.
  ellipse(c, -21, -122, 16, 17, "#e9d4ad", INK);
  ellipse(c, -21, -122, 10, 11, "#d4a78f");
  ellipse(c, 7, -127, 15, 15, "#e9d4ad", INK);
  ellipse(c, 7, -127, 9, 9, "#d4a78f");
  c.beginPath();
  c.moveTo(-24, -109);
  c.bezierCurveTo(-26, -136, 13, -132, 21, -111);
  c.lineTo(36, -104);
  c.quadraticCurveTo(40, -98, 24, -94);
  c.bezierCurveTo(3, -77, -26, -89, -24, -109);
  c.fillStyle = "#efd9b0";
  c.fill();
  c.strokeStyle = INK;
  c.stroke();
  ellipse(c, 35, -104, 4, 3, INK);
  // Goggles and scarf are the two signature details.
  path(
    c,
    [
      [-25, -112],
      [3, -116],
    ],
    undefined,
    "#856a4c",
    false,
  );
  ellipse(c, 7, -112, 10, 9, "#f1e6c9", INK);
  ellipse(c, 10, -112, 2.5, 3, INK);
  path(
    c,
    [
      [22, -100],
      [31, -96],
    ],
    undefined,
    "#9e7e60",
    false,
  );
  path(
    c,
    [
      [-18, -89],
      [5, -88],
      [3, -80],
      [-20, -81],
    ],
    "#d76a3f",
    INK,
  );
  const flutter = Math.sin(time * 9) * 3;
  path(
    c,
    [
      [-19, -84],
      [-53, -86 + flutter],
      [-44, -77 + flutter],
      [-59, -72 + flutter],
      [-23, -74],
    ],
    "#d76a3f",
    INK,
  );
  path(
    c,
    [
      [-2, -77],
      [17, -65],
      [27, -67],
    ],
    undefined,
    INK,
    false,
  );
  c.restore();
}

export function drawCactus(
  c: Ctx,
  x: number,
  y: number,
  size: number,
  p: Palette,
  obstacle = false,
) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  c.lineJoin = "round";
  c.lineCap = "round";
  const color = obstacle ? "#526b51" : p.plant;
  c.beginPath();
  c.moveTo(-7, 0);
  c.lineTo(-7, -28);
  c.lineTo(-17, -28);
  c.quadraticCurveTo(-24, -28, -24, -35);
  c.lineTo(-24, -48);
  c.quadraticCurveTo(-24, -53, -19, -53);
  c.quadraticCurveTo(-14, -53, -14, -48);
  c.lineTo(-14, -38);
  c.lineTo(-7, -38);
  c.lineTo(-7, -65);
  c.quadraticCurveTo(-7, -74, 1, -74);
  c.quadraticCurveTo(9, -74, 9, -65);
  c.lineTo(9, -45);
  c.lineTo(17, -45);
  c.lineTo(17, -58);
  c.quadraticCurveTo(17, -65, 22, -65);
  c.quadraticCurveTo(27, -65, 27, -58);
  c.lineTo(27, -39);
  c.quadraticCurveTo(27, -33, 19, -33);
  c.lineTo(9, -33);
  c.lineTo(9, 0);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = p.ink;
  c.lineWidth = obstacle ? 2 : 0.9;
  c.stroke();
  c.lineWidth = 0.8;
  c.strokeStyle = obstacle ? "#acc09a" : "#acb793";
  path(
    c,
    [
      [1, -3],
      [1, -65],
    ],
    undefined,
    c.strokeStyle,
    false,
  );
  path(
    c,
    [
      [-18, -47],
      [-18, -34],
      [-9, -32],
    ],
    undefined,
    c.strokeStyle,
    false,
  );
  c.restore();
}

export function drawCheese(c: Ctx, x: number, y: number, size = 1) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  c.lineWidth = 1.6;
  c.lineJoin = "round";
  path(
    c,
    [
      [-10, 6],
      [-10, -5],
      [7, -12],
      [12, 0],
      [12, 9],
    ],
    "#e6ad48",
    "#785632",
  );
  path(
    c,
    [
      [-10, -5],
      [12, 0],
      [12, 9],
      [-10, 6],
    ],
    "#f4ce71",
    "#785632",
  );
  ellipse(c, 5, 3, 2.3, 2, "#c78c36");
  ellipse(c, -5, 0, 1.8, 1.8, "#c78c36");
  c.restore();
}

function mesa(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  detail: string,
) {
  path(
    c,
    [
      [x, y],
      [x + w * 0.12, y - h * 0.25],
      [x + w * 0.23, y - h * 0.28],
      [x + w * 0.3, y - h * 0.89],
      [x + w * 0.43, y - h * 0.89],
      [x + w * 0.46, y - h],
      [x + w * 0.71, y - h],
      [x + w * 0.75, y - h * 0.66],
      [x + w * 0.85, y - h * 0.64],
      [x + w * 0.91, y - h * 0.17],
      [x + w, y],
    ],
    color,
  );
  c.globalAlpha = 0.25;
  c.lineWidth = 1;
  path(
    c,
    [
      [x + w * 0.3, y - h * 0.78],
      [x + w * 0.66, y - h * 0.78],
    ],
    undefined,
    detail,
    false,
  );
  path(
    c,
    [
      [x + w * 0.26, y - h * 0.48],
      [x + w * 0.48, y - h * 0.48],
    ],
    undefined,
    detail,
    false,
  );
  path(
    c,
    [
      [x + w * 0.58, y - h * 0.63],
      [x + w * 0.6, y - h * 0.12],
    ],
    undefined,
    detail,
    false,
  );
  c.globalAlpha = 1;
}

export function render(c: Ctx, g: GameState, reduced = false) {
  const p = trailFor(g.trail).palette;
  const w = g.width,
    h = g.height,
    ground = groundY(g);
  const travel = g.distance * 12;
  c.clearRect(0, 0, w, h);
  c.fillStyle = p.sky;
  c.fillRect(0, 0, w, h);
  // Sun, quiet clouds and a few stars on the moonlit trail.
  ellipse(c, w * 0.76, h * 0.28, 48, 48, p.sun);
  if (g.trail === "moon") {
    ellipse(c, w * 0.76 + 17, h * 0.28 - 15, 43, 43, p.sky);
    for (let i = 0; i < 32; i++) {
      const x = (i * 137.5) % w,
        y = 28 + ((i * 73) % (h * 0.44));
      ellipse(c, x, y, i % 3 ? 0.9 : 1.5, i % 3 ? 0.9 : 1.5, "#e0ddc8");
    }
  } else {
    c.strokeStyle = "#b0bdac";
    c.lineWidth = 1;
    c.lineCap = "round";
    for (const [x, y, len] of [
      [0.13, 0.24, 45],
      [0.18, 0.27, 27],
      [0.49, 0.16, 67],
      [0.53, 0.19, 23],
      [0.89, 0.36, 33],
    ])
      path(
        c,
        [
          [w * x, h * y],
          [w * x + len, h * y],
        ],
        undefined,
        c.strokeStyle,
        false,
      );
  }
  // Distant and near layers wrap seamlessly while the rider travels.
  const offsetFar = (travel * 0.07) % 560;
  for (let i = -1; i < w / 560 + 1; i++)
    mesa(
      c,
      i * 560 - offsetFar,
      ground - 24,
      490,
      120 + (i % 2) * 20,
      p.far,
      p.near,
    );
  const offsetNear = (travel * 0.2) % 760;
  for (let i = -1; i < w / 760 + 1; i++)
    mesa(c, i * 760 + 330 - offsetNear, ground + 12, 320, 110, p.near, p.ink);
  path(
    c,
    [
      [0, ground - 11],
      [w * 0.22, ground - 22],
      [w * 0.5, ground - 8],
      [w * 0.8, ground - 19],
      [w, ground - 11],
      [w, h],
      [0, h],
    ],
    p.ground,
  );
  c.lineWidth = 1.2;
  path(
    c,
    [
      [0, ground + 1],
      [w, ground + 1],
    ],
    undefined,
    p.ink,
    false,
  );
  const decorOffset = (travel * 0.45) % 900;
  for (let i = -1; i < w / 900 + 1; i++) {
    drawCactus(c, i * 900 + 710 - decorOffset, ground - 14, 0.75, p);
    drawCactus(c, i * 900 + 740 - decorOffset, ground - 16, 0.4, p);
    // Scrub, small stones and dry roadside grasses.
    c.lineWidth = 1;
    const bx = i * 900 + 420 - decorOffset;
    for (let j = -2; j <= 2; j++)
      path(
        c,
        [
          [bx, ground - 6],
          [bx + j * 4, ground - 13 - Math.abs(j) * 2],
        ],
        undefined,
        p.plant,
        false,
      );
  }
  for (let i = 0; i < 65; i++) {
    const x = (((i * 53.7 - travel * 0.85) % (w + 50)) + w + 50) % (w + 50);
    const y = ground + 17 + ((i * 19.1) % (h - ground - 22));
    c.globalAlpha = 0.3;
    c.fillStyle = p.ink;
    c.fillRect(x, y, i % 3 === 0 ? 12 : 3, 1);
    c.globalAlpha = 1;
  }
  for (const item of g.pickups)
    if (!item.taken) drawCheese(c, item.x, ground + item.y, 1);
  for (const o of g.obstacles) {
    if (o.kind === "cactus")
      drawCactus(c, o.x + o.width / 2, ground, 0.76, p, true);
    else {
      c.lineWidth = 2;
      path(
        c,
        [
          [o.x - 2, ground],
          [o.x + 3, ground - 19],
          [o.x + 16, ground - 31],
          [o.x + 30, ground - 27],
          [o.x + 41, ground],
        ],
        "#a27555",
        "#554d3c",
      );
      path(
        c,
        [
          [o.x + 16, ground - 26],
          [o.x + 12, ground - 14],
          [o.x + 26, ground - 12],
        ],
        undefined,
        "#c8a47d",
        false,
      );
    }
  }
  const px = playerX(g);
  c.globalAlpha = Math.max(0.08, 0.2 + g.playerY * 0.001);
  ellipse(c, px, ground + 3, 57, 6, p.ink);
  c.globalAlpha = 1;
  if (g.phase === "riding" && !reduced && g.playerY === 0) {
    for (let i = 0; i < 5; i++) {
      const f = (g.elapsed * 4 + i / 5) % 1;
      c.globalAlpha = (1 - f) * 0.3;
      ellipse(
        c,
        px - 57 - f * 70,
        ground - f * 12,
        f * 9 + 2,
        f * 4 + 1,
        p.ink,
      );
    }
    c.globalAlpha = 1;
  }
  drawMouse(
    c,
    px,
    ground + g.playerY - 1,
    1,
    reduced ? 0 : g.elapsed,
    g.playerY < -15,
  );
  for (const particle of g.particles) {
    c.globalAlpha = 1 - particle.age / particle.life;
    c.fillStyle = particle.color;
    c.fillRect(particle.x, particle.y, 4, 4);
  }
  c.globalAlpha = 1;
  // A simple signpost anchors the starting scene.
  if (g.phase === "ready" && w > 650) {
    const sx = w * 0.87;
    c.lineWidth = 3;
    path(
      c,
      [
        [sx, ground],
        [sx, ground - 69],
      ],
      undefined,
      "#6d6551",
      false,
    );
    c.lineWidth = 1.6;
    path(
      c,
      [
        [sx - 33, ground - 71],
        [sx + 34, ground - 71],
        [sx + 44, ground - 58],
        [sx + 34, ground - 45],
        [sx - 33, ground - 45],
      ],
      "#e4b677",
      "#6d6551",
    );
    c.fillStyle = "#584e3d";
    c.font = "12px sans-serif";
    c.textAlign = "center";
    c.fillText("the long way", sx + 2, ground - 54);
  }
}
