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

function gear(
  c: Ctx,
  x: number,
  y: number,
  radius: number,
  color: string,
  angle = 0,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.lineWidth = 5;
  c.strokeStyle = color;
  c.beginPath();
  c.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    c.fillStyle = color;
    c.fillRect(radius * 0.64, -4, radius * 0.4, 8);
  }
  ellipse(c, 0, 0, radius * 0.18, radius * 0.18, color);
  c.restore();
}
function cart(c: Ctx, x: number, y: number, time: number) {
  c.save();
  c.translate(x, y);
  c.lineWidth = 2;
  for (const dx of [-19, 19]) {
    ellipse(c, dx, 21, 11, 11, "#27243f", "#e7b5ab");
    gear(c, dx, 21, 7, "#b2a4bb", time * 5);
  }
  path(
    c,
    [
      [-35, -10],
      [34, -10],
      [27, 16],
      [-25, 16],
    ],
    "#574961",
    "#29213f",
  );
  c.fillStyle = "#f1ad68";
  c.fillRect(-22, -5, 44, 4);
  for (const dx of [-23, 0, 23])
    path(
      c,
      [
        [dx - 8, -10],
        [dx, -31],
        [dx + 8, -10],
      ],
      "#cdd3dd",
      "#29213f",
    );
  ellipse(c, 0, 4, 5, 5, "#ff7e80");
  c.restore();
}
function goblin(c: Ctx, x: number, y: number, time: number) {
  c.save();
  c.translate(x, y);
  c.lineWidth = 2;
  c.lineJoin = "round";
  path(
    c,
    [
      [18, 5],
      [45, 1],
      [30, 14],
    ],
    "#ffc76d",
  );
  path(
    c,
    [
      [-30, 4],
      [19, -2],
      [27, 11],
      [-21, 17],
      [-40, 12],
    ],
    "#b779b5",
    "#29213f",
  );
  c.fillStyle = "#f1cc79";
  c.fillRect(-28, 8, 38, 3);
  ellipse(c, 0, -12, 16, 15, "#9cdda9", "#29213f");
  path(
    c,
    [
      [-13, -17],
      [-29, -27],
      [-20, -8],
    ],
    "#9cdda9",
    "#29213f",
  );
  path(
    c,
    [
      [12, -17],
      [25, -27],
      [21, -7],
    ],
    "#9cdda9",
    "#29213f",
  );
  path(
    c,
    [
      [-16, -21],
      [-2, -34],
      [16, -23],
    ],
    "#df8e9b",
    "#29213f",
  );
  c.fillStyle = "#29213f";
  c.fillRect(-12, -13, 8, 4);
  c.fillRect(3, -13, 7, 4);
  path(
    c,
    [
      [-13, -5],
      [-7, 0],
      [6, -4],
    ],
    undefined,
    "#29213f",
    false,
  );
  c.strokeStyle = "#bde7d8";
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(0, 8, 44, 3, Math.sin(time * 12) * 0.05, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}
export function drawBlimp(
  c: Ctx,
  x: number,
  y: number,
  time: number,
  scale = 1,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineWidth = 3;
  c.lineJoin = "round";
  path(
    c,
    [
      [58, -14],
      [109, -37],
      [103, 7],
      [66, 22],
    ],
    "#8b658c",
    "#29213f",
  );
  ellipse(c, 0, 0, 87, 47, "#b2759b", "#29213f");
  c.save();
  c.beginPath();
  c.ellipse(0, 0, 84, 44, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = "#e8ab9b";
  c.fillRect(-75, -33, 155, 13);
  c.fillStyle = "#8b587e";
  c.fillRect(-90, 21, 180, 22);
  for (let i = -50; i <= 55; i += 35) {
    c.strokeStyle = "#eac0a6";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(i, 0, 17, 47, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  path(
    c,
    [
      [-37, 33],
      [-28, 63],
      [29, 63],
      [42, 32],
    ],
    "#5e456e",
    "#29213f",
  );
  ellipse(c, -5, 48, 18, 14, "#c4c3cf", "#29213f");
  path(
    c,
    [
      [-23, 43],
      [-23, 23],
      [-9, 37],
      [6, 36],
      [19, 22],
      [17, 45],
    ],
    "#c4c3cf",
    "#29213f",
  );
  c.strokeStyle = "#29213f";
  c.lineWidth = 2;
  path(
    c,
    [
      [-17, 44],
      [-9, 47],
      [-3, 43],
      [7, 45],
    ],
    undefined,
    "#29213f",
    false,
  );
  ellipse(c, -4, 50, 3, 2, "#d48b91");
  c.fillStyle = "#e8b969";
  c.fillRect(-23, 57, 40, 5);
  c.strokeStyle = "#33304d";
  c.lineWidth = 6;
  path(
    c,
    [
      [-35, 51],
      [-61, 57],
    ],
    undefined,
    "#33304d",
    false,
  );
  gear(c, 54, 34, 20, "#e9bb70", time * 2);
  path(
    c,
    [
      [-63, -19],
      [-48, -44],
      [-30, -32],
    ],
    "#93618f",
    "#29213f",
  );
  ellipse(c, -53, -7, 6, 10, "#ffe39c", "#29213f");
  c.restore();
}
export function render(c: Ctx, g: GameState, reduced = false) {
  const p = trailFor(g.trail).palette,
    w = g.width,
    h = g.height,
    ground = groundY(g);
  const travel = g.distance * 12,
    time = reduced ? 0 : g.elapsed;
  c.clearRect(0, 0, w, h);
  const sky = c.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, p.sky);
  sky.addColorStop(1, g.trail === "moon" ? "#845e9d" : "#de9c9d");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  ellipse(c, w * 0.72, h * 0.35, 65, 65, p.sun);
  c.fillStyle = p.sky;
  c.globalAlpha = 0.32;
  for (let i = 0; i < 4; i++)
    c.fillRect(w * 0.72 - 70, h * 0.35 + 10 + i * 12, 140, 4 + i * 2);
  c.globalAlpha = 1;
  if (g.trail === "moon")
    for (let i = 0; i < 30; i++)
      ellipse(
        c,
        (i * 137.5) % w,
        20 + ((i * 73) % (h * 0.42)),
        i % 3 ? 0.8 : 1.5,
        i % 3 ? 0.8 : 1.5,
        "#e8dcef",
      );
  c.globalAlpha = 0.18;
  gear(
    c,
    w * 0.13 - ((reduced ? 0 : travel * 0.015) % 120),
    145,
    65,
    "#f1bed3",
    time * 0.07,
  );
  gear(c, w * 0.87, 190, 80, "#ffe1b6", -time * 0.1);
  c.globalAlpha = 1;
  const far = reduced ? 0 : (travel * 0.09) % 560;
  for (let i = -1; i < w / 560 + 1; i++)
    mesa(c, i * 560 - far, ground - 25, 500, 160 + (i % 2) * 30, p.far, p.near);
  const near = reduced ? 0 : (travel * 0.23) % 760;
  for (let i = -1; i < w / 760 + 1; i++)
    mesa(c, i * 760 + 310 - near, ground + 7, 320, 115, p.near, p.ink);
  c.globalAlpha = 0.5;
  for (let i = 0; i < 6; i++) {
    const x =
      (((i * 257 - (reduced ? 0 : travel * 0.1)) % (w + 100)) + w + 100) %
      (w + 100);
    c.fillStyle = "#f4d1c1";
    c.fillRect(x, 70 + (i % 3) * 32, 45, 2);
    c.fillRect(x + 12, 76 + (i % 3) * 32, 70, 2);
  }
  c.globalAlpha = 1;
  c.fillStyle = p.ground;
  c.fillRect(0, ground, w, h - ground);
  c.fillStyle = "#2a2342";
  c.fillRect(0, ground, w, 10);
  c.fillStyle = "#75d6c1";
  c.fillRect(0, ground, w, 3);
  const offset = (reduced ? 0 : travel) % 65;
  for (let x = -65; x < w + 65; x += 65) {
    c.fillStyle = "#a17e9e";
    c.fillRect(x - offset, ground + 21, 32, 4);
    c.fillStyle = "#342840";
    c.fillRect(x - offset + 8, ground + 36, 46, 3);
  }
  const decor = (reduced ? 0 : travel * 0.45) % 900;
  for (let i = -1; i < w / 900 + 1; i++) {
    drawCactus(c, i * 900 + 710 - decor, ground - 9, 0.8, p);
    drawCactus(c, i * 900 + 750 - decor, ground - 10, 0.4, p);
  }
  if (g.phase === "ready") {
    for (let i = 0; i < 5; i++)
      drawCheese(
        c,
        w * 0.47 + i * 34,
        ground - 58 - Math.sin(i * 0.6) * 25,
        0.85,
      );
    cart(c, w * 0.82, ground - 28, 0);
    goblin(c, w * 0.84, ground - 175, 0);
    if (w > 750) drawBlimp(c, w * 0.92, 110, 0, 0.5);
  }
  for (const item of g.pickups)
    if (!item.taken) drawCheese(c, item.x, ground + item.y, 0.8);
  for (const o of g.obstacles)
    if (o.kind === "cactus")
      drawCactus(c, o.x + o.width / 2, ground, 0.63, p, true);
    else {
      ellipse(c, o.x + 15, ground - 13, 22, 15, "#89708b", "#342840");
      gear(c, o.x + 15, ground - 13, 11, "#c6a0a7");
    }
  for (const e of g.enemies)
    if (e.kind === "cart") cart(c, e.x, ground + e.y, time);
    else goblin(c, e.x, ground + e.y, time);
  if (g.boss) drawBlimp(c, g.boss.x, ground + g.boss.y, time);
  const px = playerX(g),
    py = ground + g.playerY;
  c.globalAlpha = 0.25;
  ellipse(c, px, ground + 8, 45, 7, "#27213f");
  c.globalAlpha = 1;
  if ((g.nitro || g.turbo || g.input.up) && g.phase === "riding") {
    const len = (g.nitro ? 80 : 40) + (reduced ? 0 : Math.sin(time * 45) * 12);
    path(
      c,
      [
        [px - 25, py - 57],
        [px - len, py - 40],
        [px - 30, py - 30],
      ],
      g.turbo ? "#78efda" : "#fbb96e",
    );
    path(
      c,
      [
        [px - 25, py - 50],
        [px - len * 0.7, py - 42],
        [px - 29, py - 35],
      ],
      "#fff0a7",
    );
  }
  // The original Pip rider remains, now fitted with a crown, jetpack and seed cannon.
  c.save();
  if (g.invincible > 0) c.globalAlpha = 0.65;
  drawMouse(c, px, py - 1, 0.72, time, g.playerY < -15);
  c.lineWidth = 2;
  path(
    c,
    [
      [px - 29, py - 103],
      [px - 32, py - 116],
      [px - 22, py - 110],
      [px - 16, py - 122],
      [px - 10, py - 110],
      [px, py - 117],
      [px - 4, py - 101],
    ],
    "#ffdb71",
    "#493550",
  );
  c.fillStyle = "#726191";
  c.fillRect(px - 31, py - 63, 12, 24);
  c.strokeStyle = "#29213f";
  c.strokeRect(px - 31, py - 63, 12, 24);
  c.save();
  c.translate(px + 25, py - 55);
  if (g.aim)
    c.rotate(Math.atan2(g.aim.y - (g.playerY - 55), g.aim.x - (px + 38)));
  c.fillStyle = "#efbd60";
  c.fillRect(-7, -8, 36, 14);
  c.strokeStyle = "#493550";
  c.strokeRect(-7, -8, 36, 14);
  c.fillStyle = "#ffedb0";
  c.fillRect(23, -10, 8, 18);
  c.restore();
  if (g.turbo) {
    c.strokeStyle = "#79ead6";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(px - 27, py - 14, 18, 0, Math.PI * 2);
    c.arc(px + 30, py - 14, 18, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  for (const s of g.shots) {
    c.save();
    c.translate(s.x, ground + s.y);
    c.rotate(Math.atan2(s.vy, s.vx));
    ellipse(
      c,
      0,
      0,
      s.hostile ? 8 : 9,
      s.hostile ? 5 : 4,
      s.hostile ? "#ff9ba4" : "#ffed99",
      s.hostile ? "#782c55" : "#b0773d",
    );
    c.restore();
  }
  if (g.aim && g.phase === "riding") {
    const ax = g.aim.x,
      ay = ground + g.aim.y;
    c.strokeStyle = "#fff4c2";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(ax, ay, 10, 0, Math.PI * 2);
    c.moveTo(ax - 15, ay);
    c.lineTo(ax + 15, ay);
    c.moveTo(ax, ay - 15);
    c.lineTo(ax, ay + 15);
    c.stroke();
  }
  if (!reduced) {
    for (const part of g.particles) {
      c.globalAlpha = 1 - part.age / part.life;
      c.fillStyle = part.color;
      c.fillRect(part.x, part.y, 4, 4);
    }
    c.globalAlpha = 1;
    if (g.stormFlash > 0) {
      c.strokeStyle = "#a1fff0";
      c.lineWidth = 4;
      for (let i = 0; i < 4; i++)
        path(
          c,
          [
            [(w * (i + 0.3)) / 4, 25],
            [(w * (i + 0.7)) / 4, 125],
            [(w * (i + 0.2)) / 4, 170],
            [(w * (i + 0.6)) / 4, ground],
          ],
          undefined,
          "#a1fff0",
          false,
        );
    }
    if (g.bombFlash > 0) {
      c.strokeStyle = "#ffda74";
      c.lineWidth = 8;
      c.beginPath();
      c.arc(px, py - 50, (0.6 - g.bombFlash) * w * 2, 0, Math.PI * 2);
      c.stroke();
    }
    if (g.nitro) {
      c.strokeStyle = "#fff3cd";
      c.globalAlpha = 0.5;
      c.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = (((i * 147 - travel * 2) % w) + w) % w;
        path(
          c,
          [
            [x, 140 + i * 24],
            [x + 35, 140 + i * 24],
          ],
          undefined,
          "#fff3cd",
          false,
        );
      }
      c.globalAlpha = 1;
    }
  }
}
