# 来源与维护依据

本技能是实践归纳，不声称复刻任何公司的完整内部制度。外部资料作为背景与核对入口，不是被审项目的硬性规范；每次审查优先使用目标项目及对应技术版本的证据。

## 本地基底

- 本机 `code-review/SKILL.md`：Standards／Spec 双轴、需求与规范溯源、Fowler 坏味道基线。本技能保留轴间独立判断，新增可靠性与安全轴；将强制并行改为获授权时可选。
- 本仓库 `svn-code-review/` 提供 SVN 审查的历史基底。当前技能自带 [SVN](svn-scope.md) 与 [Git](git-scope.md) 取证规则。
- `writing-for-agents`：触发描述、步骤完成条件、单一事实来源和按风险分支披露参考。
- 本地路径用于说明编写来源，不是运行时依赖；本技能运行所需参考均随目录提供。

## 公开资料

1. **[Google — What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)**

   对应：设计、功能、复杂度、测试、命名、注释、风格与文档；先理解上下文再判断。

2. **[Google — The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)**

   对应：改善代码健康而非追求完美；区分必要修复与非阻塞改进。

3. **[Microsoft — Reviewer Guidance](https://microsoft.github.io/code-with-engineering-playbook/code-reviews/process-guidance/reviewer-guidance/)**

   对应：理解上下文、设计优先、功能与错误处理、测试及建设性反馈。

4. **[Alibaba — Java 开发手册／p3c](https://github.com/alibaba/p3c)**

   对应：将编码、异常与日志、测试、安全和数据库要求制度化；Java 专项要求不直接泛化成所有语言规则。

5. **[华为云 — 代码检查安全增强](https://support.huaweicloud.com/productdesc-codecheck/codeartscheck_07_1010.html)**

   对应：以静态检查补充人工审查，关注空指针等缺陷与安全风险；工具可检测范围取决于语言、引擎与规则。

6. **[AWS Builders’ Library — Ensuring rollback safety during deployments](https://aws.amazon.com/builders-library/ensuring-rollback-safety-during-deployments/)**

   对应：新旧版本／数据兼容和回滚安全，不能将代码回退等同于状态恢复。

## 维护与验收

- 外部能力、接口和具体规则随版本变化时，先核对对应版本官方资料，再更新唯一负责该规则的参考文件。
- 修改主流程、路由或风险门槛后，更新 test-prompts.json 中相应行为场景。
- 先用当前技能记录目标场景的失败／缺口，再做最小修改，复查场景及相邻边界；区分文本检查、VCS 命令夹具和真实 Agent 行为。
- JSON、frontmatter 和链接检查只证明结构有效；实际模型是否遵守范围、取证及授权边界，需在有授权的测试会话中验收。未运行的行为场景明确标注未运行。

检验独立发现缺陷的能力时，选用能核实根因的历史改动或隔离夹具，并混入符合契约的对照补丁。先固定需求、基线、候选版本和判分依据。每份候选交给独立上下文，只提供当时可见的项目材料、技能正文和中性审查请求。维护者保留修复记录、配对关系和题库答案。

按根因核对报告中的入口、触发条件和影响，记录命中、漏报、误报和仍待核实的额外发现。对照补丁以同一证据标准判分。报告样本数和实际运行环境；若要比较技能版本，用相同模型和材料分别盲审。
