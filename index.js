class SpatialHash {
  grid = new Map;

  constructor(cellSize) {
    this.cellSize = cellSize;
  }

  clear() {
    this.grid.clear();
  }

  get(x, y) {
    return x << 16 | y & 0xffff;
  }

  insert(component) {
    const startX = Math.floor(component.aabb.minX / this.cellSize);
    const endX = Math.floor(component.aabb.maxX / this.cellSize);
    const startY = Math.floor(component.aabb.minY / this.cellSize);
    const endY = Math.floor(component.aabb.maxY / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = this.get(x, y);
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key).push(component);
      }
    }
  }

  query(aabb) {
    const startX = Math.floor(aabb.minX / this.cellSize);
    const endX = Math.floor(aabb.maxX / this.cellSize);
    const startY = Math.floor(aabb.minY / this.cellSize);
    const endY = Math.floor(aabb.maxY / this.cellSize);

    const found = new Set;

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = this.get(x, y);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            found.add(cell[i]);
          }
        }
      }
    }

    return found;
  }
}

class Game {
  canvas = document.getElementsByTagName("canvas")[0];
  ctx = this.canvas.getContext("2d");
  display = document.getElementById("data");

  components = [];
  unitScale = 2.5;
  /* ~ */
  vchecks = 0;

  spatialHash = new SpatialHash(200);

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

  player = new Player(this, { radius: 25, color: "red", x: 0, y: 0 });
  mouse = { x: this.center.x, y: this.center.y };
  keys = {};

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

    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.active = false;
      } else {
        this.time = 0;
        this.active = true;
        this.animation = requestAnimationFrame(ts => this.update(ts));
      }
    });
  }

  get center() {
    return {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2
    }
  }

  init() {
    this.enemies({ amount: 1200, wait: 0 });
    this.world();
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
      const length = Math.sqrt(moveX * moveX + moveY * moveY);

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
      this.greenBlock.rotate(1.5 * subDt);
      this.blueBlock.rotate(-0.8 * subDt);
      this.blackBlock.rotate(2 * subDt);
      this.purpleTriangle.rotate(1 * subDt);
      this.cyanHexagon.rotate(-0.5 * subDt);
      this.orangeCircle.rotate(-0.2 * subDt);
      this.magentaDodecagon.rotate(-3 * subDt);

      this.spatialHash.clear();
      for (let i = 0; i < this.components.length; i++) {
        const component = this.components[i];
        this.spatialHash.insert(component);
      }

      for (let i = 0; i < this.components.length; i++) {
        const component = this.components[i];
        if (component instanceof Enemy) {
          component.aiTrack(this.player);
        }
      }

      for (let i = 0; i < this.components.length; i++) {
        const component = this.components[i];
        if (component instanceof Entity) {
          component.move(subDt);
        }
      }
    }

    for (let i = 0; i < this.components.length; i++) {
      const component = this.components[i];
      component.update();
    }

    if (this.display) this.display.innerHTML = `
    ${dt * 1000}ms
    <br>${(1 / dt).toFixed()} fps
    <br>x: ${this.player.x}
    <br>y: ${this.player.y}
    <br>${this.player.angle / Math.PI * 180}°
    <br>(${this.player.speed.x})
    <br>(${this.player.speed.y})
    <br>[${this.components.length}]
    <br>*${
      /* ~ */
      this.vchecks
    }*
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

    for (let i = 0; i < this.components.length; i++) {
      const component = this.components[i];

      const relX = (component.x - this.player.x) * scale;
      const relY = (component.y - this.player.y) * scale;

      if (relX * relX + relY * relY > mapRadius * mapRadius) continue;

      if (component instanceof Enemy) {
        this.ctx.fillStyle = component.color;
        this.ctx.beginPath();
        this.ctx.arc(relX, relY, 3, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (component instanceof Entity) {
        this.ctx.save();
        this.ctx.translate(relX, relY);
        this.ctx.rotate(component.angle);
        this.ctx.strokeStyle = component.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        if (component.radius) {
          this.ctx.arc(0, 0, component.radius * scale, 0, Math.PI * 2);
        } else {
          for (let i = 0; i < component.localVertices.length; i++) {
            const v = component.localVertices[i];
            if (!i) this.ctx.moveTo(v.x * scale, v.y * scale);
            else this.ctx.lineTo(v.x * scale, v.y * scale);
          }
        }

        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    this.ctx.fillStyle = this.player.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  world() {
    const gr = this.ctx.createLinearGradient(0, 0, 1000, 1000);
    gr.addColorStop(0, "black");
    gr.addColorStop(0.5, "gray");
    gr.addColorStop(1, "black");

    this.greenBlock = new Entity(this, { type: "rect", width: 200, height: 200, color: "#0f0", x: -100, y: 300 });
    this.blueBlock = new Entity(this, { type: "rect", width: 400, height: 100, color: "blue", x: -400, y: 100 });
    this.blackBlock = new Entity(this, { type: "rect", width: 1000, height: 1000, color: gr, x: -100, y: 1500 });
    this.purpleTriangle = new Entity(this, { type: "poly", sides: 3, radius: 120, color: "purple", x: 400, y: -100 });
    this.cyanHexagon = new Entity(this, { type: "poly", sides: 6, radius: 100, color: "cyan", x: 200, y: 600 });
    this.orangeCircle = new Entity(this, { type: "circle", radius: 80, color: "darkorange", x: 500, y: 200 });
    this.magentaDodecagon = new Entity(this, { type: "poly", sides: 12, radius: 400, color: "#f06", x: -100, y: -500 });

    this.redBlocks = [
      new Entity(this, { type: "rect", width: 200, height: 500, color: "#f82020", x: -1350, y: -450 }),
      new Entity(this, { type: "rect", width: 500, height: 200, color: "#f82020", x: -1000, y: -100 })
    ];

    this.stoneWall = new Entity(this, {
      type: "rect", width: 200, height: 200, color: "gray", x: -100, y: 300
    });
    this.woodenCrate = new Entity(this, {
      type: "rect", width: 80, height: 80, color: "brown", x: 200, y: 200, mass: 30
    });
    this.beachBall = new Entity(this, {
      type: "circle", radius: 30, color: "pink", x: -200, y: -200, mass: 1
    });
  }

  enemies({ amount = 12, wait = 1000, spawn = true, normal = true, heavy = true, light = true } = {}) {
    if (spawn) {
      if (normal) {
        for (let i = 1; i <= amount; i++) {
          setTimeout(() => new Enemy(this, {
            radius: 20,
            color: "orange",
            x: -200 - i * 42,
            y: -200 - i * 42,
            speed: 99,
            mass: 100
          }), i * wait);
        }
      }
  
      if (heavy) {
        new Enemy(this, { radius: 35, color: "darkred", x: 400, y: 400, speed: 80, mass: 500 });
      }
  
      if (light) {
        new Enemy(this, { radius: 15, color: "yellow", x: -400, y: 400, speed: 150, mass: 20 });
      }
    }
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
    /* ~ */
    this.vchecks = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  end() {
    this.active = false;
    cancelAnimationFrame(this.animation);
  }
}

class Component {
  angle = 0;
  aabb = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  lapsed = true;

  constructor(game, { vertices = [], color = "white", x = 0, y = 0, health = 0, radius = 0, mass = Infinity } = {}) {
    this.game = game;

    this.localVertices = vertices;
    this.worldVertices = vertices.map(() => ({ x: 0, y: 0 }));

    this.color = color;
    this.x = x;
    this.y = y;
    this.health = health;
    this.radius = radius;
    this.mass = mass;

    this.game.components.push(this);
    this.updateVertices();
  }

  updateVertices() {
    /* ~ */
    ++this.game.vchecks;

    if (!this.lapsed) return this.worldVertices;

    if (this.radius) {
      this.aabb.minX = this.x - this.radius;
      this.aabb.maxX = this.x + this.radius;
      this.aabb.minY = this.y - this.radius;
      this.aabb.maxY = this.y + this.radius;

      this.lapsed = false;
      return this.worldVertices;
    };

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < this.localVertices.length; i++) {
      const p = this.localVertices[i];
      const vx = this.x + (p.x * cos - p.y * sin);
      const vy = this.y + (p.x * sin + p.y * cos);

      this.worldVertices[i].x = vx;
      this.worldVertices[i].y = vy;

      if (vx < minX) minX = vx;
      if (vx > maxX) maxX = vx;
      if (vy < minY) minY = vy;
      if (vy > maxY) maxY = vy;
    }

    this.aabb.minX = minX;
    this.aabb.maxX = maxX;
    this.aabb.minY = minY;
    this.aabb.maxY = maxY;

    this.lapsed = false;
    return this.worldVertices;
  }

  getAxes(vertices) {
    const axes = [];
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];

      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);

      axes.push({ x: normal.x / len, y: normal.y / len });
    }
    return axes;
  }

  getClosestVertex(circleX, circleY) {
    const vertices = this.worldVertices;
    let closest = vertices[0];

    const dx = closest.x - circleX;
    const dy = closest.y - circleY;
    let minDistSq = dx * dx + dy * dy;

    for (let i = 1; i < vertices.length; i++) {
      const vx = vertices[i].x - circleX;
      const vy = vertices[i].y - circleY;
      const distSq = vx * vx + vy * vy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = vertices[i];
      }
    }
    return closest;
  }

  project(axis, vertices) {
    if (this.radius) {
      const dot = this.x * axis.x + this.y * axis.y;
      return { min: dot - this.radius, max: dot + this.radius };
    }

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
    const myVerts = this.worldVertices;
    const otherVerts = component.worldVertices;

    if (
      this.aabb.maxX < component.aabb.minX ||
      component.aabb.maxX < this.aabb.minX ||
      this.aabb.maxY < component.aabb.minY ||
      component.aabb.maxY < this.aabb.minY
    ) return null;

    const axes = [];

    if (!this.radius) axes.push(...this.getAxes(myVerts));
    if (!component.radius) axes.push(...component.getAxes(otherVerts));

    if (this.radius && !component.radius) {
      const cv = component.getClosestVertex(this.x, this.y);
      const axis = { x: this.x - cv.x, y: this.y - cv.y };
      const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
      if (len > 0) axes.push({ x: axis.x / len, y: axis.y / len });
    } else if (!this.radius && component.radius) {
      const cv = this.getClosestVertex(component.x, component.y);
      const axis = { x: cv.x - component.x, y: cv.y - component.y };
      const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
      if (len > 0) axes.push({ x: axis.x / len, y: axis.y / len });
    } else if (this.radius && component.radius) {
      const axis = { x: this.x - component.x, y: this.y - component.y };
      const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
      if (len > 0) axes.push({ x: axis.x / len, y: axis.y / len });
    }

    let minOverlap = Infinity;
    let collisionAxis = null;

    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];

      const proj1 = this.project(axis, myVerts);
      const proj2 = component.project(axis, otherVerts);

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
    this.game.ctx.fillStyle = this.color;

    const cameraX = this.x - this.game.player.x + this.game.center.x;
    const cameraY = this.y - this.game.player.y + this.game.center.y;

    this.game.ctx.beginPath();
    if (this.radius) {
      this.game.ctx.arc(cameraX, cameraY, this.radius, 0, Math.PI * 2);
    } else {
      for (let i = 0; i < this.worldVertices.length; i++) {
        const v = this.worldVertices[i];

        const vx = v.x - this.game.player.x + this.game.center.x;
        const vy = v.y - this.game.player.y + this.game.center.y;
        if (!i) this.game.ctx.moveTo(vx, vy);
        else this.game.ctx.lineTo(vx, vy);
      }
    }

    this.game.ctx.fill();

    if (this.radius) {
      this.game.ctx.strokeStyle = "white";
      this.game.ctx.lineWidth = 2;
      this.game.ctx.beginPath();
      this.game.ctx.moveTo(cameraX, cameraY);
      this.game.ctx.lineTo(cameraX + Math.cos(this.angle) * this.radius, cameraY + Math.sin(this.angle) * this.radius);
      this.game.ctx.stroke();
    }
  }

  rotate(angle) {
    this.angle += angle;

    const twoPi = Math.PI * 2;
    this.angle -= twoPi * Math.round(this.angle / twoPi);

    this.lapsed = true;
    this.updateVertices();
  }
}

class Entity extends Component {
  constructor(game, config = {}) {
    let vertices = config.vertices || [];
    let radius = config.type === "circle" ? (config.radius || 0) : 0;

    if (config.type === "rect") {
      const hw = config.width / 2;
      const hh = config.height / 2;
      vertices = [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh }
      ];
    } else if (config.type === "poly") {
      for (let i = 0; i < config.sides; i++) {
        const angle = i / config.sides * Math.PI * 2;
        vertices.push({ x: Math.cos(angle) * config.radius, y: Math.sin(angle) * config.radius });
      }
    }

    super(game, { ...config, vertices, radius });

    this.speed = { x: 0, y: 0, base: config.speed || 0 };
  }

  move(dt) {
    if (this.mass === Infinity) return;

    this.x += this.speed.x * this.game.unitScale * dt;
    this.y += this.speed.y * this.game.unitScale * dt;

    this.lapsed = true;
    this.updateVertices();

    for (let loop = 0; loop < 4; loop++) {
      let resolvedAny = false;

      const nearbyComponents = this.game.spatialHash.query(this.aabb);

      for (const component of nearbyComponents) {
        if (component === this) continue;

        if (this.mass === Infinity && component.mass === Infinity) continue;

        const hit = this.collided(component);
        if (hit) {
          let pushMe = 0;
          let pushOther = 0;

          if (this.mass === Infinity) {
            pushOther = 1;
          } else if (component.mass === Infinity) {
            pushMe = 1;
          } else {
            const invTotal = 1 / (this.mass + component.mass);
            pushMe = component.mass * invTotal;
            pushOther = this.mass * invTotal;
          }

          this.x += hit.axis.x * hit.depth * pushMe;
          this.y += hit.axis.y * hit.depth * pushMe;
          if (pushMe) this.lapsed = true;

          component.x -= hit.axis.x * hit.depth * pushOther;
          component.y -= hit.axis.y * hit.depth * pushOther;
          if (pushOther) component.lapsed = true;

          resolvedAny = true;
        }
      };

      if (!resolvedAny) break;
    }
  }
}

class Player extends Entity {
  constructor(game, config = {}) {
    super(game, { ...config, type: "circle", speed: 100, health: 100, mass: 100 });
  }
}

class Enemy extends Entity {
  constructor(game, config = {}) {
    super(game, { ...config, type: "circle" });
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

game.init();

addEventListener("resize", (function resize() {
  game.canvas.width = innerWidth;
  game.canvas.height = innerHeight;
  return resize;
})());