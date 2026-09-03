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
    frameImg.src = "frame.png";
    frameImg.onload = onLoaded;

    dialImg = new Image();
    dialImg.src = "wheel.png";
    dialImg.onload = onLoaded;
  }

  // 起動時のバックグラウンド先行ロード
  loadImages();

  function drawDateAndDay(ctx, size, now, opts, color, family) {
    if (!opts || (!opts.showDate && !opts.showDay)) return;

    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY"
    ];

    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC"
    ];

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

    // 画像ロード完了前
    if (!imagesLoaded) {
      ctx.save();

      ctx.fillStyle = paint || "#ffffff";
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        "Loading Clock Textures...",
        w / 2,
        h / 2
      );

      ctx.restore();
      return;
    }

    const cx = w / 2;
    const cy = h / 2;

    const family =
      opts.fontFamily || '"Segoe UI", sans-serif';

    // デジタル時計表示
    // デフォルトはON
    const showDigital = opts.showDigital !== false;

    // デジタル時計・日付・曜日の有無によって
    // 懐中時計本体の位置を自動調整
    const hasTextBelow =
      showDigital ||
      opts.showDate ||
      opts.showDay;

    const watchYOffset =
      hasTextBelow ? -size * 0.08 : 0;

    // =====================================================
    // 24時間を360度として計算
    //
    // 12:00 = 0°
    // 18:00 = 90°
    // 00:00 = 180°
    // 06:00 = 270°
    // =====================================================

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const totalSeconds =
      ((hours - 12) * 3600) +
      (minutes * 60) +
      seconds;

    const dayProgress =
      totalSeconds / 86400;

    const rotationAngle =
      dayProgress * Math.PI * 2;

    // =====================================================
    // 時計全体
    // =====================================================

    ctx.save();

    // ドット絵のシャープなピクセル感を維持
    ctx.imageSmoothingEnabled = false;

    // 時計全体を中央へ
    // 下にデジタル表示がある場合は少し上へ
    ctx.translate(
      cx,
      cy + watchYOffset
    );

    // =====================================================
    // 1. 昼夜WHEEL
    // =====================================================

    ctx.save();

    // 円盤の表示範囲をクリップ
    ctx.beginPath();

    ctx.arc(
      0,
      0,
      size * 0.475,
      0,
      Math.PI * 2
    );

    ctx.clip();

    const wheelXOffset = -size * 0.005;  // 左
const wheelYOffset = size * 0.005;   // 下

ctx.translate(wheelXOffset, wheelYOffset);
ctx.rotate(rotationAngle);

ctx.drawImage(
  dialImg,
  -size / 2,
  -size / 2,
  size,
  size
);

    ctx.restore();

    // =====================================================
    // 2. 金色の懐中時計フレーム
    // =====================================================

    ctx.drawImage(
      frameImg,
      -size / 2,
      -size / 2,
      size,
      size
    );

    // =====================================================
    // 3. デジタル時計
    // =====================================================

    if (showDigital) {
      ctx.fillStyle = paint || "#ffffff";

      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      ctx.font =
        `700 ${size * 0.11}px ${family}`;

      let hh =
        String(now.getHours()).padStart(2, "0");

      const mm =
        String(now.getMinutes()).padStart(2, "0");

      // 12時間表示
      if (opts.hourFormat === "12") {
        let h12 = now.getHours() % 12;

        if (h12 === 0) {
          h12 = 12;
        }

        hh =
          String(h12).padStart(2, "0");
      }

      const timeStr =
        `${hh} : ${mm}`;

      ctx.fillText(
        timeStr,
        0,
        size * 0.58
      );

      // ===================================================
      // 4. AM / PM
      // ===================================================

      if (
        opts.showAmPm &&
        opts.hourFormat === "12"
      ) {
        const ampm =
          now.getHours() >= 12
            ? "PM"
            : "AM";

        ctx.save();

        ctx.fillStyle =
          paint || "#ffffff";

        ctx.globalAlpha = 0.65;

        ctx.font =
          `700 ${size * 0.055}px ${family}`;

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        ctx.fillText(
          ampm,
          -size * 0.175,
          size * 0.61
        );

        ctx.restore();
      }
    }

    // =====================================================
    // 5. 日付・曜日
    // =====================================================

    drawDateAndDay(
      ctx,
      size,
      now,
      opts,
      paint || "#ffffff",
      family
    );

    // =====================================================
    // 時計全体終了
    // =====================================================

    ctx.restore();
  };
})();