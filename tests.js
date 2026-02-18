const {
  evaluateExpression,
  formatResult,
  insertValue,
  applyUnaryToExpression,
} = window.CalculatorEngine;

const testResultsEl = document.getElementById("testResults");
const testSummaryEl = document.getElementById("testSummary");

const runTest = (name, testFn) => {
  try {
    const result = testFn();
    return { name, passed: result === true, message: result === true ? "" : result };
  } catch (error) {
    return { name, passed: false, message: error.message };
  }
};

const tests = [
  () =>
    runTest("Operator precedence", () => {
      const evaluation = evaluateExpression("5+3*2");
      return evaluation.valid && evaluation.value === 11;
    }),
  () =>
    runTest("Negative number support", () => {
      const evaluation = evaluateExpression("-5+2");
      return evaluation.valid && evaluation.value === -3;
    }),
  () =>
    runTest("Divide by zero error", () => {
      const evaluation = evaluateExpression("9/0");
      return evaluation.valid && evaluation.error === "divide-by-zero";
    }),
  () =>
    runTest("Format keeps tens", () => {
      return formatResult(10) === "10";
    }),
  () =>
    runTest("Format trims trailing zeros", () => {
      return formatResult(4.5) === "4.5" && formatResult(4.25) === "4.25";
    }),
  () =>
    runTest("Insert pi uses multiplication", () => {
      const inserted = insertValue("2", Math.PI);
      return inserted.startsWith("2*");
    }),
  () =>
    runTest("Unary square transform", () => {
      const result = applyUnaryToExpression("4", (value) => value * value);
      return result.expression === "16";
    }),
];

const results = tests.map((test) => test());
const passedCount = results.filter((result) => result.passed).length;

if (testSummaryEl) {
  testSummaryEl.textContent = `${passedCount}/${results.length} tests passed`;
}

if (testResultsEl) {
  testResultsEl.innerHTML = "";
  results.forEach((result) => {
    const item = document.createElement("div");
    item.className = "history__item";
    item.innerHTML = `
      <span class="history__expression">${result.name}</span>
      <span class="history__result">${
        result.passed ? "Passed" : `Failed: ${result.message || "Assertion"}`
      }</span>
    `;
    testResultsEl.appendChild(item);
  });
}
