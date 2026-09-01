(function(){
  window.renderClock5 = function(ctx, w, h, paint, size, now, opts){
    now = now || new Date();
    opts = opts || {};

    const cx = w/2, cy = h/2;
    const r = size;

    if (opts && !opts.suppressBg) {
      if (opts.bgGradient && Array.isArray(opts.bgGradient) && opts.bgGradient.length >= 2) {
        const g = ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0, opts.bgGradient[0]);
        g.addColorStop(1, opts.bgGradient[1]);
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      } else if (opts.bg) {
        ctx.fillStyle = opts.bg; ctx.fillRect(0,0,w,h);
      }
    }

    let basePaint = '#ffffff';
    try {
      ctx.fillStyle = paint;
      basePaint = paint;
    } catch {
      basePaint = '#ffffff';
      ctx.fillStyle = basePaint;
    }

    const ringR = r * 0.85;

    if (opts && !opts.suppressBg) {
      ctx.save();
      ctx.strokeStyle = basePaint;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1.5;

    const fontSize = Math.max(12, Math.round(r * 0.125));
    const family = opts.fontFamily || '"Arial Rounded MT Bold", "Nunito", "Segoe UI Rounded", "Helvetica Neue", sans-serif';
    ctx.font = `bold ${fontSize}px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6 - Math.PI / 2;
      const x = cx + Math.cos(ang) * ringR;
      const y = cy + Math.sin(ang) * ringR;

      const numStr = String(i === 0 ? 12 : i);

      ctx.fillStyle = basePaint;
      ctx.fillText(numStr, x, y);
    }
    ctx.restore();

    const sec = now.getSeconds() + now.getMilliseconds()/1000;
    const min = now.getMinutes() + sec/60;
    const hr  = (now.getHours()%12) + min/60;

    function drawTaperedHand(angle, length, baseWidth, tipWidth, color) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 2.5;

      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = color;

      const backLength = length * 0.12; 
      ctx.beginPath();
      ctx.moveTo(-backLength, -baseWidth / 2);
      ctx.lineTo(length, -tipWidth / 2);
      ctx.lineTo(length, tipWidth / 2);
      ctx.lineTo(-backLength, baseWidth / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawSecondHand(angle, length, thickness, color) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 2.5;

      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.moveTo(0, -thickness / 2);
      ctx.lineTo(length, -thickness / 4);
      ctx.lineTo(length, thickness / 4);
      ctx.lineTo(0, thickness / 2);
      ctx.closePath();
      ctx.fill();

      const backLength = length * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, -thickness);
      ctx.lineTo(-backLength, -thickness / 2);
      ctx.lineTo(-backLength, thickness / 2);
      ctx.lineTo(0, thickness);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-backLength, 0, Math.max(3, thickness * 2), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    const hourAng = (hr * Math.PI)/6 - Math.PI/2;
    const minAng  = (min * Math.PI)/30 - Math.PI/2;
    const secAng  = (sec * Math.PI)/30 - Math.PI/2;

    const hourLen = r * 0.50, hourTh = Math.max(6, Math.round(r * 0.05));
    const minLen  = r * 0.78, minTh  = Math.max(4, Math.round(r * 0.022));
    const secLen  = r * 0.82, secTh  = Math.max(2, Math.round(r * 0.0035));

    drawTaperedHand(hourAng, hourLen, hourTh, Math.max(2, Math.round(hourTh * 0.35)), basePaint);
    drawTaperedHand(minAng,  minLen,  minTh,  Math.max(1.5, Math.round(minTh * 0.35)), basePaint);
    drawSecondHand(secAng,  secLen,  secTh,  basePaint);

    const centerR = Math.max(4, Math.round(r * 0.042));
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = basePaint;
    ctx.beginPath();
    ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff00';
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, centerR * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    if (opts.showDate || opts.showDay) {
      const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      
      let str = "";
      if (opts.showDay && opts.showDate) {
        str = `${days[now.getDay()]}  ·  ${months[now.getMonth()]} ${now.getDate()}`;
      } else if (opts.showDay) {
        str = days[now.getDay()];
      } else if (opts.showDate) {
        str = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      }
      ctx.save();
      ctx.fillStyle = basePaint;
      ctx.globalAlpha = 0.55;
      ctx.font = `bold ${Math.max(11, Math.round(r * 0.075))}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(str, cx, cy + r * 0.4);
      ctx.restore();
    }
  };
})();