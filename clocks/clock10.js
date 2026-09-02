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

  // 【重要】スクリプトが読み込まれた瞬間にバックグラウンドで画像ダウンロードを先行開始
  // これにより、起動時や切り替え時の一瞬の「Loading...」というチラつきが完全に消滅します。
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

    // 万が一の読み込み漏れに備えるフォールバック
    loadImages();

    // 先行ロードのおかげで、通常ここは一瞬でスキップされ直接描画に入ります
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

    // 24時間に基づき、円盤の回転角度を精密計算
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const totalSeconds = ((hours - 12) * 3600) + (minutes * 60) + seconds; // 12:00（正午）を角度0に設定
    const dayProgress = totalSeconds / 86400; // 0.0 〜 1.0 の1日進捗
    const rotationAngle = dayProgress * Math.PI * 2; // 右回り（時計回り）

    ctx.save();
    ctx.imageSmoothingEnabled = false; // ドット絵のシャープなピクセル比を絶対維持
    ctx.translate(cx, cy - size * 0.08); // デジタル表示の余白のため、少し上に中心をずらす

    // 1. 中の昼夜ダイヤル（円盤）を回転描画
    ctx.save();
    ctx.beginPath();
    // 【調整】クリッピングサイズを 0.36 から 0.385 に拡張して視野を最大化
    ctx.arc(0, 0, size * 2, 0, Math.PI * 2); 
    ctx.clip();
    ctx.rotate(rotationAngle);
    // 【調整】ダイヤルの描画サイズを 0.75 から 0.8 に拡張し、金枠のキワまでピッタリ埋めます
    ctx.drawImage(dialImg, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    ctx.restore();

    // 2. 金色の懐中時計フレーム
    ctx.drawImage(frameImg, -size * 0.5, -size * 0.5, size, size);

    // 3. 懐中時計の下部にデジタル時計を描画
    ctx.fillStyle = paint || "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `700 ${size * 0.11}px ${family}`;

    let hh = String(now.getHours()).padStart(2, "0");
    let mm = String(now.getMinutes()).padStart(2, "0");
    let ss = String(now.getSeconds()).padStart(2, "0");
    if (opts.hourFormat === "12") {
      let h12 = now.getHours() % 12;
      if (h12 === 0) h12 = 12;
      hh = String(h12).padStart(2, "0");
    }

    let timeStr = `${hh}:${mm}:${ss}`;
    ctx.fillText(timeStr, 0, size * 0.58);

    // 4. 日付・曜日の描画
    drawDateAndDay(ctx, size, now, opts, paint || "#ffffff", family);

    ctx.restore();
  };
})();