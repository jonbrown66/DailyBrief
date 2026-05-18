# daily-brief · 每日 AI/科技/财经/时政简报

每天自动生成一份单文件 HTML 报告，覆盖：

- **技术动态** — GitHub Trending 热榜、AI 资讯（OpenAI/DeepMind/Hugging Face/TLDR AI/Smol AI/Latent Space/MIT Tech Review）、X 推文（attentionvc 维度）
- **市场行情** — 21 个 ticker 的技术指标（SMA / RSI / MACD）+ 加密恐慌贪婪指数 + LLM 中文交易点评
- **时政观察** — BBC / Guardian / NYT / NPR / DW / Al Jazeera / The Diplomat 国际要闻
- **财经要点** — Bloomberg / WSJ / FT / BBC / Economist 全球财经
- **社区讨论** — V2EX / LinuxDo 中文社区热议

英文源附 LLM 生成的中文摘要。报告以 `daily_reports/<UTC日期>.html` 落盘，单文件、CSS+JS 全内联。

## 设计要点

- **本地驱动**：系统自带调度器触发（Windows Task Scheduler / macOS launchd / Linux cron），不依赖任何云服务
- **零 API key**：所有数据源走免费公开端点（RSS / 公开 JSON）；LLM 调用走本地登录的 [claude CLI](https://github.com/anthropics/claude-code)，扣 **Max 订阅额度**而非按 token 计费
- **错误隔离**：单源失败不阻断全流程，单次 LLM 失败有 1-shot 重试 + 兜底渲染
- **可观测**：每次任务运行写 `logs/daily-<日期>.log`，每次 LLM 调用写 `logs/claude-calls.jsonl`，`npm run quota-report` 查 Max 5h 滚动窗口热度

## 前置要求

- **Node.js 20+** + **npm**
- **Windows 10/11** / **macOS 12+** / **Linux**（任一平台都支持，定时机制自动适配）
- **Claude Code CLI** 已登录（[安装指南](https://docs.claude.com/en/docs/claude-code/quickstart)）
  - Max 订阅最划算；用 API key 也行（成本约 $0.5-2/天）
- **git**

## 给 AI Agent 一句话装

如果你正在用 Claude Code / Cursor / Codex 之类的 AI Agent，直接把下面这段发给它：

> 帮我装这个开源项目，跑 `node scripts/install.mjs --global` 完成全局安装，装好后告诉我下次自动触发的时间：
> https://github.com/leiting-eric/DailyBrief

Agent 会自动 `git clone` → `npm install` → 注册系统调度器 → 链接全局 skill → 跑一次 `npm run dry-run` 烟测。完成后任意目录打开 Claude Code 都能用 `/run-daily`、`/check-daily`，描述问题（"日报又挂了"）也能触发 `daily-brief` skill 自动加载。

> ⚠️ Agent 替不了 **claude CLI 的 OAuth 登录**（必须本人在浏览器点同意）。如果还没登录过，先跑一次：
> ```bash
> echo "hi" | claude --print --model sonnet
> ```
> 会引导你登录，登录一次永久生效。

## 一键安装（自己跑）

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node

# Windows PowerShell
irm https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node -
```

这条命令会：
1. 检查 Node / git / claude CLI 是否就位
2. `git clone` 到 `~/daily-brief`（Windows: `%USERPROFILE%\daily-brief`）
3. `npm install`
4. 注册系统定时（Windows Task Scheduler / macOS launchd / Linux cron，默认 16:00）
5. 写 `~/.daily-brief-config` 记录项目路径
6. 在 `~/.claude/` 建符号链接让 skill 和 slash command 全局可用
7. 跑一次 `npm run dry-run` 烟测

装完后**任意目录**打开 Claude Code 都能 `/run-daily`、`/check-daily`，描述问题也能触发 `daily-brief` skill 自动加载。

自定义安装位置或触发时间：

```bash
node bootstrap.mjs --target /custom/path --at 07:30
```

## 手动安装

```bash
# 1. clone + 依赖
git clone https://github.com/leiting-eric/DailyBrief.git
cd DailyBrief
npm install

# 2. 验证 claude CLI（如果没登录会引导你登录）
echo "say hi in Chinese" | claude --print --model sonnet

# 3. 注册定时 + 启用全局 skill
node scripts/install.mjs --global
# 也可指定时间：node scripts/install.mjs --at 07:30 --global
# 不带 --global 只装本地（只有在本目录打开的 Claude Code session 能用 /run-daily）

# 4. 立即触发一次测试
# Windows:  Start-ScheduledTask -TaskName DailyBrief
# macOS:    launchctl start com.daily-brief
# Linux:    node scripts/run-daily.mjs  (cron 不能手动 trigger)
```

下次触发时机：
- **Windows** — 系统会自动唤醒电脑（如在睡眠），跑完再回睡
- **macOS** — launchd 不会主动唤醒，电脑睡着的话跳过这次（需要 `pmset wake schedule` 配合）
- **Linux** — cron 同理，挂起期间不跑

## 日常命令

| 命令 | 用途 | 耗时 |
|---|---|---|
| `npm run daily` | 手动完整跑一次 | 5-8 min |
| `npm run dry-run` | 只抓取不调 LLM，验证数据源 | ~30s |
| `npm run render [date]` | 改了 CSS/排版后重渲染 | <1s |
| `npm run regen-trading [date]` | 重做交易部分 | ~2 min |
| `npm run regen-enrich <cat:sub> [date]` | 补缺失的中文摘要 | ~30s |
| `npm run open` | 在 Chrome 打开今日报告 | 即时 |
| `npm run quota-report` | 看 Sonnet 配额近况 | 即时 |

## Claude Code 集成

**装好后任意目录**（不必 cd 进项目）打开 Claude Code 都可用：

| 触发 | 行为 |
|---|---|
| `/run-daily` | 立即触发 daily 并后台监听到完成。从任意目录都行 |
| `/check-daily` | 查任务状态 + 报告文件 + 配额 |
| 描述问题（"日报又挂了"、"X 推文为啥没更新"等）| `daily-brief` skill 的关键词触发自动加载，让 Claude 直接懂这个项目 |

实现机制：`scripts/install.mjs --global` 在 `~/.claude/` 下建符号链接，指向项目内的 [.claude/skills/daily-brief/SKILL.md](.claude/skills/daily-brief/SKILL.md) 和 [.claude/commands/](.claude/commands/) 文件——**单一源**，编辑项目文件等于编辑用户级 skill。当 symlink 因权限受限失败时（如 Windows 无开发者模式），自动 fallback 到 copy。`~/.daily-brief-config` 记录项目实际路径，让 slash command 在任意 cwd 都能找到项目。

## 项目结构

```
daily-brief/
├── lib/
│   ├── sources/        # RSS / API / curl 抓取器；新加源在这里
│   ├── ai/             # claude CLI 调用 + Sonnet 提示词
│   ├── trading/        # Yahoo Finance + 技术指标
│   └── output/         # 渲染层 (HTML / Markdown)
├── scripts/
│   ├── daily.ts        # 主管线
│   ├── render.ts       # 重渲染
│   ├── regen-*.ts      # 局部重跑
│   ├── quota-report.ts # Sonnet 用量统计
│   ├── run-daily.mjs   # 调度器调用的包装
│   ├── open-report.mjs # 打开最新报告（跨平台）
│   ├── install.mjs     # 注册定时任务（Win/Mac/Linux 自适应）
│   └── uninstall.mjs   # 卸载
├── daily_reports/      # 输出 (gitignored)
├── logs/               # 运行日志 (gitignored)
└── .claude/
    ├── skills/         # Claude Code 操作 skill
    └── commands/       # slash commands
```

## 卸载

```bash
node scripts/uninstall.mjs
# 移除：定时任务 (Task Scheduler / launchd / cron) + ~/.claude/ 下的链接 + ~/.daily-brief-config
# 不动：项目文件、daily_reports/、logs/、power plan 设置
# 想彻底清理就 rm -rf 整个项目目录
```

## 自定义 / Fork

改源、改时间、改排版、加新栏目——见 [FORKING.md](FORKING.md)。

## License

MIT
