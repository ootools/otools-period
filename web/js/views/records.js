/* 视图：记录 —— 周期历史与每日日志 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, M = MC.model, I = MC.icons.icon, UI = MC.ui;

  function periodRow(p, index, periods) {
    var days = p.end ? U.diff(p.start, p.end) + 1 : null;
    var next = periods[index + 1];
    var gap = next ? U.diff(p.start, next.start) : null;
    var range = p.end
      ? U.cnDate(p.start, true) + ' – ' + U.cnDate(p.end)
      : U.cnDate(p.start, true) + ' 起';
    var meta = '经期 ' + (days === null ? '进行中' : days + ' 天') +
      (gap === null ? ' · 最新周期' : ' · 周期 ' + gap + ' 天');
    return '<div class="period-row">' +
      '<div class="period-index">' + (index + 1) + '</div>' +
      '<div class="period-main">' +
        '<strong>' + U.esc(range) + '</strong>' +
        '<span>' + U.esc(meta) + '</span>' +
      '</div>' +
      '<div class="period-actions">' +
        '<button class="icon-btn" data-action="edit-period" data-id="' + U.esc(p.id) + '" aria-label="编辑">' + I('edit', 16) + '</button>' +
        '<button class="icon-btn" data-action="delete-period" data-id="' + U.esc(p.id) + '" aria-label="删除">' + I('trash', 16) + '</button>' +
      '</div></div>';
  }

  function logTags(log) {
    var tags = [];
    if (log.flow) tags.push('<span class="tag tag-rose">' + U.esc(M.labelOf(M.FLOWS, log.flow)) + '</span>');
    if (log.mood) tags.push('<span class="tag" style="--tag:' + M.colorOf(M.MOODS, log.mood) + '">' +
      U.esc(M.labelOf(M.MOODS, log.mood)) + '</span>');
    (log.symptoms || []).slice(0, 3).forEach(function (s) { tags.push('<span class="tag tag-soft">' + U.esc(s) + '</span>'); });
    var extra = (log.symptoms || []).length > 3 ? '+' + ((log.symptoms || []).length - 3) : '';
    if (extra) tags.push('<span class="tag tag-soft">' + extra + '</span>');
    if (log.temp) tags.push('<span class="tag tag-soft">' + U.esc(log.temp) + '℃</span>');
    if (log.weight) tags.push('<span class="tag tag-soft">' + U.esc(log.weight) + 'kg</span>');
    return tags.join('');
  }

  function periodModal(id) {
    var S = MC.store;
    var p = null;
    if (id) S.data.periods.forEach(function (x) { if (x.id === id) p = x; });
    var title = p ? '编辑周期' : '新增周期';
    var start = p ? p.start : U.today();
    var end = p ? p.end : '';
    var body =
      '<div class="form-grid">' +
        '<label class="field"><span>开始日期</span><input type="date" id="pf-start" value="' + U.esc(start) + '"></label>' +
        '<label class="field"><span>结束日期 <small>留空表示进行中</small></span><input type="date" id="pf-end" value="' + U.esc(end) + '"></label>' +
      '</div><p class="form-hint">周期长度会由相邻两次开始日期自动计算，无需手动填写。</p>';
    var footer = '<button class="btn btn-ghost" data-modal-close>取消</button>' +
      '<button class="btn btn-primary" id="pf-save">保存周期</button>';
    UI.modal({
      title: title, subtitle: '经期区间用于日历标记与周期预测', body: body, footer: footer, width: 480,
      onMount: function (root, close) {
        root.querySelector('#pf-save').addEventListener('click', function () {
          var s = root.querySelector('#pf-start').value;
          var e = root.querySelector('#pf-end').value;
          if (!s) { UI.toast('请选择开始日期', 'error'); return; }
          if (e && U.diff(s, e) < 0) { UI.toast('结束日期不能早于开始日期', 'error'); return; }
          var res = p ? S.updatePeriod(p.id, { start: s, end: e }) : S.startPeriod(s);
          if (!res.ok) {
            UI.toast(res.reason === 'exists' ? '该日期已在已有经期区间内' : '保存失败', 'error');
            return;
          }
          if (!p && e) S.endPeriod(e);
          close();
          UI.toast('周期已保存', 'success');
        });
      },
    });
  }

  function render() {
    var S = MC.store, a = S.analysis();
    var periods = a.periods.slice().reverse();
    var periodList = periods.length
      ? '<div class="period-list">' + periods.map(function (p, i) {
          // periodRow 需要原始顺序来算下一个周期，这里传倒序并换算
          var originalIndex = a.periods.length - 1 - i;
          return periodRow(p, originalIndex, a.periods);
        }).join('') + '</div>'
      : UI.emptyState('calendar', '还没有周期记录', '点右上角「新增周期」，或在今日页点「经期开始了」。',
          '<button class="btn btn-primary btn-sm" data-action="new-period">' + I('plus', 15) + ' 新增周期</button>');

    var keys = Object.keys(S.data.logs).sort().reverse().slice(0, 40);
    var logList = keys.length
      ? '<div class="log-list">' + keys.map(function (k) {
          var log = S.getLog(k);
          return '<button class="log-row" data-action="open-editor" data-date="' + k + '">' +
            '<div class="log-date"><strong>' + U.esc(U.cnDate(k)) + '</strong><small>' + U.esc(U.relative(k)) + ' · ' + U.esc(U.weekdayCN(k)) + '</small></div>' +
            '<div class="log-tags">' + logTags(log) + '</div>' +
            '<span class="log-go">' + I('right', 16) + '</span></button>';
        }).join('') + '</div>'
      : UI.emptyState('note', '还没有每日记录', '记录流量、症状、心情或体温，慢慢就会看到规律。');

    return '<div class="records-layout">' +
      '<section class="card">' +
        UI.sectionHead('周期历史', '共 ' + a.periods.length + ' 个周期 · 平均 ' + a.avgCycle + ' 天',
          '<button class="btn btn-soft btn-sm" data-action="new-period">' + I('plus', 15) + ' 新增周期</button>') +
        periodList +
      '</section>' +
      '<section class="card">' +
        UI.sectionHead('每日记录', '共 ' + Object.keys(S.data.logs).length + ' 条 · 显示最近 40 条') +
        logList +
      '</section>' +
    '</div>';
  }

  MC.actions.register({
    'new-period': function () { periodModal(null); },
    'edit-period': function (el) { periodModal(el.getAttribute('data-id')); },
    'delete-period': function (el) {
      var id = el.getAttribute('data-id');
      UI.confirm({
        title: '删除这个周期？', message: '该周期会从历史与预测中移除，关联的每日记录仍会保留。',
        confirmText: '删除', danger: true,
      }).then(function (yes) {
        if (!yes) return;
        MC.store.deletePeriod(id);
        UI.toast('周期已删除', 'success');
      });
    },
  });

  MC.views.records = { render: render };
})();
