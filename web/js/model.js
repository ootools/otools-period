/* 领域模型：字典、周期预测、阶段判定与统计。
 * 数据全部来自本地；预测仅为基于历史记录的统计推算，不构成医学建议。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;

  var FLOWS = [
    { id: 'spotting', label: '点滴', short: '点', weight: 1, color: '#F3AFC2' },
    { id: 'light', label: '少量', short: '少', weight: 2, color: '#EC8FAE' },
    { id: 'medium', label: '中等', short: '中', weight: 3, color: '#E46C97' },
    { id: 'heavy', label: '较多', short: '多', weight: 4, color: '#D6507F' },
  ];

  var SYMPTOMS = [
    '痛经', '头痛', '腹胀', '乳房胀痛', '腰酸', '疲劳', '失眠', '恶心',
    '长痘', '食欲增加', '情绪波动', '水肿', '便秘', '腹泻', '头晕',
  ];

  var MOODS = [
    { id: 'happy', label: '愉快', color: '#F0A44B' },
    { id: 'calm', label: '平静', color: '#6FBFA0' },
    { id: 'energetic', label: '活力', color: '#E8758F' },
    { id: 'sensitive', label: '敏感', color: '#A88BE8' },
    { id: 'anxious', label: '焦虑', color: '#7E9BE0' },
    { id: 'low', label: '低落', color: '#8E97A8' },
    { id: 'irritable', label: '易怒', color: '#E07A6B' },
  ];

  var DISCHARGES = [
    { id: 'dry', label: '干燥' },
    { id: 'sticky', label: '黏稠' },
    { id: 'creamy', label: '乳白' },
    { id: 'eggwhite', label: '蛋清拉丝' },
    { id: 'watery', label: '水样' },
  ];

  var INTIMACY = [
    { id: 'none', label: '无' },
    { id: 'protected', label: '有保护' },
    { id: 'unprotected', label: '无保护' },
  ];

  var PHASES = {
    period: {
      id: 'period', label: '月经期', color: '#E2648D', soft: '#FDE8EF',
      desc: '身体正在更新，记得多休息、注意保暖。',
      tip: '建议补充水分与含铁食物，避免剧烈运动；如有异常疼痛请及时就医。',
    },
    follicular: {
      id: 'follicular', label: '卵泡期', color: '#8B7BE8', soft: '#EFEBFE',
      desc: '精力回升的一段时间，适合安排需要专注的事情。',
      tip: '状态通常较好，适合运动、学习与推进计划。',
    },
    fertile: {
      id: 'fertile', label: '易孕期', color: '#A377E6', soft: '#F2EAFE',
      desc: '受孕概率相对较高的一段时间。',
      tip: '如有备孕或避孕计划，请结合自身情况并采用可靠措施。',
    },
    ovulation: {
      id: 'ovulation', label: '排卵日', color: '#9B63DE', soft: '#F0E6FE',
      desc: '预计的排卵日，基础体温可能随后轻微升高。',
      tip: '推算日存在 ±2 天误差，请勿单独作为避孕依据。',
    },
    luteal: {
      id: 'luteal', label: '黄体期', color: '#E3A45F', soft: '#FDF1E2',
      desc: '经前阶段，部分人会出现情绪或身体上的变化。',
      tip: '留意情绪与睡眠，减少高盐高糖摄入，给自己留一点松弛感。',
    },
    predicted: {
      id: 'predicted', label: '预测经期', color: '#E2648D', soft: '#FDE8EF',
      desc: '根据历史周期推算的经期窗口。',
      tip: '预测会随记录增多而更准，提前几天留意即可。',
    },
    late: {
      id: 'late', label: '经期推迟', color: '#D97757', soft: '#FCECE7',
      desc: '已超过预计的经期开始日。',
      tip: '偶尔波动很常见；若持续异常或伴有不适，建议咨询医生。',
    },
    regular: {
      id: 'regular', label: '常规日', color: '#9AA2B1', soft: '#F2F3F6',
      desc: '普通的一天。', tip: '随手记录身体感受，数据会慢慢变得有价值。',
    },
    none: {
      id: 'none', label: '待记录', color: '#9AA2B1', soft: '#F2F3F6',
      desc: '还没有足够的周期数据。', tip: '记录一次经期开始日，即可开启预测。',
    },
  };

  var DEFAULT_SETTINGS = {
    cycleLength: 28,
    periodLength: 5,
    lutealLength: 14,
    predictMode: 'auto',      // auto 依据历史记录 / manual 使用固定值
    reminderEnabled: true,
    reminderDays: 2,
    themeMode: 'light',       // auto / light / dark
    accent: 'rose',           // rose / lavender / sage
    nickname: '',
    privacyMode: false,
  };

  function emptyLog() {
    return {
      flow: '', symptoms: [], mood: '', discharge: '',
      temp: '', weight: '', intimacy: '', notes: '',
    };
  }

  function emptyData() {
    return {
      version: 1,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      periods: [],
      logs: {},
      createdAt: U.today(),
    };
  }

  function hasContent(log) {
    if (!log) return false;
    return !!(log.flow || (log.symptoms && log.symptoms.length) || log.mood ||
      log.discharge || log.temp || log.weight || log.intimacy || log.notes);
  }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i].label;
    return '';
  }

  function colorOf(list, id) {
    for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i].color;
    return '';
  }

  /** 清洗外部导入的数据，剔除非法日期与脏字段 */
  function normalize(raw) {
    var data = emptyData();
    if (!raw || typeof raw !== 'object') return data;
    var source = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    if (source.settings && typeof source.settings === 'object') {
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (source.settings[k] !== undefined && source.settings[k] !== null) data.settings[k] = source.settings[k];
      });
      data.settings.cycleLength = U.clamp(Number(data.settings.cycleLength) || 28, 18, 60);
      data.settings.periodLength = U.clamp(Number(data.settings.periodLength) || 5, 1, 14);
      data.settings.lutealLength = U.clamp(Number(data.settings.lutealLength) || 14, 10, 18);
      data.settings.reminderDays = U.clamp(Number(data.settings.reminderDays) || 2, 0, 10);
    }
    var validDate = function (k) { return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k); };
    if (Array.isArray(source.periods)) {
      var seen = {};
      source.periods.forEach(function (p) {
        if (!p || !validDate(p.start) || seen[p.start]) return;
        seen[p.start] = true;
        data.periods.push({
          id: p.id || U.uid(),
          start: p.start,
          end: validDate(p.end) && U.diff(p.start, p.end) >= 0 ? p.end : '',
        });
      });
      data.periods.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    }
    if (source.logs && typeof source.logs === 'object') {
      Object.keys(source.logs).forEach(function (k) {
        if (!validDate(k)) return;
        var l = source.logs[k] || {};
        var clean = emptyLog();
        clean.flow = labelOf(FLOWS, l.flow) ? l.flow : '';
        clean.symptoms = Array.isArray(l.symptoms)
          ? l.symptoms.filter(function (s) { return SYMPTOMS.indexOf(s) >= 0; }).slice(0, 20) : [];
        clean.mood = labelOf(MOODS, l.mood) ? l.mood : '';
        clean.discharge = labelOf(DISCHARGES, l.discharge) ? l.discharge : '';
        clean.temp = l.temp === '' || l.temp == null ? '' : U.clamp(Number(l.temp) || 0, 33, 42) || '';
        clean.weight = l.weight === '' || l.weight == null ? '' : U.clamp(Number(l.weight) || 0, 20, 300) || '';
        clean.intimacy = labelOf(INTIMACY, l.intimacy) ? l.intimacy : '';
        clean.notes = typeof l.notes === 'string' ? l.notes.slice(0, 500) : '';
        if (hasContent(clean)) data.logs[k] = clean;
      });
    }
    return data;
  }

  function inRange(k, r) {
    return U.diff(r.start, k) >= 0 && U.diff(k, r.end) >= 0;
  }

  /**
   * 核心预测：依据最近 6 个有效周期间隔推算平均周期，再推出下次经期、
   * 排卵日与易孕窗口。样本不足时回退到用户设置的默认值。
   */
  function analyze(data, t) {
    var now = t || U.today();
    var s = data.settings;
    var periods = data.periods.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    var starts = periods.map(function (p) { return p.start; });

    var gaps = [];
    for (var i = 1; i < starts.length; i += 1) {
      var g = U.diff(starts[i - 1], starts[i]);
      if (g >= 18 && g <= 60) gaps.push({ start: starts[i], length: g, index: i });
    }
    var recent = gaps.slice(-6);
    var gapValues = recent.map(function (g) { return g.length; });
    var autoCycle = gapValues.length ? Math.round(U.mean(gapValues)) : s.cycleLength;

    var lengths = [];
    periods.forEach(function (p) {
      if (!p.end) return;
      var len = U.diff(p.start, p.end) + 1;
      if (len >= 1 && len <= 14) lengths.push(len);
    });
    var autoPeriod = lengths.length ? Math.round(U.mean(lengths.slice(-6))) : s.periodLength;

    var avgCycle = U.clamp(s.predictMode === 'manual' ? s.cycleLength : autoCycle, 18, 60);
    var avgPeriod = U.clamp(s.predictMode === 'manual' ? s.periodLength : autoPeriod, 1, 14);

    var last = periods.length ? periods[periods.length - 1] : null;
    var lastStart = last ? last.start : null;
    var cycleDay = lastStart ? U.diff(lastStart, now) + 1 : null;

    // 下次经期：从最近一次起点顺推；若已逾期则继续顺推到未来。
    var nextStart = null;
    if (lastStart) {
      nextStart = U.addDays(lastStart, avgCycle);
      var guard = 0;
      while (U.diff(now, nextStart) < 0 && guard < 24) {
        nextStart = U.addDays(nextStart, avgCycle);
        guard += 1;
      }
    }

    var luteal = U.clamp(Number(s.lutealLength) || 14, 10, 18);
    var nextEnd = nextStart ? U.addDays(nextStart, avgPeriod - 1) : null;
    var ovulation = nextStart ? U.addDays(nextStart, -luteal) : null;
    var fertileStart = ovulation ? U.addDays(ovulation, -5) : null;
    var fertileEnd = ovulation ? U.addDays(ovulation, 1) : null;

    // 历史经期区间（未结束的按今天封顶，最多 14 天，避免遗忘造成超长区间）
    var ranges = periods.map(function (p) {
      var end = p.end;
      if (!end) {
        var span = U.clamp(U.diff(p.start, now) + 1, 1, 14);
        end = U.addDays(p.start, span - 1);
      }
      if (U.diff(p.start, end) < 0) end = p.start;
      return { id: p.id, start: p.start, end: end, ongoing: !p.end, predicted: false };
    });

    // 未来 6 个周期 + 对应的易孕窗口
    var future = [];
    var windows = [];
    if (nextStart) {
      for (var j = 0; j < 6; j += 1) {
        var st = U.addDays(nextStart, j * avgCycle);
        var ov = U.addDays(st, -luteal);
        future.push({ start: st, end: U.addDays(st, avgPeriod - 1), predicted: true });
        windows.push({ start: U.addDays(ov, -5), end: U.addDays(ov, 1), ovulation: ov });
      }
    }

    var daysToNext = nextStart ? U.diff(now, nextStart) : null;
    var daysToOvulation = ovulation ? U.diff(now, ovulation) : null;
    var sd = U.stddev(gapValues);
    var confidence = gapValues.length >= 4 && sd <= 2 ? 'high'
      : (gapValues.length >= 2 && sd <= 4 ? 'medium' : 'low');

    function markAt(k) {
      for (var a = 0; a < ranges.length; a += 1) {
        if (inRange(k, ranges[a])) return PHASES.period;
      }
      for (var b = 0; b < future.length; b += 1) {
        if (inRange(k, future[b])) return PHASES.predicted;
      }
      for (var c = 0; c < windows.length; c += 1) {
        var w = windows[c];
        if (k === w.ovulation) return PHASES.ovulation;
        if (inRange(k, w)) return PHASES.fertile;
      }
      return PHASES.regular;
    }

    var phase;
    if (!lastStart) phase = PHASES.none;
    else if (ranges.some(function (r) { return inRange(now, r); })) phase = PHASES.period;
    else if (cycleDay > avgCycle + 3) phase = PHASES.late;
    else if (ovulation && now === ovulation) phase = PHASES.ovulation;
    else if (fertileStart && inRange(now, { start: fertileStart, end: fertileEnd })) phase = PHASES.fertile;
    else if (fertileEnd && U.diff(fertileEnd, now) > 0) phase = PHASES.luteal;
    else phase = PHASES.follicular;

    // 提醒：距下次经期 N 天内（含当天）
    var reminder = !!(s.reminderEnabled && daysToNext !== null &&
      daysToNext >= 0 && daysToNext <= Number(s.reminderDays));

    return {
      today: now,
      periods: periods,
      ranges: ranges,
      future: future,
      windows: windows,
      gaps: gaps,
      gapValues: gapValues,
      cycleStddev: sd,
      cycleLengths: lengths,
      avgCycle: avgCycle,
      avgPeriod: avgPeriod,
      lastStart: lastStart,
      cycleDay: cycleDay > 0 ? cycleDay : null,
      nextStart: nextStart,
      nextEnd: nextEnd,
      ovulation: ovulation,
      fertileStart: fertileStart,
      fertileEnd: fertileEnd,
      daysToNext: daysToNext,
      daysToOvulation: daysToOvulation,
      confidence: confidence,
      phase: phase,
      reminder: reminder,
      markAt: markAt,
      hasPeriods: !!lastStart,
    };
  }

  /** 统计洞察 */
  function stats(data, a) {
    var counts = {};
    var moods = {};
    var flows = {};
    var temps = [];
    var weights = [];
    var logged = 0;
    var keys = Object.keys(data.logs);
    var t = U.today();
    keys.forEach(function (k) {
      var l = data.logs[k];
      if (!hasContent(l)) return;
      logged += 1;
      (l.symptoms || []).forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
      if (l.mood) moods[l.mood] = (moods[l.mood] || 0) + 1;
      if (l.flow) flows[l.flow] = (flows[l.flow] || 0) + 1;
      if (l.temp) temps.push({ date: k, value: Number(l.temp) });
      if (l.weight) weights.push({ date: k, value: Number(l.weight) });
    });
    temps.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    weights.sort(function (x, y) { return x.date < y.date ? -1 : 1; });

    var recentLogged = 0;
    for (var i = 0; i < 90; i += 1) {
      var k = U.addDays(t, -i);
      if (hasContent(data.logs[k])) recentLogged += 1;
    }

    function toRank(map) {
      return Object.keys(map).map(function (k) { return { id: k, label: k, count: map[k] }; })
        .sort(function (x, y) { return y.count - x.count; });
    }

    var gaps = a.gaps.slice(-8);
    return {
      loggedDays: logged,
      coverage: Math.round(recentLogged / 90 * 100),
      cycleSeries: gaps,
      avgCycle: a.avgCycle,
      shortestCycle: gaps.length ? Math.min.apply(null, gaps.map(function (g) { return g.length; })) : a.avgCycle,
      longestCycle: gaps.length ? Math.max.apply(null, gaps.map(function (g) { return g.length; })) : a.avgCycle,
      avgPeriod: a.avgPeriod,
      cycleStddev: U.round1(a.cycleStddev),
      periodCount: a.periods.length,
      symptoms: toRank(counts),
      moods: toRank(moods).map(function (m) {
        return { id: m.id, label: labelOf(MOODS, m.id) || m.id, color: colorOf(MOODS, m.id) || '#ccc', count: m.count };
      }),
      flows: toRank(flows).map(function (f) {
        return { id: f.id, label: labelOf(FLOWS, f.id) || f.id, color: colorOf(FLOWS, f.id) || '#ccc', count: f.count };
      }),
      temps: temps.slice(-40),
      weights: weights.slice(-40),
    };
  }

  MC.model = {
    FLOWS: FLOWS, SYMPTOMS: SYMPTOMS, MOODS: MOODS, DISCHARGES: DISCHARGES,
    INTIMACY: INTIMACY, PHASES: PHASES, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    emptyLog: emptyLog, emptyData: emptyData, hasContent: hasContent,
    labelOf: labelOf, colorOf: colorOf, normalize: normalize,
    analyze: analyze, stats: stats, inRange: inRange,
  };
})();
