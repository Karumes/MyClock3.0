(function () {
  const SEGMENTS = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 0, 1, 0, 0, 1, 0],
    2: [1, 0, 1, 1, 1, 0, 1],
    3: [1, 0, 1, 1, 0, 1, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 1, 0, 1, 0, 1, 1],
    6: [1, 1, 0, 1, 1, 1, 1],
    7: [1, 0, 1, 0, 0, 1, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
  };

  const segmentCache = {};
  const colorCache = {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCachedRgba(hex, alpha) {
    const cacheKey = `${hex}_${alpha}`;
    if (colorCache[cacheKey]) {
      return colorCache[cacheKey];
    }

    if (typeof hex !== "string" || !hex.startsWith("#")) {
      return `rgba(255, 255, 255, ${alpha})`;
    }
    const raw = hex.slice(1);
    const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);

    const result = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    colorCache[cacheKey] = result;
    return result;
  }

  function drawPolygon(ctx, points, offsetX, offsetY) {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
    }
    ctx.closePath();
    ctx.fill();
  }

  function getStrictSegments(sw, sh, t) {
    const slit = Math.max(1, t * 0.08); 

    const midY = sh / 2;
    const th = t; 

    return [
      [
        { x: th + slit, y: 0 },
        { x: sw - th - slit, y: 0 },
        { x: sw - th * 0.5 - slit, y: th * 0.5 },
        { x: sw - th - slit, y: th },
        { x: th + slit, y: th },
        { x: th * 0.5 + slit, y: th * 0.5 }
      ],
      [
        { x: 0, y: th + slit },
        { x: th * 0.5, y: th * 0.5 + slit },
        { x: th, y: th + slit },
        { x: th, y: midY - th * 0.5 - slit },
        { x: th * 0.5, y: midY - slit },
        { x: 0, y: midY - th * 0.5 - slit }
      ],
      [
        { x: sw - th, y: th + slit },
        { x: sw - th * 0.5, y: th * 0.5 + slit },
        { x: sw, y: th + slit },
        { x: sw, y: midY - th * 0.5 - slit },
        { x: sw - th * 0.5, y: midY - slit },
        { x: sw - th, y: midY - th * 0.5 - slit }
      ],
      [
        { x: th + slit, y: sh - th },
        { x: sw - th - slit, y: sh - th },
        { x: sw - th * 0.5 - slit, y: sh - th * 0.5 },
        { x: sw - th - slit, y: sh },
        { x: th + slit, y: sh },
        { x: th * 0.5 + slit, y: sh - th * 0.5 }
      ],
      [
        { x: 0, y: midY + th * 0.5 + slit },
        { x: th * 0.5, y: midY + slit },
        { x: th, y: midY + th * 0.5 + slit },
        { x: th, y: sh - th - slit },
        { x: th * 0.5, y: sh - th * 0.5 - slit },
        { x: 0, y: sh - th - slit }
      ],
      [
        { x: sw - th, y: midY + th * 0.5 + slit },
        { x: sw - th * 0.5, y: midY + slit },
        { x: sw, y: midY + th * 0.5 + slit },
        { x: sw, y: sh - th - slit },
        { x: sw - th * 0.5, y: sh - th * 0.5 - slit },
        { x: sw - th, y: sh - th - slit }
      ],
      [
        { x: th + slit, y: midY - th * 0.5 },
        { x: sw - th - slit, y: midY - th * 0.5 },
        { x: sw - th * 0.5 - slit, y: midY },
        { x: sw - th - slit, y: midY + th * 0.5 },
        { x: th + slit, y: midY + th * 0.5 },
        { x: th * 0.5 + slit, y: midY }
      ]
    ];
  }

  function getCachedSegments(sw, sh, t) {
    const cacheKey = `${sw}_${sh}_${t}`;
    if (segmentCache[cacheKey]) {
      return segmentCache[cacheKey];
    }

    const result = getStrictSegments(sw, sh, t);
    
    if (Object.keys(segmentCache).length > 20) {
      for (const key in segmentCache) delete segmentCache[key];
    }

    segmentCache[cacheKey] = result;
    return result;
  }

  function drawDigitCore(ctx, x, y, sw, sh, digit, color) {
    const flags = SEGMENTS[digit] || SEGMENTS[8];
    const thickness = Math.max(3, sw * 0.15); 
    
    const segPointsList = getCachedSegments(sw, sh, thickness);

    ctx.save();
    ctx.fillStyle = getCachedRgba(color, 1.0);

    segPointsList.forEach((points, index) => {
      if (!flags[index]) return;
      drawPolygon(ctx, points, x, y);
    });

    ctx.restore();
  }

  function drawSquareSeparator(ctx, x, y, size, color) {
    const side = Math.max(3, size * 0.09); 
    const gap = size * 0.16;

    ctx.save();
    ctx.fillStyle = getCachedRgba(color, 1.0);
    ctx.beginPath();
    ctx.rect(x - side / 2, y - gap - side / 2, side, side);
    ctx.rect(x - side / 2, y + gap - side / 2, side, side);
    ctx.fill();
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
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const fSize = Math.max(13, Math.floor(h * 0.03));
    ctx.font = `600 ${fSize}px ${family || "sans-serif"}`;
    ctx.fillText(str, w / 2, h - Math.max(20, h * 0.22));
    ctx.restore();
  }

  window.renderClock7 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    let hour = now.getHours();
    if (opts.hourFormat === "12") {
      hour = hour % 12;
      if (hour === 0) hour = 12;
    }

    const hh = String(hour).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const digits = `${hh}${mm}${ss}`;

    let digitColor = "#ffffff";
    try {
      digitColor = typeof paint === "string" && paint.trim() ? paint : "#ffffff";
    } catch (_) {
      digitColor = "#ffffff";
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = opts.bg || "#000000";
    ctx.fillRect(0, 0, w, h);

    const margin = Math.max(16, Math.min(w, h) * 0.05);
    const usableW = w - margin * 2;

    const showSeconds = opts.showSeconds !== false; 

    const digitW_main = Math.floor(clamp(size * 0.52, 24, usableW / 8.2));
    const digitH_main = Math.floor(digitW_main * 1.75); 
    const spacing_main = Math.floor(digitW_main * 0.45); 
    const colonW = Math.floor(digitW_main * 0.75);

    const digitW_sec = Math.floor(digitW_main * 0.44);
    const digitH_sec = Math.floor(digitW_sec * 1.75);
    const spacing_sec = Math.floor(digitW_sec * 0.45);
    const gap_sec = Math.floor(digitW_main * 0.2); 

    const width_main = (digitW_main * 4) + (spacing_main * 2) + colonW;
    const width_sec = (digitW_sec * 2) + spacing_sec;
    const totalW = showSeconds ? (width_main + gap_sec + width_sec) : width_main;

    const startX = (w - totalW) / 2;
    const startY_main = (h - digitH_main) / 2;
    const colonY = startY_main + digitH_main / 2;

    const startY_sec = startY_main + (digitH_main - digitH_sec);

    const x_H0 = startX;
    const x_H1 = x_H0 + digitW_main + spacing_main;
    drawDigitCore(ctx, x_H0, startY_main, digitW_main, digitH_main, Number(digits[0]), digitColor);
    drawDigitCore(ctx, x_H1, startY_main, digitW_main, digitH_main, Number(digits[1]), digitColor);
    
    const x_Colon = x_H1 + digitW_main + colonW / 2;
    drawSquareSeparator(ctx, x_Colon, colonY, digitH_main, digitColor);

    const x_M0 = x_H1 + digitW_main + colonW;
    const x_M1 = x_M0 + digitW_main + spacing_main;
    drawDigitCore(ctx, x_M0, startY_main, digitW_main, digitH_main, Number(digits[2]), digitColor);
    drawDigitCore(ctx, x_M1, startY_main, digitW_main, digitH_main, Number(digits[3]), digitColor);

    if (showSeconds) {
      const x_S0 = x_M1 + digitW_main + gap_sec;
      const x_S1 = x_S0 + digitW_sec + spacing_sec;
      drawDigitCore(ctx, x_S0, startY_sec, digitW_sec, digitH_sec, Number(digits[4]), digitColor);
      drawDigitCore(ctx, x_S1, startY_sec, digitW_sec, digitH_sec, Number(digits[5]), digitColor);
    }

    if (opts.showAmPm) {
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      ctx.save();
      ctx.fillStyle = digitColor;
      ctx.globalAlpha = 0.6;
      ctx.font = `700 ${Math.max(12, Math.floor(digitH_main * 0.22))}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      const ampmX = x_H0 - spacing_main * 0.6;
      const ampmY = startY_main + digitH_main * 0.15;
      
      ctx.fillText(ampm, ampmX, ampmY);
      ctx.restore();
    }

    drawDateAndDay(ctx, w, h, now, opts, digitColor, "sans-serif");
  };
})();