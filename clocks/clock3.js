(function () {
  const fontSizeCache = {};

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

  function getCachedFontSize(ctx, w, h, size, family, weight) {
    const cacheKey = `${w}_${h}_${size}_${family}_${weight}`;
    
    if (fontSizeCache[cacheKey] !== undefined) {
      return fontSizeCache[cacheKey];
    }

    const panelH = size;
    const panelW = panelH * 0.62;
    const allowedH = Math.floor(panelH * 0.94);

    let fontSize = Math.max(16, Math.floor(Math.min(panelH * 1.55, panelW * 2.4)));

    function measureDigitHeight(fs) {
      ctx.font = `${weight} ${fs}px ${family}`;
      const m = ctx.measureText('8');
      const asc = (m.actualBoundingBoxAscent != null) ? m.actualBoundingBoxAscent : fs * 0.8;
      const desc = (m.actualBoundingBoxDescent != null) ? m.actualBoundingBoxDescent : fs * 0.2;
      return asc + desc;
    }

    let measured = measureDigitHeight(fontSize);
    if (measured > allowedH) {
      fontSize = Math.floor(fontSize * (allowedH / measured));
      measured = measureDigitHeight(fontSize);
      while (measured > allowedH && fontSize > 8) {
        fontSize--;
        measured = measureDigitHeight(fontSize);
      }
    }

    if (Object.keys(fontSizeCache).length > 20) {
      for (const key in fontSizeCache) delete fontSizeCache[key];
    }

    fontSizeCache[cacheKey] = fontSize;
    return fontSize;
  }

  window.renderClock3 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    if (opts && !opts.suppressBg) {
      if (opts.bgGradient && Array.isArray(opts.bgGradient) && opts.bgGradient.length >= 2) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, opts.bgGradient[0]);
        g.addColorStop(1, opts.bgGradient[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else if (opts.bg) {
        ctx.fillStyle = opts.bg;
        ctx.fillRect(0, 0, w, h);
      }
    }

    let hour = now.getHours();
    if (opts.hourFormat === "12") {
      hour = hour % 12;
      if (hour === 0) hour = 12;
    }

    const hh = String(hour).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const digits = [hh[0], hh[1], mm[0], mm[1]];

    const cx = w / 2;
    const cy = h / 2;
    
    const panelH = size; 
    const panelW = panelH * 0.62; 
    
    const totalW = panelW * 4;
    const startX = cx - totalW / 2;
    const startY = cy - panelH / 2;

    const weight = 760;
    
    // 【修正】システムの"Segoe UI"ではなく、先行ロード済みのローカルフォント"font-2"（Segoe UI Bold）に固定
    const family = '"font-2"';
    
    const offset = Math.round(panelH * 0.145);
    const globalDrop = Math.round(panelH * 0.085);
    
    const fontSize = getCachedFontSize(ctx, w, h, size, family, weight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${fontSize}px ${family}`;

    try { ctx.fillStyle = paint; } catch { ctx.fillStyle = '#ffffff'; }

    for (let i = 0; i < 4; i++) {
      const x0 = Math.floor(startX + i * panelW);
      const xCenter = Math.floor(x0 + panelW / 2);
      const yCenter = Math.floor(startY + panelH / 2) + globalDrop + (i % 2 === 0 ? offset : -offset);

      ctx.save();
      ctx.beginPath();
 
      ctx.rect(x0, -10000, Math.ceil(panelW), h + 20000);
      ctx.clip();

      ctx.fillText(digits[i], xCenter, yCenter);

      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#00000000';
    ctx.lineWidth = 0.1;
    for (let k = 1; k < 4; k++) {
      const xLine = Math.floor(startX + k * panelW) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xLine, startY);
      ctx.lineTo(xLine, startY + panelH);
      ctx.stroke();
    }
    ctx.restore();

    if (opts.showAmPm) {
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      ctx.save();
      ctx.fillStyle = paint || '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.font = `bold ${panelH * 0.14}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const ampmX = startX + panelW / 2 - panelW * 0.15;
      const ampmY = startY + offset - panelH * 0.16;
      
      ctx.fillText(ampm, ampmX, ampmY);
      ctx.restore();
    }

    drawDateAndDay(ctx, w, h, now, opts, paint || '#ffffff', family);
  };
})();