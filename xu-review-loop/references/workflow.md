# 程序门禁调用契约

用户明确要求程序门禁时，按本契约调用兼容的 `workflow` 工具执行现有脚本。它必须支持以下调用和脚本内的 `agent`（独立上下文、结构化 `schema`）、`phase`、`log`；`workflow.js` 不是独立 Node 命令。先定位到目标工作目录，脚本不自行切换目录、执行外部验证命令或改动工作区。

```js
workflow({
  meta: {
    name: "xu-review-loop",
    description: goal,
    phases: [{ title: "验证与修复" }, { title: "独立审查" }]
  },
  args: { goal, scope, checks, maxRounds, notes },
  script: /* ../workflow.js 原文 */
});
```

- `scope` 写对象、定位方法、纳入与排除的范围（含暂缓项），以及两侧如何独立生成同一格式的版本标识，不限 Git。`notes` 写授权与限制。
- `checks` 是非空必验清单，每项 `{ id, check, pass }`：唯一 ID、验证方式、通过条件，不要求每项都是命令。涉及构建产物时，在通过条件中写明功能测试须使用本次构建产物；脚本只校验证据条目与版本标识，构建顺序和产物对应关系由审查核实。
- `maxRounds` 省略为 10；显式输入须为 1–20 的整数。可用的后台执行和取回结果方式以该工具为准，启动任务不算完成。
- 程序强制检查条目是否齐全、送审对象标识是否一致、审查结论是否有效及轮次上限；实际证据是否可信由独立审查核实。审查只读权限仍须由运行环境约束，不能把提示词当作权限隔离。

| `status` | 处理 |
|---|---|
| `approved` | `lastSubmission` 有逐项证据与对象；结合 `summary`、`nonBlocking` 交付，先按主流程复核漂移。 |
| `stopped` | 到有效送审上限，分别列出 `residual` 的阻塞项、`gaps` 的具体证据缺口和非阻塞项；不提交。 |
| `blocked` | 报告理由、已有证据与不完整项，或验证与审查对象不一致；如有价值，可独立做不计轮的部分只读审查。 |
| `dev-failed` / `review-failed` | 未取得有效执行／审查结果，属于流程故障；保留已经取得的证据和返工缺口。 |
| `bad-args` | 先修正调用契约。 |

`round` 永远是已完成的有效送审次数。本次在执行或审查环节出错时，未完成的拟送审轮次是 `round + 1`。不要自动重开脚本清零已用轮次。

维护时从仓库根目录运行 `node --test xu-review-loop/workflow.test.cjs`。这只验证脚本判定，不替代兼容运行器实跑；会话路径按 [行为用例](../test-prompts.json) 验证。
