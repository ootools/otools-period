/* 首次使用引导：只需一次经期开始日即可开启预测 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  MC.views = MC.views || {};
  var U = MC.util, I = MC.icons.icon, UI = MC.ui;

  function renderOverlay() {
    var t = U.today();
    return '<div class="overlay-backdrop onboard-backdrop">' +
      '<div class="onboard-card">' +
        '<div class="onboard-art">' +
          '<span class="onboard-orbit"></span><span class="onboard-moon">' + I('moon', 42) + '</span>' +
          '<span class="onboard-star s1">✦</span><span class="onboard-star s2">✧</span>' +
          '<span class="onboard-flower">' + I('flower', 26) + '</span>' +
        '</div>' +
        '<h2>欢迎来到 <em>月汐</em></h2>' +
        '<p>一个安静、私密的地方，记录身体的节律。<br>只需一次经期开始日，就能开启周期预测。</p>' +
        '<div class="onboard-form">' +
          '<label class="field"><span>最近一次经期开始日</span>' +
            '<input type="date" id="ob-start" value="' + t + '" max="' + t + '"></label>' +
          '<label class="field"><span>平均周期长度</span>' +
            '<span class="input-suffix"><input type="number" id="ob-cycle" value="28" min="18" max="60"><i>天</i></span></label>' +
        '</div>' +
        '<button class="btn btn-primary btn-block" data-action="onboard-start">' + I('sparkle', 17) + ' 开始记录</button>' +
        '<div class="onboard-links">' +
          '<button class="link-btn" data-action="onboard-demo">先看看示例数据</button>' +
          '<button class="link-btn" data-action="onboard-skip">暂时跳过</button>' +
        '</div>' +
        '<p class="onboard-privacy">' + I('lock', 14) + ' 所有数据只保存在本机，不联网、不上传</p>' +
      '</div></div>';
  }

  MC.actions.register({
    'onboard-start': function () {
      var start = document.getElementById('ob-start');
      var cycle = document.getElementById('ob-cycle');
      var date = start && start.value;
      var len = Number(cycle && cycle.value) || 28;
      if (!date) { UI.toast('请选择经期开始日', 'error'); return; }
      if (date > U.today()) { UI.toast('开始日期不能晚于今天', 'error'); return; }
      var S = MC.store;
      S.setSettings({ cycleLength: U.clamp(len, 18, 60) });
      var res = S.startPeriod(date);
      if (!res.ok) { UI.toast('该日期已在经期区间内', 'error'); return; }
      S.setOnboarding(false);
      UI.toast('已开启第一个周期，预测开始生效', 'success');
    },
    'onboard-demo': function () {
      MC.store.loadDemo();
      UI.toast('示例数据已载入，随时可在设置里清空', 'success');
    },
    'onboard-skip': function () {
      MC.store.setOnboarding(false);
      UI.toast('可随时在「今日」或「记录」里添加经期', 'info');
    },
  });

  MC.views.onboarding = { renderOverlay: renderOverlay };
})();
