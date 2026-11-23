# 子 Agent 分派与交接

## 选择当前可用的能力

先核对当前会话能否启动独立子 Agent、怎样取得实际结果、怎样配置任务权限，以及怎样续接已有上下文。已配置且合规的角色 profile 优先；没有对应 profile 时，可用通用工具新建独立上下文，并在完整任务中指定逻辑角色。已经被拒绝的权限须由有权者处理；按同等授权选择工具，保留项目或用户明确要求的角色配置和运行方式。

用宿主可核对的上下文身份校验角色隔离。不同独立上下文可以共用模型、工具和 profile。创建新角色时优先采用不继承其他专业角色历史的方式。记录稳定的子 Agent 或会话标识，注明 Harness 及所属父会话、Agent 树或运行器实例，局部名称须带其所属范围。宿主只返回任务 ID 时，须有能追溯到独立上下文创建的工具证据。分别记录跟踪运行和续接会话所用的实际句柄。续接使运行句柄变化时，沿用原上下文身份并更新句柄。隔离无法核实时报告受阻。

Reviewer 使用只读工具、沙箱或隔离的只读快照，并能读取必要上下文。把工作目录分开或写一条只读提示不足以证明写入已被限制。

## 分派和验收

- **主 Agent 发出完整任务**。包含逻辑角色、任务目标及范围、所依赖的实际产物及版本、工作位置、允许的操作、交付物、通过条件和遇阻时应报告的信息。明确需关注的反馈及问题，给 Reviewer 独立核对依据。每次调用都应有可验收的任务，并明确禁止角色子 Agent 再委派。支持工具限制时，关闭角色子 Agent 的分派权限。
- **子 Agent 直接完成本角色工作**。返回状态、实际产物或其位置、对应版本、检查范围和可核对的证据，逐项写明阻塞及仍待用户确认的事项。需要额外分派时说明所需工作和原因，由主 Agent 决定并分派。验收只认可对应角色直接完成的工作。
- **主 Agent 验收交付并流转**。核对身份隔离、版本、权限和证据完整性，从实际返回判断能否流转。排队回执和成功退出状态只用于跟踪；设计、送审材料、独立结论或实测证据由角色交付。先取得上游产物，再安排具有依赖的角色。用户的人工确认关联具体版本。
- **原角色返工**。核对上下文身份及其所属范围，使用最新可用的续接句柄和新任务续接原上下文。保留上轮结果、逐项问题与有效轮次。当前工具无法续接或原会话不可用时，向同一逻辑角色的新独立上下文交接原因、已审与当前版本、反馈、增量、已有证据、有效轮次及未结事项，记录实际接替。Reviewer 接替后先检查未结项和增量；需要全量重审时按专业技能执行。
- **能力或证据有缺口**。缺少可核对的独立上下文、只读权限或交接证据，或用户要求使用原会话但无法续接时，报告具体角色和阻塞。可交付已有实际产物及可核验的外部角色证据，按阶段原有门禁核对其适用性。主 Agent 保留编排职责，人工确认由用户给出。

## 按 Harness 选择分派方式

以下入口取决于当前客户端、版本和配置。先看当前工具声明，使用真实返回值；逻辑角色、版本和验收门禁适用同一套规则。

- **OpenCode**。如果已安装仓库的 `fr-*` profiles，映射同名角色。当前版本提供 `subagent` 时，用 `agent` 和完整任务启动，等待子会话实际输出，用返回的 `sessionID` 续接。其他版本按实际子 Agent 工具的字段操作。项目 profiles 随仓库提供，可在 OpenCode 中按需安装。 [Agent 配置](https://opencode.ai/docs/agents/) · [Subagent 工具](https://opencode.ai/docs/tools/#subagent)
- **Codex**。用客户端提供的子 Agent 能力分别派工，记录它返回的 agent／thread 标识。支持继续原 Agent 时通过该标识发送新的同角色任务。Reviewer 的只读边界要从当前会话权限、工具限制或隔离执行环境落实；Codex 自定义角色说明不覆盖父会话沙箱。 [Codex 子 Agent](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- **Pi**。子 Agent 由已获准的扩展提供。使用 `pi-subagents` 时，若当前只暴露 `subagents_enable`，先通过该工具启用，再用 `subagent`。独立角色使用 `context: "fresh"`，Reviewer 采用只读工具列表。扩展允许恢复时，用最新返回的 `runId` 发起 `resume`，通过原会话或可核对的续接记录识别同一上下文；恢复后返回的新 `runId` 用于后续操作。无法续接时走同角色交接。 [Pi 扩展](https://github.com/earendil-works/pi/tree/main/packages/coding-agent) · [pi-subagents 工具参考](https://github.com/nicobailon/pi-subagents/blob/main/docs/tool-reference.md)
- **DeepSeek Harness（DSH）**。用 `subagent` 发独立任务，按实际完成通知和结果验收。当前会话有 `send_message` 且原子 Agent 可用时，核对所属 Agent 树，再按返回的子 Agent 名称续接。角色预设和只读能力以当前工具声明为准；只有实际提供 `agent_preset` 时才使用此参数。单次外部代理须已配置且获准，续接按该代理实际能力处理。 [DSH 工具目录](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-catalog.md)
- **Kimi Code**。CLI 暴露 `Agent` 时，可按 `subagent_type` 选适用角色，评审可选只读的 `explore` 或已配置的只读角色。返回的后台任务标识用于跟踪结果，`resume` 使用 Agent 标识。Desktop 以当前会话实际暴露的分派和续接方式为准。 [Kimi CLI Agent 配置](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/agents.html) · [Kimi CLI 工具](https://www.kimi.com/code/docs/kimi-code-cli/reference/tools.html) · [Kimi Desktop 协作](https://www.kimi.com/code/docs/en/kimi-code-desktop/task-execution-and-review.html)
