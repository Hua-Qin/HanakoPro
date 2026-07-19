# Tasks

## Phase 1: 核心基础设施（模式定义与映射）

- [ ] Task 1: 创建会话模式核心定义 `core/session-mode.ts`
  - [ ] SubTask 1.1: 定义 `SessionMode` 类型（`"research" | "programming"`）和枚举常量
  - [ ] SubTask 1.2: 定义模式-工具映射表 `MODE_TOOL_MAP`（research 工具集 / programming 工具集）
  - [ ] SubTask 1.3: 定义模式-提示词策略映射 `MODE_PROMPT_STRATEGY`
  - [ ] SubTask 1.4: 导出模式判定辅助函数（`isResearchMode()` / `isProgrammingMode()`）

- [ ] Task 2: 创建模式切换管理器 `core/session-mode-manager.ts`
  - [ ] SubTask 2.1: 实现 `SessionModeManager` 类，持有当前模式状态
  - [ ] SubTask 2.2: 实现 `switchMode(newMode)` 方法 — 切换模式并保持上下文
  - [ ] SubTask 2.3: 实现 `getMode()` / `setMode()` 方法
  - [ ] SubTask 2.4: 实现模式切换事件发射（通过 EventBus 通知工具系统、提示词系统、UI）
  - [ ] SubTask 2.5: 实现模式初始化逻辑（从偏好加载默认模式，启动时间 <300ms）

- [ ] Task 3: 创建模式-工具映射注册表 `lib/tools/mode-tool-registry.ts`
  - [ ] SubTask 3.1: 定义 `ResearchModeTools` 工具集清单（bash/edit/json_edit/sequentialthinking/task_done/ckg）
  - [ ] SubTask 3.2: 定义 `ProgrammingModeTools` 工具集清单（hashline_edit/lsp_*/team_*/task/call_omo_agent）
  - [ ] SubTask 3.3: 实现 `getToolsForMode(mode)` 函数 — 返回该模式可用工具名列表
  - [ ] SubTask 3.4: 实现 `filterToolsByMode(tools, mode)` 函数 — 过滤工具数组

- [ ] Task 4: 扩展配置持久化层
  - [ ] SubTask 4.1: 修改 `core/preferences-manager.ts` — 新增 `getSessionModeDefault()` / `setSessionModeDefault(mode)`
  - [ ] SubTask 4.2: 修改 `core/session-manifest/store.ts` — 新增 `session_mode` 字段建表/读写
  - [ ] SubTask 4.3: 修改 `shared/config-schema.ts` — 新增 `sessionMode` scope 定义
  - [ ] SubTask 4.4: 修改 `core/session-coordinator.ts` — 新增 `getSessionMode()` / `setSessionMode()` 方法

## Phase 2: API 端点与前端状态

- [ ] Task 5: 扩展 API 端点
  - [ ] SubTask 5.1: 在 `server/index.ts` 新增 `GET /api/session-mode` 端点
  - [ ] SubTask 5.2: 在 `server/index.ts` 新增 `POST /api/session-mode` 端点（支持 currentSessionOnly / pendingNewSession）
  - [ ] SubTask 5.3: 在 `server/routes/preferences.ts` 新增 `GET/PUT /api/preferences/session-mode-default`

- [ ] Task 6: 扩展前端类型与状态管理
  - [ ] SubTask 6.1: 修改 `desktop/src/react/types.ts` — 新增 `SessionMode = 'research' | 'programming'` 类型
  - [ ] SubTask 6.2: 修改 `desktop/src/react/stores/session-slice.ts` — 新增 `sessionMode` 状态字段和 normalize 逻辑
  - [ ] SubTask 6.3: 修改 `desktop/src/react/stores/session-actions.ts` — 新增 `switchSessionMode` action
  - [ ] SubTask 6.4: 实现前端模式切换的 API 调用和状态同步

## Phase 3: 模式选择 UI 组件

- [ ] Task 7: 开发 `SessionModeSelector` 组件
  - [ ] SubTask 7.1: 创建 `desktop/src/react/components/input/SessionModeSelector.tsx` 基础结构
  - [ ] SubTask 7.2: 实现"研究"/"编程"/"展开项"三按钮布局
  - [ ] SubTask 7.3: 实现选中状态高亮（active 样式 + 图标变化）
  - [ ] SubTask 7.4: 实现"展开项"点击展开 4 个权限子选项（自动审核/完整权限/操作前询问/只阅读模式）
  - [ ] SubTask 7.5: 实现展开/收起动画（CSS transition，时长 200-300ms）
  - [ ] SubTask 7.6: 实现权限子选项选中后的自动收起
  - [ ] SubTask 7.7: 实现切换过渡效果和操作成功提示（toast/inline feedback）
  - [ ] SubTask 7.8: 实现响应式布局（桌面端完整布局 / 移动端紧凑布局，<768px 适配）

- [ ] Task 8: 集成 SessionModeSelector 到输入控制栏
  - [ ] SubTask 8.1: 修改 `desktop/src/react/components/input/InputControlBar.tsx` — 替换 PlanModeButton 为 SessionModeSelector
  - [ ] SubTask 8.2: 确保原有权限模式逻辑在展开项子菜单中正常工作
  - [ ] SubTask 8.3: 清理旧的 PlanModeButton 引用（保留文件但标记 deprecated 或重命名）

## Phase 4: 研究模式移植（trae-agent-main → openhanako-main）

- [ ] Task 9: 移植研究模式核心工具
  - [ ] SubTask 9.1: 移植 `BashTool` → `lib/research/tools/bash-tool.ts`（持久 shell 会话、跨平台、120s 超时、sentinel 退出码捕获）
  - [ ] SubTask 9.2: 移植 `TextEditorTool` → `lib/research/tools/edit-tool.ts`（view/create/str_replace/insert，行号显示，截断）
  - [ ] SubTask 9.3: 移植 `JSONEditTool` → `lib/research/tools/json-edit-tool.ts`（JSONPath view/set/add/remove）
  - [ ] SubTask 9.4: 移植 `SequentialThinkingTool` → `lib/research/tools/sequential-thinking-tool.ts`（thought_history、branches、动态 total_thoughts）
  - [ ] SubTask 9.5: 移植 `TaskDoneTool` → `lib/research/tools/task-done-tool.ts`
  - [ ] SubTask 9.6: 适配所有工具为 openhanako Tool 接口（get_name/get_description/get_parameters/execute）
  - [ ] SubTask 9.7: 为每个工具编写参数 schema 生成逻辑（适配不同 LLM provider 格式）

- [ ] Task 10: 移植 CKG 代码知识图
  - [ ] SubTask 10.1: 移植 `ckg_database.py` → `lib/research/ckg/ckg-database.ts`（SQLite 存储、tree-sitter 解析）
  - [ ] SubTask 10.2: 移植 `CKGTool` → `lib/research/tools/ckg-tool.ts`（search_function/search_class/search_class_method）
  - [ ] SubTask 10.3: 实现 tree-sitter 语言支持（Python/Java/C++/C/TypeScript/JavaScript）
  - [ ] SubTask 10.4: 实现智能缓存（git commit hash 判断 + 非 git 文件元数据 hash）
  - [ ] SubTask 10.5: 实现数据库过期清理（1 周自动删除）
  - [ ] SubTask 10.6: 存储位置适配为 openhanako 用户数据目录

- [ ] Task 11: 移植 Lakeview 步骤摘要系统
  - [ ] SubTask 11.1: 移植 `lake_view.py` → `lib/research/lakeview/lake-view.ts`
  - [ ] SubTask 11.2: 实现 `extract_task_in_step()`（EXTRACTOR_PROMPT，≤10 词任务 + ≤30 词详情）
  - [ ] SubTask 11.3: 实现 `extract_tag_in_step()`（TAGGER_PROMPT，8 种行为标签）
  - [ ] SubTask 11.4: 实现轨迹过长保护（>300,000 字符跳过打标）
  - [ ] SubTask 11.5: 实现独立 Lakeview 模型配置
  - [ ] SubTask 11.6: 集成到 openhanako LLM 客户端系统

- [ ] Task 12: 移植 Trajectory 轨迹记录系统
  - [ ] SubTask 12.1: 移植 `trajectory_recorder.py` → `lib/research/trajectory/trajectory-recorder.ts`
  - [ ] SubTask 12.2: 实现完整记录（LLM 交互、工具调用、token 使用、状态转换）
  - [ ] SubTask 12.3: 实现持续保存（每次交互后 save）
  - [ ] SubTask 12.4: 实现自动时间戳文件名生成
  - [ ] SubTask 12.5: 存储位置适配为 openhanako session 目录

- [ ] Task 13: 移植 Docker 沙箱管理器（可选/条件加载）
  - [ ] SubTask 13.1: 移植 `docker_manager.py` → `lib/research/docker/docker-manager.ts`
  - [ ] SubTask 13.2: 实现 4 种容器创建方式（镜像/容器 ID/Dockerfile/镜像文件）
  - [ ] SubTask 13.3: 实现工作区挂载和工具复制
  - [ ] SubTask 13.4: 实现持久化 Shell（pexpect → node-pty 适配）
  - [ ] SubTask 13.5: 移植 `DockerToolExecutor` → `lib/research/docker/docker-tool-executor.ts`
  - [ ] SubTask 13.6: 实现路径翻译（主机路径 ↔ 容器 `/workspace` 路径）

- [ ] Task 14: 移植研究模式 LLM Provider 客户端
  - [ ] SubTask 14.1: 创建 `lib/research/llm-clients/` 目录结构
  - [ ] SubTask 14.2: 适配 Anthropic 客户端（原生 SDK，bash/edit 内置工具类型）
  - [ ] SubTask 14.3: 适配 OpenAI 客户端（Responses API，strict 模式）
  - [ ] SubTask 14.4: 适配 Azure / Doubao / OpenRouter 客户端（OpenAI 兼容基类）
  - [ ] SubTask 14.5: 适配 Ollama 客户端（独立实现）
  - [ ] SubTask 14.6: 适配 Google Gemini 客户端（genai SDK）
  - [ ] SubTask 14.7: 实现统一重试机制（随机退避 3-30s）

- [ ] Task 15: 创建研究模式提示词构建器
  - [ ] SubTask 15.1: 创建 `core/prompt/research-prompt-builder.ts`
  - [ ] SubTask 15.2: 移植 7 步方法论系统提示词（理解→探索→复现→调试→实现→验证→总结）
  - [ ] SubTask 15.3: 移植 Sequential Thinking 使用指南
  - [ ] SubTask 15.4: 移植绝对路径规则和 project root 声明
  - [ ] SubTask 15.5: 移植 task_done 完成条件说明

## Phase 5: 编程模式移植（oh-my-openagent-dev → openhanako-main）

- [ ] Task 16: 移植 11 个专职 Agent 定义
  - [ ] SubTask 16.1: 创建 `lib/programming/agents/` 目录结构和注册中心
  - [ ] SubTask 16.2: 移植 Sisyphus（主编排器，thinking budget 32000，6 步回退链）
  - [ ] SubTask 16.3: 移植 Hephaestus（自主深度工作者）
  - [ ] SubTask 16.4: 移植 Prometheus（战略规划器，面试模式，`.omo/plans/` 输出）
  - [ ] SubTask 16.5: 移植 Atlas（Todo 编排器，temperature 0.1）
  - [ ] SubTask 16.6: 移植 Oracle（只读顾问，拒绝 write/edit/task）
  - [ ] SubTask 16.7: 移植 Librarian（外部文档搜索，GitHub CLI + Context7）
  - [ ] SubTask 16.8: 移植 Explore（快速代码搜索，多角度并行）
  - [ ] SubTask 16.9: 移植 Multimodal-Looker（视觉分析，仅允许 read）
  - [ ] SubTask 16.10: 移植 Metis（预规划顾问，temperature 0.3）
  - [ ] SubTask 16.11: 移植 Momus（计划审查器，偏袒批准 80% 阈值）
  - [ ] SubTask 16.12: 移植 Sisyphus-Junior（类别派生执行器）
  - [ ] SubTask 16.13: 移植 Agent 工具限制表（`agent-tool-restrictions.ts`）

- [ ] Task 17: 移植 Hashline 哈希锚定编辑
  - [ ] SubTask 17.1: 移植 `packages/hashline-core/` → `lib/programming/hashline/`
  - [ ] SubTask 17.2: 实现 xxhash32 哈希计算（Bun 原生优先，纯 JS 回退）
  - [ ] SubTask 17.3: 实现 Read 输出行附加 `LINE#HASH|` 标记（hashline-read-enhancer）
  - [ ] SubTask 17.4: 实现 hashline_edit 工具（replace/append/prepend 操作）
  - [ ] SubTask 17.5: 实现哈希验证和陈旧拒绝逻辑
  - [ ] SubTask 17.6: 实现自动纠错（前缀/缩进剥离、去重、顺序检测）
  - [ ] SubTask 17.7: 实现分块限制（200 行 / 64KB）

- [ ] Task 18: 移植 LSP 集成
  - [ ] SubTask 18.1: 移植 `packages/lsp-core/` → `lib/programming/lsp/`
  - [ ] SubTask 18.2: 实现 `LspManager`（引用计数客户端池、init 超时 30s、idle 收割器 5 分钟）
  - [ ] SubTask 18.3: 移植 51 种语言的 `BUILTIN_SERVERS` 配置和安装提示
  - [ ] SubTask 18.4: 实现 7 个 LSP 工具（diagnostics/goto_definition/find_references/symbols/prepare_rename/rename/status）
  - [ ] SubTask 18.5: 移植 `lsp-tools-mcp` → openhanako MCP 工具包装
  - [ ] SubTask 18.6: 移植 `lsp-daemon`（Unix socket / Windows named pipe 守护进程）
  - [ ] SubTask 18.7: 实现配置优先级（项目 > 用户 > 内置）

- [ ] Task 19: 移植 AST-Grep 集成
  - [ ] SubTask 19.1: 移植 AST-Grep 技能 → openhanako 技能系统
  - [ ] SubTask 19.2: 实现 `sg` 二进制调用包装（search/replace/scan/validate/langs/doctor/install）
  - [ ] SubTask 19.3: 实现两遍写入技巧（`--json=compact` 预览 → `--update-all` 应用）
  - [ ] SubTask 19.4: 实现 25 种语言支持

- [ ] Task 20: 移植 3 层 MCP 系统
  - [ ] SubTask 20.1: 移植 5 个内置 MCP（websearch/context7/grep_app/lsp/codegraph）
  - [ ] SubTask 20.2: 移植 Claude Code `.mcp.json` 加载器（环境变量扩展、scope 过滤）
  - [ ] SubTask 20.3: 移植技能嵌入式 MCP 管理器（SKILL.md frontmatter 声明）
  - [ ] SubTask 20.4: 移植 OAuth 2.0 + PKCE + DCR 认证流程
  - [ ] SubTask 20.5: 实现每会话 MCP 客户端隔离

- [ ] Task 21: 移植 Team Mode
  - [ ] SubTask 21.1: 移植 `packages/team-core/` → `lib/programming/team/`
  - [ ] SubTask 21.2: 实现 Team 注册表、邮箱、任务列表、状态管理
  - [ ] SubTask 21.3: 实现 12 个 team_* 工具
  - [ ] SubTask 21.4: 实现成员资格检查（AGENT_ELIGIBILITY_REGISTRY）
  - [ ] SubTask 21.5: 实现 worktree 隔离
  - [ ] SubTask 21.6: 实现并行执行限制（max_parallel_members 1-8）
  - [ ] SubTask 21.7: 移植 tmux 可视化布局（可选）

- [ ] Task 22: 移植核心 Hook 系统（精简子集）
  - [ ] SubTask 22.1: 创建 `lib/programming/hooks/` 目录和注册机制
  - [ ] SubTask 22.2: 移植 comment-checker Hook（阻止 AI slop 注释，二进制调用）
  - [ ] SubTask 22.3: 移植 hashline-read-enhancer Hook（Read 输出附加哈希）
  - [ ] SubTask 22.4: 移植 write-existing-file-guard Hook（要求先 Read 再 Write/Edit）
  - [ ] SubTask 22.5: 移植 rules-injector Hook（AGENTS.md / .omo/rules / .claude/rules 注入）
  - [ ] SubTask 22.6: 移植 keyword-detector Hook（IntentGate 意图分类）
  - [ ] SubTask 22.7: 移植 todo-continuation-enforcer Hook（Boulder 强制继续）

- [ ] Task 23: 移植委派系统
  - [ ] SubTask 23.1: 移植 8 个内置委派类别（visual-engineering/ultrabrain/deep/artistry/quick/unspecified-low/unspecified-high/writing）
  - [ ] SubTask 23.2: 实现 `task` 工具（完整类别+技能支持）
  - [ ] SubTask 23.3: 实现 `call_omo_agent` 工具（仅 explore + librarian）

- [ ] Task 24: 移植模型回退管道
  - [ ] SubTask 24.1: 移植 `packages/model-core/` → `lib/programming/model-fallback/`
  - [ ] SubTask 24.2: 实现 6 步解析管道（UI 选定 → 用户配置 → 类别默认 → 用户 fallback → 硬编码链 → systemDefault）
  - [ ] SubTask 24.3: 移植 AGENT_MODEL_REQUIREMENTS（11 个 Agent 回退链）
  - [ ] SubTask 24.4: 移植 CATEGORY_MODEL_REQUIREMENTS（8 个类别回退链）
  - [ ] SubTask 24.5: 实现模糊匹配（`fuzzyMatchModel`）
  - [ ] SubTask 24.6: 实现运行时回退（session.error 响应式切换）

- [ ] Task 25: 移植 Boulder 状态机
  - [ ] SubTask 25.1: 移植 `packages/boulder-state/` → `lib/programming/boulder/`
  - [ ] SubTask 25.2: 实现跨会话/worktree/子 Agent 工作计划跟踪
  - [ ] SubTask 25.3: 实现 `.omo/boulder.json` 持久化（schema_version: 2）
  - [ ] SubTask 25.4: 实现计划解析（`## TODOs` 和 `## Final Verification Wave` 章节）

- [ ] Task 26: 创建编程模式提示词构建器
  - [ ] SubTask 26.1: 创建 `core/prompt/programming-prompt-builder.ts`
  - [ ] SubTask 26.2: 移植编程纪律（类型系统/Parse-don't-validate/穷尽匹配/TDD）
  - [ ] SubTask 26.3: 移植 Agent 委派指南和工具使用规范
  - [ ] SubTask 26.4: 移植 250 LOC 文件上限、Given/When/Then 测试风格等规则
  - [ ] SubTask 26.5: 适配 openhanako 的 ishiki/identity/yuan 人格系统

## Phase 6: 工具系统与提示词适配

- [ ] Task 27: 重构工具构建管线
  - [ ] SubTask 27.1: 修改 `core/engine.ts` 的 `buildTools()` — 在权限包装前插入模式过滤步骤
  - [ ] SubTask 27.2: 实现 `filterToolsByMode(tools, mode)` 调用点
  - [ ] SubTask 27.3: 确保权限包装仅在编程模式下生效
  - [ ] SubTask 27.4: 确保 openhanako 通用工具（web-search/browser/subagent 等）在两种模式下都可用

- [ ] Task 28: 修改提示词组装逻辑
  - [ ] SubTask 28.1: 修改 `core/agent.ts` 的 `buildSystemPrompt()` — 新增模式分发
  - [ ] SubTask 28.2: 研究模式时调用 `research-prompt-builder.ts`
  - [ ] SubTask 28.3: 编程模式时调用 `programming-prompt-builder.ts`
  - [ ] SubTask 28.4: 追加 openhanako 通用上下文（记忆/工作台/日期）
  - [ ] SubTask 28.5: 保持 prompt cache 友好的组装顺序（静态前缀在前）

- [ ] Task 29: 修改权限包装层
  - [ ] SubTask 29.1: 修改 `lib/tools/session-permission-wrapper.ts` — 增加模式上下文参数
  - [ ] SubTask 29.2: 研究模式下使用独立的工具执行策略（Docker 沙箱优先）
  - [ ] SubTask 29.3: 编程模式下保持原有权限模式逻辑

- [ ] Task 30: 适配 Widget / 小工具系统
  - [ ] SubTask 30.1: 为 Widget 系统增加模式感知能力
  - [ ] SubTask 30.2: 研究模式专属 Widget（Lakeview 步骤摘要面板、轨迹查看器、CKG 浏览器）
  - [ ] SubTask 30.3: 编程模式专属 Widget（Agent 编排面板、LSP 诊断面板、Team 状态面板）

## Phase 7: 集成与模式切换

- [ ] Task 31: 实现模式切换完整流程
  - [ ] SubTask 31.1: 实现 `SessionModeManager.switchMode()` 完整流程
  - [ ] SubTask 31.2: 切换时保存当前模式到持久化层
  - [ ] SubTask 31.3: 切换时重建工具集（调用 `filterToolsByMode`）
  - [ ] SubTask 31.4: 切换时重新组装系统提示词
  - [ ] SubTask 31.5: 切换时保持消息历史和会话上下文不变
  - [ ] SubTask 31.6: 通过 EventBus 广播模式变更事件
  - [ ] SubTask 31.7: 验证切换响应时间 <500ms

- [ ] Task 32: 适配 Subagent 系统
  - [ ] SubTask 32.1: 修改 `lib/tools/subagent-tool.ts` — 传递当前会话模式
  - [ ] SubTask 32.2: Subagent 继承父会话的模式设置
  - [ ] SubTask 32.3: 编程模式下 Subagent 使用 Agent 委派系统

## Phase 8: 测试与质量保障

- [ ] Task 33: 编写核心单元测试
  - [ ] SubTask 33.1: 测试 `core/session-mode.ts` 模式定义和映射函数
  - [ ] SubTask 33.2: 测试 `core/session-mode-manager.ts` 模式切换逻辑
  - [ ] SubTask 33.3: 测试 `lib/tools/mode-tool-registry.ts` 工具过滤
  - [ ] SubTask 33.4: 测试研究模式各工具（bash/edit/json_edit/sequentialthinking/ckg）
  - [ ] SubTask 33.5: 测试编程模式核心工具（hashline_edit/lsp_tools/team_tools）
  - [ ] SubTask 33.6: 测试模式提示词构建器输出
  - [ ] SubTask 33.7: 测试配置持久化（preferences/manifest store）

- [ ] Task 34: 编写集成测试
  - [ ] SubTask 34.1: 测试模式切换端到端流程（UI → API → Manager → 工具重建 → 提示词更新）
  - [ ] SubTask 34.2: 测试模式切换后上下文保持（消息历史/工作目录不丢失）
  - [ ] SubTask 34.3: 测试研究模式工具调用流程（bash 持久会话、CKG 构建、轨迹记录）
  - [ ] SubTask 34.4: 测试编程模式 Agent 委派流程（task 工具 → 类别路由 → 模型选择）
  - [ ] SubTask 34.5: 测试编程模式 Hashline 编辑（Read 哈希 → Edit 验证 → 陈旧拒绝）
  - [ ] SubTask 34.6: 测试编程模式 LSP 工具（诊断/跳转/重命名）
  - [ ] SubTask 34.7: 测试权限控制逻辑（4 种权限模式行为一致性）

- [ ] Task 35: 编写 UI 组件测试
  - [ ] SubTask 35.1: 测试 SessionModeSelector 三按钮布局渲染
  - [ ] SubTask 35.2: 测试展开/收起动画和交互
  - [ ] SubTask 35.3: 测试权限子选项选择和自动收起
  - [ ] SubTask 35.4: 测试选中状态高亮和切换反馈
  - [ ] SubTask 35.5: 测试响应式布局（桌面/移动端）

- [ ] Task 36: 性能测试
  - [ ] SubTask 36.1: 测试模式切换响应时间（目标 <500ms）
  - [ ] SubTask 36.2: 测试模式初始化启动时间（目标 <300ms）
  - [ ] SubTask 36.3: 测试内存占用稳定性（无泄漏）
  - [ ] SubTask 36.4: 测试 CKG 数据库构建性能
  - [ ] SubTask 36.5: 测试 LSP 守护进程并发性能

- [ ] Task 37: 功能完整性检查
  - [ ] SubTask 37.1: 检查 trae-agent-main 所有功能已移植（6 工具 + Lakeview + CKG + Trajectory + Docker + 7 Provider）
  - [ ] SubTask 37.2: 检查 oh-my-openagent-dev 核心功能已移植（11 Agent + Hashline + LSP + AST-Grep + 3层MCP + Team Mode + Hooks + Boulder + 模型回退）
  - [ ] SubTask 37.3: 验证移植功能在 openhanako-main 环境正常运行
  - [ ] SubTask 37.4: 验证权限行为与原实现完全一致（无权限泄露/越权）
  - [ ] SubTask 37.5: 设计模式组合测试用例（research↔programming 切换、权限模式组合）

# Task Dependencies

- [Task 4] depends on [Task 1] — 配置持久化需要模式定义
- [Task 5] depends on [Task 4] — API 端点需要配置层支持
- [Task 6] depends on [Task 5] — 前端状态需要 API 支持
- [Task 7] depends on [Task 6] — UI 组件需要前端状态管理
- [Task 8] depends on [Task 7] — 集成需要组件完成
- [Task 9-15] depends on [Task 1] — 研究模式移植需要模式定义（可并行）
- [Task 16-26] depends on [Task 1] — 编程模式移植需要模式定义（可并行）
- [Task 27] depends on [Task 3, Task 9, Task 16] — 工具构建管线需要映射表和移植工具
- [Task 28] depends on [Task 15, Task 26] — 提示词适配需要两个 builder
- [Task 29] depends on [Task 27] — 权限包装需要工具管线完成
- [Task 30] depends on [Task 11, Task 16] — Widget 适配需要 Lakeview 和 Agent 系统
- [Task 31] depends on [Task 27, Task 28, Task 29] — 模式切换需要工具/提示词/权限适配完成
- [Task 32] depends on [Task 31] — Subagent 适配需要模式切换流程
- [Task 33-37] depends on [Task 31, Task 32] — 测试需要集成完成
