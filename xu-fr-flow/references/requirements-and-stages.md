# 基线与文档元数据

以下是逻辑内容，不限定模板或物理文件；后续模板可替换而不改变主流程。各项注明来源和适用版本，未知项标为待确认，不把推断写成事实。

## 统一结构化台账（`flow-ledger`，`schemaVersion: 1`）

在阶段切换、门禁等待和交接末尾以精简 JSON 块输出于对话中；仅当用户明确给出路径并授权写入时才落盘。完整编排流程使用完整字段，单技能独立调用时可设 `meta.standalone: true` 并只填写适用字段。

```json
{
  "meta": {
    "schemaVersion": 1,
    "taskId": "FR-YYYY-NNN",
    "mode": "standard",
    "preDraftCases": false,
    "liteRedlines": {
      "crossModuleContractChange": false,
      "securityOrPermissionChange": false,
      "deviceFlashOrPersistentStateChange": false,
      "majorArchitectureOrMigrationTradeoff": false,
      "unresolvedRequirementAmbiguity": false
    },
    "updatedAt": "2026-11-24T16:00:00+08:00"
  },
  "versions": {
    "requirements": "req-v1",
    "design": "design-v1",
    "codeSnapshot": "git:abc1234",
    "testCases": "ut-v1",
    "testCasesStatus": "formal",
    "buildOrDevice": "build-20261124-01",
    "caseFormat": "markdown"
  },
  "roles": {
    "fr-requirements": {
      "status": "completed",
      "actorType": "agent",
      "harness": "generic",
      "contextId": "ctx-req-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-req-1",
      "resumeHandle": "resume-req-1",
      "readOnlyMode": "enforced",
      "readOnlyEvidence": null,
      "handoffs": []
    }
  },
  "gates": {
    "A": { "status": "confirmed", "targetVersion": "req-v1", "confirmedBy": "user", "evidence": "chat-turn-2" },
    "B": { "status": "confirmed", "targetVersion": "design-v1", "confirmedBy": "user", "evidence": "chat-turn-5", "implementationAuthorized": true },
    "AB": { "status": "waived", "targetVersion": null, "confirmedBy": null, "evidence": null, "implementationAuthorized": false },
    "C": { "status": "pending", "targetVersion": null, "confirmedBy": null, "evidence": null }
  },
  "utEntry": {
    "codeSnapshot": "git:abc1234",
    "devSelfTest": { "passed": true, "snapshot": "git:abc1234", "evidence": "unit tests 42/42" },
    "devDiffSelfReview": { "passed": true, "snapshot": "git:abc1234", "evidence": "reviewed full diff" },
    "codeReview": { "passed": true, "snapshot": "git:abc1234", "openBlockers": 0, "evidence": "approved R1" }
  },
  "loops": {
    "design": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] },
    "code": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] },
    "testCase": { "validRounds": 0, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] },
    "defectReturn": {
      "cycles": 0,
      "maxCycles": 2,
      "pendingReturn": false,
      "history": []
    }
  },
  "qaHandoff": {
    "buildOrDevice": null,
    "codeSnapshot": null,
    "testCases": null,
    "mandatorySummary": { "passed": 0, "failed": 0, "blocked": 0, "notRun": 0 },
    "readyForQa": false,
    "qaAccepted": false
  }
}
```

- `meta.mode`：`standard` 或 `lite`。`lite` 模式下 `versions.design` 允许为 `null`，`gates.AB` 替代 `gates.A` 与 `gates.B`，且 `meta.liteRedlines` 全部须为 `false`。
- `versions.testCasesStatus`：`pre-draft`（仅第 3 步显式预起草阶段，不得通过门禁 C）或 `formal`（第 4 步代码审查通过并对齐最终 `codeSnapshot` 后的正式版本）。
- `roles.<roleId>`：键限于 8 个逻辑角色（`fr-requirements`、`fr-designer`、`fr-design-reviewer`、`fr-developer`、`fr-code-reviewer`、`fr-test-case-author`、`fr-test-case-reviewer`、`fr-test-executor`）。同一 `contextScope` 下不同角色不得共用 `contextId`（包括 `handoffs[]` 中的历史上下文）；原上下文续接可更新 `resumeHandle` / `runHandle` 而保持 `contextId` 不变。
- `roles.<roleId>.readOnlyMode`：所有只读 Agent 角色必须为 `enforced` 或 `verified-zero-write`；非只读角色为 `na`。当为 `verified-zero-write` 时，`readOnlyEvidence` 必须包含 `{ "userApprovedDegradation": true, "approvalRef": "...", "beforeFingerprint": "...", "afterFingerprint": "..." }` 且前后指纹一致。外部人工角色记 `actorType: "external-human"` 与可核对外部身份，不虚构 Agent 会话。
- `gates.<A|B|AB|C>.status`：`pending`、`confirmed`、`waived`、`invalidated`。
- `loops`：内环 `maxRounds` 为 1–20 整数，停滞计数 `stagnationCount >= 2` 须停止汇报；外环 `defectReturn.maxCycles` 为 1–10 整数（默认 2），每次回流须在整轮 UT 跑完全部用例后批量触发，并在 `history[]` 记录 `{ "cycle": 1, "fullRoundCompleted": true, "failedCaseIds": [...], "affectedScope": [...], "reviewerVerifiedScope": true, "codeReviewRounds": 1, "retestSnapshot": "...", "retestBuildOrDevice": "..." }`。
- 仓库根目录提供零依赖校验器 `scripts/validate-ledger.cjs`，可按目标门禁（`A | B | AB | C | ut-entry | qa-handoff`）确定性校验本台账。

## 角色与交接台账

- 各逻辑角色、实际 Harness 与分派方式、可核对的稳定上下文身份（含所属父会话／Agent 树／运行器范围）或外部人员身份、负责范围及对应输出和版本。另记实际运行句柄、可用的续接句柄及所属上下文。原上下文续接后只更新相应句柄，接替才登记新的独立上下文。
- 返工沿用或同身份替换的原因、交接双方、时间、材料与证据位置、未决事项及责任接收记录；保留历史角色与独立结论，不因恢复会话伪造新工作。

## 需求

- FR/PRD 来源及版本；目标、非目标；场景与业务规则。
- 输入、输出和异常；兼容性、性能及环境约束。
- 可判定验收条件及每项来源；待确认问题及其阻塞状态。
- 可行性预分析、主要风险与依赖；人工确认人、对象版本、时间或可核对记录。
- `lite` 档位另记微范围／影响说明、5 项强制升级红线的逐项核查结果，以及门禁 AB 的合并确认与实现授权记录。

## 设计

- 对应需求基线、设计版本及状态；现状与影响；方案、模块、接口和状态。
- 异常、兼容与迁移；可测试性；独立评审意见、答复与结论。
- 人工确认人、确认的设计版本及可核对记录。

## 研发测试

- 对应需求与设计版本、代码快照、用例版本及状态；验收条件到用例的覆盖表、正式用例。
- 独立评审意见、答复及结论；用例人工确认及其版本。
- 构建产物、环境和设备软件版本；逐项执行证据、缺陷、修复与复测记录。
- QA 交接的已完成项、失败/受阻项、已知风险和证据位置。
