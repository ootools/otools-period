/**
 * 真实浏览器冒烟：CDP 点击回归 + Panel 尺寸截图（无第三方依赖）。
 * 用法（服务 + Chrome 由外部拉起，见本文件末尾注释）：
 *   CDP_PORT=9231 BASE_URL=http://127.0.0.1:6491/ node scripts/smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(root, '_shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CDP_PORT = Number(process.env.CDP_PORT || 9231);
const BASE = process.env.BASE_URL || 'http://127.0.0.1:6491/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  let page = null;
  for (let i = 0; i < 20 && !page; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
    } catch (e) { /* Chrome 还在启动 */ }
    if (!page) await sleep(300);
  }
  if (!page) throw new Error('找不到 CDP 页面目标');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const jsErrors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      jsErrors.push((d.text || '') + ' ' + (d.exception && d.exception.description ? d.exception.description : ''));
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
  });
  return { send, jsErrors, ws };
}

async function main() {
  const { send, jsErrors } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 980, height: 700, deviceScaleFactor: 1, mobile: false,
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.text);
    return res.result && res.result.result ? res.result.result.value : undefined;
  };
  const exists = (sel) => evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const count = (sel) => evaluate(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
  const click = (sel) => evaluate(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true;})()`);
  const nav = (v) => click(`[data-action="nav"][data-view="${v}"]`);

  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
  };
  const shot = async (name) => {
    // 截图前清掉操作提示，避免浮动 Toast 遮挡界面
    await evaluate("(function(){var r=document.getElementById('toast-root');if(r)r.innerHTML='';return true;})()");
    const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (res.result && res.result.data) {
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(res.result.data, 'base64'));
      console.log(`  shot  ${name}.png`);
    }
  };
  const goto = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 30; i += 1) {
      await sleep(180);
      const ready = await evaluate('!!(window.MC && window.MC.store && window.MC.store.ui.ready)');
      if (ready) return;
    }
    throw new Error('页面加载超时：' + url);
  };

  // ── 首次打开 / 引导 ─────────────────────────────────
  await goto(BASE + '?reset=1');
  check('首次打开显示欢迎引导', await exists('.onboard-card'));
  check('引导可填经期开始日', await exists('#ob-start'));
  await shot('01-onboarding');

  await click('[data-action="onboard-demo"]');
  await sleep(350);
  check('载入示例后进入今日页', await exists('.ring-card'));
  check('周期环显示天数', /^\d+$/.test(String(await text('.ring-num')).trim()), await text('.ring-num'));
  check('三项预测数据齐全', (await count('.hero-stat')) === 3);
  check('最近 7 天横条', (await count('.week-cell')) === 7);
  check('未来节点列表', (await count('.event-row')) === 3);
  check('样式表已生效', (await evaluate("getComputedStyle(document.querySelector('.card')).borderRadius")) === '20px');
  check('面板宽度下无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    await evaluate('document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth'));
  await shot('02-today-light');

  await click('[data-action="theme-quick"]');
  await sleep(250);
  check('切换深色主题', (await evaluate("document.documentElement.getAttribute('data-theme')")) === 'dark');
  await shot('03-today-dark');
  await click('[data-action="theme-quick"]');
  await sleep(200);

  // ── 日历 ────────────────────────────────────────────
  await nav('calendar');
  await sleep(250);
  check('日历渲染 42 格', (await count('.cal-cell')) === 42);
  check('存在阶段标记', (await count('.cal-cell.is-period, .cal-cell.is-predicted, .cal-cell.is-fertile')) > 0);
  check('选中日详情卡', await exists('.detail-card'));
  await shot('04-calendar');
  const monthBefore = await text('.cal-head h2');
  await click('[data-action="cal-next"]');
  await sleep(150);
  check('切换月份', (await text('.cal-head h2')) !== monthBefore);
  await click('[data-action="cal-today"]');
  await sleep(150);
  await click('.cal-cell.is-today');
  await sleep(150);
  check('点选日期高亮', (await count('.cal-cell.is-selected')) === 1);

  // ── 记录编辑器 ──────────────────────────────────────
  await click('[data-action="quick-log"]');
  await sleep(250);
  check('打开记录编辑器', await exists('.editor-panel'));
  check('症状选项齐全', (await count('.chip[data-field="symptoms"]')) === 15);
  await shot('05-editor');
  await click('.chip[data-field="symptoms"]');
  await evaluate(`(function(){var t=document.querySelector('textarea[data-draft="notes"]');t.value='冒烟测试备注';t.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await click('[data-action="save-editor"]');
  await sleep(250);
  check('保存备注写入本机数据', (await evaluate('MC.store.getLog(MC.util.today()).notes')) === '冒烟测试备注');
  check('症状已写入日志', (await evaluate('MC.store.getLog(MC.util.today()).symptoms.length')) === 1);

  // ── 记录 / 洞察 / 设置 ──────────────────────────────
  await nav('records');
  await sleep(250);
  check('周期历史列表', (await count('.period-row')) >= 6, String(await count('.period-row')));
  check('每日日志列表', (await count('.log-row')) > 0);
  await shot('06-records');

  await nav('insights');
  await sleep(250);
  check('4 张 KPI 卡', (await count('.kpi-card')) === 4);
  check('SVG 图表渲染', (await count('svg.chart')) >= 3, String(await count('svg.chart')));
  check('心情环图', await exists('.donut'));
  await shot('07-insights');

  await nav('settings');
  await sleep(250);
  check('设置项齐全', (await count('.setting-row')) >= 8);
  check('数据管理入口', (await count('.data-btn')) === 4);
  await click('[data-action="set-accent"][data-value="sage"]');
  await sleep(150);
  check('切换主色', (await evaluate("document.documentElement.getAttribute('data-accent')")) === 'sage');
  await click('[data-action="set-accent"][data-value="rose"]');
  await sleep(150);
  await shot('08-settings');

  // ── 经期开关与持久化 ────────────────────────────────
  await nav('today');
  await sleep(200);
  const before = await evaluate('MC.store.data.periods.length');
  await click('[data-action="start-period"]');
  await sleep(250);
  check('新增经期周期', (await evaluate('MC.store.data.periods.length')) === before + 1);
  await click('[data-action="close-editor"]');
  await sleep(150);
  await click('[data-action="end-period"]');
  await sleep(200);
  check('结束本次经期', (await evaluate('MC.store.openPeriod()===null')) === true);
  check('导出 JSON 可解析', (await evaluate('JSON.parse(MC.store.serialize()).data.periods.length')) > 0);

  await goto(BASE);
  await sleep(350);
  check('重载后数据仍在', (await evaluate('MC.store.data.periods.length')) === before + 1);
  check('重载后不再显示引导', !(await exists('.onboard-card')));

  check('无 JS 运行时异常', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 项通过；截图目录：${SHOTS}`);
  if (failed.length) process.exitCode = 1;
  try { await send('Browser.close'); } catch (e) { /* 端口由外部命令兜底清理 */ }
}

try {
  await main();
} catch (error) {
  console.error('冒烟失败：' + (error.stack || error.message));
  process.exitCode = 1;
}
