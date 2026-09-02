(function (global) {
  const columnState = Array.from({ length: 6 }, () => ({
    shown: null,
    anim: null,
  }));

  const columnRotations = Array.from({ length: 6 }, () =>
    Array.from({ length: 10 }, () => getRandomRotation())
  );

  function getRandomRotation() {
    const maxDeg = 20;
    const deg = (Math.random() * (maxDeg * 2)) - maxDeg; 
    return deg * (Math.PI / 180);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function resolvePaint(ctx, paint) {
    try {
      ctx.fillStyle = paint;
      return paint;
    } catch (_) {
      return "#ffffff";
    }
  }

  function drawContinuousColumn(ctx, x, y, digitHeight, color, fontSize, family, now, columnIndex, canvasHeight) {
    ctx.save();
    ctx.translate(x, y); 
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;
    const ms = now.getTime();
    const phase = (ms % 1000) / 1000;
    const seconds = now.getSeconds();
    const base = seconds % 10;
    const offset = phase * digitHeight;
    const visibleRows = Math.ceil(canvasHeight / digitHeight) + 24;
    const half = Math.floor(visibleRows / 2);

    for (let r = -half; r <= half; r += 1) {
      let value = (base - r) % 10;
      value = (value + 10) % 10;
      
      const yPos = r * digitHeight + offset;
      
      ctx.save();
      ctx.translate(0, yPos);
      const rot = columnRotations[columnIndex][value];
      ctx.rotate(rot);
      ctx.fillText(String(value), 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawStaticColumn(ctx, x, y, value, color, fontSize, family, columnIndex) {
    ctx.save();
    ctx.translate(x, y); 
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;

    ctx.save();
    const rot = columnRotations[columnIndex][value];
    ctx.rotate(rot);
    ctx.fillText(String(value), 0, 0);
    ctx.restore();

    ctx.restore();
  }

  function drawDropColumn(ctx, x, y, fromValue, toValue, progress, color, fontSize, family, canvasHeight, sizeScale, columnIndex) {
    const eased = easeOutCubic(progress);
    const scaledHeight = canvasHeight / sizeScale;
    const topStart = -scaledHeight / 2 - fontSize * 1.5;
    const bottomEnd = scaledHeight / 2 + fontSize * 1.5;
    const incomingY = topStart + (0 - topStart) * eased;
    const outgoingY = 0 + (bottomEnd - 0) * eased;

    ctx.save();
    ctx.translate(x, y); 
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;

    if (fromValue !== null && fromValue !== undefined) {
      ctx.save();
      ctx.translate(0, outgoingY);
      const rotFrom = columnRotations[columnIndex][fromValue];
      ctx.rotate(rotFrom);
      ctx.globalAlpha = 1 - eased * 0.1;
      ctx.fillText(String(fromValue), 0, 0);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, incomingY);
    const rotTo = columnRotations[columnIndex][toValue];
    ctx.rotate(rotTo);
    ctx.globalAlpha = 0.25 + eased * 0.75;
    ctx.fillText(String(toValue), 0, 0);
    ctx.restore();

    ctx.restore();
  }

  function drawSeparator(ctx, x, y, char, color, fontSize, family) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.floor(fontSize * 0.68)}px ${family}`;
    ctx.fillText(char, x, y);
    ctx.restore();
  }

  function drawDateAndDay(ctx, w, h, now, opts, color, family) {
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
    
    const sizeScale = opts.sizeScale || 1;
    ctx.translate(w / 2, h / 2);
    ctx.scale(1 / sizeScale, 1 / sizeScale);
    ctx.translate(-w / 2, -h / 2);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    const fSize = 30 * (window.devicePixelRatio || 1);
    ctx.font = `600 ${fSize}px ${family || "sans-serif"}`;
    ctx.fillText(str, w / 2, h - 35 * (window.devicePixelRatio || 1));
    
    ctx.restore();
  }

  global.renderClock2 = function renderClock2(ctx, w, h, paint, size, now, options) {
    now = now || new Date();
    options = options || {};

    const family = options.fontFamily || '"JetBrains Mono", "SFMono-Regular", monospace';
    const baseColor = resolvePaint(ctx, paint);

    let hour = now.getHours();
    if (options.hourFormat === "12") {
      hour = hour % 12;
      if (hour === 0) hour = 12;
    }

    const digits = [
      Math.floor(hour / 10),
      hour % 10,
      Math.floor(now.getMinutes() / 10),
      now.getMinutes() % 10,
      Math.floor(now.getSeconds() / 10),
      now.getSeconds() % 10,
    ];

    let digitWidth = 30 + Math.floor(size * 0.55);
    let digitHeight = 120 + Math.floor(size * 1.15);
    let fontSize = 60 + Math.floor(size * 0.95);
    let pairOuterGap = Math.floor(digitWidth * 0.68);
    const pairBlock = digitWidth * 2;
    let totalWidth = pairBlock * 3 + pairOuterGap * 2;

    const startX = Math.floor(w / 2 - totalWidth / 2);
    const centerY = h / 2;
    const nowMs = now.getTime();
    const animDuration = 520;
    const sizeScale = options.sizeScale || 1;

    const xForIndex = (index) => {
      const pairIndex = Math.floor(index / 2);
      const inPairIndex = index % 2;
      const x = startX + pairIndex * (pairBlock + pairOuterGap) + inPairIndex * digitWidth;
      return x + digitWidth / 2;
    };

    const colon1X = (xForIndex(1) + xForIndex(2)) / 2;
    const colon2X = (xForIndex(3) + xForIndex(4)) / 2;

    // 【修正】options.showWave がオフ（false）の時は、即座にオフセット 0 を返して直列に整列
    const getWaveOffset = (colIndex) => {
      if (colIndex >= 5 || !options.showWave) return 0; 
      const wavePhase = now.getMinutes() * 1.15; 
      return Math.sin((colIndex * 1.25) + wavePhase) * (fontSize * 0.22); 
    };

    for (let i = 0; i < digits.length; i += 1) {
      const colState = columnState[i];
      if (colState.shown === null) colState.shown = digits[i];
      if (colState.shown !== digits[i] && !colState.anim) {
        colState.anim = { from: colState.shown, to: digits[i], startedAt: nowMs };
      }
    }

    for (let i = 0; i < digits.length; i += 1) {
      const x = xForIndex(i);
      const colState = columnState[i];
      
      const colY = centerY + getWaveOffset(i);

      if (i === 5) {
        const seconds = now.getSeconds();
        const base = seconds % 10;
        
        if (colState.shown !== base) {
          colState.shown = base;
          
          const R = Math.ceil(h / (2 * digitHeight)) + 2;
          const visibleValues = new Set();
          for (let r = -R; r <= R; r++) {
            visibleValues.add(((base - r) % 10 + 10) % 10);
          }
          
          for (let val = 0; val < 10; val++) {
            if (!visibleValues.has(val)) {
              columnRotations[5][val] = getRandomRotation();
            }
          }
        }
        drawContinuousColumn(ctx, x, colY, digitHeight, baseColor, fontSize, family, now, i, h);
        colState.anim = null;
        continue;
      }

      if (colState.anim) {
        const progress = Math.min(1, (nowMs - colState.anim.startedAt) / animDuration);
        drawDropColumn(ctx, x, colY, colState.anim.from, colState.anim.to, progress, baseColor, fontSize, family, h, sizeScale, i);
        if (progress >= 1) {
          if (colState.anim.from !== null && colState.anim.from !== undefined) {
            columnRotations[i][colState.anim.from] = getRandomRotation();
          }
          colState.shown = colState.anim.to;
          colState.anim = null;
        }
      } else {
        drawStaticColumn(ctx, x, colY, colState.shown, baseColor, fontSize, family, i);
      }
    }

    const colon1Y = centerY + (getWaveOffset(1) + getWaveOffset(2)) / 2;
    const colon2Y = centerY + (getWaveOffset(3) + getWaveOffset(4)) / 2;

    drawSeparator(ctx, colon1X, colon1Y, ":", baseColor, fontSize, family);
    drawSeparator(ctx, colon2X, colon2Y, ".", baseColor, fontSize, family);

    if (options.showAmPm) {
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      ctx.save();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = 0.6;
      ctx.font = `700 ${Math.floor(fontSize * 0.22)}px ${family}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      const ampmX = xForIndex(0) - digitWidth * 0.65;
      const ampmY = (centerY + getWaveOffset(0)) - fontSize * 0.32;
      
      ctx.fillText(ampm, ampmX, ampmY);
      ctx.restore();
    }

    drawDateAndDay(ctx, w, h, now, options, baseColor, family);
  };
})(this);