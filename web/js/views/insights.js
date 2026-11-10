/* 视图：洞察 —— 周期趋势、症状、心情、体温、体重 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, M = MC.model, I = MC.icons.icon, UI = MC.ui, C = MC.charts;

  function kpi(icon, label, value, unit, sub, tone) {
    return '<div class="kpi-card"><span class="kpi-icon" style="--kpi:' + tone + '">' + I(icon, 18) + '</span>' +
      '<div class="kpi-body"><span>' + U.esc(label) + '</span><strong class="sensitive">' + U.esc(value) +
      '<small>' + U.esc(unit) + '</small></strong><em>' + U.esc(sub) + '</em></div></div>';
  }

  function regularity(a, s) {
    var text, tone = 'good';
    if (a.gapValues.length < 2) {
      text = '目前有 ' + a.periods.length + ' 个周期记录。再记录 2 次以上经期，就能自动分析你的周期规律。';
      tone = 'neutral';
    } else if (a.cycleStddev <= 2) {
      text = '周期比较规律，最近 ' + a.gapValues.length + ' 个周期的长度波动约 ±' + U.round1(a.cycleStddev) + ' 天。继续保持记录，预测会更贴近实际。';
    } else if (a.cycleStddev <= 4) {
      text = '周期略有波动（±' + U.round1(a.cycleStddev) + ' 天），压力、作息与旅行都可能带来变化，属于常见现象。';
      tone = 'warn';
    } else {
      text = '周期波动较大（±' + U.round1(a.cycleStddev) + ' 天）。如果持续出现，建议留意身体信号并咨询专业医生。';
      tone = 'warn';
    }
    return '<section class="card insight-note ' + tone + '">' +
      '<div class="insight-note-icon">' + I('sparkle', 22) + '</div>' +
      '<div><h3>你的周期小结</h3><p>' + U.esc(text) + '</p></div>' +
      '<div class="insight-note-stat"><strong>' + s.loggedDays + '</strong><span>累计记录天数</span></div>' +
      '</section>';
  }

  function render() {
    var S = MC.store, a = S.analysis();
    var s = M.stats(S.data, a);
    return '<div class="kpi-grid">' +
        kpi('refresh', '平均周期', String(a.avgCycle), '天', '最短 ' + s.shortestCycle + ' · 最长 ' + s.longestCycle, 'var(--accent)') +
        kpi('drop', '平均经期', String(a.avgPeriod), '天', '共 ' + s.periodCount + ' 次经期记录', '#E2648D') +
        kpi('chart', '周期波动', '±' + s.cycleStddev, '天', a.confidence === 'high' ? '预测可信度较高' : '样本越多越准确', '#8B7BE8') +
        kpi('note', '记录覆盖', String(s.coverage), '%', '近 90 天', '#6FBFA0') +
      '</div>' +
      '<div class="two-col">' +
        '<section class="card">' + UI.sectionHead('周期长度趋势', '最近 ' + s.cycleSeries.length + ' 个周期') + C.cycleBars(s.cycleSeries, a.avgCycle) + '</section>' +
        '<section class="card">' + UI.sectionHead('常见症状', '按出现频次排序') + C.rankRows(s.symptoms, 'var(--accent-2)') + '</section>' +
      '</div>' +
      '<div class="two-col">' +
        '<section class="card">' + UI.sectionHead('心情分布', '记录下来的情绪占比') + C.donut(s.moods) + '</section>' +
        '<section class="card">' + UI.sectionHead('流量分布', '经期各天的流量记录') + C.rankRows(s.flows, 'var(--accent)') + '</section>' +
      '</div>' +
      '<div class="two-col">' +
        '<section class="card">' + UI.sectionHead('基础体温', '最近 ' + s.temps.length + ' 条 · ℃') +
          C.lineChart(s.temps, { id: 'temp', color: '#E08A62', emptyText: '记录体温后，这里会显示曲线' }) + '</section>' +
        '<section class="card">' + UI.sectionHead('体重趋势', '最近 ' + s.weights.length + ' 条 · kg') +
          C.lineChart(s.weights, { id: 'weight', color: '#8B7BE8', emptyText: '记录体重后，这里会显示曲线' }) + '</section>' +
      '</div>' +
      regularity(a, s) +
      '<p class="disclaimer">' + I('info', 13) + ' 所有统计仅基于你在本机记录的数据，用于自我观察，不构成任何医疗建议或诊断。</p>';
  }

  MC.views.insights = { render: render };
})();
