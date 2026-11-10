/* 视图：日历 —— 月视图、阶段标记、选中日详情 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, M = MC.model, I = MC.icons.icon, UI = MC.ui;

  var LEGEND = [
    { cls: 'period', label: '经期' },
    { cls: 'predicted', label: '预测经期' },
    { cls: 'fertile', label: '易孕期' },
    { cls: 'ovulation', label: '排卵日' },
    { cls: 'log', label: '有记录' },
  ];

  function phaseClass(mark) {
    if (mark.id === 'period') return 'is-period';
    if (mark.id === 'predicted') return 'is-predicted';
    if (mark.id === 'fertile') return 'is-fertile';
    if (mark.id === 'ovulation') return 'is-ovulation';
    return '';
  }

  function calGrid(a) {
    var ui = MC.store.ui;
    var days = U.monthGrid(ui.calYear, ui.calMonth);
    var t = U.today();
    var cells = days.map(function (g) {
      var mark = a.markAt(g.key);
      var log = MC.store.getLog(g.key);
      var has = M.hasContent(log);
      var cls = ['cal-cell', g.inMonth ? '' : 'is-out', g.isToday ? 'is-today' : '',
        g.key === ui.selected ? 'is-selected' : '', phaseClass(mark)].filter(Boolean).join(' ');
      var dots = '';
      if (mark.id === 'period' || mark.id === 'predicted') dots += '<i class="cal-mark ' + mark.id + '"></i>';
      if (mark.id === 'fertile' || mark.id === 'ovulation') dots += '<i class="cal-mark fertile"></i>';
      if (has) dots += '<i class="cal-mark log"></i>';
      var label = mark.id === 'ovulation' ? '排卵' : (mark.id === 'period' ? '经期' : (mark.id === 'predicted' ? '预计' : ''));
      return '<button class="' + cls + '" data-action="select-day" data-date="' + g.key + '" ' +
        'aria-label="' + U.esc(U.cnDate(g.key, true)) + '">' +
        '<span class="cal-num">' + g.day + '</span>' +
        (g.key > t ? '<span class="cal-future"></span>' : '') +
        (label ? '<span class="cal-label">' + label + '</span>' : '') +
        '<span class="cal-dots">' + dots + '</span></button>';
    }).join('');
    var head = U.WEEK.map(function (w) { return '<span>' + w + '</span>'; }).join('');
    return '<div class="cal-weekdays">' + head + '</div><div class="cal-grid">' + cells + '</div>';
  }

  function detail(a) {
    var S = MC.store, k = S.ui.selected, t = U.today();
    var mark = k === t ? a.phase : a.markAt(k);
    var log = S.getLog(k);
    var has = M.hasContent(log);
    var tags = [];
    if (log.flow) tags.push('<span class="tag tag-rose">' + U.esc(M.labelOf(M.FLOWS, log.flow)) + '</span>');
    if (log.mood) tags.push('<span class="tag" style="--tag:' + M.colorOf(M.MOODS, log.mood) + '">' + U.esc(M.labelOf(M.MOODS, log.mood)) + '</span>');
    (log.symptoms || []).forEach(function (s) { tags.push('<span class="tag tag-soft">' + U.esc(s) + '</span>'); });
    if (log.temp) tags.push('<span class="tag tag-soft">' + U.esc(log.temp) + ' ℃</span>');
    if (log.weight) tags.push('<span class="tag tag-soft">' + U.esc(log.weight) + ' kg</span>');
    if (log.notes) tags.push('<span class="tag tag-soft">备注</span>');

    var open = S.openPeriod();
    var canStart = k <= t && !S.isInPeriod(k);
    var canEnd = !!open && k >= open.start && k <= t;
    var actions = '<div class="detail-actions">' +
      '<button class="btn btn-primary btn-sm" data-action="open-editor" data-date="' + k + '">' + I('edit', 15) + ' ' + (has ? '编辑记录' : '记录这一天') + '</button>' +
      (canStart ? '<button class="btn btn-soft btn-sm" data-action="cal-start-period" data-date="' + k + '">' + I('drop', 15) + ' 设为经期开始</button>' : '') +
      (canEnd ? '<button class="btn btn-soft btn-sm" data-action="cal-end-period" data-date="' + k + '">' + I('check', 15) + ' 设为经期结束</button>' : '') +
      (has ? '<button class="btn btn-ghost btn-sm" data-action="delete-log" data-date="' + k + '">' + I('trash', 15) + ' 删除记录</button>' : '') +
      '</div>';

    return '<div class="detail-head">' +
        '<span class="detail-date">' + U.esc(U.cnDate(k, true)) + '</span>' +
        '<span class="detail-week">' + U.esc(U.weekdayCN(k)) + '</span>' +
        UI.pill(mark.label, mark.color, mark.soft) + '</div>' +
      '<p class="detail-desc">' + U.esc(mark.desc) + '</p>' +
      '<div class="detail-log">' +
        (has ? '<div class="tag-cloud">' + tags.join('') + '</div>' + (log.notes ? '<p class="log-notes">“' + U.esc(log.notes) + '”</p>' : '')
             : '<div class="mini-empty">' + I('note', 20) + '<p>这一天还没有记录</p></div>') +
      '</div>' + actions;
  }

  function monthSummary(a) {
    var S = MC.store, ui = S.ui;
    var prefix = ui.calYear + '-' + U.pad(ui.calMonth);
    var daysInMonth = new Date(ui.calYear, ui.calMonth, 0).getDate();
    var periodDays = 0, logged = 0;
    for (var d = 1; d <= daysInMonth; d += 1) {
      var k = prefix + '-' + U.pad(d);
      var mark = a.markAt(k);
      if (mark.id === 'period') periodDays += 1;
      if (M.hasContent(S.getLog(k))) logged += 1;
    }
    return '<div class="month-summary">' +
      '<div><strong>' + periodDays + '</strong><span>经期天数</span></div>' +
      '<div><strong>' + logged + '</strong><span>记录天数</span></div>' +
      '<div><strong>' + a.avgCycle + '</strong><span>平均周期</span></div></div>';
  }

  function render() {
    var S = MC.store, a = S.analysis(), ui = S.ui;
    return '<div class="cal-layout">' +
      '<section class="card cal-card">' +
        '<div class="cal-head">' +
          '<div><h2>' + U.esc(U.monthLabel(ui.calYear, ui.calMonth)) + '</h2>' +
            '<p>点选任意一天查看或补记</p></div>' +
          '<div class="cal-controls">' +
            '<button class="icon-btn" data-action="cal-prev" aria-label="上个月">' + I('left', 18) + '</button>' +
            '<button class="btn btn-soft btn-sm" data-action="cal-today">回到今天</button>' +
            '<button class="icon-btn" data-action="cal-next" aria-label="下个月">' + I('right', 18) + '</button>' +
          '</div>' +
        '</div>' +
        calGrid(a) +
        '<div class="cal-legend">' + LEGEND.map(function (l) {
          return '<span><i class="legend-dot ' + l.cls + '"></i>' + l.label + '</span>';
        }).join('') + '</div>' +
        monthSummary(a) +
      '</section>' +
      '<aside class="card detail-card">' + UI.sectionHead('这一天', '身体信号与周期标记') + detail(a) + '</aside>' +
    '</div>';
  }

  MC.views.calendar = { render: render };
})();
