# 会话模式选择系统重构 Spec

## Why

当前 `openhanako-main` 的会话权限模式系统（`core/session-permission-mode.ts`）仅提供 4 种扁平的权限级别（auto/operate/ask/read_only），缺乏面向不同使用场景的**功能性模式区分**。用户无法在"研究型 Agent"和"编程型 Agent"之间快速切换，也无法获得不同场景下专属的工具链、提示词策略和 Agent 编排能力。

通过引入"会话模式选择"系统，将 `trae-agent-main` 的研究能力（CKG 代码知识图、Lakeview 步骤摘要、Docker 沙箱、轨迹记录、Sequential Thinking）和 `oh-my-openagent-dev` 的深度编程能力（11 Agent 编排、Hashline 编辑、AST-Grep、LSP 集成、Team Mode、3 层 MCP）统一集成到 `openhanako-main` 中，使其成为真正的"万能"AI 助手。

## What Changes

### 新增：会话模式选择系统
- 新增顶层"会话模式"概念，包含 **"研究"（research）**、**"编程"（programming）** 两个功能模式
- 原 4 种权限模式（auto/operate/ask/read_only）降级为"编程"模式下的**权限子选项**，通过"展开项"交互访问
- 新增 `core/session-mode.ts`：定义会话模式枚举、模式-工具映射表、模式-提示词策略映射
- 新增 `core/session-mode-manager.ts`：模式切换管理器，负责模式初始化、切换、上下文保持

### 新增：模式选择 UI
- 重构 `desktop/src/react/components/input/PlanModeButton.tsx` → `SessionModeSelector.tsx`
- 实现"研究"/"编程"/"展开项"三按钮布局
- "展开项"点击后展开 4 个权限子选项（自动审核/完整权限/操作前询问/只阅读模式）
- 展开/收起动画 200-300ms，选中高亮，响应式适配

### 新增：研究模式（trae-agent-main 移植）
- 移植 6 个核心工具：bash（持久会话）、str_replace_based_edit_tool、json_edit_tool、sequentialthinking、task_done、ckg（代码知识图）
- 移植 Lakeview 步骤摘要系统（`utils/lake_view.py` → TypeScript）
- 移植 CKG 代码知识图（tree-sitter AST 解析，6 种语言）
- 移植 Trajectory 轨迹记录系统
- 移植 Docker 沙箱管理器
- 移植研究型系统提示词（7 步方法论）
- 移植 7 个 LLM Provider 客户端适配（anthropic/openai/azure/doubao/openrouter/ollama/google）

### 新增：编程模式（oh-my-openagent-dev 移植）
- 移植 11 个专职 Agent 定义（Sisyphus/Hephaestus/Prometheus/Atlas/Oracle/Librarian/Explore/Multimodal-Looker/Metis/Momus/Sisyphus-Junior）
- 移植 Hashline 哈希锚定编辑机制（`packages/hashline-core/`）
- 移植 LSP 集成（`packages/lsp-core/` + `lsp-tools-mcp/` + `lsp-daemon/`）：7 个 LSP 工具
- 移植 AST-Grep 集成（通过技能系统提供，25 种语言）
- 移植 3 层 MCP 系统（内置 5 个 + Claude Code `.mcp.json` + 技能嵌入式 MCP with OAuth 2.0/PKCE）
- 移植 Team Mode（最多 8 并行成员 + 12 个 team_* 工具 + tmux 可视化）
- 移植核心 Hook 系统（精简为关键子集：comment-checker、hashline-read-enhancer、write-existing-file-guard、rules-injector、keyword-detector、todo-continuation-enforcer）
- 移植委派系统（8 个内置类别 + task/call_omo_agent 工具）
- 移植 6 步模型回退管道
- 移植 Boulder 状态机（跨会话工作计划跟踪）

### 修改：工具系统适配
- **BREAKING** 重构 `core/engine.ts` 的 `buildTools()` 管线，新增模式感知的工具过滤层
- 新增 `lib/tools/mode-tool-registry.ts`：模式-工具映射注册表
- 修改 `lib/tools/session-permission-wrapper.ts`：增加模式上下文参数

### 修改：提示词系统适配
- 修改 `core/agent.ts` 的 `buildSystemPrompt()`：按模式选择不同的提示词组装策略
- 新增 `core/prompt/research-prompt-builder.ts`：研究模式提示词
- 新增 `core/prompt/programming-prompt-builder.ts`：编程模式提示词

### 修改：配置持久化
- 修改 `core/preferences-manager.ts`：新增 `getSessionModeDefault()` / `setSessionModeDefault()`
- 修改 `core/session-manifest/store.ts`：新增 `session_mode` 字段持久化
- 修改 `shared/config-schema.ts`：新增 sessionMode scope 定义

### 修改：API 端点
- 修改 `server/index.ts`：新增 `GET/POST /api/session-mode` 端点
- 修改 `server/routes/preferences.ts`：新增 `GET/PUT /api/preferences/session-mode-default`

### 修改：前端状态管理
- 修改 `desktop/src/react/types.ts`：新增 `SessionMode` 类型
- 修改 `desktop/src/react/stores/session-slice.ts`：新增 sessionMode 状态字段
- 修改 `desktop/src/react/stores/session-actions.ts`：新增模式切换 action

## Impact

- **Affected code（openhanako-main）:**
  - `core/session-permission-mode.ts` — 权限模式核心定义（保留，作为编程模式子选项）
  - `core/engine.ts` — buildTools() 管线重构
  - `core/agent.ts` — buildSystemPrompt() 适配
  - `core/session-coordinator.ts` — 会话模式管理
  - `core/preferences-manager.ts` — 偏好持久化
  - `core/session-manifest/store.ts` — Session 清单
  - `lib/tools/session-permission-wrapper.ts` — 权限包装
  - `desktop/src/react/components/input/PlanModeButton.tsx` → `SessionModeSelector.tsx`
  - `desktop/src/react/stores/session-slice.ts` / `session-actions.ts`
  - `desktop/src/react/types.ts`
  - `server/index.ts` / `server/routes/preferences.ts`
  - `shared/config-schema.ts`

- **New code（openhanako-main）:**
  - `core/session-mode.ts` — 模式定义与映射
  - `core/session-mode-manager.ts` — 模式切换管理器
  - `lib/research/` — 研究模式移植模块（tools/、lakeview/、ckg/、trajectory/、docker/、llm-clients/、prompt/）
  - `lib/programming/` — 编程模式移植模块（agents/、hashline/、lsp/、ast-grep/、mcp/、team/、hooks/、boulder/、model-fallback/）
  - `lib/tools/mode-tool-registry.ts` — 模式-工具映射
  - `core/prompt/research-prompt-builder.ts` / `programming-prompt-builder.ts`

## ADDED Requirements

### Requirement: 会话模式定义与枚举
系统 SHALL 定义 `SessionMode` 类型，包含 `"research"` 和 `"programming"` 两个值，代表两种功能模式。

#### Scenario: 默认模式
- **WHEN** 用户首次启动应用且无已保存偏好
- **THEN** 默认会话模式为 `"programming"`（保持向后兼容）

### Requirement: 模式选择 UI 组件
系统 SHALL 提供 `SessionModeSelector` 组件，替代原有的 `PlanModeButton`，包含"研究"、"编程"、"展开项"三个主要交互入口。

#### Scenario: 模式切换
- **WHEN** 用户点击"研究"或"编程"按钮
- **THEN** 当前会话模式立即切换，选中按钮高亮显示，切换动画时长在 200-300ms 范围内

#### Scenario: 展开权限子选项
- **WHEN** 用户点击"展开项"按钮
- **THEN** 平滑展开显示"自动审核"、"完整权限"、"操作前询问"、"只阅读模式"四个子选项
- **AND** 展开/收起动画时长在 200-300ms 范围内
- **AND** 再次点击"展开项"或选择任一子选项后自动收起

#### Scenario: 响应式适配
- **WHEN** 窗口宽度小于 768px（移动端）
- **THEN** 模式选择器以紧凑布局显示，按钮等比缩小，文字可选隐藏

### Requirement: 研究模式工具集
系统 SHALL 在研究模式下提供以下工具集，行为与 `trae-agent-main` 完全一致：
- `bash` — 持久化 bash shell 会话（跨平台，120s 超时）
- `str_replace_based_edit_tool` — 文件查看/创建/字符串替换/插入
- `json_edit_tool` — JSONPath 编辑
- `sequentialthinking` — 结构化分步思考（支持分支/修订）
- `task_done` — 任务完成信号
- `ckg` — 代码知识图查询（tree-sitter AST，Python/Java/C++/C/TS/JS）

#### Scenario: CKG 代码知识图构建
- **WHEN** Agent 首次在研究模式下访问项目目录
- **THEN** 系统使用 tree-sitter 解析 AST，构建 SQLite 索引数据库
- **AND** 后续访问基于 git commit hash 智能判断是否需要重建

### Requirement: 研究模式 Lakeview 步骤摘要
系统 SHALL 为研究模式的每个 Agent 步骤生成语义摘要，包含任务提取（≤10 词）、详情提取（≤30 词）和行为标签（8 种：WRITE_TEST/VERIFY_TEST/EXAMINE_CODE/WRITE_FIX/VERIFY_FIX/REPORT/THINK/OUTLIER）。

#### Scenario: 步骤摘要生成
- **WHEN** Agent 完成一个执行步骤
- **THEN** 系统异步调用 Lakeview LLM 生成摘要和标签
- **AND** 摘要显示在 CLI 控制台和轨迹记录中

### Requirement: 研究模式轨迹记录
系统 SHALL 完整记录研究模式下的所有 LLM 交互、工具调用、token 使用、状态转换到 JSON 轨迹文件。

#### Scenario: 持续保存
- **WHEN** 每次 LLM 交互完成后
- **THEN** 轨迹文件立即保存（非仅结束时保存）

### Requirement: 编程模式 Agent 编排
系统 SHALL 在编程模式下提供 11 个专职 Agent，角色和行为与 `oh-my-openagent-dev` 一致：
- 主力 Agent：Sisyphus（主编排）、Hephaestus（深度工作者）、Prometheus（战略规划）、Atlas（Todo 编排）
- 子 Agent：Oracle（只读顾问）、Librarian（文档搜索）、Explore（快速搜索）、Multimodal-Looker（视觉分析）、Metis（预规划顾问）、Momus（计划审查）、Sisyphus-Junior（类别执行器）

#### Scenario: Agent 委派
- **WHEN** 主 Agent 通过 `task` 工具委派子任务
- **THEN** 系统根据委派类别（visual-engineering/ultrabrain/deep/quick 等）自动选择模型和 Agent

### Requirement: 编程模式 Hashline 编辑
系统 SHALL 在编程模式下提供 Hashline 哈希锚定编辑机制，为每个 Read 输出行附加 `LINE#HASH|` 内容哈希，编辑时验证哈希防止并发冲突。

#### Scenario: 陈旧哈希拒绝
- **WHEN** Agent 尝试编辑一个已被修改的行（哈希不匹配）
- **THEN** 系统拒绝编辑并返回错误，要求 Agent 重新 Read 最新内容

### Requirement: 编程模式 LSP 集成
系统 SHALL 在编程模式下提供 7 个 LSP 工具：`lsp_diagnostics`、`lsp_goto_definition`、`lsp_find_references`、`lsp_symbols`、`lsp_prepare_rename`、`lsp_rename`、`lsp_status`。

#### Scenario: LSP 守护进程共享
- **WHEN** 多个会话同时使用 LSP 工具
- **THEN** 系统通过 lsp-daemon（Unix socket / Windows named pipe）共享热 LSP 进程
- **AND** 客户端池引用计数管理，idle 5 分钟自动收割

### Requirement: 编程模式 Team Mode
系统 SHALL 在编程模式下支持 Team Mode（默认关闭），启用后最多 8 个 Agent 并行工作，提供 12 个 `team_*` 工具。

#### Scenario: Team 创建与并行执行
- **WHEN** 用户启用 Team Mode 并创建 Team
- **THEN** 符合资格的 Agent（Sisyphus/Atlas/Sisyphus-Junior）可作为成员并行执行
- **AND** 通过邮箱系统和任务列表协调工作

### Requirement: 模式-工具映射机制
系统 SHALL 实现模式-工具映射注册表，确保不同模式下仅暴露该模式专属的工具集。

#### Scenario: 研究模式工具过滤
- **WHEN** 当前会话模式为 "research"
- **THEN** 仅注册研究模式工具（bash/edit/json_edit/sequentialthinking/task_done/ckg + openhanako 通用工具）
- **AND** 编程模式专属工具（hashline_edit/lsp_*/team_*）不可见

#### Scenario: 编程模式工具过滤
- **WHEN** 当前会话模式为 "programming"
- **THEN** 注册编程模式工具（hashline_edit/lsp_*/team_*/task/call_omo_agent + openhanako 通用工具）
- **AND** 研究模式专属工具（ckg/sequentialthinking/task_done）不可见

### Requirement: 模式感知的提示词生成
系统 SHALL 为每种模式提供独立的系统提示词生成策略。

#### Scenario: 研究模式提示词
- **WHEN** 当前模式为 "research"
- **THEN** 系统提示词包含 7 步方法论（理解→探索→复现→调试→实现→验证→总结）
- **AND** 包含 Sequential Thinking 使用指南和绝对路径规则

#### Scenario: 编程模式提示词
- **WHEN** 当前模式为 "programming"
- **THEN** 系统提示词包含编程纪律（类型系统/Parse-don't-validate/TDD/穷尽匹配）
- **AND** 包含 Agent 委派指南和工具使用规范

### Requirement: 模式切换上下文保持
系统 SHALL 在模式切换时保持会话上下文、历史记录和当前状态不丢失。

#### Scenario: 无损切换
- **WHEN** 用户从"研究"切换到"编程"（或反向）
- **THEN** 当前会话的消息历史完整保留
- **AND** 当前工作目录和项目上下文保留
- **AND** 仅工具集和提示词策略更新为新模式的配置

### Requirement: 模式配置持久化
系统 SHALL 持久化用户的模式偏好设置。

#### Scenario: 全局默认保存
- **WHEN** 用户设置默认会话模式
- **THEN** 偏好保存到 `preferences.json` 的 `session_mode_default` 字段
- **AND** 下次启动应用时自动恢复

#### Scenario: 会话级模式快照
- **WHEN** 会话创建时
- **THEN** 当前模式快照保存到 `session-manifest.db` 的 `session_mode` 字段
- **AND** Session restore 时恢复该模式

### Requirement: 模式切换性能
系统 SHALL 确保模式切换响应时间不超过 500ms。

#### Scenario: 切换延迟
- **WHEN** 用户触发模式切换
- **THEN** UI 反馈在 100ms 内出现
- **AND** 工具集重建和提示词重新组装在 500ms 内完成

## MODIFIED Requirements

### Requirement: 会话权限模式系统
原权限模式系统（auto/operate/ask/read_only）保留原有行为，但降级为编程模式下的权限子选项。权限模式的核心判定函数 `classifySessionPermission()`、工具分类集合、包装层逻辑不变。

**修改点：**
- 权限模式选择器从顶层 UI 移至"展开项"子菜单
- 权限模式仅在编程模式下生效（研究模式使用独立的工具执行策略）
- `SessionPermissionMode` 类型定义不变，新增 `SessionMode` 作为上层概念

### Requirement: 工具构建管线
`core/engine.ts` 的 `buildTools()` 方法新增模式感知过滤步骤。

**修改后的管线顺序：**
1. RuntimeContext 注入
2. 沙盒包装（PathGuard + OS 沙盒）
3. Checkpoint 包装
4. **模式工具过滤（NEW）** — 按当前会话模式过滤工具集
5. 权限包装（仅编程模式）
6. 可用性过滤

### Requirement: Agent 系统统提示词组装
`core/agent.ts` 的 `buildSystemPrompt()` 方法新增模式分发逻辑。

**修改后的组装流程：**
1. 检测当前会话模式
2. 调用对应的 prompt builder（research / programming）
3. 组装模式专属的系统提示词
4. 追加 openhanako 通用上下文（记忆/工作台/日期等）

## REMOVED Requirements

### Requirement: PlanModeButton 顶层权限模式选择器
**Reason**: 被新的 `SessionModeSelector` 组件替代，权限模式选择移至"展开项"子菜单
**Migration**: `PlanModeButton.tsx` 重命名为 `SessionModeSelector.tsx`，原权限模式选择逻辑保留在展开项子菜单中
