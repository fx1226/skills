# 分派、只读与台账契约（自包含，Harness 无关）

本文件独立定义本技能的能力驱动分派、两级只读隔离与 `flow-ledger` 契约，不依赖外部目录或特定 Harness。

## 能力驱动独立上下文分派

- **绑定角色**：本技能涉及开发 `fr-developer` 与代码 Reviewer `fr-code-reviewer`。优先使用宿主已配置且合规的专用角色；无专用配置时，使用当前宿主支持创建独立上下文的通用子 Agent 工具并显式指定一个逻辑角色。
- **上下文身份与句柄分离**：在 `flow-ledger` 中分别记录稳定上下文身份 `contextId`、所属范围 `contextScope`（父会话／Agent 树／运行器实例）及 `runHandle`、`resumeHandle`。同一 `contextScope` 下不同角色不得共用 `contextId`（含 `handoffs[]` 历史身份）。原上下文续接导致 `runHandle` 或 `resumeHandle` 变化时沿用原 `contextId`；换用新的同角色独立上下文时才登记新 `contextId` 并记录交接。
- **直接履约与禁再委派**：首次分派即提交完整实质任务、版本化输入、允许操作、交付物和完成条件；要求角色子 Agent 直接完成工作，禁止再次委派（宿主支持时关闭其分派权限）。外部人工代码审查记 `actorType: "external-human"` 与可核对外部身份，不虚构 Agent 会话。

## Reviewer 两级只读隔离协议

1. **一级（`enforced`，默认必需）**：使用宿主原生只读工具集、只读沙箱或隔离的只读快照／副本强制限制写入，同时允许读取判断所需上下文。仅用口头“不要写入”或切目录不构成只读隔离。
2. **二级（`verified-zero-write`，仅显式批准后降级）**：当宿主能新建独立上下文但无法强制禁写时，主 Agent 须先停止正式代码审查并向用户报告只读能力缺口，禁止直接用口头约束放行。仅当用户获知缺口后明确批准事后零写入核验降级，主 Agent 方可在派工前后采集可核验的工作区／VCS 状态指纹（如 `git status --porcelain` + 差异摘要，或 `svn status` + 校验和），确认 `beforeFingerprint === afterFingerprint` 零写入，并在台账与结论中标明 `readOnlyMode: "verified-zero-write"`、`approvalRef` 与前后指纹；一旦检出任何非预期写入，立即作废审查结论并报告阻塞。

## 统一结构化台账（`flow-ledger`，`schemaVersion: 1`）

在送审轮次切换、停止等待和交付末尾于对话中输出精简 `flow-ledger` JSON 块；仅当用户明确给出保存路径并授权写入时才落盘。独立调用本技能时可置 `meta.standalone: true` 并只填写适用字段，编入 `xu-fr-flow` 时合并至主台账。

```json
{
  "meta": {
    "schemaVersion": 1,
    "standalone": true,
    "taskId": "DEV-YYYY-NNN",
    "mode": "standard",
    "preDraftCases": false,
    "updatedAt": "2026-11-24T16:00:00+08:00"
  },
  "versions": {
    "codeSnapshot": "git:abc1234",
    "buildOrDevice": "build-20261124-01"
  },
  "roles": {
    "fr-developer": {
      "status": "completed",
      "actorType": "agent",
      "harness": "generic",
      "contextId": "ctx-dev-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-dev1",
      "resumeHandle": "resume-dev1",
      "readOnlyMode": "na",
      "readOnlyEvidence": null,
      "handoffs": []
    },
    "fr-code-reviewer": {
      "status": "completed",
      "actorType": "agent",
      "harness": "generic",
      "contextId": "ctx-rev-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-rev1",
      "resumeHandle": "resume-rev1",
      "readOnlyMode": "enforced",
      "readOnlyEvidence": null,
      "handoffs": []
    }
  },
  "utEntry": {
    "codeSnapshot": "git:abc1234",
    "devSelfTest": { "passed": true, "snapshot": "git:abc1234", "evidence": "unit tests 42/42" },
    "devDiffSelfReview": { "passed": true, "snapshot": "git:abc1234", "evidence": "reviewed full diff" },
    "codeReview": { "passed": true, "snapshot": "git:abc1234", "openBlockers": 0, "evidence": "approved R1" }
  },
  "loops": {
    "code": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] },
    "defectReturn": { "cycles": 0, "maxCycles": 2, "pendingReturn": false, "history": [] }
  }
}
```
