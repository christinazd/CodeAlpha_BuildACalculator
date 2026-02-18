const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const keysEl = document.getElementById("keys");
const operatorButtons = document.querySelectorAll(".key--operator");

const operators = ["+", "-", "*", "/"];
let expression = "";
let errorState = false;
let justEvaluated = false;

const isOperator = (value) => operators.includes(value);

const formatResult = (value) => {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
  let text = rounded.toString();

  if (text.includes("e")) {
    text = rounded.toPrecision(10);
  } else if (text.length > 12) {
    text = rounded.toPrecision(12);
  }

  if (text.includes(".") && !text.includes("e")) {
    text = text.replace(/(\.\d*?[1-9])0+$/, "$1");
    text = text.replace(/\.0+$/, "");
  }
  return text;
};

const tokenize = (expr) => {
  const tokens = [];
  let number = "";
  let prevType = "operator";

  for (const char of expr) {
    if (/\d/.test(char)) {
      number += char;
      prevType = "number";
    } else if (char === ".") {
      if (number.includes(".")) return null;
      number += char;
      prevType = "number";
    } else if (isOperator(char)) {
      if (char === "-" && prevType === "operator") {
        number = number === "" ? "-" : `${number}-`;
        prevType = "number";
      } else {
        if (number === "" || number === "-") return null;
        tokens.push(number);
        number = "";
        tokens.push(char);
        prevType = "operator";
      }
    }
  }

  if (number === "-") return null;
  if (number !== "") tokens.push(number);
  return tokens;
};

const evaluateExpression = (expr) => {
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return { valid: false };
  if (isOperator(tokens[tokens.length - 1])) return { valid: false };

  const output = [];
  const ops = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };

  for (const token of tokens) {
    if (!isOperator(token)) {
      output.push(token);
    } else {
      while (
        ops.length &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        output.push(ops.pop());
      }
      ops.push(token);
    }
  }

  while (ops.length) output.push(ops.pop());

  const stack = [];
  for (const token of output) {
    if (!isOperator(token)) {
      stack.push(parseFloat(token));
      continue;
    }

    if (stack.length < 2) return { valid: false };
    const b = stack.pop();
    const a = stack.pop();

    if (token === "/" && b === 0) {
      return { valid: true, error: "divide-by-zero" };
    }

    switch (token) {
      case "+":
        stack.push(a + b);
        break;
      case "-":
        stack.push(a - b);
        break;
      case "*":
        stack.push(a * b);
        break;
      case "/":
        stack.push(a / b);
        break;
      default:
        return { valid: false };
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    return { valid: false };
  }

  return { valid: true, value: stack[0] };
};

const getPreviewExpression = (expr) => {
  let preview = expr;
  while (preview.length && isOperator(preview.slice(-1))) {
    if (preview.length === 1) {
      preview = "";
      break;
    }
    preview = preview.slice(0, -1);
  }
  return preview;
};

const getLastNumber = (expr) => {
  const match = expr.match(/(-?\d*\.?\d*)$/);
  return match ? match[0] : "";
};

const getTrailingBinaryOperator = (expr) => {
  const lastChar = expr.slice(-1);
  if (!isOperator(lastChar)) return null;
  if (lastChar === "-" && (expr.length === 1 || isOperator(expr.slice(-2, -1)))) {
    return null;
  }
  return lastChar;
};

const updateOperatorHighlight = () => {
  operatorButtons.forEach((button) => button.classList.remove("is-active"));
  const active = getTrailingBinaryOperator(expression);
  if (!active) return;
  const activeButton = Array.from(operatorButtons).find(
    (button) => button.dataset.value === active
  );
  if (activeButton) activeButton.classList.add("is-active");
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

keysEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { action, value } = button.dataset;
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
    default:
      break;
  }
});

document.addEventListener("keydown", (event) => {
  const { key } = event;
  if (/^\d$/.test(key)) {
    event.preventDefault();
    handleDigit(key);
    return;
  }

  if (key === ".") {
    event.preventDefault();
    handleDecimal();
    return;
  }

  if (["+", "-", "*", "/"].includes(key)) {
    event.preventDefault();
    handleOperator(key);
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    handleEquals();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    handleDelete();
    return;
  }

  if (key === "Delete" || key === "Escape") {
    event.preventDefault();
    handleClear();
  }
});

updateDisplay();
