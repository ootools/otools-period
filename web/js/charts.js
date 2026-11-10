/* 纯 SVG / CSS 图表，无第三方依赖。颜色跟随主题变量。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;

  function empty(text) {
    return '<div class="chart-empty">' + U.esc(text || '暂无足够数据') + '</div>';
  }

  /** 周期长度柱状图 + 平均虚线 */
  function cycleBars(series, avg) {
    if (!series || !series.length) return empty('记录 2 次以上经期后，这里会显示周期长度变化');
    var w = 540, h = 176, padL = 32, padR = 14, padT = 22, padB = 30;
    var items = series.slice(-8);
    var values = items.map(function (g) { return g.length; }).concat([avg]);
    var min = Math.max(18, Math.min.apply(null, values) - 3);
    var max = Math.min(60, Math.max.apply(null, values) + 3);
    if (max - min < 8) { min -= 3; max += 3; }
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var slot = plotW / items.length;
    var barW = Math.min(38, slot * 0.52);
    var y = function (v) { return padT + plotH * (1 - (v - min) / (max - min)); };
    var s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">';
    s += '<defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>';
    [0, 1, 2].forEach(function (i) {
      var yy = padT + plotH * i / 2;
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (w - padR) + '" y2="' + yy +
        '" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5"/>';
    });
    s += '<line x1="' + padL + '" y1="' + y(avg) + '" x2="' + (w - padR) + '" y2="' + y(avg) +
      '" stroke="var(--accent-2)" stroke-width="1.4" stroke-dasharray="6 5" opacity="0.8"/>';
    s += '<text x="' + (w - padR) + '" y="' + (y(avg) - 6) + '" text-anchor="end" font-size="10" fill="var(--text-3)">平均 ' + avg + ' 天</text>';
    items.forEach(function (g, i) {
      var cx = padL + slot * i + slot / 2;
      var yy = y(g.length);
      var bh = padT + plotH - yy;
      s += '<rect x="' + (cx - barW / 2) + '" y="' + yy + '" width="' + barW + '" height="' + Math.max(2, bh) +
        '" rx="' + Math.min(8, barW / 2) + '" fill="url(#barGrad)" opacity="0.88"/>';
      s += '<text x="' + cx + '" y="' + (yy - 7) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-2)">' + g.length + '</text>';
      s += '<text x="' + cx + '" y="' + (h - 9) + '" text-anchor="middle" font-size="10" fill="var(--text-3)">' +
        U.esc(U.cnDate(g.start).replace('日', '')) + '</text>';
    });
    s += '</svg>';
    return s;
  }

  /** 折线 + 渐变面积 */
  function lineChart(points, opts) {
    var o = opts || {};
    if (!points || !points.length) return empty(o.emptyText || '暂无数据');
    var pts = points.slice(-40);
    var w = 540, h = 176, padL = 40, padR = 14, padT = 18, padB = 28;
    var vals = pts.map(function (p) { return Number(p.value); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = Math.max(0.4, hi - lo);
    var min = lo - span * 0.22, max = hi + span * 0.22;
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var x = function (i) { return padL + (pts.length === 1 ? plotW / 2 : plotW * i / (pts.length - 1)); };
    var y = function (v) { return padT + plotH * (1 - (v - min) / (max - min)); };
    var color = o.color || 'var(--accent)';
    var id = 'grad' + (o.id || 'line');
    var s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">';
    s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity="0.26"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>';
    [0, 1, 2].forEach(function (i) {
      var yy = padT + plotH * i / 2;
      var label = (max - (max - min) * i / 2).toFixed(1);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (w - padR) + '" y2="' + yy +
        '" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5"/>';
      s += '<text x="' + (padL - 7) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="10" fill="var(--text-3)">' + label + '</text>';
    });
    var line = pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.value).toFixed(1); }).join(' ');
    var base = (padT + plotH).toFixed(1);
    var area = 'M' + x(0).toFixed(1) + ',' + base + ' L' + line.replace(/ /g, ' L') + ' L' + x(pts.length - 1).toFixed(1) + ',' + base + ' Z';
    s += '<path d="' + area + '" fill="url(#' + id + ')"/>';
    s += '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    pts.forEach(function (p, i) {
      if (pts.length <= 16 || i === pts.length - 1 || i % Math.ceil(pts.length / 12) === 0) {
        s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="2.6" fill="var(--surface)" stroke="' + color + '" stroke-width="1.8"/>';
      }
    });
    [pts[0], pts[pts.length - 1]].forEach(function (p, i) {
      var xx = i === 0 ? x(0) : x(pts.length - 1);
      s += '<text x="' + xx + '" y="' + (h - 8) + '" text-anchor="' + (i === 0 ? 'start' : 'end') +
        '" font-size="10" fill="var(--text-3)">' + U.esc(U.cnDate(p.date)) + '</text>';
    });
    s += '</svg>';
    return s;
  }

  /** 心情 / 流量分布：CSS 甜甜圈 + 图例 */
  function donut(items) {
    var valid = (items || []).filter(function (x) { return x.count > 0; });
    var total = valid.reduce(function (sum, x) { return sum + x.count; }, 0);
    if (!total) return empty('还没有心情或流量记录');
    var acc = 0;
    var stops = valid.map(function (x) {
      var from = acc / total * 100;
      acc += x.count;
      return x.color + ' ' + from.toFixed(2) + '% ' + (acc / total * 100).toFixed(2) + '%';
    }).join(',');
    var legend = valid.map(function (x) {
      return '<div class="donut-legend-row"><i style="background:' + x.color + '"></i>' +
        '<span>' + U.esc(x.label) + '</span><b>' + Math.round(x.count / total * 100) + '%</b></div>';
    }).join('');
    return '<div class="donut-wrap">' +
      '<div class="donut" style="background:conic-gradient(' + stops + ')">' +
        '<div class="donut-hole"><strong>' + total + '</strong><small>条记录</small></div></div>' +
      '<div class="donut-legend">' + legend + '</div></div>';
  }

  /** 排行横条 */
  function rankRows(items, color) {
    var valid = (items || []).slice(0, 8);
    if (!valid.length) return empty('暂无记录');
    var max = valid[0].count || 1;
    return '<div class="rank-list">' + valid.map(function (x) {
      return '<div class="rank-row"><span class="rank-label">' + U.esc(x.label) + '</span>' +
        MC.ui.meter(x.count, max, x.color || color || 'var(--accent)') +
        '<b>' + x.count + '</b></div>';
    }).join('') + '</div>';
  }

  MC.charts = {
    cycleBars: cycleBars, lineChart: lineChart, donut: donut, rankRows: rankRows, empty: empty,
  };
})();
