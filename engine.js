(() => {
  const operators = ["+", "-", "*", "/"];
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

  const replaceLastNumber = (expr, replacement) => {
    const match = expr.match(/(-?\d*\.?\d*)$/);
    if (!match || match[0] === "") return replacement;
    return expr.slice(0, -match[0].length) + replacement;
  };

  const insertValue = (expr, value) => {
    const text = typeof value === "number" ? formatResult(value) : String(value);
    if (!expr) return text;
    const lastChar = expr.slice(-1);
    if (/\d|\./.test(lastChar)) {
      return `${expr}*${text}`;
    }
    return `${expr}${text}`;
  };

  const applyUnaryToExpression = (expr, transform) => {
    const lastNumber = getLastNumber(expr);
    const hasNumber =
      lastNumber !== "" && lastNumber !== "-" && lastNumber !== ".";
    const baseValue = hasNumber ? parseFloat(lastNumber) : 0;
    const nextValue = transform(baseValue);
    if (!Number.isFinite(nextValue)) {
      return { error: "invalid" };
    }
    const formatted = formatResult(nextValue);
    const nextExpression = hasNumber
      ? replaceLastNumber(expr, formatted)
      : formatted;
    return { expression: nextExpression, value: nextValue };
  };

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  window.CalculatorEngine = {
    operators,
    isOperator,
    formatResult,
    tokenize,
    evaluateExpression,
    getPreviewExpression,
    getLastNumber,
    getTrailingBinaryOperator,
    replaceLastNumber,
    insertValue,
    applyUnaryToExpression,
    toRadians,
  };
})();
