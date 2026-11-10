/* 每日记录编辑器（弹层）。草稿保存在 ui.editorDraft，重绘不丢失输入。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, M = MC.model, I = MC.icons.icon, UI = MC.ui;

  function open(date) {
    var S = MC.store;
    var k = date || S.ui.selected || U.today();
    S.ui.selected = k;
    S.ui.editorDate = k;
    S.ui.editorDraft = S.getLog(k);
    S.notify();
  }

  function close() {
    var S = MC.store;
    if (!S.ui.editorDate) return;
    S.ui.editorDate = null;
    S.ui.editorDraft = null;
    S.notify();
  }

  function chips(items, field, multi) {
    var d = MC.store.ui.editorDraft || M.emptyLog();
    var value = d[field];
    return '<div class="chip-group" data-group="' + field + '">' + items.map(function (x) {
      var on = multi ? (value || []).indexOf(x.id) >= 0 : value === x.id;
      return '<button type="button" class="chip' + (on ? ' active' : '') + '" data-action="chip" ' +
        'data-field="' + field + '" data-value="' + x.id + '" data-multi="' + (multi ? '1' : '0') + '"' +
        (x.color ? ' style="--chip:' + x.color + '"' : '') + '>' +
        (x.color ? '<i class="chip-dot"></i>' : '') + U.esc(x.label) + '</button>';
    }).join('') + '</div>';
  }

  function section(title, hint, body) {
    return '<div class="editor-section"><div class="editor-section-head"><h4>' + U.esc(title) + '</h4>' +
      (hint ? '<small>' + U.esc(hint) + '</small>' : '') + '</div>' + body + '</div>';
  }

  function renderOverlay() {
    var S = MC.store, ui = S.ui, k = ui.editorDate;
    if (!k) return '';
    var d = ui.editorDraft || M.emptyLog();
    var a = S.analysis();
    var mark = k === U.today() ? a.phase : a.markAt(k);
    var t = U.today();
    var openPeriod = S.openPeriod();
    var canStart = k <= t && !S.isInPeriod(k);
    var canEnd = !!openPeriod && k >= openPeriod.start && k <= t;
    var has = M.hasContent(S.getLog(k));

    var body =
      section('流量', '可多选时段记录，留空表示无', chips(M.FLOWS, 'flow', false)) +
      section('身体症状', '可多选', chips(M.SYMPTOMS.map(function (x) { return { id: x, label: x }; }), 'symptoms', true)) +
      section('心情', '', chips(M.MOODS, 'mood', false)) +
      section('分泌物', '', chips(M.DISCHARGES, 'discharge', false)) +
      section('身体数据', '选填，用于洞察页的趋势曲线',
        '<div class="form-grid">' +
          '<label class="field"><span>基础体温 (℃)</span><input type="number" step="0.1" min="33" max="42" data-draft="temp" value="' + U.esc(d.temp) + '" placeholder="36.5"></label>' +
          '<label class="field"><span>体重 (kg)</span><input type="number" step="0.1" min="20" max="300" data-draft="weight" value="' + U.esc(d.weight) + '" placeholder="52.0"></label>' +
        '</div>' + chips(M.INTIMACY.map(function (x) { return { id: x.id, label: x.label }; }), 'intimacy', false)) +
      section('备注', '想对自己说的话',
        '<textarea data-draft="notes" rows="3" maxlength="500" placeholder="今天感觉怎么样…">' + U.esc(d.notes) + '</textarea>');

    var footer =
      '<div class="editor-foot-left">' +
        (has ? '<button class="btn btn-ghost btn-sm" data-action="delete-log" data-date="' + k + '">' + I('trash', 15) + ' 删除</button>' : '') +
        (canStart ? '<button class="btn btn-soft btn-sm" data-action="cal-start-period" data-date="' + k + '">' + I('drop', 15) + ' 设为经期开始</button>' : '') +
        (canEnd ? '<button class="btn btn-soft btn-sm" data-action="cal-end-period" data-date="' + k + '">' + I('check', 15) + ' 设为经期结束</button>' : '') +
      '</div>' +
      '<div class="editor-foot-right">' +
        '<button class="btn btn-ghost" data-action="close-editor">取消</button>' +
        '<button class="btn btn-primary" data-action="save-editor">' + I('check', 16) + ' 保存记录</button>' +
      '</div>';

    return '<div class="overlay-backdrop editor-backdrop">' +
      '<div class="editor-panel" role="dialog" aria-modal="true">' +
        '<div class="editor-head">' +
          '<div><h3>' + U.esc(U.cnDate(k, true)) + '</h3><p>' + U.esc(U.weekdayCN(k)) + ' · ' +
            U.esc(U.relative(k)) + '</p></div>' +
          '<div class="editor-head-right">' + UI.pill(mark.label, mark.color, mark.soft) +
            '<button class="icon-btn" data-action="close-editor" aria-label="关闭">' + I('close', 18) + '</button></div>' +
        '</div>' +
        '<div class="editor-body">' + body + '</div>' +
        '<div class="editor-foot">' + footer + '</div>' +
      '</div></div>';
  }

  MC.actions.register({
    'open-editor': function (el) { open(el.getAttribute('data-date')); },
    'close-editor': function () { close(); },
    'save-editor': function () {
      var S = MC.store, k = S.ui.editorDate;
      if (!k) return;
      var draft = S.ui.editorDraft || M.emptyLog();
      S.ui.editorDate = null;
      S.ui.editorDraft = null;
      S.setLog(k, draft);
      UI.toast('已保存 ' + U.cnDate(k) + ' 的记录', 'success');
    },
    'delete-log': function (el) {
      var k = el.getAttribute('data-date');
      UI.confirm({
        title: '删除这一天的记录？', message: U.cnDate(k, true) + ' 的流量、症状与备注都会被删除。',
        confirmText: '删除', danger: true,
      }).then(function (yes) {
        if (!yes) return;
        close();
        MC.store.clearLog(k);
        UI.toast('记录已删除', 'success');
      });
    },
    'chip': function (el) {
      var S = MC.store, d = S.ui.editorDraft;
      if (!d) return;
      var field = el.getAttribute('data-field');
      var value = el.getAttribute('data-value');
      var multi = el.getAttribute('data-multi') === '1';
      if (multi) {
        var arr = (d[field] || []).slice();
        var i = arr.indexOf(value);
        if (i >= 0) arr.splice(i, 1); else arr.push(value);
        d[field] = arr;
      } else {
        d[field] = d[field] === value ? '' : value;
      }
      var group = el.closest('.chip-group');
      if (group) {
        Array.prototype.forEach.call(group.querySelectorAll('.chip'), function (c) {
          var v = c.getAttribute('data-value');
          var on = multi ? (d[field] || []).indexOf(v) >= 0 : d[field] === v;
          c.classList.toggle('active', on);
        });
      }
    },
  });

  MC.views.editor = { open: open, close: close, renderOverlay: renderOverlay };
})();
