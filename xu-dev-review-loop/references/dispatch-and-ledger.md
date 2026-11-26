# 分派、只读与台账契约（自包含，Harness 无关）

本文件独立定义能力驱动分派、两级只读隔离与 `flow-ledger` 契约，不依赖外部目录或特定 Harness。

## 能力驱动独立上下文分派

- **绑定角色**：当前主 Agent 担任 `developer`。送审材料就绪后，为该 Bug 或新功能绑定独立的 `code-reviewer`，各轮续接同一对上下文。这两个名称标识职责；宿主提供通用独立上下文时，可在分派中指定职责与权限。
- **上下文身份与句柄分离**：记录稳定 `contextId`、`contextScope`、`runHandle` 和 `resumeHandle`。
  同一 `contextScope` 下不同角色不得共用 `contextId`（含 `handoffs[]`）。
  续接原上下文只更新句柄；换用新的同角色上下文才登记新身份和交接。
- **交接**：派给 Reviewer 的首份任务含版本化 diff、填写好的送审说明、自验结果、只读权限和完成条件。如属复审，再给出上轮结论、逐项答复与增量。只有原会话确实不可续接时才记录原因并同角色交接。
  已分派的角色子 Agent 直接履约，禁止再次委派（宿主支持时关闭其分派权限）。
  外部人工代码审查记 `actorType: "external-human"` 与可核对身份，不虚构 Agent 会话。

## Reviewer 两级只读隔离协议

1. **一级（`enforced`，默认必需）**：用宿主只读工具、只读沙箱或隔离只读副本限制写入。
   口头“不要写入”或仅切目录不构成只读隔离。
2. **二级（`verified-zero-write`，仅显式批准后降级）**：无法强制禁写时，先停报缺口；
   用户获知缺口并明确批准后，才可继续派工。派工前后采集可核验的工作区／VCS 指纹，
   确认 `beforeFingerprint === afterFingerprint`，并在台账与结论中标注模式、批准记录和指纹。
   检出任何非预期写入或漂移时，立即作废审查结论并报告阻塞。开发者需要新增本地测试材料补证时，在只读核验窗口之外执行，再把证据交给原 Reviewer。

## 状态卡与按需台账

日常切换和交付末尾输出 6–8 行紧凑状态卡，记录步骤与结论、已审版本、开发者与 Reviewer、只读约束、轮次和待解决的问题。
跨会话交接、调用台账校验或用户明确要求时，才输出稀疏 `flow-ledger` JSON（`schemaVersion: 1`）。
独立台账使用 `meta.standalone: true` 与下例角色键。需要核验开发自验与审查交接证据时，在仓库根目录运行 `node scripts/validate-ledger.cjs --gate ut-entry path/to/ledger.json`，将示例路径替换为实际台账路径。若从标准输入读取 JSON，将路径参数改为 `-`。
仅当用户明确给出保存路径并授权写入时才落盘。

```json
{
  "meta": { "schemaVersion": 1, "standalone": true, "taskId": "DEV-2026-001", "updatedAt": "2026-11-24T16:00:00+08:00" },
  "versions": { "codeSnapshot": "git:abc1234+diff:7bc91d2", "buildOrDevice": "build-20261124-01" },
  "roles": {
    "developer": {
      "status": "completed",
      "contextId": "ctx-dev-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-dev1"
    },
    "code-reviewer": {
      "status": "completed",
      "contextId": "ctx-rev-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-rev1",
      "readOnlyMode": "enforced"
    }
  },
  "utEntry": {
    "codeSnapshot": "git:abc1234+diff:7bc91d2",
    "devSelfTest": { "passed": true, "snapshot": "git:abc1234+diff:7bc91d2", "evidence": "unit tests 42/42" },
    "devDiffSelfReview": { "passed": true, "snapshot": "git:abc1234+diff:7bc91d2", "evidence": "reviewed full diff" },
    "codeReview": { "passed": true, "snapshot": "git:abc1234+diff:7bc91d2", "openBlockers": 0, "evidence": "approved R1" }
  },
  "loops": { "code": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] } }
}
```

## 由其他工作流复用

调用方可以传入已绑定的开发者与 Reviewer，也可以在开发者自验通过后分派独立 Reviewer。角色名称的转换只涉及调用方的记录，两位经办者的上下文、权限、证据与轮次随交接保留。

例如，`xu-fr-flow` 以阶段 3 的开发者进入阶段 4，由外层主 Agent 分派或续接 Reviewer。写回其完整台账时，`developer` 对应 `fr-developer`，`code-reviewer` 对应 `fr-code-reviewer`。已有的独立旧台账也可按原有 `fr-*` 键读取。
