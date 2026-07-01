const STORAGE_KEY = "simple-budget-tracker-v1";

const CATEGORY_COLORS = {
  "食費": "#3d7a6b",
  "日用品": "#7aa88f",
  "交通": "#c9a24b",
  "娯楽": "#c0483c",
  "交際費": "#8a6bbf",
  "医療": "#4a90b8",
  "衣服": "#d98a5f",
  "その他": "#9a9a9a",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yen(n) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultData() {
  return {
    settings: {
      income: 0,
      savingsGoal: 0,
      fixedExpenses: [],
    },
    expenses: [],
    assetSnapshots: [],
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return {
      settings: {
        income: parsed.settings?.income ?? 0,
        savingsGoal: parsed.settings?.savingsGoal ?? 0,
        fixedExpenses: parsed.settings?.fixedExpenses ?? [],
      },
      expenses: parsed.expenses ?? [],
      assetSnapshots: parsed.assetSnapshots ?? [],
    };
  } catch (e) {
    console.error("Failed to load data, starting fresh.", e);
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadData();

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ---------- Settings ----------
const incomeInput = document.getElementById("incomeInput");
const savingsInput = document.getElementById("savingsInput");
const fixedExpenseList = document.getElementById("fixedExpenseList");
const fixedExpenseForm = document.getElementById("fixedExpenseForm");
const fixedTotalEl = document.getElementById("fixedTotal");
const saveMsg = document.getElementById("saveMsg");

function fixedExpenseTotal() {
  return state.settings.fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
}

function renderIncomeFields() {
  incomeInput.value = state.settings.income || "";
  savingsInput.value = state.settings.savingsGoal || "";
}

function renderFixedExpenseList() {
  fixedExpenseList.innerHTML = "";
  state.settings.fixedExpenses.forEach((f) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(f.name)} — ${yen(f.amount)}</span>`;
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      state.settings.fixedExpenses = state.settings.fixedExpenses.filter((x) => x.id !== f.id);
      saveData();
      renderFixedExpenseList();
      renderDashboard();
    });
    li.appendChild(delBtn);
    fixedExpenseList.appendChild(li);
  });

  fixedTotalEl.textContent = yen(fixedExpenseTotal());
}

fixedExpenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("fixedName").value.trim();
  const amount = Number(document.getElementById("fixedAmount").value);
  if (!name || !(amount >= 0)) return;
  state.settings.fixedExpenses.push({ id: uid(), name, amount });
  saveData();
  fixedExpenseForm.reset();
  renderFixedExpenseList();
  renderDashboard();
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  state.settings.income = Number(incomeInput.value) || 0;
  state.settings.savingsGoal = Number(savingsInput.value) || 0;
  saveData();
  renderDashboard();
  saveMsg.textContent = "保存しました";
  setTimeout(() => (saveMsg.textContent = ""), 2000);
});

// ---------- Expenses ----------
const expenseForm = document.getElementById("expenseForm");
const expenseTableBody = document.getElementById("expenseTableBody");
const expenseEmpty = document.getElementById("expenseEmpty");

document.getElementById("expenseDate").value = todayStr();

function renderExpenses() {
  const sorted = [...state.expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
  expenseTableBody.innerHTML = "";
  sorted.forEach((exp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${exp.date}</td>
      <td>${escapeHtml(exp.category)}</td>
      <td>${yen(exp.amount)}</td>
      <td>${escapeHtml(exp.memo || "")}</td>
    `;
    const tdBtn = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      state.expenses = state.expenses.filter((x) => x.id !== exp.id);
      saveData();
      renderExpenses();
      renderDashboard();
    });
    tdBtn.appendChild(delBtn);
    tr.appendChild(tdBtn);
    expenseTableBody.appendChild(tr);
  });
  expenseEmpty.style.display = sorted.length ? "none" : "block";
}

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("expenseDate").value;
  const category = document.getElementById("expenseCategory").value;
  const amount = Number(document.getElementById("expenseAmount").value);
  const memo = document.getElementById("expenseMemo").value.trim();
  if (!date || !(amount >= 0)) return;
  state.expenses.push({ id: uid(), date, category, amount, memo });
  saveData();
  expenseForm.reset();
  document.getElementById("expenseDate").value = todayStr();
  renderExpenses();
  renderDashboard();
});

// ---------- Assets ----------
const assetForm = document.getElementById("assetForm");
const assetTableBody = document.getElementById("assetTableBody");
const assetTableEmpty = document.getElementById("assetTableEmpty");

document.getElementById("assetDate").value = todayStr();

function renderAssets() {
  const sorted = [...state.assetSnapshots].sort((a, b) => (a.date < b.date ? 1 : -1));
  assetTableBody.innerHTML = "";
  sorted.forEach((snap) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${snap.date}</td>
      <td>${yen(snap.bank)}</td>
      <td>${yen(snap.investment)}</td>
      <td>${yen(snap.bank + snap.investment)}</td>
    `;
    const tdBtn = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      state.assetSnapshots = state.assetSnapshots.filter((x) => x.id !== snap.id);
      saveData();
      renderAssets();
      renderDashboard();
    });
    tdBtn.appendChild(delBtn);
    tr.appendChild(tdBtn);
    assetTableBody.appendChild(tr);
  });
  assetTableEmpty.style.display = sorted.length ? "none" : "block";
}

assetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("assetDate").value;
  const bank = Number(document.getElementById("bankAmount").value);
  const investment = Number(document.getElementById("investmentAmount").value);
  if (!date || !(bank >= 0) || !(investment >= 0)) return;
  state.assetSnapshots.push({ id: uid(), date, bank, investment });
  saveData();
  assetForm.reset();
  document.getElementById("assetDate").value = todayStr();
  renderAssets();
  renderDashboard();
});

// ---------- Dashboard ----------
let categoryChart, trendChart, assetChart;

function currentMonthKey() {
  return todayStr().slice(0, 7); // YYYY-MM
}

function renderDashboard() {
  const fixedTotal = fixedExpenseTotal();
  const available = Math.max(
    0,
    state.settings.income - fixedTotal - state.settings.savingsGoal
  );

  const monthKey = currentMonthKey();
  const monthExpenses = state.expenses.filter((e) => e.date.slice(0, 7) === monthKey);
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = available - spent;

  document.getElementById("availableBudget").textContent = yen(available);
  document.getElementById("spentThisMonth").textContent = yen(spent);
  document.getElementById("remainingBudget").textContent = yen(remaining);

  const remainingCard = document.getElementById("remainingCard");
  remainingCard.classList.toggle("over", remaining < 0);

  const pct = available > 0 ? Math.min(100, (spent / available) * 100) : spent > 0 ? 100 : 0;
  const progressFill = document.getElementById("progressFill");
  progressFill.style.width = pct + "%";
  progressFill.classList.toggle("over", remaining < 0);
  document.getElementById("progressLabel").textContent =
    Math.round(pct) + "% 使用" + (remaining < 0 ? "（予算オーバー）" : "");

  renderCategoryChart(monthExpenses);
  renderTrendChart();
  renderAssetChart();
}

function renderCategoryChart(monthExpenses) {
  const canvas = document.getElementById("categoryChart");
  const emptyMsg = document.getElementById("categoryEmpty");
  if (!monthExpenses.length) {
    canvas.style.display = "none";
    emptyMsg.style.display = "block";
    if (categoryChart) categoryChart.destroy();
    return;
  }
  canvas.style.display = "block";
  emptyMsg.style.display = "none";

  const totals = {};
  monthExpenses.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });
  const labels = Object.keys(totals);
  const data = labels.map((l) => totals[l]);
  const colors = labels.map((l) => CATEGORY_COLORS[l] || "#9a9a9a");

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
    },
  });
}

function lastNMonths(n) {
  const months = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(m.toISOString().slice(0, 7));
  }
  return months;
}

function renderTrendChart() {
  const canvas = document.getElementById("trendChart");
  const emptyMsg = document.getElementById("trendEmpty");
  if (!state.expenses.length) {
    canvas.style.display = "none";
    emptyMsg.style.display = "block";
    if (trendChart) trendChart.destroy();
    return;
  }
  canvas.style.display = "block";
  emptyMsg.style.display = "none";

  const months = lastNMonths(6);
  const totals = months.map((m) =>
    state.expenses
      .filter((e) => e.date.slice(0, 7) === m)
      .reduce((sum, e) => sum + e.amount, 0)
  );

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: months,
      datasets: [{ label: "支出", data: totals, backgroundColor: "#3d7a6b" }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderAssetChart() {
  const canvas = document.getElementById("assetChart");
  const emptyMsg = document.getElementById("assetEmpty");
  if (!state.assetSnapshots.length) {
    canvas.style.display = "none";
    emptyMsg.style.display = "block";
    if (assetChart) assetChart.destroy();
    return;
  }
  canvas.style.display = "block";
  emptyMsg.style.display = "none";

  const sorted = [...state.assetSnapshots].sort((a, b) => (a.date > b.date ? 1 : -1));
  const labels = sorted.map((s) => s.date);
  const bankData = sorted.map((s) => s.bank);
  const investmentData = sorted.map((s) => s.investment);
  const totalData = sorted.map((s) => s.bank + s.investment);

  if (assetChart) assetChart.destroy();
  assetChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "合計", data: totalData, borderColor: "#3d7a6b", backgroundColor: "transparent", tension: 0.2 },
        { label: "銀行", data: bankData, borderColor: "#4a90b8", backgroundColor: "transparent", tension: 0.2 },
        { label: "投資", data: investmentData, borderColor: "#c9a24b", backgroundColor: "transparent", tension: 0.2 },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ---------- Export / Import / Reset ----------
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-data-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = {
        settings: {
          income: parsed.settings?.income ?? 0,
          savingsGoal: parsed.settings?.savingsGoal ?? 0,
          fixedExpenses: parsed.settings?.fixedExpenses ?? [],
        },
        expenses: parsed.expenses ?? [],
        assetSnapshots: parsed.assetSnapshots ?? [],
      };
      saveData();
      renderAll();
    } catch (err) {
      alert("ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("全てのデータを削除します。よろしいですか？この操作は取り消せません。")) return;
  state = defaultData();
  saveData();
  renderAll();
});

// ---------- Utils ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAll() {
  renderIncomeFields();
  renderFixedExpenseList();
  renderExpenses();
  renderAssets();
  renderDashboard();
}

renderAll();
