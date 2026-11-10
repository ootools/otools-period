/* 视图：今日 —— 周期环、阶段提示、快捷记录、近 7 天与未来节点 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, M = MC.model, I = MC.icons.icon, UI = MC.ui;

  function stat(label, value, sub) {
    return '<div class="hero-stat"><span>' + U.esc(label) + '</span><strong class="sensitive">' +
      U.esc(value) + '</strong><small>' + U.esc(sub) + '</small></div>';
  }

  function ring(a) {
    var pct = a.cycleDay ? U.clamp(a.cycleDay / a.avgCycle, 0, 1) : 0;
    var C = 2 * Math.PI * 96;
    var off = C * (1 - pct);
    var center = a.cycleDay
      ? '<span class="ring-eyebrow">当前周期 · 第</span>' +
        '<strong class="ring-num sensitive">' + a.cycleDay + '</strong>' +
        '<span class="ring-unit">天 / 共 ' + a.avgCycle + ' 天</span>' +
        '<span class="ring-caption">' + (a.daysToNext === 0 ? '预计今天开始' : '距下次经期 <b class="sensitive">' + a.daysToNext + '</b> 天') + '</span>'
      : '<span class="ring-eyebrow">还没有周期记录</span>' +
        '<strong class="ring-num ring-num-empty">—</strong>' +
        '<span class="ring-unit">记录一次经期即可预测</span>' +
        '<span class="ring-caption">数据只保存在本机</span>';
    return '<div class="ring-wrap">' +
      '<svg class="ring-svg" viewBox="0 0 240 240" aria-hidden="true">' +
        '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/>' +
        '</linearGradient></defs>' +
        '<circle cx="120" cy="120" r="96" fill="none" stroke="var(--ring-track)" stroke-width="15"/>' +
        '<circle class="ring-progress" cx="120" cy="120" r="96" fill="none" stroke="url(#ringGrad)" ' +
          'stroke-width="15" stroke-linecap="round" transform="rotate(-90 120 120)" ' +
          'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
        '<circle cx="120" cy="120" r="72" fill="none" stroke="var(--ring-inner)" stroke-width="1.5" stroke-dasharray="2 8"/>' +
      '</svg><div class="ring-center">' + center + '</div></div>';
  }

  function confidence(a) {
    var labels = { high: '较高', medium: '一般', low: '较低' };
    var level = a.confidence === 'high' ? 3 : (a.confidence === 'medium' ? 2 : 1);
    var dots = '';
    for (var i = 1; i <= 3; i += 1) dots += '<i class="' + (i <= level ? 'on' : '') + '"></i>';
    return '<div class="confidence"><span>预测可信度</span><div class="confidence-dots">' + dots + '</div>' +
      '<b>' + labels[a.confidence] + '</b><small>' +
      (a.gapValues.length >= 2 ? '基于最近 ' + a.gapValues.length + ' 个周期 · 波动 ±' + U.round1(a.cycleStddev) + ' 天' : '再记录几个周期会更准') +
      '</small></div>';
  }

  function logSummary(log) {
    if (!M.hasContent(log)) {
      return '<div class="mini-empty">' + I('note', 20) + '<p>今天还没有记录</p>' +
        '<button class="btn btn-soft btn-sm" data-action="open-editor" data-date="' + U.today() + '">写第一笔</button></div>';
    }
    var parts = [];
    if (log.flow) parts.push('<span class="tag tag-rose">' + U.esc(M.labelOf(M.FLOWS, log.flow)) + '</span>');
    if (log.mood) parts.push('<span class="tag" style="--tag:' + M.colorOf(M.MOODS, log.mood) + '">' +
      U.esc(M.labelOf(M.MOODS, log.mood)) + '</span>');
    (log.symptoms || []).slice(0, 5).forEach(function (s) { parts.push('<span class="tag tag-soft">' + U.esc(s) + '</span>'); });
    if (log.temp) parts.push('<span class="tag tag-soft">' + U.esc(log.temp) + ' ℃</span>');
    if (log.weight) parts.push('<span class="tag tag-soft">' + U.esc(log.weight) + ' kg</span>');
    if (log.discharge) parts.push('<span class="tag tag-soft">' + U.esc(M.labelOf(M.DISCHARGES, log.discharge)) + '</span>');
    var notes = log.notes ? '<p class="log-notes">“' + U.esc(log.notes) + '”</p>' : '';
    return '<div class="tag-cloud">' + parts.join('') + '</div>' + notes +
      '<button class="link-btn" data-action="open-editor" data-date="' + U.today() + '">编辑今日记录 ' + I('arrowRight', 14) + '</button>';
  }

  function futureList(a) {
    if (!a.nextStart) return UI.emptyState('calendar', '开启预测', '记录一次经期开始日，就能看到未来的周期节点。');
    var rows = [
      { icon: 'drop', color: 'var(--accent)', label: '下次经期预计', date: a.nextStart, sub: '预计持续 ' + a.avgPeriod + ' 天' },
      { icon: 'target', color: '#A377E6', label: '预计排卵日', date: a.ovulation, sub: '按黄体期 ' + MC.store.data.settings.lutealLength + ' 天推算' },
      { icon: 'sparkle', color: '#8B7BE8', label: '易孕期', date: a.fertileStart, sub: U.cnDate(a.fertileStart) + ' – ' + U.cnDate(a.fertileEnd) },
    ];
    return '<div class="event-list">' + rows.map(function (r) {
      var days = U.diff(U.today(), r.date);
      return '<div class="event-row"><span class="event-icon" style="--ev:' + r.color + '">' + I(r.icon, 18) + '</span>' +
        '<div class="event-main"><strong>' + U.esc(r.label) + '</strong><small>' + U.esc(r.sub) + '</small></div>' +
        '<div class="event-date"><b>' + U.esc(U.cnDate(r.date)) + '</b><small>' +
        (days > 0 ? days + ' 天后' : (days === 0 ? '就是今天' : Math.abs(days) + ' 天前')) + '</small></div></div>';
    }).join('') + '</div>';
  }

  function weekStrip(a) {
    var t = U.today();
    var cells = '';
    for (var i = 6; i >= 0; i -= 1) {
      var k = U.addDays(t, -i);
      var mark = i === 0 ? a.phase : a.markAt(k);
      var log = MC.store.getLog(k);
      var has = M.hasContent(log);
      cells += '<button class="week-cell' + (i === 0 ? ' is-today' : '') + '" data-action="open-editor" data-date="' + k + '">' +
        '<span class="week-name">' + U.weekdayCN(k).replace('周', '') + '</span>' +
        '<span class="week-day">' + U.parse(k).getDate() + '</span>' +
        '<span class="week-dot" style="background:' + mark.color + '"></span>' +
        (has ? '<span class="week-log"></span>' : '') + '</button>';
    }
    return '<div class="week-strip">' + cells + '</div>';
  }

  function render() {
    var S = MC.store, a = S.analysis(), t = U.today();
    var p = a.phase;
    var open = S.openPeriod();
    var inPeriod = S.isInPeriod(t);
    var openDays = open ? U.diff(open.start, t) + 1 : 0;

    var primary = open
      ? '<button class="btn btn-primary btn-block" data-action="end-period">' + I('check', 17) + ' 结束本次经期</button>' +
        '<p class="quick-hint">经期进行中 · 第 ' + openDays + ' 天（' + U.cnDate(open.start) + ' 开始）</p>'
      : '<button class="btn btn-primary btn-block" data-action="start-period">' + I('flower', 17) + ' 今天，经期开始了</button>' +
        '<p class="quick-hint">点一下即可开启新周期，预测会随之更新</p>';

    var flowBtns = M.FLOWS.map(function (f) {
      var active = S.getLog(t).flow === f.id;
      return '<button class="flow-btn' + (active ? ' active' : '') + '" data-action="quick-flow" data-value="' + f.id +
        '" style="--flow:' + f.color + '"><i></i>' + f.label + '</button>';
    }).join('');

    var html =
      '<div class="today-grid">' +
        '<section class="card card-hero ring-card">' +
          '<div class="hero-head"><span class="eyebrow">' + U.esc(U.cnDateFull(t)) + '</span>' +
            UI.pill(p.label, p.color, p.soft) + '</div>' +
          ring(a) +
          '<div class="hero-foot">' +
            stat('下次经期', a.nextStart ? U.cnDate(a.nextStart) : '—', a.daysToNext !== null ? a.daysToNext + ' 天后' : '待记录') +
            '<span class="hero-divider"></span>' +
            stat('预计排卵', a.ovulation ? U.cnDate(a.ovulation) : '—', a.daysToOvulation !== null ? (a.daysToOvulation >= 0 ? a.daysToOvulation + ' 天后' : Math.abs(a.daysToOvulation) + ' 天前') : '待记录') +
            '<span class="hero-divider"></span>' +
            stat('平均周期', a.avgCycle + ' 天', '经期 ' + a.avgPeriod + ' 天') +
          '</div>' +
        '</section>' +
        '<div class="today-side">' +
          '<section class="card quick-card">' +
            UI.sectionHead('快捷记录', '一次点击，留住今天的身体信号') +
            primary +
            '<button class="btn btn-soft btn-block" data-action="open-editor" data-date="' + t + '">' + I('note', 16) + ' 打开今日记录</button>' +
            '<div class="quick-flow"><span>流量速记</span><div class="flow-row">' + flowBtns + '</div></div>' +
          '</section>' +
          '<section class="card tip-card" style="--phase:' + p.color + ';--phase-soft:' + p.soft + '">' +
            '<div class="tip-icon">' + I('sparkle', 20) + '</div>' +
            '<div class="tip-body"><h3>' + U.esc(p.label) + ' · 温柔提醒</h3><p>' + U.esc(p.desc) + '</p>' +
            '<p class="tip-hint">' + U.esc(p.tip) + '</p></div>' +
            confidence(a) +
          '</section>' +
        '</div>' +
      '</div>' +
      '<section class="card week-card">' +
        UI.sectionHead('最近 7 天', '点任意一天补记或查看', '<button class="link-btn" data-action="nav" data-view="calendar">查看日历 ' + I('arrowRight', 14) + '</button>') +
        weekStrip(a) +
      '</section>' +
      '<div class="two-col">' +
        '<section class="card">' + UI.sectionHead('今日记录', U.cnDate(t) + ' · ' + (inPeriod ? '经期中' : '常规日')) + logSummary(S.getLog(t)) + '</section>' +
        '<section class="card">' + UI.sectionHead('未来节点', '根据历史周期推算') + futureList(a) + '</section>' +
      '</div>' +
      '<p class="disclaimer">' + I('info', 13) + ' 预测基于你自己的记录，仅供参考，不能作为避孕或医疗判断依据。</p>';
    return html;
  }

  MC.views.today = { render: render };
})();
