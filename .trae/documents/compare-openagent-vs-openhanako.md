# 编程 Agent 项目全面对比分析

> **对比对象**
> - **项目 A**：`oh-my-openagent-dev`（v4.12.1，代号 "oh-my-openagent"）
> - **项目 B**：`openhanako-main`（v0.341.13，代号 "HanaAgent"）

---

## 0. 一句话定位（结论先行）

| 维度 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **本质** | OpenCode 插件式**编程 Agent 编排框架**（Harness） | Electron **通用个人 AI 助手**桌面应用 |
| **核心场景** | 代码生成 / 重构 / 调试 / 多 Agent 协作编程 | 聊天陪伴 / 自动化 / 多平台消息 / 办公 / 编程 |
| **运行形态** | CLI / TUI（Bun 运行时） | 桌面应用（Electron）+ HTTP/WS Server + CLI |
| **编程能力深度** | ⭐⭐⭐⭐⭐ 极深（11 个专职编程 Agent + LSP + AST-Grep） | ⭐⭐⭐ 中等（基于 Pi-Coding-Agent，工具丰富但非专精） |
| **通用能力广度** | ⭐⭐ 较窄（纯编程域） | ⭐⭐⭐⭐⭐ 极广（编程 + 办公 + 消息 + 桌面自动化） |

**综合判断：如果衡量标准是"编程 Agent 综合能力"，oh-my-openagent-dev 明显更强；如果是"通用 AI 助手综合能力"，openhanako-main 更全面。**

---

## 1. 核心架构与技术栈差异

### 1.1 架构模式

#### oh-my-openagent-dev — 插件式 Harness 架构

- **不是独立应用**，而是 [OpenCode](https://github.com/opencode-ai) 的插件（`@opencode-ai/plugin` + `@opencode-ai/sdk`）
- 入口：[packages/omo-opencode/src/index.ts](file:///c:/Users/Administrator/Desktop/IDE/oh-my-openagent-dev/packages/omo-opencode/src/index.ts) 导出 `PluginModule`
- 通过 **14 个 OpenCode Hook 处理器**接入宿主（`config`、`tool`、`chat.message`、`chat.params`、`tool.execute.before/after` 等）
- 全程 **工厂函数模式**（`createXXX()`），无类继承，函数式组合
- **双版本策略**：
  - Ultimate Edition（`omo-opencode`）— 完整插件，11 Agent + 54+ Hooks + 5 内置 MCP
  - Light Edition（`omo-codex` / `lazycodex-ai`）— Codex CLI 可移植组件包（8 组件）

#### openhanako-main — 分层桌面应用架构

- **独立全栈应用**：Electron 主进程 → Hono HTTP/WS Server → Hub 调度层 → Engine 门面 → Managers → Libraries
- 入口：[desktop/bootstrap.cjs](file:///c:/Users/Administrator/Desktop/IDE/openhanako-main/desktop/bootstrap.cjs)（桌面）/ [server/index.ts](file:///c:/Users/Administrator/Desktop/IDE/openhanako-main/server/index.ts)（服务端）/ [cli/entry.ts](file:///c:/Users/Administrator/Desktop/IDE/openhanako-main/cli/entry.ts)（CLI）
- [core/engine.ts](file:///c:/Users/Administrator/Desktop/IDE/openhanako-main/core/engine.ts) 是**门面模式**（Thin Facade），持有 10+ Manager 并委托执行
- **Hub 层**独立处理后台任务：EventBus、ChannelRouter、Scheduler、DmRouter

### 1.2 技术栈对比

| 技术维度 | oh-my-openagent-dev | openhanako-main |
|----------|---------------------|-----------------|
| **语言** | TypeScript（strict, ESNext） | TypeScript（ESM）+ Electron 主进程 JS |
| **运行时** | **Bun 1.3.12**（唯一支持） | **Node.js ≥24.12** |
| **包管理** | Bun（部分 Node 包用 npm） | npm |
| **UI 框架** | @opentui/solid（终端 TUI） | **React 19 + Electron 42**（桌面 GUI） |
| **HTTP 服务** | 无（依赖 OpenCode 宿主） | **Hono 4** + WebSocket |
| **Agent 运行时** | 自研 Agent 系统 | **Pi SDK**（`@mariozechner/pi-ai` + `pi-coding-agent`） |
| **数据库** | 无持久化 DB | **better-sqlite3**（WAL 模式，FTS5 全文搜索） |
| **终端模拟** | tmux 集成 | **node-pty** |
| **Schema 验证** | **Zod v4** | Zod（shared/config） |
| **构建工具** | Bun build + tsgo 类型检查 | **Vite 7 + esbuild + electron-builder** |
| **测试框架** | **Bun test**（co-located `*.test.ts`） | **Vitest 4**（500+ 测试文件） |
| **License** | SUL-1.0（源码可见，非 OSI 开源） | 未明确（需检查 LICENSE） |
| **版本成熟度** | v4.12.1 | v0.341.13（高频迭代） |

### 1.3 项目规模

| 规模指标 | oh-my-openagent-dev | openhanako-main |
|----------|---------------------|-----------------|
| **Monorepo 包数** | 37 个 packages | 4 个 packages（plugin-sdk 系列） |
| **Agent 数量** | 11 个专职 Agent | 多 Agent 实例（动态创建） |
| **工具数量** | 20-39 个（配置门控） | 30+ 个工具 |
| **Hook 数量** | 53-60 个生命周期 Hook | N/A（事件驱动 EventBus） |
| **技能数** | 17 个 SKILL.md | 4 个内置技能 |
| **插件系统** | Claude Code 兼容插件 + MCP | 独立插件系统（`plugins/` 6 个内置） |
| **LLM 提供商** | ~10 家 | **30+ 家**（含中国厂商全覆盖） |

---

## 2. 功能模块对比

### 2.1 代码生成与编辑

| 能力 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **编辑机制** | **Hashline**（哈希锚定 `LINE#ID` 编辑，内容过期自动拒绝） | 通用 file-tool 读写 |
| **多文件编辑** | ✅ 支持，Agent 可批量操作 | ✅ 支持，file-tool |
| **AST 级操作** | ✅ **AST-Grep**（覆盖 25 种语言的模式感知搜索/重写） | ❌ 无专用 AST 工具 |
| **LSP 集成** | ✅ **深度集成**（goto-definition、find-references、symbols、diagnostics、rename）— 自研 `lsp-daemon` + `lsp-tools-mcp` | ❌ 无 LSP 集成 |
| **代码审查** | ✅ Momus Agent（计划审查）+ `review-work` 技能 | ❌ 无专用审查模块 |

**结论：代码生成与编辑精度，oh-my-openagent-dev 远超 openhanako-main。**

### 2.2 调试能力

| 能力 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **诊断** | ✅ LSP diagnostics（实时） | ❌ |
| **交互式调试** | ✅ tmux 交互式终端（REPL/调试器/TUI） | ✅ node-pty 终端会话 |
| **只读架构咨询** | ✅ Oracle Agent（专职只读顾问） | ❌ |
| **错误分析** | ✅ Session 错误捕获 + runtime-fallback | ✅ error-bus（shared/） |
| **沙箱隔离** | ❌ 无 OS 级沙箱 | ✅ **双层沙箱**（PathGuard + macOS Seatbelt / Linux Bubblewrap / Windows 受限令牌） |

### 2.3 多语言支持

| 能力 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **编程语言覆盖** | ✅ LSP（理论支持所有 LSP 语言）+ AST-Grep（25 种） | ⚠️ 依赖 Pi-Coding-Agent（通用代码能力） |
| **自然语言 UI** | 5 语言（EN/KO/JA/ZH-CN/RU） | 5 语言（ZH/EN/JA/KO/ZH-TW） |
| **中文优化** | ✅ README 中文版 | ✅ **深度中文优化**（Jieba 分词、中国 LLM 厂商全覆盖） |

### 2.4 项目理解深度

| 能力 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **上下文发现** | ✅ `agents-md-core` 向上遍历 `AGENTS.md` 文件树 | ⚠️ workspace 概念 + 授权文件夹 |
| **自动上下文生成** | ✅ `/init-deep` 技能（自动生成层级化上下文文件） | ❌ |
| **代码搜索** | ✅ grep + glob + Explore Agent（专职快速搜索） | ✅ 通用 file 操作 |
| **代码图谱** | ✅ `codegraph` MCP | ❌ |
| **外部文档搜索** | ✅ Librarian Agent（专职外部文档/代码搜索） | ✅ web-search + web-fetch |

### 2.5 多 Agent 协作

| 能力 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **架构** | 固定 11 Agent + 8 委派类别 | 动态 Agent 实例 + subagent-tool |
| **并行执行** | ✅ **Team Mode**（最多 8 并行成员 + tmux 可视化） | ✅ 非阻塞 subagent + deferred results |
| **角色分工** | ✅ 明确（规划/执行/审查/搜索/咨询） | ⚠️ 通用（每个 Agent 可独立人格） |
| **对抗式审查** | ✅ `hyperplan`（5 个敌对审查者）+ `security-research`（3 猎手 + 2 PoC 工程师） | ❌ |
| **Agent 间通信** | ✅ 共享邮箱 + 任务列表（Team Mode） | ✅ channel-tool + dm-tool |

### 2.6 独有能力对比

#### oh-my-openagent-dev 独有
- **Claude Code 全兼容**（hooks/commands/skills/MCPs/plugins 原样运行）
- **Hashline 哈希锚定编辑**（防止并发冲突）
- **3 层 MCP 系统**（内置 + Claude `.mcp.json` + 技能嵌入 MCP with OAuth 2.0/PKCE）
- **Ralph Loop**（自引用循环直到任务完成）
- **IntentGate 意图分类**（`keyword-detector` 在行动前分类）
- **Todo Enforcer**（强制 Agent 使用 todo 列表）
- **Comment Checker**（阻止 AI 生成的冗余注释）

#### openhanako-main 独有
- **持久化记忆系统**（高斯衰减模型：`score × e^(-λ × t²)`，FTS5 全文搜索）
- **多平台消息桥接**（Telegram / 飞书 / QQ / 微信 / 钉钉）
- **Computer Use**（原生 OS 自动化：macOS CUA + Windows UIA）
- **浏览器自动化**（WebSocket 控制 + 截图）
- **角色卡导入/导出**（zip 包本地优先）
- **人格系统**（ishiki 模板 = "意识"模板）
- **多模态生成**（图片生成插件 `jimeng-cli` + `image-gen`）
- **办公文档处理**（Word/Excel/PDF，mammoth + exceljs + unpdf）
- **Electron 桌面体验**（系统托盘、自动更新、主题、拖拽）

---

## 3. 性能表现差异（基于架构推断）

> **注意**：以下为基于架构和代码分析的推断，非实测数据。

### 3.1 响应速度

| 指标 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **冷启动** | ⚡ 快（Bun 运行时，TUI 无 GUI 开销） | 🐢 较慢（Electron + React + Server 三层启动） |
| **工具执行** | ⚡ 快（进程内调用，Bun JIT） | ⚠️ 中等（HTTP/WS 跨进程通信） |
| **上下文加载** | ⚡ 快（AGENTS.md 即时读取） | ⚠️ 中等（SQLite 查询 + 记忆编译） |
| **大文件处理** | ✅ LSP 增量分析 | ⚠️ 全量读取 |

### 3.2 准确率（编程任务）

| 指标 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **代码编辑精度** | ⭐⭐⭐⭐⭐ Hashline 防冲突 + LSP 验证 | ⭐⭐⭐ 通用文件读写 |
| **符号定位** | ⭐⭐⭐⭐⭐ LSP 精确定位 | ⭐⭐ 文本搜索 |
| **重构安全性** | ⭐⭐⭐⭐⭐ LSP rename + AST-Grep | ⭐⭐ 文本替换 |
| **错误检测** | ⭐⭐⭐⭐⭐ LSP diagnostics 实时 | ⭐⭐ 运行时错误 |

### 3.3 资源占用

| 指标 | oh-my-openagent-dev | openhanako-main |
|------|---------------------|-----------------|
| **内存** | 🟢 低（~100-200MB，TUI） | 🔴 高（~500MB-1GB，Electron） |
| **CPU** | 🟢 低（事件驱动） | 🟡 中（React 渲染 + SQLite） |
| **磁盘** | 🟢 低（无数据库） | 🟡 中（SQLite + 记忆存储） |
| **并发** | 🟢 5+ 后台 Agent + 8 Team 成员 | 🟡 subagent 并行（数量可配置） |

---

## 4. 使用场景与适用范围

### 4.1 oh-my-openagent-dev 适用场景

```
✅ 适合                          ❌ 不适合
─────────────────────────────────────────────
专业软件开发                      日常聊天陪伴
大规模代码重构                    多平台消息转发
代码审查与安全审计                办公文档处理
多 Agent 并行编程                 桌面 UI 自动化
CLI/TUI 工作流                    需要 GUI 的场景
OpenCode / Claude Code 生态      非 OpenCode 宿主
```

**目标用户**：专业程序员、DevOps 工程师、安全研究员

### 4.2 openhanako-main 适用场景

```
✅ 适合                          ❌ 不适合
─────────────────────────────────────────────
个人 AI 助手                     专业级代码重构
多平台消息机器人                  大规模代码审查
自动化办公流程                    LSP 级代码导航
桌面任务自动化                    纯 CLI 工作流
需要持久记忆的长期陪伴             无 GUI 服务器环境
跨平台桌面应用                    仅编程场景
```

**目标用户**：普通用户、内容创作者、社群运营者、需要多平台集成的用户

### 4.3 场景重叠区

两者在以下场景有重叠，但 oh-my-openagent-dev 更专精：
- 基础代码生成与问答
- 项目理解与探索
- Web 搜索与文档查询

---

## 5. 优缺点评估

### 5.1 oh-my-openagent-dev

**优点：**
1. ✅ **编程能力极深**：LSP + AST-Grep + Hashline 三件套，达到 IDE 级精度
2. ✅ **多 Agent 编排成熟**：11 个专职 Agent，角色清晰，Team Mode 支持并行
3. ✅ **Claude Code 全兼容**：生态迁移成本为零
4. ✅ **Bun 性能优势**：启动快、内存低
5. ✅ **文档极其详尽**：每个包都有 AGENTS.md，多语言 README
6. ✅ **测试纪律严格**：两个元审计测试文件强制架构不变量
7. ✅ **模型回退策略完善**：6 步模型解析管道，双回退系统

**缺点：**
1. ❌ **强依赖 OpenCode 宿主**：不能独立运行（Light Edition 依赖 Codex CLI）
2. ❌ **通用能力窄**：无消息桥接、无桌面自动化、无文档处理
3. ❌ **SUL-1.0 非真正开源**：源码可见但限制商用
4. ❌ **架构正在大重构**：根 AGENTS.md 明确标注"正在拆毁重建"
5. ❌ **Bun 强依赖**：不支持 Node.js 运行时
6. ❌ **无 GUI**：纯 TUI，不适合需要可视化的场景
7. ❌ **无持久化记忆**：会话间无记忆连续性

### 5.2 openhanako-main

**优点：**
1. ✅ **通用能力极广**：编程 + 办公 + 消息 + 桌面自动化一站式
2. ✅ **持久化记忆创新**：高斯衰减模型模拟人类遗忘，FTS5 搜索
3. ✅ **多平台桥接丰富**：Telegram/飞书/QQ/微信/钉钉全覆盖
4. ✅ **30+ LLM 提供商**：中国厂商支持最全面
5. ✅ **桌面体验优秀**：Electron + React 19，系统托盘 + 自动更新
6. ✅ **沙箱安全**：双层隔离（PathGuard + OS 级）
7. ✅ **插件生态友好**：SDK + Runtime + Protocol + Components 完整体系
8. ✅ **测试覆盖极高**：500+ 测试文件
9. ✅ **Computer Use**：原生 OS 自动化能力

**缺点：**
1. ❌ **编程能力不专精**：无 LSP、无 AST-Grep、无代码图谱
2. ❌ **资源占用高**：Electron 固有缺点
3. ❌ **依赖 Pi SDK**：核心 Agent 能力受第三方约束
4. ❌ **编程场景下精度不足**：文本级操作，无符号级理解
5. ❌ **无 Team Mode**：缺乏对抗式审查机制
6. ❌ **版本号 0.341.x**：暗示尚未达到 1.0 稳定

---

## 6. 综合能力评判

### 6.1 评分矩阵（满分 10 分）

| 维度 | oh-my-openagent-dev | openhanako-main |
|------|:---:|:---:|
| **代码生成精度** | 9.5 | 6.0 |
| **调试能力** | 9.0 | 5.0 |
| **多语言编程支持** | 9.5 | 5.5 |
| **项目理解深度** | 9.0 | 6.0 |
| **多 Agent 协作** | 9.5 | 7.0 |
| **LLM 覆盖广度** | 7.0 | 9.5 |
| **通用任务能力** | 3.0 | 9.0 |
| **持久化记忆** | 2.0 | 9.0 |
| **多平台集成** | 1.0 | 9.5 |
| **桌面体验** | 2.0 | 9.0 |
| **安全性（沙箱）** | 4.0 | 8.5 |
| **文档质量** | 9.5 | 8.0 |
| **测试覆盖** | 8.0 | 9.0 |
| **性能（响应速度）** | 9.0 | 6.0 |
| **性能（资源占用）** | 9.0 | 5.0 |
| **架构成熟度** | 7.0（重构中） | 8.0 |
| **编程综合** | **⭐ 9.2/10** | **⭐ 5.8/10** |
| **通用综合** | **⭐ 4.5/10** | **⭐ 8.7/10** |

### 6.2 最终判断

> **问题回顾：哪个项目在"综合能力"上表现更强？**

**答案取决于"综合能力"的定义域：**

#### 如果"综合能力"= 编程 Agent 能力（用户问题核心）
**🏆 oh-my-openagent-dev 胜出（9.2 vs 5.8）**

**判断依据：**
1. **代码精度碾压**：Hashline + LSP + AST-Grep 提供 IDE 级编辑精度，openhanako 仅文本级
2. **Agent 编排成熟**：11 个专职编程 Agent + Team Mode 对抗式审查，openhanako 依赖通用 Pi SDK
3. **编程专用工具链**：LSP diagnostics/goto/rename、codegraph MCP、init-deep 上下文生成，openhanako 均缺失
4. **Claude Code 兼容**：可直接复用整个 Claude 生态的 skills/commands/MCPs

#### 如果"综合能力"= 通用 AI 助手能力
**🏆 openhanako-main 胜出（8.7 vs 4.5）**

**判断依据：**
1. **能力广度碾压**：编程+办公+消息+桌面自动化，oh-my-openagent 仅编程域
2. **持久化记忆**：高斯衰减模型，oh-my-openagent 无跨会话记忆
3. **多平台覆盖**：5 大消息平台桥接，oh-my-openagent 无
4. **LLM 覆盖**：30+ 提供商（中国厂商全覆盖），oh-my-openagent ~10 家
5. **桌面体验**：Electron GUI + 系统托盘 + 自动更新，oh-my-openagent 纯 TUI

### 6.3 总结论

用户问题明确指向"**编程 Agent 项目**"对比，因此：

> **oh-my-openagent-dev 在编程 Agent 综合能力上表现更强。**
>
> 它在代码生成精度、调试能力、项目理解深度、多 Agent 协作、编程专用工具链等核心维度上全面领先。其 LSP + AST-Grep + Hashline 的组合达到了 IDE 级别的代码操作精度，11 个专职 Agent + Team Mode 的编排能力远超 openhanako-main 基于通用 Pi SDK 的实现。
>
> 但需注意：oh-my-openagent-dev 是**专精型**工具（编程域极深、通用域极窄），openhanako-main 是**广博型**工具（通用域极广、编程域中等）。两者不是同一赛道的竞品，而是互补关系。

---

## 实施步骤

本任务为**纯分析研究任务**，不涉及代码修改。分析已完成，上述文档即为最终交付物。

1. ✅ Phase 1：探索两个项目代码库（已完成）
2. ✅ Phase 2：生成对比分析文档（本文档）
3. ⬜ Phase 3：向用户展示分析结果

## 假设与决策

1. **假设**：用户关心的"综合能力"以编程 Agent 能力为主（基于问题中"编程 Agent 项目"的措辞）
2. **决策**：性能部分基于架构推断而非实测（未运行实际 benchmark）
3. **决策**：评分矩阵基于探索到的代码结构和功能模块，主观权重已标注
4. **局限**：oh-my-openagent-dev 根 AGENTS.md 声明正在大重构，当前分析基于现有代码状态
