/**
 * db.js — LocalStorage data layer for Kharcha
 * Expenses only. No backend needed.
 */

const DB = (() => {

  const KEY = 'kharcha_expenses';

  const CATEGORIES = [
    { id: 'food',          label: 'Food & Dining',    icon: '🛒', bg: '#FBF0D9', accent: '#C8943A' },
    { id: 'transport',     label: 'Transport',         icon: '🚌', bg: '#DFF0E5', accent: '#7A9E87' },
    { id: 'health',        label: 'Health & Medical',  icon: '💊', bg: '#F2E0D5', accent: '#C4714A' },
    { id: 'entertainment', label: 'Entertainment',     icon: '🎬', bg: '#EAE0F0', accent: '#6B4E6E' },
    { id: 'shopping',      label: 'Shopping',          icon: '🛍️', bg: '#E8ECF2', accent: '#4A5568' },
    { id: 'utilities',     label: 'Utilities & Bills', icon: '💡', bg: '#FBF0D9', accent: '#A0522D' },
    { id: 'rent',          label: 'Rent & Housing',    icon: '🏠', bg: '#EAE0F0', accent: '#6B4E6E' },
    { id: 'education',     label: 'Education',         icon: '📚', bg: '#DFF0E5', accent: '#3B6D11' },
    { id: 'groceries',     label: 'Groceries',         icon: '🥦', bg: '#DFF0E5', accent: '#7A9E87' },
    { id: 'other',         label: 'Other',             icon: '📌', bg: '#EDE7DC', accent: '#6B5744' },
  ];

  function getCat(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  function getAll() { return load(); }

  function add({ date, category, description, amount }) {
    const items = load();
    const entry = {
      id: genId(),
      date,
      category,
      description: (description || '').trim(),
      amount: Math.round(parseFloat(amount)),
      createdAt: Date.now(),
    };
    items.unshift(entry);
    save(items);
    return entry;
  }

  function remove(id) {
    save(load().filter(e => e.id !== id));
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  function forDay(dateStr) {
    return load().filter(e => e.date === dateStr);
  }

  function forMonth(monthStr) {               // 'YYYY-MM'
    return load().filter(e => e.date.startsWith(monthStr));
  }

  function sumAmount(list) {
    return list.reduce((s, e) => s + e.amount, 0);
  }

  function groupByDay(list) {
    const map = {};
    list.forEach(e => {
      map[e.date] = map[e.date] || [];
      map[e.date].push(e);
    });
    return map;
  }

  function groupByCategory(list) {
    const map = {};
    list.forEach(e => {
      map[e.category] = map[e.category] || [];
      map[e.category].push(e);
    });
    return map;
  }

  return { CATEGORIES, getCat, getAll, add, remove, forDay, forMonth, sumAmount, groupByDay, groupByCategory };
})();
