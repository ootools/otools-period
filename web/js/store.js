/* 状态与持久化：全部数据只保存在本机 localStorage，不联网、不上传。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;
  var M = MC.model;
  var H = MC.host;

  var STORAGE_KEY = 'otools-period.v1';
  var listeners = [];
  var data = M.emptyData();
  var cache = null;
  var persistOk = true;

  var t0 = U.today();
  var d0 = U.parse(t0);
  var ui = {
    ready: false,
    view: 'today',
    calYear: d0.getFullYear(),
    calMonth: d0.getMonth() + 1,
    selected: t0,
    editorDate: null,
    onboarding: false,
    theme: 'light',
    host: false,
    lang: 'zh-CN',
    storageOk: true,
  };

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      persistOk = true;
    } catch (e) {
      persistOk = false;
      ui.storageOk = false;
    }
  }

  function touch() {
    cache = null;
    persist();
    notify();
  }

  function notify() {
    for (var i = 0; i < listeners.length; i += 1) {
      try { listeners[i](); } catch (e) { console.error('[period] render error', e); }
    }
  }

  function subscribe(fn) { listeners.push(fn); }

  function analysis() {
    if (!cache) cache = M.analyze(data, U.today());
    return cache;
  }

  function resolveTheme() {
    var mode = data.settings.themeMode;
    if (mode === 'light' || mode === 'dark') return mode;
    var host = H.hostTheme();
    if (host === 'dark' || host === 'light') return host;
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }

  function applyTheme() {
    ui.theme = resolveTheme();
    document.documentElement.setAttribute('data-theme', ui.theme);
    document.documentElement.setAttribute('data-accent', data.settings.accent || 'rose');
  }

  function init(options) {
    var opts = options || {};
    ui.host = H.available();
    ui.lang = H.language();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = M.normalize(JSON.parse(raw));
    } catch (e) {
      data = M.emptyData();
      ui.storageOk = false;
    }

    var query = {};
    try {
      new URLSearchParams(location.search).forEach(function (v, k) { query[k] = v; });
    } catch (e) {}

    if (query.reset === '1') data = M.emptyData();
    if ((query.demo === '1' || opts.demo) && !data.periods.length) data = MC.demo.build();
    if (query.theme === 'dark' || query.theme === 'light') data.settings.themeMode = query.theme;
    if (query.reset === '1' || query.demo === '1') persist();

    applyTheme();
    ui.onboarding = !data.periods.length;
    ui.ready = true;
    notify();
    return data;
  }

  /* ── 设置 ─────────────────────────────────────────────── */
  function setSettings(patch) {
    Object.keys(patch || {}).forEach(function (k) { data.settings[k] = patch[k]; });
    var s = data.settings;
    s.cycleLength = U.clamp(Math.round(Number(s.cycleLength) || 28), 18, 60);
    s.periodLength = U.clamp(Math.round(Number(s.periodLength) || 5), 1, 14);
    s.lutealLength = U.clamp(Math.round(Number(s.lutealLength) || 14), 10, 18);
    s.reminderDays = U.clamp(Math.round(Number(s.reminderDays) || 0), 0, 10);
    s.reminderEnabled = !!s.reminderEnabled;
    applyTheme();
    touch();
  }

  /* ── 周期 ─────────────────────────────────────────────── */
  function isInPeriod(date) {
    return analysis().ranges.some(function (r) { return M.inRange(date, r); });
  }

  function openPeriod() {
    var list = data.periods.filter(function (p) { return !p.end; });
    return list.length ? list[list.length - 1] : null;
  }

  function startPeriod(date) {
    var d = date || U.today();
    if (isInPeriod(d)) return { ok: false, reason: 'exists' };
    // 之前若还有未结束的经期，自动在前一天关闭，避免区间重叠
    data.periods.forEach(function (p) {
      if (!p.end && p.start < d) p.end = U.addDays(d, -1);
    });
    data.periods.push({ id: U.uid(), start: d, end: '' });
    data.periods.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    touch();
    return { ok: true };
  }

  function endPeriod(date) {
    var d = date || U.today();
    var open = null;
    data.periods.forEach(function (p) {
      if (!p.end && p.start <= d && (!open || p.start > open.start)) open = p;
    });
    if (!open) return { ok: false, reason: 'no-open' };
    if (U.diff(open.start, d) < 0) return { ok: false, reason: 'before-start' };
    open.end = d;
    touch();
    return { ok: true, days: U.diff(open.start, d) + 1 };
  }

  function updatePeriod(id, patch) {
    var found = null;
    data.periods.forEach(function (p) { if (p.id === id) found = p; });
    if (!found) return { ok: false, reason: 'not-found' };
    var start = patch.start || found.start;
    var end = patch.end === undefined ? found.end : patch.end;
    if (end && U.diff(start, end) < 0) return { ok: false, reason: 'invalid-range' };
    found.start = start;
    found.end = end;
    data.periods.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    touch();
    return { ok: true };
  }

  function deletePeriod(id) {
    data.periods = data.periods.filter(function (p) { return p.id !== id; });
    touch();
  }

  /* ── 每日日志 ─────────────────────────────────────────── */
  function getLog(date) {
    var l = data.logs[date];
    if (!l) return M.emptyLog();
    return {
      flow: l.flow || '', symptoms: (l.symptoms || []).slice(), mood: l.mood || '',
      discharge: l.discharge || '', temp: l.temp || '', weight: l.weight || '',
      intimacy: l.intimacy || '', notes: l.notes || '',
    };
  }

  function setLog(date, patch) {
    var next = Object.assign(getLog(date), patch || {});
    if (!M.hasContent(next)) delete data.logs[date];
    else data.logs[date] = next;
    touch();
  }

  function clearLog(date) {
    delete data.logs[date];
    touch();
  }

  /* ── 数据管理 ─────────────────────────────────────────── */
  function serialize() {
    return JSON.stringify({
      app: 'otools-period', version: 1, exportedAt: new Date().toISOString(), data: data,
    }, null, 2);
  }

  function parseImport(text) {
    var obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object') throw new Error('文件内容不是有效的 JSON');
    var normalized = M.normalize(obj);
    if (!normalized.periods.length && !Object.keys(normalized.logs).length) {
      throw new Error('文件里没有可导入的周期或日志数据');
    }
    return normalized;
  }

  function importData(text) {
    var next = parseImport(text);
    var keep = {
      themeMode: data.settings.themeMode,
      accent: data.settings.accent,
      privacyMode: data.settings.privacyMode,
    };
    next.settings = Object.assign(next.settings, keep);
    data = next;
    ui.onboarding = false;
    touch();
    return { periods: data.periods.length, logs: Object.keys(data.logs).length };
  }

  function resetRecords() {
    var settings = JSON.parse(JSON.stringify(data.settings));
    data = M.emptyData();
    data.settings = settings;
    ui.onboarding = true;
    touch();
  }

  function loadDemo() {
    var keep = {
      themeMode: data.settings.themeMode,
      accent: data.settings.accent,
      privacyMode: data.settings.privacyMode,
    };
    data = MC.demo.build();
    data.settings = Object.assign(data.settings, keep);
    ui.onboarding = false;
    touch();
  }

  function setRoute(view) { ui.view = view; notify(); }
  function setOnboarding(on) { ui.onboarding = !!on; notify(); }

  MC.store = {
    ui: ui,
    get data() { return data; },
    get persistOk() { return persistOk; },
    init: init, subscribe: subscribe, notify: notify, analysis: analysis,
    applyTheme: applyTheme, setSettings: setSettings, setRoute: setRoute,
    setOnboarding: setOnboarding, isInPeriod: isInPeriod, openPeriod: openPeriod,
    startPeriod: startPeriod, endPeriod: endPeriod, updatePeriod: updatePeriod,
    deletePeriod: deletePeriod, getLog: getLog, setLog: setLog, clearLog: clearLog,
    serialize: serialize, parseImport: parseImport, importData: importData,
    resetRecords: resetRecords, loadDemo: loadDemo,
    hasAnyData: function () { return data.periods.length > 0 || Object.keys(data.logs).length > 0; },
  };
})();
