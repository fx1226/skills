# 开发者送审模板

在送审说明前列出 Bug 或需求标识、基线、拟提交的完整 diff（或可核对的引用）与测试产物版本。复审时附上轮意见、逐项答复和相对上轮的增量。多个 Bug 建议各填一份，分别说明根因、修改位置和验证结果。

```text
Bug 问题描述（新功能填写需求描述）

==========由Review发起人填写==========

[Root Cause]（必填）
Bug 填写根因分析；新功能填写“新功能”并给出需求依据。

[Fix Solution]（必填）
描述修改方案，以及改动如何修复根因或满足需求。

[Impact Modules]（必填）
写明直接改动的模块、是否涉及其他模块，以及可能受影响的关联功能。

[Unit Test]（必填，由解决人填写）
Bug 写明复现过程、预期行为、修复后实测结果及关联回归结果。
新功能写明验收场景、预期行为、实测结果及关联回归结果。

[Test Suggestion]（必填）
填写后续测试建议，区分建议执行的项目和已经取得的实测结果。

[Reference to update feature,character or spec,syslog,cli,logic,config]（必选，YES 或 NO）
以下两项任一为 YES，总项填 YES；两项均为 NO，总项填 NO。
1. 是否修改了一个已有 SYSLOG（ID 相同）的格式或文本信息？
2. 与已发布的上一个版本相比，相同配置下，已支持的业务是否有业务可感知的变化
   （如 session 老化时间、删除机制、调度算法）？

[Security Considerations]（必填）
检查代码是否存在超级账户、后门、恶意程序或其他安全漏洞。
经检查未发现或不涉及时填“无”；发现风险时说明具体内容。请 Reviewer 独立核查此项。

[Reference to update cli command]（可选）
是否涉及 CLI 命令行修改；涉及时说明命令及变化。

[Need amend doc]（yes/no）
是否需要修改文档。

[What doc content if need amend doc]
需要修改文档时，列出涉及的 CLI、SYSLOG、错误信息或具体功能变更。
```
