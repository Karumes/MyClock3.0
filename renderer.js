const fontFamilies = {
  font1: '"font-1"',
  font2: '"font-2"',
  font3: '"font-3"',
  font4: '"font-4"',
  font5: '"font-5"',   
  font6: '"font-6"',      
  font7: '"font-7"',
  font8: '"font-8"',    
  font9: '"font-9"',
};

const colorPresets = {
  primary: ["#ffffff", "#69f7ff", "#89ffbf", "#ffe66d", "#ff8f5f"],
  colon: ["#ffffff", "#69f7ff", "#ff4fd8", "#89ffbf", "#ffe66d"],
  card: ["#000000", "#11151c", "#d9dfe8", "#f1eadf", "#6f7785"],
};

const clocks = window.KARUMES_CLOCKS || [];
const launchParams = new URLSearchParams(window.location.search);
const isClockMode = launchParams.get("mode") === "clock";

const state = {
  section: "library",
  selected: 0,        
  activeSelected: 0,  
  pointerStart: null,
  loadedRenderers: new Set(),
  hideControlsTimeout: null,
  animationFrameId: null, 
  profiles: clocks.map((clock) => ({
    color: clock.defaultAccent || "#ffffff",
    colonColor: clock.defaultColon || "#ffffff",
    cardColor: clock.defaultSurface || "#d9dfe8",
    fontFamily: clock.defaultFont || "font1",
    difficulty: clock.defaultDifficulty || "easy",
    sizeScale: clock.defaultSizeScale || 1,
    hourFormat: "24",
    showAmPm: false,
    showDate: false,
    showDay: false,
    showSeconds: true,
    showMidline: true,
    showWave: true, 
    compiledOptions: null,
  })),
};

function getClockRenderType(index, profile) {
  const clock = clocks[index];
  if (!clock) return "static-minutes";

  const name = clock.renderer;
  if (name === "renderClock2" || name === "renderClock5") {
    return "continuous";
  }
  if (name === "renderClock4") {
    return "animated-seconds";
  }
  if (name === "renderClock7") {
    return profile.showSeconds ? "static-seconds" : "static-minutes";
  }
  if (name === "renderClock1" || name === "renderClock6") {
    return "animated-minutes";
  }
  return "static-minutes";
}

function updateCompiledOptions(index) {
  const clock = clocks[index];
  const profile = state.profiles[index];
  if (!clock || !profile) return;

  profile.compiledOptions = {
    suppressBg: true,
    color: profile.color,
    colonColor: profile.colonColor,
    circleDigitColor: profile.colonColor,
    cardColor: profile.cardColor,
    fontFamily: fontFamilies[profile.fontFamily] || fontFamilies.font1,
    mathDifficulty: profile.difficulty,
    sizeScale: profile.sizeScale,
    hourFormat: profile.hourFormat || "24",
    showAmPm: !!profile.showAmPm,
    showDate: !!profile.showDate,
    showDay: !!profile.showDay,
    showSeconds: profile.showSeconds !== false,
    showMidline: profile.showMidline !== false,
    showWave: profile.showWave !== false,
    clock6Speed: 0.42,
    fontMode: "solid",
  };

  const optionMap = clock.optionMap || {};
  Object.entries(optionMap).forEach(([profileKey, optionKey]) => {
    if (profileKey === "card") profile.compiledOptions[optionKey] = profile.cardColor;
    if (profileKey === "colon") profile.compiledOptions[optionKey] = profile.colonColor;
  });
}

async function loadSettings() {
  try {
    const saved = await window.electronAPI.loadSettings();
    if (saved) {
      if (typeof saved.selected === "number" && saved.selected >= 0 && saved.selected < clocks.length) {
        state.selected = saved.selected;
        state.activeSelected = saved.selected;
      } else {
        state.selected = 0;
        state.activeSelected = 0;
      }
      if (Array.isArray(saved.profiles)) {
        saved.profiles.forEach((profile, index) => {
          if (state.profiles[index] && profile) {
            state.profiles[index] = { ...state.profiles[index], ...profile };
          }
        });
      }
    } else {
      state.selected = 0;
      state.activeSelected = 0;
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
    state.selected = 0;
    state.activeSelected = 0;
  }
  state.profiles.forEach((_, i) => updateCompiledOptions(i));
}

async function saveSettings() {
  try {
    const dataToSave = {
      selected: state.activeSelected,
      profiles: state.profiles,
    };
    await window.electronAPI.saveSettings(dataToSave);
  } catch (error) {
    console.error("Failed to save clock settings:", error);
  }
}

const platform = document.getElementById("platform");
const librarySection = document.getElementById("library-section");
const clockGrid = document.getElementById("clock-grid");
const saver = document.getElementById("saver");
const saverActions = document.getElementById("saver-actions");
const mainCanvas = document.getElementById("clockCanvas");
const mainCtx = mainCanvas.getContext("2d");
const settingsPanel = document.getElementById("settings-panel");
const settingsTitle = document.getElementById("settings-title");
const fontInput = document.getElementById("font-custom-color");
const colonInput = document.getElementById("colon-custom-color");
const cardInput = document.getElementById("card-custom-color");
const fontSelect = document.getElementById("font-family-select");
const difficultySelect = document.getElementById("difficulty-select");
const formatSelect = document.getElementById("format-select");
const ampmToggle = document.getElementById("ampm-toggle");
const dateToggle = document.getElementById("date-toggle");
const dayToggle = document.getElementById("day-toggle");
const secondsToggle = document.getElementById("seconds-toggle");
const midlineToggle = document.getElementById("midline-toggle");

const waveToggle = document.getElementById("wave-toggle");
const sizeScaleInput = document.getElementById("clock-size-scale");
const renderErrors = new Set();

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("revealed");
      });
    }, { threshold: 0.16 })
  : null;

function fillPureBlack(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color || "#000000";
  ctx.fillRect(0, 0, w, h);
}

function drawClockFallback(ctx, w, h, clockName) {
  ctx.save();
  fillPureBlack(ctx, w, h, "#000000");
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(18, Math.floor(Math.min(w, h) * 0.055))}px ${fontFamilies.font2}`;
  ctx.fillText(clockName || "Clock", w / 2, h / 2);
  ctx.restore();
}

function getClockControls(index) {
  return new Set(clocks[index]?.controls || []);
}

function executeRenderer(renderer, ctx, w, h, clock, profile, baseSize, sizeScale, now, options) {
  if (typeof renderer !== "function") throw new Error("Renderer is not a function");
  if (clock.renderer === "renderClock1") {
    renderer(ctx, w, h, profile.color, baseSize * sizeScale, now, options);
  } else {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(sizeScale, sizeScale);
    ctx.translate(-w / 2, -h / 2);
    renderer(ctx, w, h, profile.color, baseSize, now, options);
    ctx.restore();
  }
}

function ensureRendererLoaded(rendererName) {
  if (window[rendererName] || state.loadedRenderers.has(rendererName)) {
    return Promise.resolve();
  }
  
  const rendererMap = {
    renderClock1: 'clocks/clock1.js',
    renderClock2: 'clocks/clock2.js',
    renderClock3: 'clocks/clock3.js',
    renderClock4: 'clocks/clock4.js',
    renderClock5: 'clocks/clock5.js',
    renderClock6: 'clocks/clock6.js',
    renderClock7: 'clocks/clock7.js',
    renderClock8: 'clocks/clock8.js',
    renderClock9: 'clocks/clock9.js',
  };
  
  const filePath = rendererMap[rendererName];
  if (!filePath) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = filePath;
    script.async = false;
    script.onload = () => {
      state.loadedRenderers.add(rendererName);
      resolve();
    };
    script.onerror = () => {
      console.error(`Failed to load ${filePath}`);
      reject(new Error(`Failed to load renderer ${rendererName}`));
    };
    document.head.appendChild(script);
  });
}

function renderClock(ctx, canvas, index, now) {
  const clock = clocks[index];
  const profile = state.profiles[index];
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.imageSmoothingEnabled = false;
  fillPureBlack(ctx, w, h, "#000000");

  const renderer = window[clock.renderer];
  if (!renderer) {
    ctx.fillStyle = "#666";
    ctx.font = "24px sans-serif";
    ctx.fillText("Loading...", w / 2 - 40, h / 2);
    return;
  }
  
  const sizeScale = Number(profile.sizeScale) || 1;
  
  const referenceDim = 820;
  const currentDim = Math.min(w, h);
  const baseSize = clock.size * (currentDim / referenceDim);
  const options = profile.compiledOptions || {};

  try {
    executeRenderer(renderer, ctx, w, h, clock, profile, baseSize, sizeScale, now, options);
  } catch (error) {
    if (!renderErrors.has(clock.renderer)) {
      console.error(`Failed to render ${clock.name}`, error);
      renderErrors.add(clock.renderer);
    }
    drawClockFallback(ctx, w, h, clock.name);
  }
}

function createClockCard(clock, index) {
  const card = document.createElement("button");
  card.className = "clock-card";
  card.type = "button";
  card.setAttribute("aria-label", `${clock.name} clock`);
  
  card.addEventListener("click", () => launchClock(index, true));
  
  const img = document.createElement("img");
  img.className = "clock-preview-image";
  img.src = clock.previewImage || ""; 
  img.alt = `${clock.name} preview`;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  const shine = document.createElement("span");
  shine.className = "card-shine";
  card.append(img, shine);
  clockGrid.appendChild(card);
  if (revealObserver) revealObserver.observe(card);
  else requestAnimationFrame(() => card.classList.add("revealed"));
}

function buildGrid() {
  clocks.forEach(createClockCard);
  updateSelectionUI();
}

function updateSelectionUI() {
  document.querySelectorAll(".clock-card").forEach((card, index) => {
    card.classList.toggle("selected", index === state.activeSelected);
    card.setAttribute("aria-pressed", String(index === state.activeSelected));
  });
}

function setSection(section) {
  state.section = section;
  librarySection.classList.toggle("active", section === "library");
}

function hideControlsAfterDelay() {
  if (!saverActions) return;

  if (state.hideControlsTimeout) {
    clearTimeout(state.hideControlsTimeout);
  }

  saverActions.classList.remove("hidden-controls");
  state.hideControlsTimeout = setTimeout(() => {
    saverActions.classList.add("hidden-controls");
  }, 5000);
}

function startLoop() {
  if (state.animationFrameId === null) {
    loop();
  }
}

function stopLoop() {
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

let lastMin = -1;
let lastSec = -1;
let animWindowEnd = 0;

function loop() {
  const now = new Date();
  const nowMs = now.getTime();
  const currentMin = now.getMinutes();
  const currentSec = now.getSeconds();

  const profile = state.profiles[state.selected];
  const renderType = getClockRenderType(state.selected, profile);

  let shouldRedraw = false;

  switch (renderType) {
    case "continuous":
    case "animated-seconds":
      shouldRedraw = true;
      break;

    case "static-seconds":
      if (currentSec !== lastSec) {
        shouldRedraw = true;
        lastSec = currentSec;
      }
      break;

    case "animated-minutes":
      if (currentMin !== lastMin) {
        lastMin = currentMin;
        animWindowEnd = nowMs + 1200; 
      }
      if (nowMs < animWindowEnd) {
        shouldRedraw = true;
      }
      break;

    case "static-minutes":
      if (currentMin !== lastMin) {
        shouldRedraw = true;
        lastMin = currentMin;
      }
      break;
  }

  if (shouldRedraw) {
    renderMain(now);
  }

  state.animationFrameId = requestAnimationFrame(loop);
}

function launchClock(index, makeActive = false) {
  state.selected = index;
  const clock = clocks[index];
  
  ensureRendererLoaded(clock.renderer).then(() => {
    if (makeActive) {
      state.activeSelected = index;
      saveSettings();
    }
    updateSelectionUI();
    platform.classList.add("hidden");
    saver.classList.remove("hidden");
    closeSettings();
    resizeMainCanvas();
    
    lastMin = -1;
    lastSec = -1;
    animWindowEnd = 0;

    startLoop();
    
    if (saverActions) {
      saverActions.classList.remove("hidden-controls");
      if (state.hideControlsTimeout) {
        clearTimeout(state.hideControlsTimeout);
      }
      state.hideControlsTimeout = setTimeout(() => {
        saverActions.classList.add("hidden-controls");
      }, 5000);
    }
  }).catch(err => {
    console.error("Failed to launch clock:", err);
  });
}

function returnHome() {
  if (isClockMode) return;
  
  stopLoop();
  
  saver.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  platform.classList.remove("hidden");
  updateSelectionUI();
  if (state.hideControlsTimeout) {
    clearTimeout(state.hideControlsTimeout);
    state.hideControlsTimeout = null;
  }
}

function setColorInput(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncSwatchState() {
  const map = {
    primary: fontInput.value,
    colon: colonInput.value,
    card: cardInput.value,
  };
  Object.entries(map).forEach(([key, value]) => {
    let matched = false;
    document.querySelectorAll(`[data-swatches="${key}"] .color-swatch:not(.custom)`).forEach((button) => {
      const isActive = button.dataset.color.toLowerCase() === value.toLowerCase();
      button.classList.toggle("active", isActive);
      if (isActive) matched = true;
    });

    const customButton = document.querySelector(`[data-swatches="${key}"] .color-swatch.custom`);
    if (customButton) {
      customButton.classList.toggle("active", !matched);
    }
  });
}

function buildColorSwatches() {
  Object.entries(colorPresets).forEach(([key, colors]) => {
    const wrap = document.querySelector(`[data-swatches="${key}"]`);
    if (!wrap) return;
    wrap.innerHTML = "";
    colors.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.dataset.color = color;
      button.style.setProperty("--swatch", color);
      button.setAttribute("aria-label", `${key} ${color}`);
      button.addEventListener("click", () => {
        const targetId = wrap.closest("[data-color-target]").dataset.colorTarget;
        const input = document.getElementById(targetId);
        setColorInput(input, color);
        syncSwatchState();
      });
      wrap.appendChild(button);
    });
    
    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "color-swatch custom";
    custom.setAttribute("aria-label", `Custom ${key} color`);
    custom.dataset.opened = "false";
    
    custom.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetId = wrap.closest("[data-color-target]").dataset.colorTarget;
      const input = document.getElementById(targetId);
      if (!input) return;

      if (custom.dataset.opened === "true") {
        const originalType = input.type;
        input.type = "text";
        input.type = originalType;
        custom.dataset.opened = "false";
      } else {
        document.querySelectorAll('.color-swatch.custom').forEach(btn => {
          btn.dataset.opened = "false";
        });
        input.click(); 
        custom.dataset.opened = "true";
      }
    });
    
    wrap.appendChild(custom);
  });
}

function syncCustomFontDropdownUI(val) {
  const trigger = document.getElementById("custom-font-select");
  const option = document.querySelector(`.custom-option[data-value="${val}"]`);
  if (trigger && option) {
    trigger.textContent = option.textContent;
  }
}

function syncCustomDifficultyDropdownUI(val) {
  const trigger = document.getElementById("custom-difficulty-select");
  const option = document.querySelector(`.custom-difficulty-option[data-value="${val}"]`);
  if (trigger && option) {
    trigger.textContent = option.textContent;
  }
}

function syncCustomFormatDropdownUI(val) {
  const trigger = document.getElementById("custom-format-select");
  const option = document.querySelector(`.custom-format-option[data-value="${val}"]`);
  if (trigger && option) {
    trigger.textContent = option.textContent;
  }
}

function syncAmPmToggleState(formatVal) {
  const row = document.querySelector('[data-setting="showAmPm"]');
  const toggle = row?.querySelector('.toggle-switch');
  
  if (formatVal === "12") {
    ampmToggle.disabled = false;
    toggle?.classList.remove("disabled-toggle");
    row?.classList.remove("disabled-row");
  } else {
    ampmToggle.checked = false;
    ampmToggle.disabled = true;
    toggle?.classList.add("disabled-toggle");
    row?.classList.add("disabled-row");
  }
}

function openSettings() {
  const clock = clocks[state.selected];
  const profile = state.profiles[state.selected];
  const controls = getClockControls(state.selected);
  const minSize = Number(clock.minSizeScale ?? 0.35);
  const maxSize = Number(clock.maxSizeScale ?? 3.0);
  settingsTitle.textContent = clock.name;
  fontInput.value = profile.color;
  colonInput.value = profile.colonColor;
  cardInput.value = profile.cardColor;
  
  fontSelect.value = profile.fontFamily;
  syncCustomFontDropdownUI(profile.fontFamily);
  
  difficultySelect.value = profile.difficulty;
  syncCustomDifficultyDropdownUI(profile.difficulty);

  const formatVal = profile.hourFormat || "24";
  formatSelect.value = formatVal;
  syncCustomFormatDropdownUI(formatVal);

  ampmToggle.checked = !!profile.showAmPm;
  syncAmPmToggleState(formatVal);

  dateToggle.checked = !!profile.showDate;
  dayToggle.checked = !!profile.showDay;
  if (secondsToggle) {
    secondsToggle.checked = profile.showSeconds !== false;
  }
  if (midlineToggle) {
    midlineToggle.checked = profile.showMidline !== false;
  }
  if (waveToggle) {
    waveToggle.checked = profile.showWave !== false;
  }

  if (sizeScaleInput) {
    sizeScaleInput.setAttribute("min", String(minSize));
    sizeScaleInput.setAttribute("max", String(maxSize));
    sizeScaleInput.setAttribute("step", "0.01");
    const clamped = Math.min(Math.max(Number(profile.sizeScale) || minSize, minSize), maxSize);
    sizeScaleInput.value = clamped;
    profile.sizeScale = clamped;
  }
  document.querySelectorAll("[data-setting]").forEach((row) => {
    const visible = controls.has(row.dataset.setting);
    row.classList.toggle("hidden-setting", !visible);
  });
  syncSwatchState();
  settingsPanel.classList.remove("hidden");
}

function closeSettings() {
  settingsPanel.classList.add("hidden");
}

function updateProfileFromControls() {
  const profile = state.profiles[state.selected];
  profile.color = fontInput.value;
  profile.colonColor = colonInput.value;
  profile.cardColor = cardInput.value;
  profile.fontFamily = fontSelect.value;
  profile.difficulty = difficultySelect.value;
  profile.hourFormat = formatSelect.value;

  if (profile.hourFormat === "24") {
    profile.showAmPm = false;
    ampmToggle.checked = false;
  } else {
    profile.showAmPm = ampmToggle.checked;
  }

  profile.showDate = dateToggle.checked;
  profile.showDay = dayToggle.checked;
  if (secondsToggle) {
    profile.showSeconds = secondsToggle.checked;
  }
  if (midlineToggle) {
    profile.showMidline = midlineToggle.checked;
  }
  if (waveToggle) {
    profile.showWave = waveToggle.checked;
  }
  profile.sizeScale = Number(sizeScaleInput.value);
  
  updateCompiledOptions(state.selected);
  
  lastMin = -1;
  lastSec = -1;
  
  syncSwatchState();
}

function resizeMainCanvas() {
  const rect = mainCanvas.getBoundingClientRect();
  mainCanvas.width = Math.floor(rect.width * window.devicePixelRatio);
  mainCanvas.height = Math.floor(rect.height * window.devicePixelRatio);
  lastMin = -1;
  lastSec = -1;
}

function renderMain(now) {
  if (saver.classList.contains("hidden")) return;
  renderClock(mainCtx, mainCanvas, state.selected, now);
}

function requestCloseApp() {
  if (window.electronAPI && typeof window.electronAPI.closeApp === "function") {
    window.electronAPI.closeApp();
  }
}

function handleClockModeMouseMove(event) {
  if (!isClockMode) return;
  if (!state.pointerStart) {
    state.pointerStart = { x: event.screenX, y: event.screenY };
    return;
  }
  if (Math.hypot(event.screenX - state.pointerStart.x, event.screenY - state.pointerStart.y) >= 5) {
    requestCloseApp();
  }
}

function initEvents() {
  document.getElementById("brand-btn").addEventListener("click", () => setSection("library"));

  saver.addEventListener("click", () => {
    if (!saver.classList.contains("hidden")) {
      hideControlsAfterDelay();
    }
  });

  document.getElementById("home-btn").addEventListener("click", returnHome);
  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("close-settings").addEventListener("click", closeSettings);

  const customFontTrigger = document.getElementById("custom-font-select");
  const customFontOptions = document.getElementById("custom-font-options");
  const customDifficultyTrigger = document.getElementById("custom-difficulty-select");
  const customDifficultyOptions = document.getElementById("custom-difficulty-options");
  const customFormatTrigger = document.getElementById("custom-format-select");
  const customFormatOptions = document.getElementById("custom-format-options");
  
  if (customFontTrigger && customFontOptions) {
    customFontTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (customDifficultyOptions) {
        customDifficultyOptions.classList.add("hidden");
        customDifficultyTrigger.classList.remove("active");
      }
      if (customFormatOptions) {
        customFormatOptions.classList.add("hidden");
        customFormatTrigger.classList.remove("active");
      }
      customFontOptions.classList.toggle("hidden");
      customFontTrigger.classList.toggle("active");
    });

    document.querySelectorAll(".custom-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        fontSelect.value = val;
        customFontTrigger.textContent = opt.textContent;
        customFontOptions.classList.add("hidden");
        customFontTrigger.classList.remove("active");
        updateProfileFromControls();
      });
    });
  }

  if (customDifficultyTrigger && customDifficultyOptions) {
    customDifficultyTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (customFontOptions) {
        customFontOptions.classList.add("hidden");
        customFontTrigger.classList.remove("active");
      }
      if (customFormatOptions) {
        customFormatOptions.classList.add("hidden");
        customFormatTrigger.classList.remove("active");
      }
      customDifficultyOptions.classList.toggle("hidden");
      customDifficultyTrigger.classList.toggle("active");
    });

    document.querySelectorAll(".custom-difficulty-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        difficultySelect.value = val;
        customDifficultyTrigger.textContent = opt.textContent;
        customDifficultyOptions.classList.add("hidden");
        customDifficultyTrigger.classList.remove("active");
        updateProfileFromControls();
      });
    });
  }

  if (customFormatTrigger && customFormatOptions) {
    customFormatTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (customFontOptions) {
        customFontOptions.classList.add("hidden");
        customFontTrigger.classList.remove("active");
      }
      if (customDifficultyOptions) {
        customDifficultyOptions.classList.add("hidden");
        customDifficultyTrigger.classList.remove("active");
      }
      customFormatOptions.classList.toggle("hidden");
      customFormatTrigger.classList.toggle("active");
    });

    document.querySelectorAll(".custom-format-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        formatSelect.value = val;
        customFormatTrigger.textContent = opt.textContent;
        customFormatOptions.classList.add("hidden");
        customFormatTrigger.classList.remove("active");
        
        syncAmPmToggleState(val);

        updateProfileFromControls();
      });
    });
  }

  document.addEventListener("click", () => {
    if (customFontOptions) customFontOptions.classList.add("hidden");
    if (customFontTrigger) customFontTrigger.classList.remove("active");
    if (customDifficultyOptions) customDifficultyOptions.classList.add("hidden");
    if (customDifficultyTrigger) customDifficultyTrigger.classList.remove("active");
    if (customFormatOptions) customFormatOptions.classList.add("hidden");
    if (customFormatTrigger) customFormatTrigger.classList.remove("active");
  });
  
  [fontInput, colonInput, cardInput, fontSelect, difficultySelect, sizeScaleInput, formatSelect, ampmToggle, dateToggle, dayToggle, secondsToggle, midlineToggle, waveToggle].forEach((input) => {
    if (input) {
      input.addEventListener("input", updateProfileFromControls);
      input.addEventListener("change", updateProfileFromControls);
    }
  });
  
  window.addEventListener("mousemove", handleClockModeMouseMove, { passive: true });
  window.addEventListener("mousedown", () => { if (isClockMode) requestCloseApp(); });
  window.addEventListener("keydown", () => { if (isClockMode) requestCloseApp(); });
  window.addEventListener("resize", resizeMainCanvas);
  window.addEventListener("keydown", (event) => {
    if (!isClockMode && event.key === "Escape" && !saver.classList.contains("hidden")) returnHome();
  });

  window.addEventListener("focus", () => {
    setTimeout(() => {
      document.querySelectorAll(".color-swatch.custom").forEach((btn) => {
        btn.dataset.opened = "false";
      });
    }, 200);
  });
}

async function init() {
  await loadSettings();
  
  if (document.fonts) {
    Object.values(fontFamilies).forEach((family) => {
      document.fonts.load(`10px ${family}`);      
      document.fonts.load(`700 10px ${family}`);  
    });
  }

  buildColorSwatches();
  buildGrid();
  initEvents();
  resizeMainCanvas();
  setSection("library");
  
  if (isClockMode) {
    document.body.classList.add("clock-mode");
    launchClock(state.selected, false);
  } else {
    stopLoop();
  }
}

init();