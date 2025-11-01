// --- Global Data Storage (Mock) ---
let expenses = [];
let weeklyBudget = 0; 
let activePeriod = 'Current Week';
let totalSpent = 0;
let totalBudget = 0;
let balance = 0;
let categoryChartInstance = null; // Variable to hold the Chart.js instance

// --- DOM Element References ---
// Layout & Theme
const appBody = document.getElementById('app-body'); 
const themeSelect = document.getElementById('theme-select');
const navButtons = document.querySelectorAll('.nav-btn');
const appSections = document.querySelectorAll('.app-section');
const currentDateTimeDisplay = document.getElementById('current-datetime');

// Budget & Entry
const budgetForm = document.getElementById('budget-form');
const weeklyBudgetInput = document.getElementById('weekly-budget');
const currentBudgetDisplay = document.getElementById('current-budget-display');
const budgetAlert = document.getElementById('budget-alert');
const expenseForm = document.getElementById('expense-form');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseCategoryInput = document.getElementById('expense-category');
const expenseDateInput = document.getElementById('expense-date');

// Breakdown
const breakdownPeriodSelect = document.getElementById('breakdown-period');
const periodSelector = document.getElementById('period-selector');
const viewBreakdownBtn = document.getElementById('view-breakdown-btn');
const breakdownResults = document.getElementById('breakdown-results');

// Footer
const footerPeriodDisplay = document.getElementById('footer-period-display');
const footerSpentDisplay = document.getElementById('footer-spent-display');
const footerBudgetDisplay = document.getElementById('footer-budget-display');
const footerBalanceDisplay = document.getElementById('footer-balance-display');
const footerComment = document.getElementById('footer-comment');

// Chart
const chartCanvas = document.getElementById('categoryChart');

// --- Initialization: Load Data, Set Date, Update UI ---
function loadData() {
    weeklyBudget = parseFloat(localStorage.getItem('weeklyBudget')) || 0;
    // Dummy data uses a future date (2025-10-xx) to ensure it appears in the current period based on system context
    expenses = JSON.parse(localStorage.getItem('expenses')) || [
        { id: 1678888800000, amount: 50.00, category: 'Food', date: '2025-10-29' },
        { id: 1678888800001, amount: 35.00, category: 'Transport', date: '2025-10-30' },
        { id: 1678888800002, amount: 150.00, category: 'Bills', date: '2025-10-31' },
    ];
    
    setDateTimeDisplay();
    setAutoExpenseDate();
    
    updateBudgetDisplay();
    updatePeriodSelector();
    updateFooterSummary(); 
    checkBudgetAlert(new Date());
}

function saveData() {
    localStorage.setItem('weeklyBudget', weeklyBudget);
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// --- Dynamic Date & Time ---
function setDateTimeDisplay() {
    const now = new Date();
    const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
    
    currentDateTimeDisplay.textContent = `${formattedDate} | ${formattedTime}`;
    
    setTimeout(setDateTimeDisplay, 1000);
}

function setAutoExpenseDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${yyyy}-${mm}-${dd}`;
    
    expenseDateInput.max = todayFormatted;
    expenseDateInput.value = todayFormatted;
}

// --- 1. Theme Initialization & Switching Logic ---
function applySavedTheme() {
    const savedMode = localStorage.getItem('darkMode') || 'disabled';
    if (savedMode === 'enabled') {
        appBody.classList.add('dark-mode');
    } else {
        appBody.classList.remove('dark-mode');
    }

    const savedColorScheme = localStorage.getItem('selectedTheme') || 'default';
    appBody.classList.remove('default', 'hunter-red', 'sky-blue');
    appBody.classList.add(savedColorScheme);
    themeSelect.value = savedColorScheme;
    
    if (document.getElementById('reports-charts-section').classList.contains('hidden') === false) {
        const currentBreakdown = generateBreakdown(true);
        renderChart(currentBreakdown);
    }
}

themeSelect.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    appBody.classList.remove('default', 'hunter-red', 'sky-blue');
    appBody.classList.add(newTheme);
    localStorage.setItem('selectedTheme', newTheme);
    
    if (document.getElementById('reports-charts-section').classList.contains('hidden') === false) {
        const currentBreakdown = generateBreakdown(true);
        renderChart(currentBreakdown);
    }
});

// --- 2. Navigation Logic (Includes Chart Call) ---
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetSectionId = button.getAttribute('data-section');
        
        appSections.forEach(section => section.classList.add('hidden'));
        document.getElementById(targetSectionId).classList.remove('hidden');

        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        document.querySelector('.app-header h1').textContent = button.textContent;

        // CHART CALL: If navigating to Chart, ensure it's rendered 
        if (targetSectionId === 'reports-charts-section') {
            const currentBreakdown = generateBreakdown(true); 
            renderChart(currentBreakdown);
        }
    });
});


// --- Helper Functions for Date/Week/Month ---
function getWeekNumber(d) {
    // Standard logic to calculate week number
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function getMonthName(monthIndex) {
    const d = new Date(2000, monthIndex); 
    return d.toLocaleString('en-US', { month: 'long' });
}

// --- 3. Budget, Alert, and Footer Logic ---
function updateFooterSummary() {
    const now = new Date();
    const currentWeekNo = getWeekNumber(now);
    const currentYear = now.getFullYear();

    const weeklyExpenses = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return getWeekNumber(expDate) === currentWeekNo && expDate.getFullYear() === currentYear;
        });

    totalSpent = weeklyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    totalBudget = weeklyBudget;
    balance = totalBudget - totalSpent;
    activePeriod = `Week ${currentWeekNo}, ${currentYear}`;
    
    footerPeriodDisplay.textContent = activePeriod;
    footerSpentDisplay.textContent = `$${totalSpent.toFixed(2)}`;
    footerBudgetDisplay.textContent = `$${totalBudget.toFixed(2)}`;
    footerBalanceDisplay.textContent = `$${balance.toFixed(2)}`;

    footerBalanceDisplay.classList.remove('positive', 'negative');
    if (balance >= 0) {
        footerBalanceDisplay.classList.add('positive');
    } else {
        footerBalanceDisplay.classList.add('negative');
    }
    
    if (totalBudget <= 0) {
        footerComment.textContent = "Set a budget to start tracking your success!";
        footerComment.style.color = 'var(--alert-warning)';
    } else if (balance >= 0) {
        footerComment.textContent = `Excellent! You are on track this week.`;
        footerComment.style.color = 'var(--alert-success)';
    } else {
        footerComment.textContent = `Warning: You have overspent by $${Math.abs(balance).toFixed(2)}.`;
        footerComment.style.color = 'var(--alert-warning)';
    }
}

function updateBudgetDisplay() {
    currentBudgetDisplay.textContent = `Current Weekly Budget: $${weeklyBudget.toFixed(2)}`;
}

budgetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    weeklyBudget = parseFloat(weeklyBudgetInput.value);
    saveData();
    updateBudgetDisplay();
    updateFooterSummary();
    checkBudgetAlert(new Date());
    alert('Weekly budget has been set!');
});

function checkBudgetAlert(date) {
    if (weeklyBudget <= 0) {
        budgetAlert.style.display = 'none';
        return;
    }
    const alertComment = footerComment.textContent; 
    budgetAlert.style.display = 'block';
    
    if (alertComment.includes("overspent") || alertComment.includes("Warning")) {
        budgetAlert.className = 'alert-message warning';
        budgetAlert.textContent = '⚠️ ' + alertComment.replace('Warning: ', '');
    } else {
        budgetAlert.className = 'alert-message success';
        budgetAlert.textContent = '✅ ' + alertComment.replace('Excellent! ', '');
    }
}

// --- 4. Expense Logging Logic ---
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newExpense = {
        // Assign a unique ID to the expense (crucial for editing/deleting later)
        id: Date.now(), 
        amount: parseFloat(expenseAmountInput.value),
        category: expenseCategoryInput.value,
        date: expenseDateInput.value
    };

    expenses.push(newExpense);
    saveData();
    expenseForm.reset();
    
    setAutoExpenseDate();
    
    updateFooterSummary();
    checkBudgetAlert(new Date(newExpense.date)); 
    updatePeriodSelector(); 
    alert('Expense added successfully!');
});

// --- 5. Breakdown Logic (History & Chart Data Source) ---
function updatePeriodSelector() {
    periodSelector.innerHTML = ''; 
    const uniquePeriods = new Set();
    const isWeekly = breakdownPeriodSelect.value === 'weekly';

    expenses.forEach(exp => {
        const d = new Date(exp.date);
        const year = d.getFullYear();
        if (isWeekly) {
            const weekNo = getWeekNumber(d);
            uniquePeriods.add(`W${weekNo}-${year}`);
        } else { 
            const monthIndex = d.getMonth();
            const monthName = getMonthName(monthIndex);
            uniquePeriods.add(`${monthName}-${year}`);
        }
    });

    Array.from(uniquePeriods)
        .sort((a, b) => {
            const [typeA, yearA] = a.split('-');
            const [typeB, yearB] = b.split('-');
            if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA); 
            if (isWeekly) return parseInt(typeB.substring(1)) - parseInt(typeA.substring(1));
            return a.localeCompare(b);
        })
        .forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = isWeekly ? `Week ${period.substring(1)}` : period;
            periodSelector.appendChild(option);
        });
}

breakdownPeriodSelect.addEventListener('change', updatePeriodSelector);
viewBreakdownBtn.addEventListener('click', () => {
    const breakdownData = generateBreakdown();
    // CHART CALL: Also update chart when 'View Breakdown' is clicked 
    renderChart(breakdownData); 
});


function generateBreakdown(returnDataOnly = false) {
    const periodType = breakdownPeriodSelect.value;
    const selectedPeriod = periodSelector.value;
    
    if (!selectedPeriod) {
        if (!returnDataOnly) {
            breakdownResults.innerHTML = '<p>No expenses found for any period. Log an expense first.</p>';
        }
        return { total: 0, categoryBreakdown: {} };
    }

    let filteredExpenses;
    const [periodValue, year] = selectedPeriod.split('-');

    if (periodType === 'weekly') {
        const weekNo = parseInt(periodValue.substring(1)); 
        filteredExpenses = expenses.filter(exp => {
            const d = new Date(exp.date);
            return getWeekNumber(d) === weekNo && d.getFullYear() === parseInt(year);
        });
    } else { 
        const monthName = periodValue; 
        const monthIndex = new Date(Date.parse(monthName + " 1, " + year)).getMonth();
        
        filteredExpenses = expenses.filter(exp => {
            const d = new Date(exp.date);
            return d.getMonth() === monthIndex && d.getFullYear() === parseInt(year);
        });
    }

    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {});
    
    if (returnDataOnly) {
        return { total: total, categoryBreakdown: categoryBreakdown };
    }

    // Generate HTML for History Display
    let html = `<h4>Report for ${periodType === 'weekly' ? 'Week ' + periodValue.substring(1) : selectedPeriod}</h4>`;
    html += `<p><strong>Total Spending: $${total.toFixed(2)}</strong></p>`;
    
    // Category Table
    html += '<h5>Details by Category:</h5>';
    html += '<table><thead><tr><th>Category</th><th>Amount Spent ($)</th><th>Percentage (%)</th></tr></thead><tbody>';

    for (const category in categoryBreakdown) {
        const amount = categoryBreakdown[category];
        const percentage = total > 0 ? (amount / total * 100).toFixed(1) : 0;
        html += `<tr><td>${category}</td><td>$${amount.toFixed(2)}</td><td>${percentage}%</td></tr>`;
    }
    html += '</tbody></table>';

    // Individual Transactions
    html += '<h5>Individual Transactions:</h5>';
    html += '<ul>'
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
        // Placeholder list for now; we would add Edit/Delete buttons here next.
        html += `<li>[${exp.category}] ${exp.date}: <strong>$${exp.amount.toFixed(2)}</strong></li>`
    });
    html += '</ul>'

    breakdownResults.innerHTML = html;
    
    return { total: total, categoryBreakdown: categoryBreakdown };
}


// --- 6. Chart Rendering Logic (The Professional Chart) ---
function renderChart(breakdownData) {
    const { total, categoryBreakdown } = breakdownData;

    // 1. Destroy old chart if it exists
    if (categoryChartInstance) {
        categoryChartInstance.destroy(); 
    }
    
    // 2. Handle zero data
    if (total === 0) {
        chartCanvas.style.display = 'none';
        return;
    }
    chartCanvas.style.display = 'block';

    const labels = Object.keys(categoryBreakdown);
    const data = labels.map(label => categoryBreakdown[label]);
    
    // 3. Define professional, multi-color palette (Material Design derived)
    const categoryColors = [
        '#FF6384', // Red
        '#36A2EB', // Blue
        '#FFCE56', // Yellow
        '#4BC0C0', // Cyan
        '#9966FF', // Purple
        '#FF9F40'  // Orange
    ];
    
    // 4. Get the current text color from CSS variables for chart text visibility
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-color');

    // 5. Create the Chart.js instance (Doughnut Chart)
    categoryChartInstance = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: categoryColors.slice(0, labels.length), // Apply the multiple colors
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right', // Professional placement
                    labels: {
                        color: textColor, // Use theme color for text
                        font: {
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Spending by Category',
                    color: textColor, // Use theme color for text
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    // Custom tooltip to show amount and percentage
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                label += `$${value.toFixed(2)} (${percentage}%)`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
   // --- Initial Page Load FIX ---
// 1. Get ALL sections in the application (Dashboard, Add Transaction, History, etc.)
document.querySelectorAll('.app-section').forEach(section => {
    // 2. FORCE every section to be hidden on startup
    section.classList.add('hidden'); 
});

// 3. Explicitly show the Dashboard (by removing the hidden class)
document.getElementById('dashboard-section').classList.remove('hidden'); 

// 4. Force the Dashboard button to be highlighted (for visual correctness)
document.querySelector('.nav-btn[data-section="dashboard-section"]').classList.add('active');

