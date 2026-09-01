(function () {
  const layoutCache = {};

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
    ctx.fillText(str, w / 2, h - Math.max(20, h * 0.05));
    ctx.restore();
  }

  function getCachedLayout(ctx, w, h, size, hh, mm, family, digits) {
    const cacheKey = `${w}_${h}_${size}_${hh}_${mm}_${family}`;
    if (layoutCache[cacheKey]) {
      return layoutCache[cacheKey];
    }

    const targetBase = size || Math.min(w * 0.60, h * 0.52); 
    let fontSize = Math.floor(targetBase * 3.45); 

    const maxAllowableWidth = w * 0.96;
    const testFontSizeForWidth = Math.floor(maxAllowableWidth / 1.15); 
    if (fontSize > testFontSizeForWidth) {
      fontSize = testFontSizeForWidth;
    }

    ctx.font = `700 ${fontSize}px ${family}`;
    const digitW = Math.max(...digits.map(d => ctx.measureText(d).width));

    const spacingX = digitW * 0.54;    
    const spacingY = fontSize * 0.42; 

    const result = { fontSize, digitW, spacingX, spacingY };

    if (Object.keys(layoutCache).length > 50) {
      for (const key in layoutCache) delete layoutCache[key];
    }

    layoutCache[cacheKey] = result;
    return result;
  }

  window.renderClock8 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    let hour = now.getHours();
    if (opts.hourFormat === "12") {
      hour = hour % 12;
      if (hour === 0) hour = 12;
    }

    const hh = String(hour).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    ctx.fillStyle = paint || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const family = (opts && opts.fontFamily) || "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    const digits = [hh[0], hh[1], mm[0], mm[1]];

    const layout = getCachedLayout(ctx, w, h, size, hh, mm, family, digits);

    ctx.font = `700 ${layout.fontSize}px ${family}`;

    const centerX = w / 2;
    const centerY = h / 2;

    const cxLeft = centerX - layout.spacingX;
    const cxRight = centerX + layout.spacingX;
    const cyTop = centerY - layout.spacingY;
    const cyBottom = centerY + layout.spacingY;

    ctx.fillText(hh[0], cxLeft, cyTop);
    ctx.fillText(hh[1], cxRight, cyTop);
    ctx.fillText(mm[0], cxLeft, cyBottom);
    ctx.fillText(mm[1], cxRight, cyBottom);

    if (opts.showAmPm) {
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      ctx.save();
      ctx.fillStyle = paint || '#ffffff';
      ctx.globalAlpha = 0.5;
      ctx.font = `700 ${Math.floor(layout.fontSize * 0.15)}px ${family}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      const ampmX = cxLeft - layout.digitW * 0.65;
      const ampmY = cyTop - layout.fontSize * 0.22;
      
      ctx.fillText(ampm, ampmX, ampmY);
      ctx.restore();
    }

    drawDateAndDay(ctx, w, h, now, opts, paint || '#ffffff', family);
  };
})();