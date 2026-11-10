/* 应用入口：路由、渲染、全局事件与公共动作 */
(function () {
  'use strict';
  var MC = window.MC;
  var U = MC.util, M = MC.model, S = MC.store, I = MC.icons.icon, UI = MC.ui;

  var NAV = [
    { id: 'today', label: '今日', icon: 'home' },
    { id: 'calendar', label: '日历', icon: 'calendar' },
    { id: 'records', label: '记录', icon: 'book' },
    { id: 'insights', label: '洞察', icon: 'chart' },
    { id: 'settings', label: '设置', icon: 'settings' },
  ];

  var SUBTITLE = {
    today: '今天也要好好照顾自己',
    calendar: '把每一天都看清楚',
    records: '所有周期与日志，都在你手里',
    insights: '从记录里看见自己的规律',
    settings: '按你的习惯来',
  };

  var reminderDismissed = false;

  function greeting() {
    var h = new Date().getHours();
    var word = h < 6 ? '夜深了' : (h < 11 ? '早上好' : (h < 14 ? '中午好' : (h < 18 ? '下午好' : '晚上好')));
    var name = S.data.settings.nickname;
    return name ? word + '，' + name : word + '，今天也照顾好自己';
  }

  function navHtml() {
    return NAV.map(function (n) {
      return '<button class="nav-item' + (S.ui.view === n.id ? ' active' : '') + '" data-action="nav" data-view="' + n.id + '">' +
        '<span class="nav-icon">' + I(n.icon, 19) + '</span><span>' + n.label + '</span>' +
        (S.ui.view === n.id ? '<i class="nav-active"></i>' : '') + '</button>';
    }).join('');
  }

  function topHtml() {
    var title = (NAV.filter(function (n) { return n.id === S.ui.view; })[0] || NAV[0]).label;
    var subtitle = S.ui.view === 'today' ? greeting() : SUBTITLE[S.ui.view];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-sub').textContent = subtitle;
    document.getElementById('top-date').innerHTML = I('calendar', 14) + '<span>' + U.esc(U.cnDateFull(U.today())) + '</span>';
    document.getElementById('theme-icon').innerHTML = I(S.ui.theme === 'dark' ? 'sun' : 'moon', 18);
  }

  function reminderHtml(a) {
    if (reminderDismissed || !a.reminder || S.ui.onboarding || S.ui.view !== 'today') return '';
    return '<div class="reminder-banner">' +
      '<span class="reminder-icon">' + I('bell', 18) + '</span>' +
      '<div class="reminder-text"><strong>经期临近</strong><p>预计 ' + U.esc(U.cnDate(a.nextStart)) +
        ' 开始，还有 ' + a.daysToNext + ' 天。记得提前照顾好自己。</p></div>' +
      '<button class="btn btn-soft btn-sm" data-action="nav" data-view="calendar">查看日历</button>' +
      '<button class="icon-btn" data-action="dismiss-reminder" aria-label="关闭提醒">' + I('close', 16) + '</button>' +
    '</div>';
  }

  function render() {
    if (!S.ui.ready) return;
    var a = S.analysis();
    document.body.classList.toggle('privacy-on', !!S.data.settings.privacyMode);
    document.getElementById('nav').innerHTML = navHtml();
    topHtml();
    document.getElementById('reminder-slot').innerHTML = reminderHtml(a);

    var view = MC.views[S.ui.view] || MC.views.today;
    var root = document.getElementById('view');
    root.innerHTML = view.render();
    root.classList.remove('view-enter');
    void root.offsetWidth;
    root.classList.add('view-enter');

    var overlay = document.getElementById('overlay');
    var html = S.ui.onboarding
      ? MC.views.onboarding.renderOverlay()
      : MC.views.editor.renderOverlay();
    overlay.innerHTML = html;
    overlay.classList.toggle('active', !!html);
  }

  /* ── 公共动作 ─────────────────────────────────────────── */
  MC.actions.register({
    'nav': function (el) {
      var v = el.getAttribute('data-view');
      if (v === 'calendar' && S.ui.view !== 'calendar') {
        var d = U.parse(S.ui.selected);
        S.ui.calYear = d.getFullYear();
        S.ui.calMonth = d.getMonth() + 1;
      }
      S.setRoute(v);
    },
    'theme-quick': function () {
      S.setSettings({ themeMode: S.ui.theme === 'dark' ? 'light' : 'dark' });
    },
    'quick-log': function () { MC.views.editor.open(U.today()); },
    'dismiss-reminder': function () { reminderDismissed = true; render(); },
    'quick-flow': function (el) {
      var t = U.today(), v = el.getAttribute('data-value');
      var next = S.getLog(t).flow === v ? '' : v;
      S.setLog(t, { flow: next });
      UI.toast(next ? '已记录今日流量：' + M.labelOf(M.FLOWS, next) : '已清除今日流量', 'success');
      if (next && !S.isInPeriod(t) && !S.openPeriod()) {
        setTimeout(function () { UI.toast('如需开启新周期，请点「经期开始了」'); }, 900);
      }
    },
    'start-period': function () {
      var t = U.today();
      var r = S.startPeriod(t);
      UI.toast(r.ok ? '已记录经期开始，预测已更新' : (r.reason === 'exists' ? '今天已在经期区间内' : '记录失败'),
        r.ok ? 'success' : 'error');
      if (r.ok) MC.views.editor.open(t);
    },
    'end-period': function () {
      var r = S.endPeriod(U.today());
      if (!r.ok) { UI.toast(r.reason === 'no-open' ? '当前没有进行中的经期' : '结束日期不能早于开始日期', 'error'); return; }
      UI.toast('本次经期已结束，共 ' + r.days + ' 天', 'success');
    },
    'cal-start-period': function (el) {
      var k = el.getAttribute('data-date');
      if (k > U.today()) { UI.toast('不能为未来的日期标记经期开始', 'error'); return; }
      var r = S.startPeriod(k);
      UI.toast(r.ok ? '已将 ' + U.cnDate(k) + ' 设为经期开始' : '该日期已在经期区间内', r.ok ? 'success' : 'error');
    },
    'cal-end-period': function (el) {
      var k = el.getAttribute('data-date');
      var r = S.endPeriod(k);
      if (!r.ok) { UI.toast('当前没有可结束的经期', 'error'); return; }
      UI.toast('已将 ' + U.cnDate(k) + ' 设为经期结束', 'success');
    },
    'select-day': function (el) {
      var k = el.getAttribute('data-date');
      var d = U.parse(k);
      S.ui.selected = k;
      S.ui.calYear = d.getFullYear();
      S.ui.calMonth = d.getMonth() + 1;
      S.notify();
    },
    'cal-prev': function () { shiftMonth(-1); },
    'cal-next': function () { shiftMonth(1); },
    'cal-today': function () {
      var d = U.parse(U.today());
      S.ui.calYear = d.getFullYear();
      S.ui.calMonth = d.getMonth() + 1;
      S.ui.selected = U.today();
      S.notify();
    },
  });

  function shiftMonth(delta) {
    var m = S.ui.calMonth + delta, y = S.ui.calYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    S.ui.calMonth = m;
    S.ui.calYear = y;
    S.notify();
  }

  /* ── 全局事件 ─────────────────────────────────────────── */
  function bind() {
    document.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl && !actionEl.disabled) {
        e.preventDefault();
        MC.actions.handle(actionEl.getAttribute('data-action'), actionEl, e);
        return;
      }
      if (e.target.classList && e.target.classList.contains('editor-backdrop')) MC.views.editor.close();
    });

    document.addEventListener('change', function (e) {
      var el = e.target.closest && e.target.closest('[data-field]');
      if (!el) return;
      var name = el.getAttribute('data-field');
      var value = el.type === 'checkbox' ? el.checked : el.value;
      if (['cycleLength', 'periodLength', 'lutealLength', 'reminderDays'].indexOf(name) >= 0) value = Number(value);
      var patch = {};
      patch[name] = value;
      S.setSettings(patch);
    });

    document.addEventListener('input', function (e) {
      var el = e.target.closest && e.target.closest('[data-draft]');
      if (!el || !S.ui.editorDraft) return;
      S.ui.editorDraft[el.getAttribute('data-draft')] = el.value;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (S.ui.editorDate) { MC.views.editor.close(); return; }
        var modalRoot = document.getElementById('modal-root');
        var last = modalRoot && modalRoot.lastElementChild;
        if (last) { last.remove(); return; }
      }
      if (S.ui.view === 'calendar' && !S.ui.editorDate && !S.ui.onboarding) {
        if (e.key === 'ArrowLeft') shiftMonth(-1);
        if (e.key === 'ArrowRight') shiftMonth(1);
      }
    });

    try {
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if (S.data.settings.themeMode === 'auto') { S.applyTheme(); render(); }
        });
      }
    } catch (e) {}
  }

  function boot() {
    S.subscribe(render);
    bind();
    S.init();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
