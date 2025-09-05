// Full JS — paste inside <script> in your page
// If there's no <canvas id="c"> the script will create one and append to body.
(function () {
  // create or get canvas
  let c = document.getElementById("c");
  if (!c) {
    c = document.createElement("canvas");
    c.id = "c";
    c.style.position = "fixed";
    c.style.left = "0";
    c.style.top = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.zIndex = "9999";
    document.body.appendChild(c);
  }

  // helpers
  function hexToRgba(hex, a) {
    // supports #RRGGBB or #RGB
    let h = hex.replace("#", "");
    if (h.length === 3)
      h = h
        .split("")
        .map((ch) => ch + ch)
        .join("");
    let bigint = parseInt(h, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  // canvas + context
  let w = (c.width = window.innerWidth),
    h = (c.height = window.innerHeight),
    ctx = c.getContext("2d"),
    hw = w / 2,
    hh = h / 2;

  // options (close to your original) — صغِرت القيمة شوية
  let opts = {
    // texts
    strings: ["HAPPY", "BIRTHDAY!", "to You"],
    charSize: 42, // كان 48 — صغرتها شوية
    charSpacing: 48,
    lineHeight: 64,

    cx: w / 2,
    cy: h / 2,

    // firework letter trail
    fireworkPrevPoints: 10,
    fireworkBaseLineWidth: 4,
    fireworkAddedLineWidth: 6,
    fireworkSpawnTime: 120,
    fireworkBaseReachTime: 40,
    fireworkAddedReachTime: 30,
    fireworkCircleBaseSize: 20,
    fireworkCircleAddedSize: 12,
    fireworkCircleBaseTime: 30,
    fireworkCircleAddedTime: 30,
    fireworkCircleFadeBaseTime: 12,
    fireworkCircleFadeAddedTime: 8,
    fireworkBaseShards: 8,
    fireworkAddedShards: 8,
    fireworkShardPrevPoints: 4,
    fireworkShardBaseVel: 4,
    fireworkShardAddedVel: 2,
    fireworkShardBaseSize: 2,
    fireworkShardAddedSize: 2,

    gravity: 0.12,
    upFlow: -0.06,
    letterContemplatingWaitTime: 360,

    // balloons
    balloonSpawnTime: 20,
    balloonBaseInflateTime: 12,
    balloonAddedInflateTime: 12,
    balloonBaseSize: 22,
    balloonAddedSize: 18,
    balloonBaseVel: 0.45,
    balloonAddedVel: 0.45,
    balloonBaseRadian: -(Math.PI / 2 - 0.5),
    balloonAddedRadian: -1,

    // general fireworks (background random)
    globalFireworkChance: 0.02,
    globalSparkCount: 40,
    globalSparkSize: 2,
  };

  // palette decided (non repeating, visible on #00b5ff)
  const palette = ["#FFD700", "#DC143C", "#8A2BE2", "#FF8C00", "#006400"]; // gold, crimson, darkviolet, darkorange, darkgreen

  // calc values
  let calc = {
    totalWidth:
      opts.charSpacing *
      Math.max(opts.strings[0].length, opts.strings[1].length),
  };

  const Tau = Math.PI * 2;
  const TauQuarter = Tau / 4;

  ctx.font = opts.charSize + "px Verdana";
  ctx.textBaseline = "middle";

  // ---- Letter (full behavior: firework -> contemplate -> balloon) ----
  function Letter(char, x, y, color) {
    this.char = char;
    this.x = x;
    this.y = y;

    this.dx = -ctx.measureText(char).width / 2;
    this.dy = +opts.charSize / 2;

    this.fireworkDy = this.y - hh;

    // color assigned from palette (hex)
    this.colorHex = color || palette[0];
    this.color = this.colorHex;
    this.lightColor = this.colorHex; // used when drawn on circle etc.

    // alpha color generator
    this.alphaColor = (alp) => hexToRgba(this.colorHex, alp);

    this.reset();
  }

  Letter.prototype.reset = function () {
    this.phase = "firework";
    this.tick = 0;
    this.spawned = false;
    this.spawningTime = (opts.fireworkSpawnTime * Math.random()) | 0;
    this.reachTime =
      (opts.fireworkBaseReachTime +
        opts.fireworkAddedReachTime * Math.random()) |
      0;
    this.lineWidth =
      opts.fireworkBaseLineWidth + opts.fireworkAddedLineWidth * Math.random();
    this.prevPoints = [[0, hh, 0]];
    this.shards = [];
    this.circleCreating = false;
    this.circleFading = false;
    this.circleFinalSize = 0;
    this.circleCompleteTime = 0;
    this.circleFadeTime = 0;
  };

  Letter.prototype.step = function () {
    if (this.phase === "firework") {
      if (!this.spawned) {
        ++this.tick;
        if (this.tick >= this.spawningTime) {
          this.tick = 0;
          this.spawned = true;
        }
      } else {
        ++this.tick;

        var linearProportion = this.tick / this.reachTime,
          armonicProportion = Math.sin(linearProportion * TauQuarter),
          x = linearProportion * this.x,
          y = hh + armonicProportion * this.fireworkDy;

        if (this.prevPoints.length > opts.fireworkPrevPoints)
          this.prevPoints.shift();

        this.prevPoints.push([x, y, linearProportion * this.lineWidth]);

        var lineWidthProportion = 1 / (this.prevPoints.length - 1);

        for (var i = 1; i < this.prevPoints.length; ++i) {
          var point = this.prevPoints[i],
            point2 = this.prevPoints[i - 1];

          ctx.strokeStyle = this.alphaColor(i / this.prevPoints.length);
          ctx.lineWidth = point[2] * lineWidthProportion * i;
          ctx.beginPath();
          ctx.moveTo(point[0], point[1]);
          ctx.lineTo(point2[0], point2[1]);
          ctx.stroke();
        }

        if (this.tick >= this.reachTime) {
          this.phase = "contemplate";

          this.circleFinalSize =
            opts.fireworkCircleBaseSize +
            opts.fireworkCircleAddedSize * Math.random();
          this.circleCompleteTime =
            (opts.fireworkCircleBaseTime +
              opts.fireworkCircleAddedTime * Math.random()) |
            0;
          this.circleCreating = true;
          this.circleFading = false;

          this.circleFadeTime =
            (opts.fireworkCircleFadeBaseTime +
              opts.fireworkCircleFadeAddedTime * Math.random()) |
            0;
          this.tick = 0;
          this.tick2 = 0;

          this.shards = [];

          var shardCount =
              (opts.fireworkBaseShards +
                opts.fireworkAddedShards * Math.random()) |
              0,
            angle = Tau / shardCount,
            cos = Math.cos(angle),
            sin = Math.sin(angle),
            sx = 1,
            sy = 0;

          for (var s = 0; s < shardCount; ++s) {
            var x1 = sx;
            sx = sx * cos - sy * sin;
            sy = sy * cos + x1 * sin;

            this.shards.push(
              new Shard(this.x, this.y, sx, sy, this.alphaColor)
            );
          }
        }
      }
    } else if (this.phase === "contemplate") {
      ++this.tick;

      if (this.circleCreating) {
        ++this.tick2;
        var proportion = this.tick2 / this.circleCompleteTime,
          armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

        ctx.beginPath();
        ctx.fillStyle = this.alphaColor(proportion * 0.6); // subtle glow
        ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau);
        ctx.fill();

        if (this.tick2 > this.circleCompleteTime) {
          this.tick2 = 0;
          this.circleCreating = false;
          this.circleFading = true;
        }
      } else if (this.circleFading) {
        ctx.fillStyle = this.color;
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

        ++this.tick2;
        var proportion = this.tick2 / this.circleFadeTime,
          armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

        ctx.beginPath();
        ctx.fillStyle = this.alphaColor(1 - armonic);
        ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau);
        ctx.fill();

        if (this.tick2 >= this.circleFadeTime) this.circleFading = false;
      } else {
        ctx.fillStyle = this.color;
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
      }

      for (var k = 0; k < this.shards.length; ++k) {
        this.shards[k].step();

        if (!this.shards[k].alive) {
          this.shards.splice(k, 1);
          --k;
        }
      }

      if (this.tick > opts.letterContemplatingWaitTime) {
        this.phase = "balloon";

        this.tick = 0;
        this.spawning = true;
        this.spawnTime = (opts.balloonSpawnTime * Math.random()) | 0;
        this.inflating = false;
        this.inflateTime =
          (opts.balloonBaseInflateTime +
            opts.balloonAddedInflateTime * Math.random()) |
          0;
        this.size =
          (opts.balloonBaseSize + opts.balloonAddedSize * Math.random()) | 0;

        var rad =
            opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random(),
          vel = opts.balloonBaseVel + opts.balloonAddedVel * Math.random();

        this.vx = Math.cos(rad) * vel;
        this.vy = Math.sin(rad) * vel;

        this.cx = this.x;
        this.cy = this.y;
      }
    } else if (this.phase === "balloon") {
      ctx.strokeStyle = this.lightColor;

      if (this.spawning) {
        ++this.tick;
        ctx.fillStyle = this.lightColor;
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

        if (this.tick >= this.spawnTime) {
          this.tick = 0;
          this.spawning = false;
          this.inflating = true;
        }
      } else if (this.inflating) {
        ++this.tick;

        var proportion = this.tick / this.inflateTime,
          x = (this.cx = this.x),
          y = (this.cy = this.y - this.size * proportion);

        ctx.fillStyle = this.alphaColor(proportion * 0.9);
        ctx.beginPath();
        generateBalloonPath(x, y, this.size * proportion);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, this.y);
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

        if (this.tick >= this.inflateTime) {
          this.tick = 0;
          this.inflating = false;
        }
      } else {
        this.cx += this.vx;
        this.cy += this.vy += opts.upFlow;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        generateBalloonPath(this.cx, this.cy, this.size);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.cx, this.cy);
        ctx.lineTo(this.cx, this.cy + this.size);
        ctx.stroke();

        ctx.fillStyle = this.lightColor;
        ctx.fillText(
          this.char,
          this.cx + this.dx,
          this.cy + this.dy + this.size
        );

        // fixed bounds checks (كانت فيها مقارنة خاطئة قبل)
        if (
          this.cy + this.size < -hh ||
          this.cx < -hw ||
          this.cx > hw ||
          this.cy - this.size > hh
        )
          this.phase = "done";
      }
    }
  };

  // ---- Shard for letter explosion ----
  function Shard(x, y, vx, vy, colorFn) {
    var vel =
      opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random();

    this.vx = vx * vel;
    this.vy = vy * vel;

    this.x = x;
    this.y = y;

    this.prevPoints = [[x, y]];
    this.colorFn = colorFn;

    this.alive = true;

    this.size =
      opts.fireworkShardBaseSize + opts.fireworkShardAddedSize * Math.random();
  }
  Shard.prototype.step = function () {
    this.x += this.vx;
    this.y += this.vy += opts.gravity;

    if (this.prevPoints.length > opts.fireworkShardPrevPoints)
      this.prevPoints.shift();

    this.prevPoints.push([this.x, this.y]);

    var lineWidthProportion = this.size / this.prevPoints.length;

    for (var k = 0; k < this.prevPoints.length - 1; ++k) {
      var point = this.prevPoints[k],
        point2 = this.prevPoints[k + 1];

      ctx.strokeStyle = this.colorFn(k / this.prevPoints.length);
      ctx.lineWidth = Math.max(0.5, k * lineWidthProportion);
      ctx.beginPath();
      ctx.moveTo(point[0], point[1]);
      ctx.lineTo(point2[0], point2[1]);
      ctx.stroke();
    }

    if (this.prevPoints[0][1] > hh) this.alive = false;
  };

  // ---- Global fireworks (background decorative) ----
  function GlobalFirework() {
    this.reset();
  }
  GlobalFirework.prototype.reset = function () {
    this.x = Math.random() * w;
    this.y = h + 10;
    this.vy = -(2 + Math.random() * 3);
    this.vx = (Math.random() - 0.5) * 2;
    this.history = [];
    this.phase = "rise";
    this.hue = Math.floor(Math.random() * 360);
    this.sparks = null;
    this.alpha = 1;
  };
  GlobalFirework.prototype.step = function () {
    if (this.phase === "rise") {
      this.history.push([this.x, this.y]);
      this.x += this.vx;
      this.y += this.vy;
      this.vy += opts.gravity * 0.05;

      ctx.strokeStyle = `hsla(${this.hue},90%,55%,${this.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let prev = this.history[this.history.length - 2];
      ctx.moveTo(prev ? prev[0] : this.x, prev ? prev[1] : this.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      if (this.vy >= -0.3) {
        this.phase = "explode";
        this.sparks = [];
        for (let i = 0; i < opts.globalSparkCount; i++) {
          this.sparks.push(new GlobalSpark(this.x, this.y, this.hue));
        }
      }
    } else if (this.phase === "explode") {
      this.sparks.forEach((s) => s.step());
      this.alpha *= 0.96;
      if (this.alpha < 0.03) this.reset();
    }
  };

  function GlobalSpark(x, y, hue) {
    this.x = x;
    this.y = y;
    let angle = Math.random() * Math.PI * 2;
    let speed = 1 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.hue = hue;
    this.alpha = 1;
    this.size = 1 + Math.random() * opts.globalSparkSize;
  }
  GlobalSpark.prototype.step = function () {
    this.x += this.vx;
    this.y += this.vy += opts.gravity * 0.1;
    this.alpha *= 0.96;

    ctx.fillStyle = `hsla(${this.hue},90%,60%,${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Tau);
    ctx.fill();
  };

  // ---- balloon helper path (keeps same bezier shape) ----
  function generateBalloonPath(x, y, size) {
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x - size / 2,
      y - size / 2,
      x - size / 4,
      y - size,
      x,
      y - size
    );
    ctx.bezierCurveTo(x + size / 4, y - size, x + size / 2, y - size / 2, x, y);
  }

  // ---- build letters array with palette distribution (non repeating) ----
  let letters = [];
  (function buildLetters() {
    letters = [];
    let idx = 0;
    for (let i = 0; i < opts.strings.length; ++i) {
      let str = opts.strings[i];
      for (let j = 0; j < str.length; ++j) {
        let x =
          j * opts.charSpacing +
          opts.charSpacing / 2 -
          (str.length * opts.charSize) / 2;
        let y =
          i * opts.lineHeight +
          opts.lineHeight / 2 -
          (opts.strings.length * opts.lineHeight) / 2;
        let rx = x;
        let ry = y;
        let color = palette[idx % palette.length];
        idx++;
        letters.push(new Letter(str[j], rx, ry, color));
      }
    }
  })();

  // ---- global fireworks array (decoration) ----
  let globals = [];
  for (let i = 0; i < 12; i++) globals.push(new GlobalFirework());

  // ---- helper to recenter letters & update measurements (exposed to window) ----
  window.recenterLetters = function () {
    // make sure font set appropriately before measuring
    ctx.font = opts.charSize + "px Verdana";
    let idx = 0;
    for (let i = 0; i < opts.strings.length; ++i) {
      let str = opts.strings[i];
      for (let j = 0; j < str.length; ++j) {
        let x =
          j * opts.charSpacing +
          opts.charSpacing / 2 -
          (str.length * opts.charSize) / 2;
        let y =
          i * opts.lineHeight +
          opts.lineHeight / 2 -
          (opts.strings.length * opts.lineHeight) / 2;
        if (!letters[idx]) {
          idx++;
          continue;
        }
        letters[idx].x = x;
        letters[idx].y = y;
        // recompute text offsets based on current font size
        letters[idx].dx = -ctx.measureText(letters[idx].char).width / 2;
        letters[idx].dy = opts.charSize / 2;
        letters[idx].fireworkDy = letters[idx].y - hh;
        idx++;
      }
    }
  };

  // ---- main animation loop ----
  function anim() {
    let animationId = window.requestAnimationFrame(anim);

    // background
    ctx.fillStyle = "#00b5ff";
    ctx.fillRect(0, 0, w, h);

    // translate to center like original
    ctx.save();
    ctx.translate(hw, hh);

    // draw letters and their internal animations
    let done = true;
    for (let l = 0; l < letters.length; ++l) {
      letters[l].step();
      if (letters[l].phase !== "done") done = false;
    }

    // draw global fireworks
    ctx.restore(); // restore before drawing global fireworks in screen coords
    for (let gf of globals) gf.step();

    // translate back for shards/balloons that used center coordinates
    ctx.save();
    ctx.translate(hw, hh);

    // If progressed to all done we can stop; but we'll keep animating decorative fireworks
    // so not canceling animation automatically here. If you want single-run uncomment below:
    // if (done) cancelAnimationFrame(animationId);

    ctx.restore();
  }

  // responsive handler (داخل الـ IIFE عشان يوصل لـ opts و ctx)
  function updateResponsiveOpts() {
    opts.charSize = Math.max(24, Math.min(window.innerWidth * 0.045, 60)); // صغِرت النسبة شوية
    opts.charSpacing = Math.max(28, Math.min(window.innerWidth * 0.055, 64));
    opts.lineHeight = Math.max(36, Math.min(window.innerHeight * 0.08, 80));

    // update canvas pixel dimensions
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    hw = w / 2;
    hh = h / 2;

    ctx.font = opts.charSize + "px Verdana";
    ctx.textBaseline = "middle";

    // recompute letter positions and measurements
    window.recenterLetters();
  }

  // start animation
  updateResponsiveOpts(); // set responsive values first
  anim();

  // shoud handle resize: update canvas & options & recenter letters
  window.addEventListener("resize", function () {
    updateResponsiveOpts();
  });

  // call once to ensure center positions are consistent if user changed canvas size before start
  window.recenterLetters();
})(); // نهاية الـ IIFE

// ---- التعامل الآمن مع وجود أو غياب <section> في الصفحة ----
const section = document.querySelector("section");
if (section) {
  section.style.display = "none";
  setTimeout(() => {
    section.style.display = "block";
  }, 1);
}

window.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("section");

  // أول ما الصفحة تفتح نخفيه
  section.style.display = "none";

  // بعد 20 ثانية يظهر
  setTimeout(() => {
    section.style.display = "flex"; // أو block حسب تصميمك
    section.style.opacity = "0";
    section.style.transition = "opacity 1s ease-in-out";

    // ندي delay صغير عشان transition يشتغل
    setTimeout(() => {
      section.style.opacity = "1";
    }, 50);
  }, 20000); // 20 ثانية
});

window.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  // أول ما الصفحة تفتح خلي الارتفاع ثابت 100vh
  body.style.height = "100vh";
  body.style.overflow = "hidden"; // يمنع السكرول أثناء الانتظار

  // بعد 20 ثانية رجّع الوضع الطبيعي
  setTimeout(() => {
    body.style.height = "auto";
    body.style.overflow = "visible";
  }, 20000); // 20 ثانية
});
