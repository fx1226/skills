# 基线与文档元数据

以下是逻辑内容，不限定模板或物理文件；后续模板可替换而不改变主流程。各项注明来源和适用版本，未知项标为待确认，不把推断写成事实。

## 日常状态卡与按需台账

日常阶段切换、门禁等待和交接末尾输出以下 8 行紧凑状态卡；
未激活角色、未触达门禁和空轮次不占行。

```text
档位：standard
阶段／终态：3 实现 / ADVANCE
固定版本：req-v1、design-v1、codeSnapshot=git:abc1234
活跃角色：fr-developer
只读约束：本阶段无 Reviewer
门禁：A、B 已确认；C 未触达
轮次／回流：code 0/3；defectReturn 0/2
阻塞／待确认：无
```

跨会话交接、调用 `scripts/validate-ledger.cjs` 或用户明确要求导出结构化台账时，
才输出稀疏 `flow-ledger` JSON（`schemaVersion: 1`），省略未激活角色、门禁与空环。
`pre-draft` 与门禁 C 等待中不得正式执行。落盘须同时有明确路径和写入授权。

## `flow-ledger` 字段速查

| 区域 | 关键字段 | 用途 |
| --- | --- | --- |
| `meta` | `schemaVersion`、`taskId`、`mode`、`preDraftCases`、`updatedAt` | 标识任务与契约；`lite` 另附 `liteRedlines` 五项布尔值 |
| `versions` | `requirements`、`design`、`codeSnapshot`、`testCases`、`buildOrDevice`、`caseFormat` | 固定各产物与运行版本 |
| `roles.<roleId>` | `status`、`actorType`、`contextId`、`contextScope`、`runHandle`、`resumeHandle`、`readOnlyMode`、`readOnlyEvidence`、`handoffs` | 核对角色隔离、续接、只读和交接 |
| `gates` | `status`、`targetVersion`、`confirmedBy`、`evidence`、`implementationAuthorized` | 关联人工确认与具体版本 |
| `loops` | `validRounds`、`maxRounds`、`stagnationCount`、`openBlockers` | 记录内环轮次、停滞和未解阻塞 |
| `loops.defectReturn` | `cycles`、`maxCycles`、`pendingReturn`、`history` | 记录批量回流与熔断 |
| `utEntry` | `devSelfTest`、`devDiffSelfReview`、`codeReview` | 四项入口证据与对应快照 |
| `qaHandoff` | 版本、`mandatorySummary`、`readyForQa`、`qaAccepted` | 汇总逐例状态与交接边界 |

以下为省略未激活角色和未触达门禁的稀疏示例：

```json
{
  "meta": { "schemaVersion": 1, "taskId": "FR-2026-001", "mode": "standard", "preDraftCases": false, "updatedAt": "2026-11-24T16:00:00+08:00" },
  "versions": { "requirements": "req-v1", "design": "design-v1", "codeSnapshot": "git:abc1234" },
  "roles": {
    "fr-requirements": {
      "status": "completed",
      "contextId": "ctx-req-1",
      "contextScope": "root-tree-01",
      "runHandle": "run-req-1",
      "readOnlyMode": "enforced"
    }
  },
  "gates": {
    "A": { "status": "confirmed", "targetVersion": "req-v1", "confirmedBy": "user", "evidence": "chat-turn-2" }
  },
  "loops": {
    "design": { "validRounds": 1, "maxRounds": 3, "stagnationCount": 0, "openBlockers": [] }
  }
}
```

- `meta.mode`：`standard` 或 `lite`；`lite` 可省略 `versions.design`，以 AB 替代 A／B，且五项红线均为 `false`。
- `versions.testCasesStatus`：`pre-draft` 或 `formal`。
- 同一 `contextScope` 下不同角色不得共用 `contextId`（含 `handoffs[]`）；续接只更新句柄。
- 只读角色为 `enforced` 或 `verified-zero-write`，非只读角色为 `na`；降级须记录批准与一致的前后指纹。
- 门禁状态：`pending`、`confirmed`、`waived`、`invalidated`。
- 内环 `maxRounds` 为 1–20；`stagnationCount >= 2` 须停止汇报。
  外环 `maxCycles` 为 1–10（默认 2），回流须整轮测完后批量触发。
  `history[]` 记录 `fullRoundCompleted`、失败用例、影响面、Reviewer 核验、复审轮次与复测版本。
- 仓库根目录提供 `scripts/validate-ledger.cjs`，按 `A | B | AB | C | ut-entry | qa-handoff` 校验。

## 角色与交接台账

- 各逻辑角色、实际 Harness 与分派方式、稳定上下文身份或外部人员身份、输出和版本。
  另记运行句柄、续接句柄及所属上下文；原上下文续接只更新句柄。
- 返工沿用或替换的原因、交接双方、时间、材料、未决事项及责任接收记录。
  保留历史角色与独立结论，不因恢复会话伪造新工作。

## 需求

- FR/PRD 来源及版本；目标、非目标；场景与业务规则。
- 输入、输出和异常；兼容性、性能及环境约束。
- 可判定验收条件及每项来源；待确认问题及其阻塞状态。
- 可行性预分析、主要风险与依赖；人工确认人、对象版本、时间或可核对记录。
- `lite` 档位另记微范围／影响说明、5 项红线逐项核查结果，以及门禁 AB 的合并确认与实现授权记录。

## 设计

- 对应需求基线、设计版本及状态；现状与影响；方案、模块、接口和状态。
- 异常、兼容与迁移；可测试性；独立评审意见、答复与结论。
- 人工确认人、确认的设计版本及可核对记录。

## 研发测试

- 对应需求与设计版本、代码快照、用例版本及状态；验收条件到用例的覆盖表、正式用例。
- 独立评审意见、答复及结论；用例人工确认及其版本。
- 构建产物、环境和设备软件版本；逐项执行证据、缺陷、修复与复测记录。
- QA 交接的已完成项、失败/受阻项、已知风险和证据位置。
