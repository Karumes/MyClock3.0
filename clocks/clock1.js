(function () {
  const state = {
    chars: null,
    minuteKey: "",
    rotations: [0, 0, 0, 0],
    anims: [null, null, null, null],
  };

  const offscreenCache = {};
  const colorCache = {};

  // 【調整】傾きの変化が美しく引き立つよう、ランダム角度を -10度 〜 +10度 の範囲に調整
  function getRandomRotation() {
    const degrees = Math.floor(Math.random() * 21) - 10; 
    return degrees * (Math.PI / 180);
  }

  function getOffscreen(key, physicalWidth, physicalHeight) {
    if (!offscreenCache[key]) {
      offscreenCache[key] = document.createElement("canvas");
    }
    const canvas = offscreenCache[key];
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, physicalWidth, physicalHeight);
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, t));
  }

  function parseColor(color) {
    if (typeof color !== "string") return { r: 105, g: 247, b: 255 };
    const trimmed = color.trim();
    if (colorCache[trimmed]) return colorCache[trimmed];

    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
    let result = { r: 105, g: 247, b: 255 };
    if (hex) {
      let raw = hex[1];
      if (raw.length === 3) raw = raw.split("").map((x) => x + x).join("");
      result = {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
      };
    }
    colorCache[trimmed] = result;
    return result;
  }

  function lighten(hex, amount) {
    const c = parseColor(hex);
    return `rgb(${Math.round(c.r + (255 - c.r) * amount)},${Math.round(c.g + (255 - c.g) * amount)},${Math.round(c.b + (255 - c.b) * amount)})`;
  }

  function drawDigitTo(ctx, x, y, value, rotation, color, font, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 0, 0);
    ctx.restore();
  }

  function drawAnimFrameTo(ctx, index, x, y, anim, color, font, h, nowMs) {
    const raw = Math.min(1, (nowMs - anim.startedAt) / 700);
    const t = easeOutExpo(raw);
    const distance = h * 0.72;

    drawDigitTo(ctx, x, y + t * distance, anim.from, state.rotations[index], color, font, 1 - t);
    drawDigitTo(ctx, x, y - distance + t * distance, anim.to, state.rotations[index], color, font, t);

    if (raw >= 1) {
      state.chars[index] = anim.to;
      state.anims[index] = null;
    }
  }

  function drawDateAndDay(ctx, w, h, now, opts, color, family, centerY, clockFontSize) {
    if (!opts || (!opts.showDate && !opts.showDay)) return;
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
    let str = "";
    if (opts.showDay && opts.showDate) {
      str = `${days[now.getDay()]}  ·  ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    } else if (opts.showDay) {
      str = days[now.getDay()];
    } else if (opts.showDate) {
      str = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    const fSize = Math.max(12, Math.floor(clockFontSize * 0.08));
    ctx.font = `600 ${fSize}px ${family || "sans-serif"}`;
    
    const drawY = Math.min(h - 20, centerY + clockFontSize * 0.4 + fSize * 0.5);
    
    ctx.fillText(str, w / 2, drawY);
    ctx.restore();
  }

  window.renderClock1 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    const pw = ctx.canvas.width;
    const ph = ctx.canvas.height;

    let hour = now.getHours();
    if (opts.hourFormat === "12") {
      hour = hour % 12;
      if (hour === 0) hour = 12;
    }
    const hh = String(hour).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const chars = [hh[0], hh[1], mm[0], mm[1]];
    const minuteKey = `${hh}:${mm}`;
    const nowMs = now.getTime();

    // 初回起動時の角度設定
    if (!state.chars) {
      state.chars = chars.slice();
      state.minuteKey = minuteKey;
      state.rotations = [
        getRandomRotation(),
        getRandomRotation(),
        getRandomRotation(),
        getRandomRotation()
      ];
    }

    // 【動的更新】1分経ち「時：分」が変化した瞬間に、4つの数字の角度をすべて新しくランダム生成し直す
    if (state.minuteKey !== minuteKey) {
      state.minuteKey = minuteKey;
      state.rotations = [
        getRandomRotation(),
        getRandomRotation(),
        getRandomRotation(),
        getRandomRotation()
      ];
    }
    chars.forEach((c, i) => {
      if (state.chars[i] !== c && !state.anims[i]) {
        state.anims[i] = { from: state.chars[i], to: c, startedAt: nowMs };
      }
    });

    const family = opts.fontFamily || '"Fredoka","M PLUS Rounded 1c","Nunito",sans-serif';
    
    // フォント1（Quicksand-Bold）が選択されているかを判定
    const isFont1 = (family === '"font-1"' || family === 'font-1');

    const primary = typeof paint === "string" ? paint : "#69f7ff";
    const secondary = lighten(primary, 0.55);

    let fontSize = Math.round(size || Math.min(ph * 0.75, pw * 0.22));
    const font = `850 ${fontSize}px ${family}`;

    ctx.save();
    ctx.font = font;
    const widths = chars.map((c) => ctx.measureText(c).width);
    ctx.restore();

    // 【条件分岐】フォント1のときは重なり（overlapAmt）あり、それ以外は重ねず等間隔に配置
    const overlapAmt = isFont1 ? (fontSize * 0.18) : 0;
    const gap = isFont1 ? (fontSize * 0.18) : (fontSize * 0.35); // フォント1以外はコロンを描画するため広めの余白を確保
    const total = widths[0] + widths[1] + widths[2] + widths[3] - overlapAmt * 3 + gap;

    let x = Math.round((pw - total) / 2);
    const y = Math.round(ph / 2);
    const positions = [];
    for (let i = 0; i < 4; i++) {
      positions[i] = Math.round(x + widths[i] / 2);
      x += widths[i] - overlapAmt;
      if (i === 1) x += gap;
    }

    const colors = [primary, secondary, primary, secondary];

    const charScreens = [];
    for (let i = 0; i < 4; i++) {
      const { canvas: cv, ctx: oc } = getOffscreen(`ch${i}`, pw, ph);
      if (state.anims[i]) {
        drawAnimFrameTo(oc, i, positions[i], y, state.anims[i], colors[i], font, ph, nowMs);
      } else {
        drawDigitTo(oc, positions[i], y, state.chars[i], state.rotations[i], colors[i], font);
      }
      charScreens.push(cv);
    }

    const { canvas: compCv, ctx: compCtx } = getOffscreen("composite", pw, ph);

    if (isFont1) {
      // ■ フォント1：従来の美しい重なりマスククリッピング ＋ 自作の二重円丸ドット
      const overlapColor = lighten(primary, 0.82);

      function makeOverlapMask(maskKey, canvasA, canvasB) {
        const { canvas: mv, ctx: mc } = getOffscreen(maskKey, pw, ph);
        mc.drawImage(canvasA, 0, 0);
        mc.globalCompositeOperation = "source-in";
        mc.drawImage(canvasB, 0, 0);
        mc.globalCompositeOperation = "source-over";
        return mv;
      }

      function makeOverlapOverlay(overlayKey, maskCanvas) {
        const { canvas: ov, ctx: oc } = getOffscreen(overlayKey, pw, ph);
        oc.drawImage(maskCanvas, 0, 0);
        oc.globalCompositeOperation = "source-in";
        oc.fillStyle = overlapColor;
        oc.fillRect(0, 0, pw, ph);
        oc.globalCompositeOperation = "source-over";
        return ov;
      }

      const mask01 = makeOverlapMask("mask01", charScreens[0], charScreens[1]);
      const mask23 = makeOverlapMask("mask23", charScreens[2], charScreens[3]);
      const overlay01 = makeOverlapOverlay("ov01", mask01);
      const overlay23 = makeOverlapOverlay("ov23", mask23);

      for (let i = 0; i < 4; i++) {
        compCtx.drawImage(charScreens[i], 0, 0);
      }
      compCtx.drawImage(overlay01, 0, 0);
      compCtx.drawImage(overlay23, 0, 0);

      const cx = Math.round((positions[1] + positions[2]) / 2);
      const dotR = Math.round(Math.max(7 * (window.devicePixelRatio || 1), fontSize * 0.08));

      compCtx.save();
      compCtx.fillStyle = opts.colonColor || "white";
      compCtx.globalAlpha = 0.85;

      compCtx.beginPath();
      compCtx.arc(cx, Math.round(y - fontSize * 0.18), dotR, 0, Math.PI * 2);
      compCtx.fill();

      compCtx.beginPath();
      compCtx.arc(cx, Math.round(y + fontSize * 0.18), dotR, 0, Math.PI * 2);
      compCtx.fill();
      compCtx.restore();
    } else {
      // ■ フォント1以外：等間隔（重なりなし） ＋ 各フォント固有デザインの「:」
      for (let i = 0; i < 4; i++) {
        compCtx.drawImage(charScreens[i], 0, 0);
      }

      const cx = Math.round((positions[1] + positions[2]) / 2);
      compCtx.save();
      compCtx.fillStyle = opts.colonColor || "white";
      compCtx.textAlign = "center";
      compCtx.textBaseline = "middle";
      compCtx.font = `800 ${fontSize * 0.9}px ${family}`;
      compCtx.fillText(":", cx, y - fontSize * 0.02);
      compCtx.restore();
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(compCv, 0, 0);
    ctx.restore();

    if (opts.showAmPm) {
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      ctx.save();
      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.65;
      ctx.font = `700 ${fontSize * 0.15}px ${family}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      const ampmX = positions[0] - widths[0] / 2 - fontSize * 0.05;
      const ampmY = y - fontSize * 0.35;
      
      ctx.fillText(ampm, ampmX, ampmY);
      ctx.restore();
    }

    drawDateAndDay(ctx, pw, ph, now, opts, primary, family, y, fontSize);
  };
})();