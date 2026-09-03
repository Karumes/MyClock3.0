(function () {
  let frameImg = null;
  let dialImg = null;
  let imagesLoaded = false;

  // 画像の非同期ロード
  function loadImages() {
    if (imagesLoaded) return;
    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        imagesLoaded = true;
      }
    };

    frameImg = new Image();
    frameImg.src = 'frame.png';
    frameImg.onload = onLoaded;

    dialImg = new Image();
    dialImg.src = 'wheel.png';
    dialImg.onload = onLoaded;
  }

  // 起動時のバックグラウンド先行ロード
  loadImages();

  function drawDateAndDay(ctx, size, now, opts, color, family) {
    if (!opts || (!opts.showDate && !opts.showDay)) return;
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
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `600 ${size * 0.065}px ${family || "sans-serif"}`;
    ctx.fillText(str, 0, size * 0.74);
    ctx.restore();
  }

  window.renderClock10 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    loadImages();

    if (!imagesLoaded) {
      ctx.save();
      ctx.fillStyle = paint || "#ffffff";
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Loading Clock Textures...", w / 2, h / 2);
      ctx.restore();
      return;
    }

    const cx = w / 2;
    const cy = h / 2;
    const family = opts.fontFamily || '"Segoe UI", sans-serif';

    // デジタル時計表示のトグル状態（デフォルトはtrue）
    const showDigital = opts.showDigital !== false;

    // 【オートリバランス機能】
    // デジタル時計・日付・曜日のすべてが表示オフの場合、懐中時計本体を完全に画面中央（offset=0）に自動配置。
    // 何かしらの文字が表示されている時のみ、下部スペースを確保するために少し上に寄せます。
    const hasTextBelow = showDigital || opts.showDate || opts.showDay;
    const watchYOffset = hasTextBelow ? -size * 0.08 : 0;

    // 24時間に基づき、円盤の回転角度を精密計算
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const totalSeconds = ((hours - 12) * 3600) + (minutes * 60) + seconds; // 12:00（正午）を角度0に設定
    const dayProgress = totalSeconds / 86400; // 0.0 〜 1.0 の1日進捗
    const rotationAngle = dayProgress * Math.PI * 2; // 右回り（時計回り）

    ctx.save();
    ctx.imageSmoothingEnabled = false; // ドット絵のシャープなピクセル比を絶対維持
    ctx.translate(cx, cy + watchYOffset); // オートリバランスを統合した座標に中心を移動

    // 円盤（WHEEL）を完全に水平な中心よりも「ほんの少し下（size * 0.012）」に配置して完璧に位置調整
    const dialYOffset = size * 0.01; 

    // 1. 中の昼夜ダイヤル（円盤）を回転描画
    ctx.save();
    ctx.translate(0, dialYOffset); // 補正された時計盤の円の中心に原点を移動
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2); 
    ctx.clip();
    ctx.rotate(rotationAngle);
    ctx.drawImage(dialImg, -size * 0.47, -size * 0.47, size * 0.94, size * 0.94);
    ctx.restore();

    // 2. 金色の懐中時計フレーム
    ctx.drawImage(frameImg, -size * 0.5, -size * 0.5, size, size);

    // 【条件分岐：デジタル表示がONのときのみ時計を描画】
    if (showDigital) {
      // 3. 懐中時計の下部にデジタル時計を描画
      ctx.fillStyle = paint || "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = `700 ${size * 0.11}px ${family}`;

      let hh = String(now.getHours()).padStart(2, "0");
      let mm = String(now.getMinutes()).padStart(2, "0");
      if (opts.hourFormat === "12") {
        let h12 = now.getHours() % 12;
        if (h12 === 0) h12 = 12;
        hh = String(h12).padStart(2, "0");
      }

      let timeStr = `${hh} : ${mm}`;
      ctx.fillText(timeStr, 0, size * 0.58);

      // 4. AM/PMをデジタル時計の左側に配置
      if (opts.showAmPm && opts.hourFormat === "12") {
        const ampm = now.getHours() >= 12 ? "PM" : "AM";
        ctx.save();
        ctx.fillStyle = paint || "#ffffff";
        ctx.globalAlpha = 0.65;
        ctx.font = `700 ${size * 0.055}px ${family}`; 
        ctx.textAlign = "right"; 
        ctx.textBaseline = "middle"; 
        
        ctx.fillText(ampm, -size * 0.175, size * 0.61);
        ctx.restore();
      }
    }

    // 5. 日付・曜日の描画（独自の showDate / showDay トグルで判定されます）
    drawDateAndDay(ctx, size, now, opts, paint || "#ffffff", family);

    ctx.restore();
  };
})();