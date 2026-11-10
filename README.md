# 月汐 · Luna Period（OTools 独立插件）

一个**完全离线**的女性经期管理插件。以 **Panel 面板**为默认打开方式（`openMode: panel`），
打开即进入「今日」页。原生 JS + CSS 实现，无框架、无构建依赖、无网络请求、无第三方统计。

## 功能

| 模块 | 内容 |
| --- | --- |
| 今日 | 周期进度环、当前阶段与贴心提示、下次经期 / 排卵日 / 易孕期预测、快捷开启与结束经期、流量速记、最近 7 天、今日记录摘要、经期临近提醒 |
| 日历 | 月视图（前后月切换 / 回到今天）、经期 / 预测经期 / 易孕期 / 排卵日 / 有记录五类标记、点选任意一天查看阶段与记录、当月统计 |
| 记录 | 周期历史（起止日期、经期天数、周期长度，可增删改）、每日日志列表、周期编辑弹层 |
| 洞察 | 4 项 KPI、周期长度柱状图、症状频次排行、心情分布环图、流量分布、基础体温与体重趋势、周期规律小结 |
| 记录编辑器 | 流量、15 种症状、心情、分泌物、基础体温、体重、亲密行为、备注；可直接把某天设为经期开始 / 结束 |
| 设置 | 自动 / 手动预测、周期与经期长度、黄体期长度、经期提醒、浅色 / 深色 / 跟随系统、三套主色、昵称、隐私模式、JSON 导入导出、示例数据、清空记录 |

预测算法取最近 6 个有效周期间隔（18–60 天）的均值，样本不足时回退到设置值；
排卵日 = 下次经期开始日 − 黄体期长度，易孕期 = 排卵日前 5 天至后 1 天。
预测可信度按样本数与标准差分为高 / 中 / 低。

## 隐私

- 所有数据保存在插件 WebView 的 `localStorage`（key `otools-period.v1`），**不联网、不上传**。
- 导入 / 导出通过 OTools 宿主文件对话框（或浏览器下载 / 选择文件回退）完成，文件由用户自己保管。
- 提供「隐私模式」，可模糊页面上的敏感数字，鼠标悬停时恢复。
- 周期推算仅供参考，不能作为避孕或医疗判断依据。

## 目录

```
otools-period/
├── plugin.json            # 清单：openMode=panel / panelWidth=980 / panelHeight=700
├── logo.svg               # 插件图标
├── web/                   # 源码（纯前端，多文件模块化）
│   ├── index.html         # 入口 + 宿主桥标记
│   ├── css/app.css
│   └── js/                # util / bridge / model / demo / store / icons / ui / charts / views / app
├── scripts/               # 构建、打包、校验、预览、同步到主仓库
├── dist/                  # 构建产物（web/ 的拷贝，不入库）
└── dist-pack/             # .oplg 发布包与摘要（不入库）
```

## 构建与校验

```bash
node scripts/build-web.mjs                      # web/ → dist/
node scripts/serve-dist.mjs 6486                # 本地预览 http://127.0.0.1:6486/
node scripts/pack-plugin.mjs --out dist-pack --version 1.0.0
node scripts/verify-plugin.mjs dist-pack        # 校验 ZIP / CRC / SHA256 / 入口桥
```

预览参数：

- `?demo=1` 首次打开时载入一组演示数据（可完整体验图表与日历）
- `?reset=1` 清空本机数据
- `?theme=dark` / `?theme=light` 强制主题

## 浏览器冒烟（可选）

`scripts/smoke.mjs` 通过 Chrome CDP 在 980×700 的 Panel 视口里做真实点击回归：首次引导、五个页签、
记录编辑器、经期开启 / 结束、数据持久化、导出 JSON、无 JS 异常、面板宽度下无横向溢出；
并把 8 张界面截图写入 `_shots/`（已被 `.gitignore` 忽略）。

服务、Chrome、测试必须写在**同一条 shell 命令**里执行（后台进程跨命令不存活），
Windows 下 Chrome 用绝对路径，且每次换一组新端口，避免旧服务残留导致请求打到旧代码上：

```bash
cd D:/Repos/xyito/otools/otools-period
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$NODE" scripts/serve-dist.mjs 6491 > _shots/serve.log 2>&1 & SRV=$!
"$CHROME" --headless=new --disable-gpu --no-first-run --remote-allow-origins='*' --remote-debugging-port=9231 --user-data-dir="D:/Repos/xyito/otools/otools-period/_shots/profile" --window-size=980,700 about:blank > _shots/chrome.log 2>&1 & CHR=$!
sleep 3; CDP_PORT=9231 BASE_URL=http://127.0.0.1:6491/ "$NODE" scripts/smoke.mjs
kill $SRV $CHR 2>/dev/null
```

## 安装到 OTools 本地试跑

两种方式：

1. **离线安装**：把 `dist-pack/otools-period-1.0.0.oplg` 拖进 OTools 插件仓库的「本地安装」。
2. **同步到主仓库**（会写入 OTools 主仓库的 `plugins/otools-period/`，请确认后再执行）：

```powershell
pwsh -File scripts/deploy-to-otools.ps1 -OtoolsRoot D:/Repos/xyito/otools/otools
```

同步后重启 / 重载 OTools，插件会以 Panel 面板形式打开。

## 宿主桥

`web/js/bridge.js` 同时支持 `window.otools` 包装 API 与 Tauri IPC 两条通道，
用于导入 / 导出 JSON；两条都不通时（普通浏览器预览）自动退回浏览器原生文件能力。
文件写入遵循 `tools_webview_write_file` 的 `request` 结构体约定。

---

## 独立仓库与发版

本插件是 `ootools` 组织下的独立 public 仓库：`git@github.com:ootools/otools-period.git`（默认分支 `main`），
并在 xyito 主仓库中以子模块 `otools/otools-period` 挂载。

- `.github/workflows/build-plugin.yml`：push / PR / 手动触发，构建 `web/ → dist/`、打包并校验 `.oplg`。
- `.github/workflows/release-plugin.yml`：手动触发或推送 `v*` 标签。默认 `dry_run=true` 只构建校验；
  关掉 dry-run 才创建 GitHub Release。上架 OTools 插件市场需先配置 secret `XYCLOUD_PAT`，
  并显式传 `publish_market=true`。

```bash
gh workflow run release-plugin.yml --repo ootools/otools-period --ref main \
  -f display_version=<版本号> -F publish_market=true -F dry_run=false
```

> `plugin.json` 的版本号是唯一事实来源：发版前先 +1 并推送 main，
> xyito 里的子模块指针也要同步提交推送。
