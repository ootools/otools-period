/* 视图：设置 —— 预测参数、外观、隐私与数据管理 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, I = MC.icons.icon, UI = MC.ui, H = MC.host;

  function field(label, hint, control) {
    return '<label class="setting-row"><span class="setting-label"><b>' + U.esc(label) + '</b>' +
      (hint ? '<small>' + U.esc(hint) + '</small>' : '') + '</span>' + control + '</label>';
  }

  function numberField(name, value, min, max, suffix) {
    return '<span class="input-suffix"><input type="number" data-field="' + name + '" value="' + U.esc(value) +
      '" min="' + min + '" max="' + max + '"><i>' + U.esc(suffix) + '</i></span>';
  }

  function switchField(name, checked) {
    return '<span class="switch"><input type="checkbox" data-field="' + name + '"' + (checked ? ' checked' : '') +
      '><i></i></span>';
  }

  function selectField(name, value, options) {
    return '<select data-field="' + name + '">' + options.map(function (o) {
      return '<option value="' + o.value + '"' + (o.value === value ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
    }).join('') + '</select>';
  }

  function themeButtons(s) {
    var list = [
      { id: 'light', label: '浅色', icon: 'sun' },
      { id: 'dark', label: '深色', icon: 'moon' },
      { id: 'auto', label: '跟随系统', icon: 'settings' },
    ];
    return '<div class="seg">' + list.map(function (x) {
      return '<button class="' + (s.themeMode === x.id ? 'active' : '') + '" data-action="set-theme" data-value="' + x.id + '">' +
        I(x.icon, 15) + x.label + '</button>';
    }).join('') + '</div>';
  }

  function accentButtons(s) {
    var list = [
      { id: 'rose', label: '玫瑰', color: '#E2648D' },
      { id: 'lavender', label: '薰衣草', color: '#9B7BE0' },
      { id: 'sage', label: '青提', color: '#5FAF92' },
    ];
    return '<div class="accent-list">' + list.map(function (x) {
      return '<button class="accent-btn' + (s.accent === x.id ? ' active' : '') + '" data-action="set-accent" data-value="' + x.id + '">' +
        '<i style="background:' + x.color + '"></i><span>' + x.label + '</span>' +
        (s.accent === x.id ? I('check', 14) : '') + '</button>';
    }).join('') + '</div>';
  }

  function dataButtons() {
    return '<div class="data-actions">' +
      '<button class="data-btn" data-action="export-data"><span class="data-icon">' + I('download', 18) + '</span>' +
        '<span><b>导出备份</b><small>保存为 JSON 文件，可随时迁移</small></span>' + I('right', 16) + '</button>' +
      '<button class="data-btn" data-action="import-data"><span class="data-icon">' + I('upload', 18) + '</span>' +
        '<span><b>导入数据</b><small>从备份文件恢复（会覆盖当前数据）</small></span>' + I('right', 16) + '</button>' +
      '<button class="data-btn" data-action="load-demo"><span class="data-icon">' + I('sparkle', 18) + '</span>' +
        '<span><b>载入示例数据</b><small>快速体验完整界面与图表</small></span>' + I('right', 16) + '</button>' +
      '<button class="data-btn danger" data-action="clear-data"><span class="data-icon">' + I('trash', 18) + '</span>' +
        '<span><b>清空所有记录</b><small>删除周期与日志，保留偏好设置</small></span>' + I('right', 16) + '</button>' +
    '</div>';
  }

  function render() {
    var S = MC.store, s = S.data.settings;
    var storageWarn = !S.persistOk
      ? '<div class="warn-banner">' + I('info', 16) + ' 本机存储不可用，本次修改仅在当前页面有效。请检查浏览器/宿主存储权限。</div>'
      : '';
    return storageWarn +
      '<div class="settings-grid">' +
        '<section class="card">' + UI.sectionHead('周期与预测', '样本不足时使用下方数值') +
          field('预测方式', '自动按最近 6 个周期计算',
            selectField('predictMode', s.predictMode, [
              { value: 'auto', label: '自动 · 依据历史记录' },
              { value: 'manual', label: '手动 · 固定周期长度' },
            ])) +
          field('平均周期长度', '两次经期开始日之间的天数',
            numberField('cycleLength', s.cycleLength, 18, 60, '天')) +
          field('经期持续天数', '一次经期的典型长度',
            numberField('periodLength', s.periodLength, 1, 14, '天')) +
          field('黄体期长度', '用于推算排卵日，默认 14 天',
            numberField('lutealLength', s.lutealLength, 10, 18, '天')) +
          '<div class="setting-divider"></div>' +
          field('经期提醒', '在预计开始前几天，于面板内显示提醒条', switchField('reminderEnabled', s.reminderEnabled)) +
          field('提前提醒', '0 表示仅在预计当天提醒',
            numberField('reminderDays', s.reminderDays, 0, 10, '天')) +
        '</section>' +
        '<section class="card">' + UI.sectionHead('外观与隐私', '让面板更符合你的习惯') +
          '<div class="setting-row stack"><span class="setting-label"><b>界面主题</b><small>可随时切换，立即生效</small></span>' + themeButtons(s) + '</div>' +
          '<div class="setting-row stack"><span class="setting-label"><b>主色调</b><small>影响进度环、按钮与图表</small></span>' + accentButtons(s) + '</div>' +
          '<div class="setting-divider"></div>' +
          field('昵称', '仅用于首页问候，可留空',
            '<input type="text" data-field="nickname" value="' + U.esc(s.nickname) + '" placeholder="怎么称呼你" maxlength="20">') +
          field('隐私模式', '模糊页面上的敏感数字，鼠标悬停时显示', switchField('privacyMode', s.privacyMode)) +
          '<div class="privacy-note">' + I('shield', 16) + ' 数据始终保存在本机，插件不联网、不上传、不含任何统计 SDK。</div>' +
        '</section>' +
        '<section class="card">' + UI.sectionHead('数据管理', '你的数据，你做主') + dataButtons() + '</section>' +
        '<section class="card about-card">' + UI.sectionHead('关于', '月汐 · Luna Period') +
          '<div class="about-row"><span>版本</span><b>1.0.0</b></div>' +
          '<div class="about-row"><span>运行方式</span><b>' + (S.ui.host ? 'OTools 宿主面板' : '浏览器预览') + '</b></div>' +
          '<div class="about-row"><span>存储位置</span><b>本机 localStorage</b></div>' +
          '<div class="about-row"><span>打开方式</span><b>Panel 面板（默认）</b></div>' +
          '<p class="about-tip">小提示：在日历页按 ← / → 可切换月份，按 Esc 关闭弹层。</p>' +
          '<p class="disclaimer">' + I('info', 13) + ' 本工具仅用于日常自我记录，预测结果可能与实际存在偏差，不能作为避孕或医疗判断依据。</p>' +
        '</section>' +
      '</div>';
  }

  MC.actions.register({
    'set-theme': function (el) { MC.store.setSettings({ themeMode: el.getAttribute('data-value') }); },
    'set-accent': function (el) { MC.store.setSettings({ accent: el.getAttribute('data-value') }); },
    'export-data': function () {
      var name = '月汐-备份-' + U.today() + '.json';
      H.saveJson(name, MC.store.serialize()).then(function (p) {
        if (!p) { UI.toast('已取消导出'); return; }
        UI.toast(p === 'browser' ? '备份文件已下载' : '已保存：' + String(p).split(/[\\/]/).pop(), 'success');
      }).catch(function (e) { UI.toast('导出失败：' + e.message, 'error'); });
    },
    'import-data': function () {
      H.openJson().then(function (file) {
        if (!file) return null;
        var parsed = MC.store.parseImport(file.text);
        return UI.confirm({
          title: '导入备份数据',
          message: '文件包含 ' + parsed.periods.length + ' 个周期、' + Object.keys(parsed.logs).length +
            ' 条日志。导入后会覆盖当前数据，建议先导出一份备份。',
          confirmText: '确认导入',
        }).then(function (yes) {
          if (!yes) return null;
          var r = MC.store.importData(file.text);
          UI.toast('已导入 ' + r.periods + ' 个周期、' + r.logs + ' 条日志', 'success');
          return r;
        });
      }).catch(function (e) { UI.toast('导入失败：' + e.message, 'error'); });
    },
    'load-demo': function () {
      UI.confirm({
        title: '载入示例数据？', message: '会生成一组演示周期与日志，并覆盖当前记录。适合快速预览完整界面。',
        confirmText: '载入示例',
      }).then(function (yes) {
        if (!yes) return;
        MC.store.loadDemo();
        UI.toast('示例数据已载入', 'success');
      });
    },
    'clear-data': function () {
      UI.confirm({
        title: '清空所有记录？', message: '周期、每日日志与备注都会被删除且无法撤销。偏好设置会保留。',
        confirmText: '确认清空', danger: true,
      }).then(function (yes) {
        if (!yes) return;
        MC.store.resetRecords();
        UI.toast('记录已清空', 'success');
      });
    },
  });

  MC.views.settings = { render: render };
})();
