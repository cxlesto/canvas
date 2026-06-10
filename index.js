const canvas = document.body.insertBefore(
  document.createElement("canvas"),
  document.body.firstChild
);
const display = document.getElementById("data");

addEventListener("resize", (function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  return resize;
})());

class Game {
  canvas = canvas;
  ctx = this.canvas.getContext("2d");
  components = [];
  unitScale = 2.5;

  keybinds = {
    up: "w",
    left: "a",
    down: "s",
    right: "d",
    toggleSpin: "r"
  }

  animation = requestAnimationFrame(ts => this.update(ts));
  time = 0;

  active = true;
  autoSpin = false;

  player = new Player(25, "red", 0, 0, this);
  mouse = { x: this.center.x, y: this.center.y };
  keys = [];

  constructor() {
    addEventListener("mousemove", e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (!this.autoSpin) {
        const dx = this.mouse.x - this.center.x;
        const dy = this.mouse.y - this.center.y;
        this.player.angle = Math.atan2(dy, dx);
      }
    });

    addEventListener("keydown", e => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;
      
      if (key === this.keybinds.toggleSpin) {
        this.autoSpin = !this.autoSpin;
      }
    });

    addEventListener("keyup", e => {
      const key = e.key.toLowerCase();
      this.keys[key] = false;
    });

    addEventListener("blur", () => {
      this.active = false;
    });

    addEventListener("focus", () => {
      this.time = 0;
      this.active = true;
      this.animation = requestAnimationFrame(ts => this.update(ts));
    });
  }

  get center() {
    return {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2
    }
  }

  update(timestamp) {
    if (!this.active) return;

    let dt = (timestamp - (this.time || timestamp)) / 1000;
    this.time = timestamp;

    if (dt > 0.1) {
      dt = 1 / 60;
    } else if (dt > 1 / 30) {
      dt = 1 / 30;
    }

    this.clear();
    this.grid();

    let moveX = 0;
    let moveY = 0;

    if (this.keys[this.keybinds.up] || this.keys["arrowup"]) moveY -= 1;
    if (this.keys[this.keybinds.left] || this.keys["arrowleft"]) moveX -= 1;
    if (this.keys[this.keybinds.down] || this.keys["arrowdown"]) moveY += 1;
    if (this.keys[this.keybinds.right] || this.keys["arrowright"]) moveX += 1;

    if (moveX || moveY) {
      const length = Math.hypot(moveX, moveY);

      this.player.speed.x = moveX / length * this.player.speed.base;
      this.player.speed.y = moveY / length * this.player.speed.base;
    } else {
      this.player.speed.x = 0;
      this.player.speed.y = 0;
    }

    if (this.autoSpin) {
      this.player.rotate(2 * dt);
    }

    const substeps = 3;
    const subDt = dt / substeps;

    for (let step = 0; step < substeps; step++) {
      greenBlock.rotate(1.5 * subDt);
      blueBlock.rotate(-0.8 * subDt);
      blackBlock.rotate(2 * subDt);
      purpleTriangle.rotate(1 * subDt);
      cyanHexagon.rotate(-0.5 * subDt);
      orangeCircle.rotate(-0.2 * subDt);
      magentaDodecagon.rotate(-3 * subDt);

      this.components.forEach(component => {
        if (component instanceof Enemy) component.aiTrack(this.player);
      });

      this.components.forEach(component => {
        if (component instanceof Entity) component.move(subDt);
      });
    }

    this.components.forEach(component => component.update());

    if (display) display.innerHTML = `
    ${dt * 1000}ms
    <br>${(1 / dt).toFixed()} fps
    <br>x: ${this.player.x}
    <br>y: ${this.player.y}
    <br>${this.player.angle / Math.PI * 180}°
    `;

    this.minimap();

    requestAnimationFrame(ts => this.update(ts));
  }

  grid() {
    const size = 75;

    this.ctx.save();
    this.ctx.strokeStyle = "#222";
    this.ctx.lineWidth = 1;

    const offsetX = (this.center.x - this.player.x) % size;
    const offsetY = (this.center.y - this.player.y) % size;

    for (let x = offsetX; x < this.canvas.width; x += size) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = offsetY; y < this.canvas.height; y += size) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  minimap() {
    const size = 300;
    const padding = 20;
    const x = this.canvas.width - size - padding;
    const y = padding;
    const scale = 0.08;
    const mapRadius = size / 2;

    this.ctx.save();

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    this.ctx.strokeStyle = "#444";
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(x + mapRadius, y + mapRadius, mapRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.clip();
    this.ctx.translate(x + mapRadius, y + mapRadius);

    this.components.forEach(component => {
      const relX = (component.x - this.player.x) * scale;
      const relY = (component.y - this.player.y) * scale;

      if (Math.hypot(relX, relY) > mapRadius) return;

      if (component instanceof Obstacle) {
        this.ctx.save();
        this.ctx.translate(relX, relY);
        this.ctx.rotate(component.angle);
        this.ctx.strokeStyle = component.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        if (component.radius) {
          this.ctx.arc(0, 0, component.radius * scale, 0, Math.PI * 2);
        } else {
          component.localVertices.forEach((v, i) => {
            if (!i) this.ctx.moveTo(v.x * scale, v.y * scale);
            else this.ctx.lineTo(v.x * scale, v.y * scale);
          });
        }

        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      } else if (component instanceof Enemy) {
        this.ctx.fillStyle = component.color;
        this.ctx.beginPath();
        this.ctx.arc(relX, relY, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    this.ctx.fillStyle = this.player.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  rebind(action) {
    const captureKey = e => {
      const key = e.key.toLowerCase();
      this.keybinds[action] = key;
      removeEventListener("keydown", captureKey);
    }
    addEventListener("keydown", captureKey);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  end() {
    this.active = false;
    cancelAnimationFrame(this.animation);
  }
}

class Component {
  angle = 0;
  radius = 0;

  constructor(localVertices, color, x, y, health, radius = 0, game) {
    this.localVertices = localVertices;
    this.color = color;
    this.x = x;
    this.y = y;
    this.health = health;
    this.radius = radius;
    this.game = game;

    this.game.components.push(this);
  }

  getVertices() {
    if (this.radius) return [];
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    return this.localVertices.map(p => ({
      x: this.x + (p.x * cos - p.y * sin),
      y: this.y + (p.x * sin + p.y * cos)
    }));
  }

  getAxes() {
    const vertices = this.getVertices();
    const axes = [];
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];

      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const len = Math.hypot(normal.x, normal.y);

      axes.push({ x: normal.x / len, y: normal.y / len });
    }
    return axes;
  }
  
  getClosestVertex(circleX, circleY) {
    const vertices = this.getVertices();
    let closest = vertices[0];
    let minDist = Math.hypot(vertices[0].x - circleX, vertices[0].y - circleY);

    for (let i = 1; i < vertices.length; i++) {
      const dist = Math.hypot(vertices[i].x - circleX, vertices[i].y - circleY);
      if (dist < minDist) {
        minDist = dist;
        closest = vertices[i];
      }
    }
    return closest;
  }

  project(axis) {
    if (this.radius) {
      const dot = this.x * axis.x + this.y * axis.y;
      return { min: dot - this.radius, max: dot + this.radius };
    }

    const vertices = this.getVertices();
    let min = vertices[0].x * axis.x + vertices[0].y * axis.y;
    let max = min;

    for (let i = 1; i < vertices.length; i++) {
      const dot = vertices[i].x * axis.x + vertices[i].y * axis.y;
      if (dot < min) min = dot;
      if (dot > max) max = dot;
    }
    return { min, max };
  }

  collided(component) {
    const axes = [];

    if (!this.radius) axes.push(...this.getAxes());
    if (!component.radius) axes.push(...component.getAxes());

    if (this.radius && !component.radius) {
      const cv = component.getClosestVertex(this.x, this.y);
      const axis = { x: this.x - cv.x, y: this.y - cv.y };
      const len = Math.hypot(axis.x, axis.y);
      if (len > 0) axes.push({ x: axis.x / len, y: axis.y / len });
    } else if (!this.radius && component.radius) {
      const cv = this.getClosestVertex(component.x, component.y);
      const axis = { x: cv.x - component.x, y: cv.y - component.y };
      const len = Math.hypot(axis.x, axis.y);
      if (len > 0) axes.push({ x: axis.x / len, y: axis.y / len });
    } else if (this.radius && component.radius) {
      const axis = { x: this.x - component.x, y: this.y - component.y };
      const len = Math.hypot(axis.x, axis.y);
      if (len > 0) axes.push({ x: axis.x / len, y: axis.y / len });
    }

    let minOverlap = Infinity;
    let collisionAxis = null;

    for (const axis of axes) {
      const proj1 = this.project(axis);
      const proj2 = component.project(axis);

      if (proj1.max < proj2.min || proj2.max < proj1.min) return null;

      const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        collisionAxis = axis;
      }
    }

    const dirX = this.x - component.x;
    const dirY = this.y - component.y;
    const dot = dirX * collisionAxis.x + dirY * collisionAxis.y;
    if (dot < 0) {
      collisionAxis.x = -collisionAxis.x;
      collisionAxis.y = -collisionAxis.y;
    }

    return { depth: minOverlap, axis: collisionAxis };
  }

  update() {
    const { ctx } = this.game;
    ctx.save();
    ctx.fillStyle = this.color;

    const cameraX = this.x - this.game.player.x + this.game.center.x;
    const cameraY = this.y - this.game.player.y + this.game.center.y;

    ctx.beginPath();
    if (this.radius) {
      ctx.arc(cameraX, cameraY, this.radius, 0, Math.PI * 2);
    } else {
      const vertices = this.getVertices();
      vertices.forEach((v, i) => {
        const vx = v.x - this.game.player.x + this.game.center.x;
        const vy = v.y - this.game.player.y + this.game.center.y;
        if (!i) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      });
      ctx.closePath();
    }

    ctx.fill();

    if (this.radius) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cameraX, cameraY);
      ctx.lineTo(cameraX + Math.cos(this.angle) * this.radius, cameraY + Math.sin(this.angle) * this.radius);
      ctx.stroke();
    }

    ctx.restore();
  }

  rotate(angle) {
    this.angle += angle;
    this.angle = Math.atan2(Math.sin(this.angle), Math.cos(this.angle));
  }
}

class Obstacle extends Component {
  constructor(type, sizeOrWidth, heightOrRadius, color, x, y, health, game) {
    if (type === "circle") {
      super([], color, x, y, health, sizeOrWidth, game);
      return;
    }

    let vertices = [];
    if (type === "rect") {
      const hw = sizeOrWidth / 2;
      const hh = heightOrRadius / 2;
      vertices = [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh }
      ];
    } else if (type === "poly") {
      const sides = sizeOrWidth;
      const radius = heightOrRadius;
      for (let i = 0; i < sides; i++) {
        const angle = i / sides * Math.PI * 2;
        vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
    }

    super(vertices, color, x, y, health, 0, game);
  }
}

class Entity extends Component {
  constructor(localVertices, color, x, y, speed, health, radius = 0, game) {
    super(localVertices, color, x, y, health, radius, game);
    this.speed = { x: 0, y: 0, base: speed };
  }

  move(dt) {
    this.x += this.speed.x * this.game.unitScale * dt;
    this.y += this.speed.y * this.game.unitScale * dt;

    for (let loop = 0; loop < 4; loop++) {
      let resolvedAny = false;

      this.game.components.forEach(component => {
        if (component === this) return;

        const hit = this.collided(component);
        if (hit) {
          const weight = component instanceof Obstacle ? 1 : 0.5;

          this.x += hit.axis.x * hit.depth * weight;
          this.y += hit.axis.y * hit.depth * weight;

          if (component instanceof Entity) {
            component.x -= hit.axis.x * hit.depth * (1 - weight);
            component.y -= hit.axis.y * hit.depth * (1 - weight);
          }

          resolvedAny = true;
        }
      });

      if (!resolvedAny) break;
    }
  }
}

class Player extends Entity {
  constructor(radius, color, x, y, game) {
    super([], color, x, y, 100, 100, radius, game);
  }
}

class Enemy extends Entity {
  constructor(radius, color, x, y, speed, health, game) {
    super([], color, x, y, speed, health, radius, game);
  }

  aiTrack(component) {
    const dx = component.x - this.x;
    const dy = component.y - this.y;
    this.angle = Math.atan2(dy, dx);

    this.speed.x = Math.cos(this.angle) * this.speed.base;
    this.speed.y = Math.sin(this.angle) * this.speed.base;
  }
}

const game = new Game;

const gr = game.ctx.createLinearGradient(0, 0, 1000, 1000);
gr.addColorStop(0, "black");
gr.addColorStop(0.5, "gray");
gr.addColorStop(1, "black");

const greenBlock = new Obstacle("rect", 200, 200, "#0f0", -100, 300, 0, game);
const blueBlock = new Obstacle("rect", 400, 100, "blue", -400, 100, 0, game);
const blackBlock = new Obstacle("rect", 1000, 1000, gr, -100, 1500, 0, game);
const purpleTriangle = new Obstacle("poly", 3, 120, "purple", 400, -100, 0, game);
const cyanHexagon = new Obstacle("poly", 6, 100, "cyan", 200, 600, 0, game);
const orangeCircle = new Obstacle("circle", 80, 0, "darkorange", 500, 200, 0, game);
const magentaDodecagon = new Obstacle("poly", 12, 400, "#f06", -100, -500, 0, game);

for (let i = 1; i <= 12; i++) {
  setTimeout(() => new Enemy(20, "orange", -200 - i * 42, -200 - i * 42, 99, 0, game), i * 1000);
}