# Checklist

## Phase 1: 核心基础设施
- [ ] `core/session-mode.ts` 定义了 `SessionMode` 类型（`"research" | "programming"`）和枚举常量
- [ ] `core/session-mode.ts` 包含模式-工具映射表 `MODE_TOOL_MAP`
- [ ] `core/session-mode.ts` 包含模式-提示词策略映射 `MODE_PROMPT_STRATEGY`
- [ ] `core/session-mode.ts` 导出 `isResearchMode()` / `isProgrammingMode()` 辅助函数
- [ ] `core/session-mode-manager.ts` 实现 `SessionModeManager` 类
- [ ] `SessionModeManager.switchMode()` 能切换模式并保持上下文
- [ ] `SessionModeManager` 通过 EventBus 广播模式变更事件
- [ ] 模式初始化启动时间 <300ms
- [ ] `lib/tools/mode-tool-registry.ts` 定义研究模式工具集清单（6 个核心工具）
- [ ] `lib/tools/mode-tool-registry.ts` 定义编程模式工具集清单（hashline/lsp/team/task 等）
- [ ] `getToolsForMode(mode)` 正确返回对应模式的工具名列表
- [ ] `filterToolsByMode(tools, mode)` 正确过滤工具数组
- [ ] `core/preferences-manager.ts` 新增 `getSessionModeDefault()` / `setSessionModeDefault(mode)`
- [ ] `core/session-manifest/store.ts` 新增 `session_mode` 字段持久化
- [ ] `shared/config-schema.ts` 新增 `sessionMode` scope 定义
- [ ] `core/session-coordinator.ts` 新增 `getSessionMode()` / `setSessionMode()` 方法

## Phase 2: API 端点与前端状态
- [ ] `GET /api/session-mode` 端点返回当前会话模式
- [ ] `POST /api/session-mode` 端点支持设置模式（currentSessionOnly / pendingNewSession）
- [ ] `GET /api/preferences/session-mode-default` 返回默认模式
- [ ] `PUT /api/preferences/session-mode-default` 设置默认模式
- [ ] `desktop/src/react/types.ts` 新增 `SessionMode = 'research' | 'programming'` 类型
- [ ] `desktop/src/react/stores/session-slice.ts` 包含 `sessionMode` 状态字段
- [ ] `desktop/src/react/stores/session-actions.ts` 包含 `switchSessionMode` action
- [ ] 前端模式切换时正确调用 API 并同步状态

## Phase 3: 模式选择 UI 组件
- [ ] `SessionModeSelector.tsx` 组件创建完成
- [ ] "研究"/"编程"/"展开项"三按钮布局正确渲染
- [ ] 选中模式按钮高亮显示（active 样式 + 图标变化）
- [ ] 点击"展开项"后显示 4 个权限子选项（自动审核/完整权限/操作前询问/只阅读模式）
- [ ] 展开/收起动画时长在 200-300ms 范围内
- [ ] 权限子选项选中后自动收起展开项
- [ ] 模式切换提供操作成功提示（toast/inline feedback）
- [ ] 响应式布局：<768px 时以紧凑布局显示
- [ ] `InputControlBar.tsx` 正确集成 `SessionModeSelector`（替换 PlanModeButton）
- [ ] 原有权限模式逻辑在展开项子菜单中正常工作

## Phase 4: 研究模式移植
- [ ] `lib/research/tools/bash-tool.ts` 实现持久 shell 会话（跨平台、120s 超时、sentinel 退出码）
- [ ] `lib/research/tools/edit-tool.ts` 实现 view/create/str_replace/insert（行号显示、截断）
- [ ] `lib/research/tools/json-edit-tool.ts` 实现 JSONPath view/set/add/remove
- [ ] `lib/research/tools/sequential-thinking-tool.ts` 实现 thought_history、branches、动态 total_thoughts
- [ ] `lib/research/tools/task-done-tool.ts` 正确返回任务完成信号
- [ ] 所有研究模式工具适配 openhanako Tool 接口
- [ ] `lib/research/ckg/ckg-database.ts` 使用 tree-sitter 解析 AST（Python/Java/C++/C/TS/JS）
- [ ] `lib/research/tools/ckg-tool.ts` 实现 search_function/search_class/search_class_method
- [ ] CKG 智能缓存基于 git commit hash 判断是否重建
- [ ] CKG 数据库过期清理（1 周自动删除）
- [ ] `lib/research/lakeview/lake-view.ts` 实现 extract_task_in_step（≤10 词任务 + ≤30 词详情）
- [ ] `lib/research/lakeview/lake-view.ts` 实现 extract_tag_in_step（8 种行为标签）
- [ ] Lakeview 轨迹过长保护（>300,000 字符跳过打标）
- [ ] Lakeview 支持独立模型配置
- [ ] `lib/research/trajectory/trajectory-recorder.ts` 完整记录 LLM 交互、工具调用、token 使用
- [ ] 轨迹文件每次交互后持续保存（非仅结束时）
- [ ] `lib/research/docker/docker-manager.ts` 支持 4 种容器创建方式
- [ ] `lib/research/docker/docker-tool-executor.ts` 实现路径翻译
- [ ] 研究模式 LLM Provider 客户端适配 7 个 Provider（anthropic/openai/azure/doubao/openrouter/ollama/google）
- [ ] 统一重试机制实现（随机退避 3-30s）
- [ ] `core/prompt/research-prompt-builder.ts` 包含 7 步方法论系统提示词
- [ ] 研究模式提示词包含 Sequential Thinking 使用指南和绝对路径规则

## Phase 5: 编程模式移植
- [ ] `lib/programming/agents/` 包含 11 个专职 Agent 定义
- [ ] Sisyphus 配置正确（thinking budget 32000，6 步回退链）
- [ ] Atlas 配置正确（temperature 0.1）
- [ ] Metis 配置正确（temperature 0.3）
- [ ] Oracle 工具限制正确（拒绝 write/edit/task/call_omo_agent）
- [ ] Multimodal-Looker 工具限制正确（仅允许 read）
- [ ] Momus 审查阈值正确（偏袒批准 80%）
- [ ] Agent 工具限制表（`agent-tool-restrictions.ts`）完整移植
- [ ] `lib/programming/hashline/` 实现 xxhash32 哈希计算（Bun 原生优先）
- [ ] hashline-read-enhancer 为 Read 输出行附加 `LINE#HASH|` 标记
- [ ] hashline_edit 工具实现 replace/append/prepend 操作
- [ ] 陈旧哈希正确拒绝编辑并返回错误
- [ ] 分块限制正确（200 行 / 64KB）
- [ ] `lib/programming/lsp/` 实现 `LspManager`（引用计数、30s init 超时、5 分钟 idle 收割）
- [ ] 7 个 LSP 工具全部实现（diagnostics/goto_definition/find_references/symbols/prepare_rename/rename/status）
- [ ] LSP 守护进程通过 Unix socket / Windows named pipe 共享热进程
- [ ] LSP 配置优先级正确（项目 > 用户 > 内置）
- [ ] AST-Grep 集成支持 25 种语言
- [ ] AST-Grep 两遍写入技巧实现（`--json=compact` 预览 → `--update-all` 应用）
- [ ] 3 层 MCP 系统完整移植（5 内置 + Claude Code + 技能嵌入式）
- [ ] 技能嵌入式 MCP 支持 OAuth 2.0 + PKCE + DCR 认证
- [ ] 每会话 MCP 客户端隔离正确
- [ ] `lib/programming/team/` 实现 Team 注册表、邮箱、任务列表
- [ ] 12 个 team_* 工具全部实现
- [ ] Team Mode 成员资格检查正确（AGENT_ELIGIBILITY_REGISTRY）
- [ ] Team Mode 并行限制正确（max_parallel_members 1-8）
- [ ] 核心 Hook 系统移植（comment-checker/hashline-read-enhancer/write-existing-file-guard/rules-injector/keyword-detector/todo-continuation-enforcer）
- [ ] 委派系统移植 8 个内置类别
- [ ] `task` 和 `call_omo_agent` 工具实现
- [ ] 6 步模型回退管道实现
- [ ] AGENT_MODEL_REQUIREMENTS（11 个 Agent 回退链）完整移植
- [ ] CATEGORY_MODEL_REQUIREMENTS（8 个类别回退链）完整移植
- [ ] 模糊匹配（`fuzzyMatchModel`）实现
- [ ] 运行时回退（session.error 响应式切换）实现
- [ ] `lib/programming/boulder/` 实现跨会话工作计划跟踪
- [ ] Boulder `.omo/boulder.json` 持久化正确（schema_version: 2）
- [ ] `core/prompt/programming-prompt-builder.ts` 包含编程纪律
- [ ] 编程模式提示词适配 openhanako ishiki/identity/yuan 人格系统

## Phase 6: 工具系统与提示词适配
- [ ] `core/engine.ts` 的 `buildTools()` 在权限包装前插入模式过滤步骤
- [ ] `filterToolsByMode(tools, mode)` 在工具管线中正确调用
- [ ] 权限包装仅在编程模式下生效
- [ ] openhanako 通用工具（web-search/browser/subagent 等）在两种模式下都可用
- [ ] `core/agent.ts` 的 `buildSystemPrompt()` 新增模式分发逻辑
- [ ] 研究模式调用 `research-prompt-builder.ts`
- [ ] 编程模式调用 `programming-prompt-builder.ts`
- [ ] 提示词追加 openhanako 通用上下文（记忆/工作台/日期）
- [ ] prompt cache 友好的组装顺序（静态前缀在前）
- [ ] `lib/tools/session-permission-wrapper.ts` 增加模式上下文参数
- [ ] 研究模式使用独立工具执行策略
- [ ] Widget 系统增加模式感知能力
- [ ] 研究模式专属 Widget 实现（Lakeview 面板/轨迹查看器/CKG 浏览器）
- [ ] 编程模式专属 Widget 实现（Agent 编排/LSP 诊断/Team 状态）

## Phase 7: 集成与模式切换
- [ ] `SessionModeManager.switchMode()` 完整流程实现
- [ ] 模式切换时保存当前模式到持久化层
- [ ] 模式切换时重建工具集
- [ ] 模式切换时重新组装系统提示词
- [ ] 模式切换时消息历史和会话上下文不丢失
- [ ] 模式切换通过 EventBus 广播事件
- [ ] 模式切换响应时间 <500ms
- [ ] `lib/tools/subagent-tool.ts` 传递当前会话模式
- [ ] Subagent 继承父会话的模式设置
- [ ] 编程模式下 Subagent 使用 Agent 委派系统

## Phase 8: 测试与质量保障
- [ ] `core/session-mode.ts` 单元测试通过
- [ ] `core/session-mode-manager.ts` 单元测试通过
- [ ] `lib/tools/mode-tool-registry.ts` 单元测试通过
- [ ] 研究模式各工具单元测试通过
- [ ] 编程模式核心工具单元测试通过
- [ ] 模式提示词构建器单元测试通过
- [ ] 配置持久化单元测试通过
- [ ] 模式切换端到端集成测试通过
- [ ] 模式切换后上下文保持集成测试通过
- [ ] 研究模式工具调用流程集成测试通过
- [ ] 编程模式 Agent 委派流程集成测试通过
- [ ] 编程模式 Hashline 编辑集成测试通过
- [ ] 编程模式 LSP 工具集成测试通过
- [ ] 权限控制逻辑集成测试通过
- [ ] SessionModeSelector UI 组件测试通过
- [ ] 展开/收起动画和交互测试通过
- [ ] 响应式布局测试通过
- [ ] 核心功能模块测试覆盖率达到 80% 以上
- [ ] 模式切换响应时间性能测试通过（<500ms）
- [ ] 模式初始化启动时间性能测试通过（<300ms）
- [ ] 内存占用稳定性测试通过（无泄漏）
- [ ] trae-agent-main 所有功能移植完整性检查通过
- [ ] oh-my-openagent-dev 核心功能移植完整性检查通过
- [ ] 移植功能在 openhanako-main 环境运行验证通过
- [ ] 权限行为一致性验证通过（无泄露/越权）
- [ ] 模式组合测试用例全部通过
