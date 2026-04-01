/**
 * app.js — Kharcha expense tracker logic
 */

// ── State ─────────────────────────────────────────────────────────────────────
let selectedDate  = todayStr();
let selectedMonth = monthStr(new Date());
let catMonth      = monthStr(new Date());

// ── Utilities ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDay(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00');
  const t   = todayStr();
  const yes = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === t)   return 'Today';
  if (dateStr === yes) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
}

function fmtMonthFull(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function shiftMonth(mStr, delta) {
  const [y, m] = mStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthStr(d);
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

function expenseItemHTML(e) {
  const cat = DB.getCat(e.category);
  return `
    <li class="expense-item">
      <div class="expense-icon" style="background:${cat.bg};">${cat.icon}</div>
      <div class="expense-info">
        <span class="expense-desc">${e.description || cat.label}</span>
        <span class="expense-cat">${cat.label}</span>
      </div>
      <span class="expense-amount">${fmt(e.amount)}</span>
      <button class="expense-delete" data-id="${e.id}" title="Delete">✕</button>
    </li>`;
}

// ── DAILY TAB ─────────────────────────────────────────────────────────────────

function renderDaily() {
  const list  = DB.forDay(selectedDate);
  const total = DB.sumAmount(list);

  $('selectedDateLabel').textContent = fmtDay(selectedDate);
  $('selectedDateFull').textContent  = fmtDate(selectedDate);
  $('dayTotal').textContent          = fmt(total);

  const el    = $('dailyList');
  const empty = $('emptyDaily');

  if (list.length) {
    el.innerHTML = list.map(expenseItemHTML).join('');
    empty.classList.add('hidden');
  } else {
    el.innerHTML = '';
    empty.classList.remove('hidden');
  }
}

$('prevDay').addEventListener('click', () => {
  selectedDate = shiftDate(selectedDate, -1);
  renderDaily();
});

$('nextDay').addEventListener('click', () => {
  selectedDate = shiftDate(selectedDate, +1);
  renderDaily();
});

// ── MONTHLY TAB ───────────────────────────────────────────────────────────────

function renderMonthly() {
  $('monthLabel').textContent = fmtMonthFull(selectedMonth);

  const list  = DB.forMonth(selectedMonth);
  const total = DB.sumAmount(list);
  const byDay = DB.groupByDay(list);
  const days  = Object.keys(byDay).sort().reverse();

  // Summary strip
  $('monthlySummaryStrip').innerHTML = `
    <div class="summary-card summary-card--accent">
      <p class="summary-card__label">Total spent</p>
      <p class="summary-card__value">${fmt(total)}</p>
    </div>
    <div class="summary-card">
      <p class="summary-card__label">Transactions</p>
      <p class="summary-card__value">${list.length}</p>
    </div>
    <div class="summary-card">
      <p class="summary-card__label">Daily avg</p>
      <p class="summary-card__value">${days.length ? fmt(total / days.length) : '₹0'}</p>
    </div>
    <div class="summary-card">
      <p class="summary-card__label">Active days</p>
      <p class="summary-card__value">${days.length}</p>
    </div>`;

  // Day-by-day
  const ul    = $('dayBreakdownList');
  const empty = $('emptyMonthly');

  if (!days.length) {
    ul.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  ul.innerHTML = days.map(d => {
    const items   = byDay[d];
    const dayAmt  = DB.sumAmount(items);
    const dayNum  = new Date(d + 'T00:00:00').getDate();
    const dayName = new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    return `
      <li class="day-row" data-date="${d}">
        <div class="day-row__left">
          <span class="day-row__num">${dayNum}</span>
          <div class="day-row__info">
            <p class="day-row__name">${dayName}, ${fmtDate(d).split(',')[0]}</p>
            <p class="day-row__count">${items.length} expense${items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <span class="day-row__amount">${fmt(dayAmt)}</span>
      </li>`;
  }).join('');

  // Click day row → jump to daily view for that date
  ul.querySelectorAll('.day-row').forEach(row => {
    row.addEventListener('click', () => {
      selectedDate = row.dataset.date;
      switchTab('daily');
      renderDaily();
    });
  });
}

$('prevMonth').addEventListener('click', () => {
  selectedMonth = shiftMonth(selectedMonth, -1);
  renderMonthly();
});

$('nextMonth').addEventListener('click', () => {
  selectedMonth = shiftMonth(selectedMonth, +1);
  renderMonthly();
});

// ── CATEGORY TAB ──────────────────────────────────────────────────────────────

function renderCategory() {
  $('catMonthLabel').textContent = fmtMonthFull(catMonth);

  const list    = DB.forMonth(catMonth);
  const total   = DB.sumAmount(list);
  const byCat   = DB.groupByCategory(list);
  const catIds  = Object.keys(byCat).sort((a, b) => DB.sumAmount(byCat[b]) - DB.sumAmount(byCat[a]));

  const grid  = $('categoryGrid');
  const empty = $('emptyCat');

  if (!catIds.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    $('catDetailHeading').style.display = 'none';
    $('catDetailList').innerHTML = '';
    return;
  }

  empty.classList.add('hidden');

  grid.innerHTML = catIds.map(id => {
    const cat  = DB.getCat(id);
    const amt  = DB.sumAmount(byCat[id]);
    const pct  = total ? Math.round((amt / total) * 100) : 0;
    const cnt  = byCat[id].length;
    return `
      <div class="cat-card" data-cat="${id}">
        <div class="cat-card__top">
          <div class="cat-card__left">
            <div class="cat-card__icon" style="background:${cat.bg};">${cat.icon}</div>
            <div>
              <p class="cat-card__name">${cat.label}</p>
              <p class="cat-card__count">${cnt} item${cnt > 1 ? 's' : ''} · ${pct}%</p>
            </div>
          </div>
          <span class="cat-card__amount">${fmt(amt)}</span>
        </div>
        <div class="cat-bar"><div class="cat-bar__fill" style="width:${pct}%;background:${cat.accent};"></div></div>
      </div>`;
  }).join('');

  // Click category → show detail
  grid.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const id   = card.dataset.cat;
      const cat  = DB.getCat(id);
      const items = (byCat[id] || []).sort((a, b) => b.date.localeCompare(a.date));

      $('catDetailHeading').textContent    = `${cat.icon} ${cat.label} — details`;
      $('catDetailHeading').style.display  = 'block';
      $('catDetailList').innerHTML         = items.map(expenseItemHTML).join('');

      $('catDetailHeading').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

$('prevCatMonth').addEventListener('click', () => {
  catMonth = shiftMonth(catMonth, -1);
  renderCategory();
  $('catDetailHeading').style.display = 'none';
  $('catDetailList').innerHTML = '';
});

$('nextCatMonth').addEventListener('click', () => {
  catMonth = shiftMonth(catMonth, +1);
  renderCategory();
  $('catDetailHeading').style.display = 'none';
  $('catDetailList').innerHTML = '';
});

// ── TABS ─────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('tab--active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + tab));
  if (tab === 'daily')    renderDaily();
  if (tab === 'monthly')  renderMonthly();
  if (tab === 'category') renderCategory();
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── MODAL ─────────────────────────────────────────────────────────────────────

const modal = $('modal');

$('openModal').addEventListener('click', () => {
  $('txnDate').value = selectedDate;
  modal.classList.remove('hidden');
  setTimeout(() => $('amount').focus(), 300);
});

modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

$('submitTxn').addEventListener('click', () => {
  const date   = $('txnDate').value;
  const cat    = $('category').value;
  const desc   = $('description').value.trim();
  const amount = parseFloat($('amount').value);

  if (!date)           { alert('Please select a date.');         return; }
  if (!cat)            { alert('Please select a category.');     return; }
  if (!amount || amount < 1) { alert('Please enter a valid amount.'); return; }

  DB.add({ date, category: cat, description: desc, amount });

  // reset
  $('category').value    = '';
  $('description').value = '';
  $('amount').value      = '';
  modal.classList.add('hidden');

  // update month total in header
  refreshHeader();
  // re-render active tab
  const activeTab = document.querySelector('.tab--active').dataset.tab;
  switchTab(activeTab);
});

// ── DELETE (event delegation) ─────────────────────────────────────────────────

document.addEventListener('click', e => {
  const btn = e.target.closest('.expense-delete');
  if (!btn) return;
  if (confirm('Remove this expense?')) {
    DB.remove(btn.dataset.id);
    refreshHeader();
    const activeTab = document.querySelector('.tab--active').dataset.tab;
    switchTab(activeTab);
  }
});

// ── HEADER TOTAL (current month) ─────────────────────────────────────────────

function refreshHeader() {
  const list  = DB.forMonth(monthStr(new Date()));
  $('monthTotal').textContent = fmt(DB.sumAmount(list));
}

// ── INIT ──────────────────────────────────────────────────────────────────────

$('txnDate').value = todayStr();
refreshHeader();
renderDaily();
