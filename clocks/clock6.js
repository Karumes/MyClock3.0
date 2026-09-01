(function () {
  const state = {
    dur: 200,
    shown: null,
    anims: [null, null],
  };

  const fontSizeCache = {};

  function easeInOutSine(t) {
    return 0.5 * (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t))));
  }

  function drawPlate(ctx, x, y, width, height, panelColor, glassOnly) {
    if (glassOnly) return;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, Math.floor(width * 0.08));
    ctx.fillStyle = panelColor;
    ctx.fill();
  }

  function drawPanelMidline(ctx, x, y, width, height, panelColor, glassOnly) {
    ctx.save();
    ctx.strokeStyle = glassOnly ? "rgb(0, 0, 0)" : panelColor;
    ctx.lineWidth = glassOnly ? Math.max(1, Math.floor(height * 0.007)) : Math.max(1.5, Math.floor(height * 0.013));
    ctx.beginPath();
    ctx.moveTo(x + 1, y + height / 2);
    ctx.lineTo(x + width - 1, y + height / 2);
    ctx.stroke();
    ctx.restore();
  }

  function getCachedFontSize(ctx, width, height, pairText, family, fontSizeScale) {
    const cacheKey = `${width}_${height}_${pairText}_${family}_${fontSizeScale}`;
    
    if (fontSizeCache[cacheKey]) {
      return fontSizeCache[cacheKey];
    }

    const scale = Math.max(0.7, Math.min(1.35, Number(fontSizeScale) || 1));
    let fontSize = Math.floor(height * 0.90 * scale);
    ctx.font = `700 ${fontSize}px ${family}`;

    const maxTextWidth = width * 0.94;
    const maxTextHeight = height * 0.88;

    let metrics = ctx.measureText(pairText);
    let textHeight = (metrics.actualBoundingBoxAscent || fontSize * 0.76) + (metrics.actualBoundingBoxDescent || fontSize * 0.18);
    
    while ((metrics.width > maxTextWidth || textHeight > maxTextHeight) && fontSize > 10) {
      fontSize -= 1;
      ctx.font = `700 ${fontSize}px ${family}`;
      metrics = ctx.measureText(pairText);
      textHeight = (metrics.actualBoundingBoxAscent || fontSize * 0.76) + (metrics.actualBoundingBoxDescent || fontSize * 0.18);
    }

    const result = { fontSize, metrics };

    if (Object.keys(fontSizeCache).length > 60) {
      for (const k in fontSizeCache) delete fontSizeCache[k];
    }

    fontSizeCache[cacheKey] = result;
    return result;
  }

  function drawRawText(ctx, x, y, width, height, pairText, color, family, glassOnly, fontSizeScale) {
    ctx.save();

    const { fontSize, metrics } = getCachedFontSize(ctx, width, height, pairText, family, fontSizeScale);

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;

    if (glassOnly) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      const shadowOffset = Math.max(1, Math.floor(height * 0.015));
      const actualCenterYShadow = y + height / 2 + shadowOffset;
      let visualOffsetShadow = 0;
      if (metrics.actualBoundingBoxAscent != null && metrics.actualBoundingBoxDescent != null) {
        visualOffsetShadow = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      }
      const nudgeDownShadow = Math.floor(height * 0.055);
      ctx.fillText(pairText, x + width / 2 + shadowOffset, actualCenterYShadow + (visualOffsetShadow * 0.15) + nudgeDownShadow);
      ctx.restore();
    }

    const actualCenterY = y + height / 2;
    let visualOffset = 0;
    if (metrics.actualBoundingBoxAscent != null && metrics.actualBoundingBoxDescent != null) {
      visualOffset = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    }

    const nudgeDown = Math.floor(height * 0.055);
    ctx.fillText(pairText, x + width / 2, actualCenterY + (visualOffset * 0.15) + nudgeDown);
    ctx.restore();
  }

  function drawPairTileStatic(ctx, x, y, width, height, pairText, color, family, panelColor, glassOnly, fontSizeScale) {
    drawPlate(ctx, x, y, width, height, panelColor, glassOnly);
    drawRawText(ctx, x, y, width, height, pairText, color, family, glassOnly, fontSizeScale);
  }

  function drawPairTileAnimated(ctx, x, y, width, height, fromPair, toPair, color, progress, family, panelColor, glassOnly, fontSizeScale) {
    drawPlate(ctx, x, y, width, height, panelColor, glassOnly);

    const t = Math.max(0, Math.min(1, progress));
    const topProgress = easeInOutSine(Math.min(1, t * 2));
    const bottomProgress = easeInOutSine(Math.max(0, (t - 0.5) * 2));
    const hingeY = y + height / 2;
    const skewMax = 0.12;

    if (t < 0.5) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, hingeY, width, y + height - hingeY);
      ctx.clip();
      drawRawText(ctx, x, y, width, height, fromPair, color, family, glassOnly, fontSizeScale);
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, hingeY - y);
      ctx.clip();
      drawRawText(ctx, x, y, width, height, toPair, color, family, glassOnly, fontSizeScale);
      ctx.restore();
    }

    if (t < 0.5) {
      const scaleY = Math.max(0.0001, 1 - topProgress);
      const skew = (1 - scaleY) * skewMax;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, hingeY - y);
      ctx.clip();
      
      ctx.translate(x + width / 2, hingeY);
      ctx.transform(1, 0, skew, 1, 0, 0);
      ctx.scale(1, scaleY);
      ctx.translate(-(x + width / 2), -hingeY);
      
      drawRawText(ctx, x, y, width, height, fromPair, color, family, glassOnly, fontSizeScale);
      ctx.restore();
    } else {
      const scaleY = Math.max(0.0001, bottomProgress);
      const skew = (1 - scaleY) * skewMax;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, hingeY, width, y + height - hingeY);
      ctx.clip();

      ctx.translate(x + width / 2, hingeY);
      ctx.transform(1, 0, skew, 1, 0, 0);
      ctx.scale(1, scaleY);
      ctx.translate(-(x + width / 2), -hingeY);
      
      drawRawText(ctx, x, y, width, height, toPair, color, family, glassOnly, fontSizeScale);
      ctx.restore();
    }
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
    ctx.fillText(str, w / 2, h - Math.max(45, h * 0.22));
    ctx.restore();
  }

  window.renderClock6 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();

    let hour = now.getHours();
    if (opts && opts.hourFormat === "12") {
      hour = hour % 12;
      if (hour === 0) hour = 12;
    }

    const hh = String(hour).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const pairs = [hh, mm];
    const family = (opts && opts.fontFamily) || '"Roboto Condensed", "Segoe UI", sans-serif';
    let baseColor = "#ffffff";
    try {
      ctx.fillStyle = paint;
      baseColor = paint;
    } catch (_) {
      baseColor = "#ffffff";
    }
    const panelColor = (opts && typeof opts.flipBackColor === "string" && opts.flipBackColor.trim())
      ? opts.flipBackColor
      : "rgb(0, 0, 0)";
    const glassOnly = Boolean(opts && opts.glassOnly);
    const fontSizeScale = (opts && opts.fontSizeScale) || 1;
    const ts = now.getTime();

    const showMidline = !opts || opts.showMidline !== false;

    if (!state.shown) {
      state.shown = pairs.slice();
    }

    let tileHeight = Math.floor(size * 1);
    let tileWidth = Math.floor(tileHeight * 1);
    let gap = Math.max(2, Math.floor(tileWidth * 0.03));
    let totalWidth = tileWidth * 2 + gap;

    const startX = Math.round((w - totalWidth) / 2);
    const startY = Math.round((h - tileHeight) / 2);

    for (let i = 0; i < pairs.length; i += 1) {
      if (state.shown[i] !== pairs[i] && !state.anims[i]) {
        state.anims[i] = { from: state.shown[i], to: pairs[i], start: ts };
      }
    }

    for (let i = 0; i < pairs.length; i += 1) {
      const x = startX + i * (tileWidth + gap);
      const anim = state.anims[i];
      if (anim) {
        const progress = Math.min(1, (ts - anim.start) / state.dur);
        drawPairTileAnimated(ctx, x, startY, tileWidth, tileHeight, anim.from, anim.to, baseColor, progress, family, panelColor, glassOnly, fontSizeScale);
        if (progress >= 1) {
          state.shown[i] = anim.to;
          state.anims[i] = null;
        }
      } else {
        drawPairTileStatic(ctx, x, startY, tileWidth, tileHeight, state.shown[i], baseColor, family, panelColor, glassOnly, fontSizeScale);
      }
      
      if (showMidline) {
        drawPanelMidline(ctx, x, startY, tileWidth, tileHeight, panelColor, glassOnly);
      }
    }

    if (opts && opts.showAmPm) {
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      ctx.save();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = 0.6;
      ctx.font = `700 ${Math.floor(tileHeight * 0.14)}px ${family}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      const ampmX = startX - tileWidth * 0.08;
      const ampmY = startY + tileHeight * 0.15;
      
      ctx.fillText(ampm, ampmX, ampmY);
      ctx.restore();
    }

    drawDateAndDay(ctx, w, h, now, opts, baseColor, family);
  };
})();