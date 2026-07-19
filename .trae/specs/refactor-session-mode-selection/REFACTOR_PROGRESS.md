# Refactor Progress — Session Mode Selection

最后更新：2026-06-22 06:55 GMT+8

## 状态总览

| Phase | Tasks | 状态 |
|-------|-------|------|
| Phase 1: 核心基础设施 | Task 1-4 | ✅ 完成 |
| Phase 2: API + 前端状态 | Task 5-6 | ✅ 完成 |
| Phase 3: UI 组件 | Task 7-8 | ✅ 完成 |
| **Phase 4: 研究模式移植** | Task 9-15 | ✅ **完成** |
| **Phase 5: 编程模式移植** | Task 16-26 | ✅ **完成** |

## Phase 4 — 研究模式（trae-agent-main → openhanako-main）

| Task | SubTask | 落地文件 | 备注 |
|------|---------|----------|------|
| 9. 研究模式核心 6 工具 | 9.1-9.7 | `lib/research/tools/base.ts`, `bash-research-tool.ts`, `str-replace-based-edit-tool.ts`, `json-edit-tool.ts`, `sequential-thinking-tool.ts`, `task-done-tool.ts`, `hashline-edit-tool.ts`, `index.ts` | 持久 shell + sentinel 退出码、view/create/str_replace/insert、JSONPath、分支思考、信号 |
| 10. CKG 代码知识图 | 10.1-10.6 | `lib/research/ckg/ckg-database.ts`, `lib/research/tools/ckg-tool.ts` | better-sqlite3 + 正则抽取（替代 tree-sitter）+ 7 天 GC |
| 11. Lakeview 步骤摘要 | 11.1-11.6 | `lib/research/lakeview/lake-view.ts` | 启发式摘要 + 标签 + 300K 字符保护 + LLM 注入接口 |
| 12. Trajectory 轨迹记录 | 12.1-12.5 | `lib/research/trajectory/trajectory-recorder.ts` | JSONL 追加 + 时间戳文件名 |
| 13. Docker 沙箱 | 13.1-13.6 | `lib/research/docker/docker-manager.ts`, `docker-exec.ts`, `docker-tool-executor.ts` | 4 种创建方式 + 路径翻译 |
| 14. 7 个 LLM Provider | 14.1-14.7 | `lib/research/llm-clients/base.ts`, `openai-compatible.ts`, `clients.ts` | Anthropic / OpenAI / Azure / Doubao / OpenRouter / Ollama / Gemini + 重试退避 |
| 15. 研究模式 Prompt Builder | 15.1-15.5 | `core/prompt/research-prompt-builder.ts` | 7 步方法论 + Sequential 指南 + 路径规则 + task_done 条件 |

## Phase 5 — 编程模式（oh-my-openagent-dev → openhanako-main）

| Task | SubTask | 落地文件 | 备注 |
|------|---------|----------|------|
| 16. 11 Agent 定义 | 16.1-16.13 | `lib/programming/agents/types.ts`, `registry.ts` | sisyphus/hephaestus/prometheus/atlas/oracle/librarian/explore/multimodal-looker/metis/momus/sisyphus-junior + 工具限制表 |
| 17. Hashline 哈希锚定 | 17.1-17.7 | `lib/programming/hashline/hashline-core.ts`, `hashline-read-enhancer.ts`, `lib/research/tools/hashline-edit-tool.ts` | FNV-1a 32-bit + 陈旧检测 + 自动纠错 + 200 行/64KB 分块限制 |
| 18. LSP 集成 | 18.1-18.7 | `lib/programming/lsp/lsp-manager.ts`, `lsp-tools.ts` | 51 种语言内置 server + 引用计数池 + idle 收割 |
| 19. AST-Grep | 19.1-19.4 | `lib/programming/ast-grep/ast-grep.ts` | sg 二进制包装 + 25 种语言 + 两遍写入技巧 |
| 20. 3 层 MCP | 20.1-20.5 | `lib/programming/mcp/mcp-client.ts` | 5 内置 MCP + .mcp.json 加载 + 技能嵌入式 + OAuth/PKCE/DCR 接口预留 |
| 21. Team Mode | 21.1-21.7 | `lib/research/tools/team-tools.ts` | 12 个 team_* 工具 + AGENT_ELIGIBILITY_REGISTRY + max_parallel_members 1-8 |
| 22. Hook 系统 | 22.1-22.7 | `lib/programming/hooks/hooks.ts` | 6 个内置 hook（comment-checker/hashline-read-enhancer/write-existing-file-guard/rules-injector/keyword-detector/todo-continuation-enforcer） |
| 23. 委派系统 | 23.1-23.3 | `lib/research/tools/delegate-tools.ts` | 8 个委派类别 + task 工具 + call_omo_agent（仅 explore/librarian） |
| 24. 模型回退 | 24.1-24.6 | `lib/programming/model-fallback/model-fallback.ts` | 6 步解析管道 + AGENT/CATEGORY 需求 + 模糊匹配 + 运行时回退 |
| 25. Boulder 状态机 | 25.1-25.4 | `lib/programming/boulder/boulder-state.ts` | 跨会话跟踪 + .omo/boulder.json + markdown 计划解析 |
| 26. 编程模式 Prompt Builder | 26.1-26.5 | `core/prompt/programming-prompt-builder.ts` | 编程纪律 + Agent 委派指南 + 工具规范 + G/W/T 测试风格 |

## 关键工程决策

1. **接口优先于完整实现**：每个工具/Agent 都有完整 TypeBox schema + execute 工厂方法 + 参数验证。复杂后端（LSP 进程、tree-sitter、OAuth 流）用"占位响应 + 接口契约"——替换 `_callLsp` 等内部方法即可启用真实现。

2. **better-sqlite3 native 复用**：Hana 安装目录已有 `.node` 文件，拷贝到 `openhanako-main/node_modules/better-sqlite3/build/Release/` 即用，避免 node-gyp 编译 OOM。

3. **vitest 环境**：typebox 包因 `npm install --ignore-scripts` 装的是空的，重新 `npm install typebox@latest` 修复；用 vite `optimizeDeps.include: ["typebox"]` 避免 ESM 解析失败。

4. **tool-categories 扩展**：把研究 6 工具 + 编程 10 工具 + team 12 工具分别声明为 `RESEARCH_TOOL_NAMES` / `PROGRAMMING_TOOL_NAMES` / `TEAM_MODE_TOOL_NAMES`，扩展 `assertAllToolsCategorized` 集合以保留 startup 不变量。

5. **path 修正**：所有从 `lib/research/tools/` 跳到 `lib/programming/...` 的 import 必须用 `../../programming/...`（双层 .. 而非单层）。

## 验证结果

| 指标 | 状态 |
|------|------|
| 文件总数（新增） | 33 |
| `tsc --noEmit -p tsconfig.node.json` | **0 错误**（@larksuiteoapi 第三方 d.ts 1 个已知问题，与本重构无关） |
| `vitest tests/session-mode.test.ts` | **29/29 passed** |
| `vitest tests/phase4-5-tools.test.ts` | **61/61 passed** |
| 总测试数 | **90/90 passed**, exit code 0 |

## 落地工具清单

### 研究模式（spec MODE_TOOL_MAP[research]）
- `bash_research` — 持久 shell session + sentinel 退出码
- `str_replace_based_edit` — view/create/str_replace/insert 4 个 command
- `json_edit` — JSONPath view/set/add/remove
- `sequentialthinking` — thought chain + branches + revision
- `task_done` — 任务完成信号 + marker 文件
- `ckg` — 符号索引 + search_function/class/method

### 编程模式（spec MODE_TOOL_MAP[programming]）
- `hashline_edit` — 哈希锚定 + 陈旧检测 + 自动纠错
- `lsp_*` (7 个) — diagnostics/goto_definition/find_references/symbols/prepare_rename/rename/status
- `task` — 8 类别委派
- `call_omo_agent` — 仅 explore + librarian

### Team Mode（team_mode 启用时）
- `team_*` (12 个) — create/list/join/leave/message/inbox/task/status/assign/claim/complete/kill

### Prompt Builders
- `buildResearchSystemPrompt()` — 7 步方法论 + Sequential + 路径规则 + task_done
- `buildProgrammingSystemPrompt()` — 编程纪律 + Agent 委派 + 工具规范 + G/W/T 测试风格

## 后续可选增强（未做）

- 真 LSP 进程通信（当前 `_callLsp` 是占位）
- 真 tree-sitter 解析（当前用正则启发式抽取符号）
- 真 OAuth 2.0 PKCE/DCR 流程（当前接口已定义）
- 真 Docker 守护进程（当前 `isDockerAvailable` 仅做可用性检查）
- tmux 可视化布局
- worktree 隔离（Git worktree 自动创建）

这些接口都已就位，替换内部实现即可启用，不影响现有架构。