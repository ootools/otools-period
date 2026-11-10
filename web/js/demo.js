/* 演示数据：确定性生成，便于预览与截图验收，不会在用户首次打开时自动写入。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;
  var M = MC.model;

  var seed = 20261110;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function pick(list) { return list[Math.floor(rnd() * list.length)]; }
  function chance(p) { return rnd() < p; }

  function build() {
    var data = M.emptyData();
    var t = U.today();
    var gaps = [28, 30, 27, 29, 28];       // 5 个历史间隔（旧 → 新）
    var starts = [];
    var cursor = U.addDays(t, -16);         // 今天是本周期第 17 天
    starts.unshift(cursor);
    for (var i = gaps.length - 1; i >= 0; i -= 1) {
      cursor = U.addDays(cursor, -gaps[i]);
      starts.unshift(cursor);
    }

    var periodLens = [5, 6, 4, 5, 5, 5];
    starts.forEach(function (start, index) {
      data.periods.push({
        id: 'demo-' + index,
        start: start,
        end: U.addDays(start, periodLens[index % periodLens.length] - 1),
      });
    });

    var ranges = data.periods.map(function (p) { return { start: p.start, end: p.end }; });
    var first = starts[0];
    var total = U.diff(first, t);

    for (var d = 0; d <= total; d += 1) {
      var k = U.addDays(first, d);
      if (d > 120 && d < total - 75) continue;  // 中间留白，控制体积
      var inPeriod = ranges.some(function (r) { return M.inRange(k, r); });
      var dayInPeriod = 0;
      ranges.forEach(function (r) {
        if (M.inRange(k, r)) dayInPeriod = U.diff(r.start, k) + 1;
      });
      // 每个周期各自推算排卵日，让基础体温呈现典型的双相曲线
      var nextCycleStart = '';
      for (var s = 0; s < starts.length; s += 1) {
        if (starts[s] > k) { nextCycleStart = starts[s]; break; }
      }
      if (!nextCycleStart) nextCycleStart = U.addDays(starts[starts.length - 1], 28);
      var ov = U.addDays(nextCycleStart, -14);
      var afterOv = U.diff(ov, k) > 0;
      var nearOv = U.diff(k, ov) >= -3 && U.diff(k, ov) <= 1;

      if (!inPeriod && !chance(0.78)) continue;
      var log = M.emptyLog();

      if (inPeriod) {
        log.flow = dayInPeriod <= 2 ? 'heavy' : (dayInPeriod === 3 ? 'medium' : (dayInPeriod === 4 ? 'light' : 'spotting'));
        log.symptoms = [pick(['痛经', '腰酸', '疲劳', '腹胀'])];
        if (chance(0.45)) log.symptoms.push(pick(['头痛', '恶心', '情绪波动', '失眠']));
        log.mood = pick(['low', 'sensitive', 'calm', 'irritable']);
        log.temp = String(U.round1(36.25 + rnd() * 0.2));
      } else {
        log.symptoms = [];
        if (afterOv && chance(0.6)) log.symptoms = [pick(['腹胀', '乳房胀痛', '长痘', '情绪波动', '水肿', '疲劳'])];
        else if (chance(0.18)) log.symptoms = [pick(['头痛', '疲劳', '失眠'])];
        log.mood = afterOv
          ? pick(['calm', 'sensitive', 'irritable', 'low', 'anxious'])
          : pick(['happy', 'calm', 'energetic', 'happy']);
        log.temp = String(U.round1(afterOv ? 36.62 + rnd() * 0.22 : 36.28 + rnd() * 0.2));
        log.discharge = nearOv ? (chance(0.6) ? 'eggwhite' : 'watery') : (chance(0.4) ? pick(['dry', 'sticky', 'creamy']) : '');
        if (chance(0.08)) log.intimacy = pick(['protected', 'protected', 'none']);
      }
      if (chance(0.85)) log.weight = String(U.round1(52.2 + Math.sin(d / 11) * 0.45 + rnd() * 0.3));
      if (chance(0.12)) log.notes = pick(['今天状态不错', '有点累，早点睡', '喝了热饮舒服一些', '散步 30 分钟', '工作比较忙']);
      data.logs[k] = log;
    }

    data.settings.nickname = '小月';
    return M.normalize(data);
  }

  MC.demo = { build: build };
})();
