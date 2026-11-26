# 分派、只读与台账契约（自包含，Harness 无关）

本文件独立定义能力驱动分派、两级只读隔离与 `flow-ledger` 契约，不依赖外部目录或特定 Harness。

## 能力驱动独立上下文分派

- **绑定角色与跨阶段隔离**：用例作者 `fr-test-case-author` 与用例 Reviewer `fr-test-case-reviewer` 使用各自独立的上下文，
  并与主 Agent、入口开发者和代码 Reviewer 隔离。
  使用入口绑定的开发会话执行 UT，以原开发角色记录测试证据。开发角色交接沿用已有的版本、身份和证据规则。
  新建用例角色时优先使用合规角色配置，也可用通用工具创建独立上下文。
- **上下文身份与句柄分离**：记录稳定 `contextId`、`contextScope`、`runHandle` 和 `resumeHandle`。
  同一 `contextScope` 下不同角色不得共用 `contextId`（含 `handoffs[]`）。
  续接原上下文只更新句柄；换用新的同角色上下文才登记新身份和交接。
- **直接履约与禁再委派**：首次分派即给出完整任务、版本化输入、权限、交付物和完成条件。
  角色子 Agent 直接履约，禁止再次委派（宿主支持时关闭其分派权限）。
  外部人工代码审查记 `actorType: "external-human"` 与可核对身份，不虚构 Agent 会话。

## Reviewer 两级只读隔离协议

1. **一级（`enforced`，默认必需）**：用例 Reviewer 使用宿主只读工具、只读沙箱或隔离只读副本限制写入。
   口头“不要写入”或仅切目录不构成只读隔离。
2. **二级（`verified-zero-write`，仅显式批准后降级）**：无法强制禁写时，先停报缺口；
   用户获知缺口并明确批准后，才可继续派工。派工前后采集可核验的工作区／VCS 指纹，
   确认 `beforeFingerprint === afterFingerprint`，并在台账与结论中标注模式、批准记录和指纹。
   检出任何非预期写入或漂移时，立即作废评审结论并报告阻塞。

## 状态卡与按需台账

日常切换和交接末尾输出 6–8 行紧凑状态卡，记录档位、阶段／终态、固定版本、
活跃角色、只读约束、门禁、轮次／回流、阻塞／待确认项。
跨会话交接、调用 `scripts/validate-ledger.cjs` 或用户明确要求时，
才输出稀疏 `flow-ledger` JSON（`schemaVersion: 1`），省略未激活角色和未触达门禁。
独立调用可置 `meta.standalone: true` 并只填写适用字段，编入 `xu-fr-flow` 时合并至主台账。
仅当用户明确给出保存路径并授权写入时才落盘。

新交接在 `qaHandoff.executorRole` 记录入口开发者的角色标识（`fr-developer` 或独立调用的 `developer`）。
历史台账中已完成的独立测试角色及证据可如实保留。复测批次记录 `retestSnapshot` 和 `retestBuildOrDevice`。
已发起的缺陷批次数 `loops.defectReturn.cycles` 与 `history` 条数一致。
发起时保存 `status: "active"`、`fullRoundCompleted: true` 和 `failedCaseIds`。复审及复测证据齐全后改为 `"completed"`。
旧记录缺少 `status` 时按已完成批次校验。待开启的下一批用 `pendingReturn` 表示。

```json
{
  "meta": { "schemaVersion": 1, "standalone": true, "taskId": "UT-2026-001", "mode": "standard", "preDraftCases": false, "updatedAt": "2026-11-24T16:00:00+08:00" },
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
    "fr-developer": {
      "status": "completed",
      "contextId": "ctx-dev-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-dev1"
    },
    "fr-code-reviewer": {
      "status": "completed",
      "contextId": "ctx-rev-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-rev1",
      "readOnlyMode": "enforced"
    },
    "fr-test-case-author": {
      "status": "completed",
      "contextId": "ctx-tca-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-tca1"
    },
    "fr-test-case-reviewer": {
      "status": "completed",
      "contextId": "ctx-tcr-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-tcr1",
      "readOnlyMode": "enforced"
    }
  },
  "gates": {
    "C": { "status": "confirmed", "targetVersion": "ut-v1", "confirmedBy": "user", "evidence": "chat-turn-9" }
  },
  "utEntry": {
    "codeSnapshot": "git:abc1234",
    "devSelfTest": { "passed": true, "snapshot": "git:abc1234", "evidence": "unit tests 42/42" },
    "devDiffSelfReview": { "passed": true, "snapshot": "git:abc1234", "evidence": "reviewed full diff" },
    "codeReview": { "passed": true, "snapshot": "git:abc1234", "openBlockers": 0, "evidence": "approved R1" }
  },
  "loops": {
    "code": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] },
    "testCase": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] }
  },
  "qaHandoff": {
    "executorRole": "fr-developer",
    "buildOrDevice": "build-20261124-01",
    "codeSnapshot": "git:abc1234",
    "testCases": "ut-v1",
    "mandatorySummary": { "passed": 10, "failed": 0, "blocked": 0, "notRun": 0 },
    "readyForQa": true,
    "qaAccepted": false
  }
}
```
