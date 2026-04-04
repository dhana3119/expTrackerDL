/**
 * app.js — Kharcha expense tracker
 * Fixes: local-date bug, nav arrows, edit + delete per entry
 */

// ── State ─────────────────────────────────────────────────────────────────────
let selectedDate  = localDateStr(new Date());
let selectedMonth = localMonthStr(new Date());
let catMonth      = localMonthStr(new Date());

// ── Date helpers (LOCAL time, not UTC) ────────────────────────────────────────

function localDateStr(d) {
  // Returns 'YYYY-MM-DD' in the device's local timezone
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function localMonthStr(d) {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${mo}`;
}

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return localDateStr(dt);
}

function shiftMonth(mStr, delta) {
  const [y, m] = mStr.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return localMonthStr(dt);
}

function fmtDay(dateStr) {
  const today     = localDateStr(new Date());
  const yesterday = localDateStr(new Date(new Date().setDate(new Date().getDate() - 1)));
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'long' });
}

function fmtDateFull(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function fmtMonthFull(mStr) {
  const [y, m] = mStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function fmt(n) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN');
}

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Expense item HTML (with edit + delete buttons) ────────────────────────────

function expenseItemHTML(e) {
  const cat = DB.getCat(e.category);
  return `
    <li class="expense-item">
      <div class="expense-icon" style="background:${cat.bg};">${cat.icon}</div>
      <div class="expense-info">
        <span class="expense-desc">${escHtml(e.description || cat.label)}</span>
        <span class="expense-cat">${cat.label}</span>
      </div>
      <span class="expense-amount">${fmt(e.amount)}</span>
      <div class="expense-actions">
        <button class="action-btn action-btn--edit"  data-id="${e.id}" title="Edit" aria-label="Edit">&#9998;</button>
        <button class="action-btn action-btn--delete" data-id="${e.id}" title="Delete" aria-label="Delete">&#128465;</button>
      </div>
    </li>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Render header ─────────────────────────────────────────────────────────────

function refreshHeader() {
  const list = DB.forMonth(localMonthStr(new Date()));
  $('monthTotal').textContent = fmt(DB.sumAmount(list));
}

// ── DAILY TAB ─────────────────────────────────────────────────────────────────

function renderDaily() {
  const list  = DB.forDay(selectedDate);
  const total = DB.sumAmount(list);

  $('selectedDateLabel').textContent = fmtDay(selectedDate);
  $('selectedDateFull').textContent  = fmtDateFull(selectedDate);
  $('dayTotal').textContent          = fmt(total);

  const ul    = $('dailyList');
  const empty = $('emptyDaily');

  if (list.length) {
    ul.innerHTML = list.map(expenseItemHTML).join('');
    empty.classList.add('hidden');
  } else {
    ul.innerHTML = '';
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
      <p class="summary-card__value">${days.length ? fmt(total / days.length) : fmt(0)}</p>
    </div>
    <div class="summary-card">
      <p class="summary-card__label">Active days</p>
      <p class="summary-card__value">${days.length}</p>
    </div>`;

  const ul    = $('dayBreakdownList');
  const empty = $('emptyMonthly');

  if (!days.length) {
    ul.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  ul.innerHTML = days.map(d => {
    const items  = byDay[d];
    const dayAmt = DB.sumAmount(items);
    const [dy, dm, dd] = d.split('-').map(Number);
    const dt = new Date(dy, dm - 1, dd);
    const dayNum  = dt.getDate();
    const dayName = dt.toLocaleDateString('en-IN', { weekday: 'short' });
    const monName = dt.toLocaleDateString('en-IN', { month: 'short' });
    return `
      <li class="day-row" data-date="${d}">
        <div class="day-row__left">
          <span class="day-row__num">${dayNum}</span>
          <div class="day-row__info">
            <p class="day-row__name">${dayName}, ${monName} ${dayNum}</p>
            <p class="day-row__count">${items.length} expense${items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <span class="day-row__amount">${fmt(dayAmt)}</span>
      </li>`;
  }).join('');

  ul.querySelectorAll('.day-row').forEach(row => {
    row.addEventListener('click', () => {
      selectedDate = row.dataset.date;
      switchTab('daily');
    });
  });
}

$('prevMonth').addEventListener('click', () => { selectedMonth = shiftMonth(selectedMonth, -1); renderMonthly(); });
$('nextMonth').addEventListener('click', () => { selectedMonth = shiftMonth(selectedMonth, +1); renderMonthly(); });

// ── CATEGORY TAB ──────────────────────────────────────────────────────────────

function renderCategory() {
  $('catMonthLabel').textContent = fmtMonthFull(catMonth);

  const list   = DB.forMonth(catMonth);
  const total  = DB.sumAmount(list);
  const byCat  = DB.groupByCategory(list);
  const catIds = Object.keys(byCat).sort((a, b) => DB.sumAmount(byCat[b]) - DB.sumAmount(byCat[a]));

  const grid  = $('categoryGrid');
  const empty = $('emptyCat');

  $('catDetailHeading').classList.add('hidden');
  $('catDetailList').innerHTML = '';

  if (!catIds.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  grid.innerHTML = catIds.map(id => {
    const cat = DB.getCat(id);
    const amt = DB.sumAmount(byCat[id]);
    const pct = total ? Math.round((amt / total) * 100) : 0;
    const cnt = byCat[id].length;
    return `
      <div class="cat-card" data-cat="${id}">
        <div class="cat-card__top">
          <div class="cat-card__left">
            <div class="cat-card__icon" style="background:${cat.bg};">${cat.icon}</div>
            <div>
              <p class="cat-card__name">${cat.label}</p>
              <p class="cat-card__count">${cnt} item${cnt > 1 ? 's' : ''} &middot; ${pct}%</p>
            </div>
          </div>
          <span class="cat-card__amount">${fmt(amt)}</span>
        </div>
        <div class="cat-bar"><div class="cat-bar__fill" style="width:${pct}%;background:${cat.accent};"></div></div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const id    = card.dataset.cat;
      const cat   = DB.getCat(id);
      const items = (byCat[id] || []).sort((a, b) => b.date.localeCompare(a.date));
      const heading = $('catDetailHeading');
      heading.textContent = `${cat.icon} ${cat.label}`;
      heading.classList.remove('hidden');
      $('catDetailList').innerHTML = items.map(expenseItemHTML).join('');
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

$('prevCatMonth').addEventListener('click', () => { catMonth = shiftMonth(catMonth, -1); renderCategory(); });
$('nextCatMonth').addEventListener('click', () => { catMonth = shiftMonth(catMonth, +1); renderCategory(); });

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

// ── ADD MODAL ─────────────────────────────────────────────────────────────────

const modal = $('modal');

$('openModal').addEventListener('click', () => {
  $('txnDate').value    = selectedDate;
  $('category').value   = '';
  $('description').value = '';
  $('amount').value     = '';
  modal.classList.remove('hidden');
});

modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

$('submitTxn').addEventListener('click', () => {
  const date   = $('txnDate').value;
  const cat    = $('category').value;
  const desc   = $('description').value.trim();
  const amount = parseFloat($('amount').value);

  if (!date)             { alert('Please select a date.');         return; }
  if (!cat)              { alert('Please select a category.');     return; }
  if (!amount || amount < 1) { alert('Please enter a valid amount.'); return; }

  DB.add({ date, category: cat, description: desc, amount });
  modal.classList.add('hidden');
  refreshHeader();
  refreshActiveTab();
});

// ── EDIT MODAL ────────────────────────────────────────────────────────────────

const editModal = $('editModal');

function openEditModal(id) {
  const entry = DB.getById(id);
  if (!entry) return;
  $('editId').value            = entry.id;
  $('editDate').value          = entry.date;
  $('editCategory').value      = entry.category;
  $('editDescription').value   = entry.description || '';
  $('editAmount').value        = entry.amount;
  editModal.classList.remove('hidden');
}

editModal.addEventListener('click', e => { if (e.target === editModal) editModal.classList.add('hidden'); });

$('saveEdit').addEventListener('click', () => {
  const id     = $('editId').value;
  const date   = $('editDate').value;
  const cat    = $('editCategory').value;
  const desc   = $('editDescription').value.trim();
  const amount = parseFloat($('editAmount').value);

  if (!date)             { alert('Please select a date.');         return; }
  if (!cat)              { alert('Please select a category.');     return; }
  if (!amount || amount < 1) { alert('Please enter a valid amount.'); return; }

  DB.update(id, { date, category: cat, description: desc, amount });
  editModal.classList.add('hidden');
  refreshHeader();
  refreshActiveTab();
});

$('deleteFromEdit').addEventListener('click', () => {
  const id = $('editId').value;
  if (confirm('Delete this expense?')) {
    DB.remove(id);
    editModal.classList.add('hidden');
    refreshHeader();
    refreshActiveTab();
  }
});

// ── EVENT DELEGATION for edit/delete buttons ──────────────────────────────────

document.addEventListener('click', e => {
  // Edit button
  const editBtn = e.target.closest('.action-btn--edit');
  if (editBtn) {
    openEditModal(editBtn.dataset.id);
    return;
  }
  // Delete button (inline)
  const delBtn = e.target.closest('.action-btn--delete');
  if (delBtn) {
    if (confirm('Delete this expense?')) {
      DB.remove(delBtn.dataset.id);
      refreshHeader();
      refreshActiveTab();
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function refreshActiveTab() {
  const tab = document.querySelector('.tab--active').dataset.tab;
  switchTab(tab);
}

// ── INIT ──────────────────────────────────────────────────────────────────────

refreshHeader();
renderDaily();
