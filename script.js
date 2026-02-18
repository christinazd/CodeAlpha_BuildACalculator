const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const keysEl = document.getElementById("keys");
const operatorButtons = document.querySelectorAll(".key--operator");
const historyListEl = document.getElementById("historyList");
const historyEmptyEl = document.getElementById("historyEmpty");
const historyClearBtn = document.getElementById("historyClear");
const historyToggleEl = document.getElementById("historyToggle");
const historyOverlayEl = document.getElementById("historyOverlay");
const historyCloseEl = document.getElementById("historyClose");
const memoryIndicatorEl = document.getElementById("memoryIndicator");
const modeIndicatorEl = document.getElementById("modeIndicator");
const themeSelectEl = document.getElementById("themeSelect");
const sciToggleEl = document.getElementById("sciToggle");
const hintsToggleEl = document.getElementById("hintsToggle");
const soundToggleEl = document.getElementById("soundToggle");
const hintsOverlayEl = document.getElementById("hintsOverlay");
const hintsCloseEl = document.getElementById("hintsClose");

const {
  operators,
  isOperator,
  formatResult,
  evaluateExpression,
  getPreviewExpression,
  getLastNumber,
  getTrailingBinaryOperator,
  replaceLastNumber,
  insertValue,
  toRadians,
} = window.CalculatorEngine;

const HISTORY_LIMIT = 25;
const HISTORY_KEY = "calculator-history";
const PREFS_KEY = "calculator-preferences";

const defaultPrefs = {
  theme: "glass",
  sciMode: false,
  sound: false,
};

const readPrefs = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
    return { ...defaultPrefs, ...stored };
  } catch (error) {
    return { ...defaultPrefs };
  }
};

const prefs = readPrefs();
const urlParams = new URLSearchParams(window.location.search);
const sciOverride = urlParams.get("sci");
const hasSciOverride = sciOverride !== null;

if (hasSciOverride) {
  prefs.sciMode = sciOverride === "1" || sciOverride === "true";
}

let expression = "";
let errorState = false;
let justEvaluated = false;
let memoryValue = 0;
let memorySet = false;
let history = [];
let audioContext = null;

const savePrefs = () => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};

const setToggleState = (button, isOn) => {
  if (!button) return;
  button.setAttribute("aria-pressed", String(isOn));
  button.classList.toggle("is-active", isOn);
};

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
  if (themeSelectEl) themeSelectEl.value = theme;
  prefs.theme = theme;
  savePrefs();
};

const applyScientificMode = (enabled, persist = true) => {
  document.body.classList.toggle("is-scientific", enabled);
  setToggleState(sciToggleEl, enabled);
  if (modeIndicatorEl) {
    modeIndicatorEl.textContent = enabled ? "Scientific" : "Standard";
  }
  prefs.sciMode = enabled;
  if (persist) {
    savePrefs();
  }
};

const applySound = (enabled) => {
  setToggleState(soundToggleEl, enabled);
  prefs.sound = enabled;
  savePrefs();
};


const loadHistory = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
};

const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const renderHistory = () => {
  if (!historyListEl) return;
  historyListEl.innerHTML = "";

  history.slice(0, HISTORY_LIMIT).forEach((entry, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history__item";
    item.dataset.value = entry.result;
    item.setAttribute("aria-label", `Use ${entry.result}`);
    item.innerHTML = `
      <span class="history__expression">${entry.expression}</span>
      <span class="history__result">${entry.result}</span>
    `;
    item.style.animationDelay = `${index * 0.02}s`;
    historyListEl.appendChild(item);
  });

  if (historyEmptyEl) {
    historyEmptyEl.hidden = history.length > 0;
  }
};

const updateMemoryIndicator = () => {
  if (!memoryIndicatorEl) return;
  memoryIndicatorEl.classList.toggle("is-active", memorySet);
  memoryIndicatorEl.setAttribute("aria-hidden", String(!memorySet));
};

const playClick = () => {
  if (!prefs.sound) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 420;
    gainNode.gain.value = 0.08;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.08
    );
    oscillator.stop(audioContext.currentTime + 0.09);
  } catch (error) {
    // Ignore audio failures (autoplay restrictions, etc).
  }
};

const triggerFeedback = () => {
  playClick();
  // Haptics removed by request.
};

const getCurrentValue = () => {
  if (errorState) return 0;
  const previewExpr = getPreviewExpression(expression);
  if (previewExpr && previewExpr !== "-") {
    const evaluation = evaluateExpression(previewExpr);
    if (evaluation.valid && !evaluation.error) {
      return evaluation.value;
    }
  }
  const lastNumber = getLastNumber(expression);
  if (lastNumber && lastNumber !== "-" && lastNumber !== ".") {
    const value = parseFloat(lastNumber);
    return Number.isFinite(value) ? value : 0;
  }
  return 0;
};

const updateOperatorHighlight = () => {
  operatorButtons.forEach((button) => {
    button.classList.remove("is-active");
    button.setAttribute("aria-pressed", "false");
  });
  const active = getTrailingBinaryOperator(expression);
  if (!active) return;
  const activeButton = Array.from(operatorButtons).find(
    (button) => button.dataset.value === active
  );
  if (activeButton) {
    activeButton.classList.add("is-active");
    activeButton.setAttribute("aria-pressed", "true");
  }
};

const updateDisplay = () => {
  expressionEl.textContent = expression || "0";
  const previewExpr = getPreviewExpression(expression);
  if (!previewExpr || previewExpr === "-") {
    resultEl.textContent = "0";
  } else {
    const evaluation = evaluateExpression(previewExpr);
    if (!evaluation.valid) {
      resultEl.textContent = "0";
    } else if (evaluation.error) {
      resultEl.textContent = "Error";
    } else {
      resultEl.textContent = formatResult(evaluation.value);
    }
  }
  updateOperatorHighlight();
};

const showError = () => {
  errorState = true;
  expression = "";
  expressionEl.textContent = "Error";
  resultEl.textContent = "Error";
  updateOperatorHighlight();
};

const resetAll = () => {
  errorState = false;
  expression = "";
  justEvaluated = false;
  updateDisplay();
};

const handleDigit = (digit) => {
  if (errorState) resetAll();
  if (justEvaluated) {
    expression = digit;
    justEvaluated = false;
    updateDisplay();
    return;
  }

  if (expression === "0") {
    expression = digit;
  } else {
    expression += digit;
  }
  updateDisplay();
};

const handleDecimal = () => {
  if (errorState) resetAll();
  if (justEvaluated) {
    expression = "0.";
    justEvaluated = false;
    updateDisplay();
    return;
  }

  const lastChar = expression.slice(-1);
  if (expression === "" || isOperator(lastChar)) {
    expression += "0.";
    updateDisplay();
    return;
  }

  const lastNumber = getLastNumber(expression);
  if (lastNumber.includes(".")) return;

  expression += ".";
  updateDisplay();
};

const handleOperator = (operator) => {
  if (errorState) resetAll();
  if (expression === "" && operator !== "-") return;

  if (justEvaluated) {
    justEvaluated = false;
  }

  const lastChar = expression.slice(-1);
  if (isOperator(lastChar)) {
    if (operator === "-" && lastChar !== "-") {
      expression += operator;
    } else {
      expression = expression.slice(0, -1) + operator;
    }
  } else {
    expression += operator;
  }

  updateDisplay();
};

const handleEquals = () => {
  if (errorState) return;
  const previewExpr = getPreviewExpression(expression);
  if (!previewExpr || previewExpr === "-") return;

  const evaluation = evaluateExpression(previewExpr);
  if (!evaluation.valid) return;
  if (evaluation.error) {
    showError();
    return;
  }

  const formatted = formatResult(evaluation.value);
  expression = formatted;
  expressionEl.textContent = formatted;
  resultEl.textContent = formatted;
  justEvaluated = true;
  updateOperatorHighlight();

  history.unshift({ expression: previewExpr, result: formatted });
  history = history.slice(0, HISTORY_LIMIT);
  saveHistory();
  renderHistory();
};

const handleClear = () => resetAll();

const handleDelete = () => {
  if (errorState) {
    resetAll();
    return;
  }
  if (!expression) return;
  expression = expression.slice(0, -1);
  justEvaluated = false;
  updateDisplay();
};

const applyUnaryOperation = (operation) => {
  if (errorState) resetAll();
  const lastNumber = getLastNumber(expression);
  const hasNumber =
    lastNumber !== "" && lastNumber !== "-" && lastNumber !== ".";
  const baseValue = hasNumber ? parseFloat(lastNumber) : getCurrentValue();
  const nextValue = operation(baseValue);
  if (!Number.isFinite(nextValue)) {
    showError();
    return;
  }
  const formatted = formatResult(nextValue);
  expression = hasNumber
    ? replaceLastNumber(expression, formatted)
    : formatted;
  justEvaluated = false;
  updateDisplay();
};

const handlePercent = () => applyUnaryOperation((value) => value / 100);
const handleSquare = () => applyUnaryOperation((value) => value * value);
const handleReciprocal = () =>
  applyUnaryOperation((value) => (value === 0 ? NaN : 1 / value));
const handleSqrt = () =>
  applyUnaryOperation((value) => (value < 0 ? NaN : Math.sqrt(value)));
const handleSin = () =>
  applyUnaryOperation((value) => Math.sin(toRadians(value)));
const handleCos = () =>
  applyUnaryOperation((value) => Math.cos(toRadians(value)));
const handleTan = () =>
  applyUnaryOperation((value) => Math.tan(toRadians(value)));

const handlePi = () => {
  if (errorState) resetAll();
  expression = insertValue(expression, Math.PI);
  justEvaluated = false;
  updateDisplay();
};

const handleMemoryClear = () => {
  memoryValue = 0;
  memorySet = false;
  updateMemoryIndicator();
};

const handleMemoryRecall = () => {
  if (!memorySet) return;
  expression = formatResult(memoryValue);
  justEvaluated = true;
  updateDisplay();
};

const handleMemoryAdd = () => {
  memoryValue += getCurrentValue();
  memorySet = true;
  updateMemoryIndicator();
};

const handleMemorySubtract = () => {
  memoryValue -= getCurrentValue();
  memorySet = true;
  updateMemoryIndicator();
};

const toggleHints = (forceOpen = null) => {
  if (!hintsOverlayEl) return;
  const willOpen =
    forceOpen !== null ? forceOpen : hintsOverlayEl.dataset.open !== "true";
  hintsOverlayEl.dataset.open = willOpen ? "true" : "false";
  hintsOverlayEl.setAttribute("aria-hidden", String(!willOpen));
  if (hintsToggleEl) {
    hintsToggleEl.setAttribute("aria-expanded", String(willOpen));
  }
};

const toggleHistory = (forceOpen = null) => {
  if (!historyOverlayEl) return;
  const willOpen =
    forceOpen !== null ? forceOpen : historyOverlayEl.dataset.open !== "true";
  historyOverlayEl.dataset.open = willOpen ? "true" : "false";
  historyOverlayEl.setAttribute("aria-hidden", String(!willOpen));
  if (historyToggleEl) {
    historyToggleEl.setAttribute("aria-expanded", String(willOpen));
  }
};

keysEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { action, value } = button.dataset;
  triggerFeedback();

  switch (action) {
    case "number":
      handleDigit(value);
      break;
    case "decimal":
      handleDecimal();
      break;
    case "operator":
      handleOperator(value);
      break;
    case "equals":
      handleEquals();
      break;
    case "clear":
      handleClear();
      break;
    case "delete":
      handleDelete();
      break;
    case "percent":
      handlePercent();
      break;
    case "square":
      handleSquare();
      break;
    case "reciprocal":
      handleReciprocal();
      break;
    case "sqrt":
      handleSqrt();
      break;
    case "sin":
      handleSin();
      break;
    case "cos":
      handleCos();
      break;
    case "tan":
      handleTan();
      break;
    case "pi":
      handlePi();
      break;
    case "memory-clear":
      handleMemoryClear();
      break;
    case "memory-recall":
      handleMemoryRecall();
      break;
    case "memory-add":
      handleMemoryAdd();
      break;
    case "memory-subtract":
      handleMemorySubtract();
      break;
    default:
      break;
  }
});

if (historyListEl) {
  historyListEl.addEventListener("click", (event) => {
    const item = event.target.closest(".history__item");
    if (!item) return;
    triggerFeedback();
    expression = item.dataset.value || "";
    justEvaluated = true;
    updateDisplay();
  });
}

if (historyClearBtn) {
  historyClearBtn.addEventListener("click", () => {
    triggerFeedback();
    history = [];
    saveHistory();
    renderHistory();
  });
}

if (historyToggleEl) {
  historyToggleEl.addEventListener("click", () => {
    triggerFeedback();
    toggleHistory();
  });
}

if (historyCloseEl) {
  historyCloseEl.addEventListener("click", () => {
    triggerFeedback();
    toggleHistory(false);
  });
}

if (historyOverlayEl) {
  historyOverlayEl.addEventListener("click", (event) => {
    if (event.target === historyOverlayEl) {
      toggleHistory(false);
    }
  });
}

if (sciToggleEl) {
  sciToggleEl.addEventListener("click", () => {
    triggerFeedback();
    applyScientificMode(!prefs.sciMode);
  });
}

if (hintsToggleEl) {
  hintsToggleEl.addEventListener("click", () => {
    triggerFeedback();
    toggleHints();
  });
}

if (hintsCloseEl) {
  hintsCloseEl.addEventListener("click", () => {
    triggerFeedback();
    toggleHints(false);
  });
}

if (hintsOverlayEl) {
  hintsOverlayEl.addEventListener("click", (event) => {
    if (event.target === hintsOverlayEl) {
      toggleHints(false);
    }
  });
}

if (soundToggleEl) {
  soundToggleEl.addEventListener("click", () => {
    triggerFeedback();
    applySound(!prefs.sound);
  });
}


if (themeSelectEl) {
  themeSelectEl.addEventListener("change", (event) => {
    triggerFeedback();
    applyTheme(event.target.value);
  });
}

document.addEventListener("keydown", (event) => {
  const { key } = event;
  const lowerKey = key.toLowerCase();

  if (hintsOverlayEl?.dataset.open === "true" && key === "Escape") {
    event.preventDefault();
    toggleHints(false);
    return;
  }

  if (historyOverlayEl?.dataset.open === "true" && key === "Escape") {
    event.preventDefault();
    toggleHistory(false);
    return;
  }

  if (key === "?" || (key === "/" && event.shiftKey) || lowerKey === "h") {
    event.preventDefault();
    toggleHints();
    return;
  }

  if (/^\d$/.test(key)) {
    event.preventDefault();
    triggerFeedback();
    handleDigit(key);
    return;
  }

  if (key === ".") {
    event.preventDefault();
    triggerFeedback();
    handleDecimal();
    return;
  }

  if (["+", "-", "*", "/"].includes(key)) {
    event.preventDefault();
    triggerFeedback();
    handleOperator(key);
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    triggerFeedback();
    handleEquals();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    triggerFeedback();
    handleDelete();
    return;
  }

  if (key === "Delete" || key === "Escape") {
    event.preventDefault();
    triggerFeedback();
    handleClear();
    return;
  }

  if (lowerKey === "p" && !event.shiftKey) {
    event.preventDefault();
    triggerFeedback();
    handlePercent();
    return;
  }

  if (key === "P") {
    event.preventDefault();
    triggerFeedback();
    handlePi();
    return;
  }

  if (lowerKey === "q") {
    event.preventDefault();
    triggerFeedback();
    handleSqrt();
    return;
  }

  if (lowerKey === "x") {
    event.preventDefault();
    triggerFeedback();
    handleSquare();
    return;
  }

  if (lowerKey === "i") {
    event.preventDefault();
    triggerFeedback();
    handleReciprocal();
    return;
  }

  if (lowerKey === "s") {
    event.preventDefault();
    triggerFeedback();
    handleSin();
    return;
  }

  if (lowerKey === "c") {
    event.preventDefault();
    triggerFeedback();
    handleCos();
    return;
  }

  if (lowerKey === "t") {
    event.preventDefault();
    triggerFeedback();
    handleTan();
  }
});

applyTheme(prefs.theme);
applyScientificMode(prefs.sciMode, !hasSciOverride);
applySound(prefs.sound);
history = loadHistory();
renderHistory();
updateMemoryIndicator();
updateDisplay();
