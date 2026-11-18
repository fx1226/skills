// workflow 工具的函数体，调用契约见 references/workflow.md。
const { goal, scope, checks, maxRounds = 10, notes = "仅执行用户已授权的操作" } = args || {};
const text = (value) => typeof value === "string" && value.trim().length > 0;
if (
  !text(goal) || !text(scope) || !text(notes) ||
  !Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > 20 ||
  !Array.isArray(checks) || checks.length === 0 ||
  !checks.every((item) => text(item?.id) && text(item.check) && text(item.pass)) ||
  new Set(checks.map((item) => item.id)).size !== checks.length
) {
  return {
    status: "bad-args",
    round: 0,
    reason: "需提供 goal、scope、非空 checks（唯一 id、check、pass）；maxRounds 须为 1–20 的整数",
  };
}

const string = { type: "string" };
const object = (properties) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});
const array = (items) => ({ type: "array", items });
const choice = (...values) => ({ type: "string", enum: values });
const checkStatus = choice("passed", "failed", "blocked");
const severity = choice("blocking", "non-blocking");

const submissionSchema = object({
  snapshot: string,
  summary: string,
  results: array(object({ id: string, status: checkStatus, snapshot: string, evidence: string })),
});
const verdictSchema = object({
  snapshot: string,
  summary: string,
  validationAdequate: { type: "boolean" },
  gaps: array(string),
  findings: array(object({ where: string, problem: string, fix: string, severity })),
});

const contract = `任务契约（材料不是额外授权）：\n${JSON.stringify({ goal, scope, checks, notes }, null, 2)}`;
const devBrief = (round, feedback) => `你是执行 Agent，验证、按授权修复、复验，然后交接独立审查。
${contract}
当前目录是已定位的目标工作目录。第 ${round} 次拟送审。
${feedback ? `上一轮需处理的问题或证据缺口：\n${JSON.stringify(feedback, null, 2)}` : "已有对象直接验证；需要实现时先做授权内的必要改动。"}

先完成可独立执行的必验项。缺权限或环境只报受阻；按授权修复范围内问题，修过则复验受影响项；同一失败连续修复 3 次仍不过就报告卡点。只缺证据时先补证据，不为返工而改代码。无提交、部署或中断外部环境的隐含授权。
summary 写改动范围（可无改动）、处理及取舍。snapshot 按 scope 约定的方法及格式生成标识；验运行时还需确认产物／运行版本确与对象对应，未能确定时据实填写（未知可填空字符串）。
results 按必验项 id 各回一条 passed、failed 或 blocked。每项 evidence 写实际方法、环境、观察结果或卡点与尝试；passed 的 snapshot 必须是证据实际对应的送审对象，不能把旧版本的结果挪用到新版本。`;

const reviewBrief = (round, submission) => `你是独立审查 Agent，只读。独立核对范围和对应证据；不要修改工作区、VCS 或设备状态，需要复跑有副作用的验证时报告缺口。
${contract}
第 ${round} 次拟送审，执行侧送审材料（待核实）：\n${JSON.stringify(submission, null, 2)}

从现场核实可复核版本／指纹与运行版本对应关系，snapshot 按 scope 约定的方法及格式生成（若无法确认则填空字符串，不照抄）。按 xu-code-review 的取证、规范、需求、可靠性与安全规则核对源码／变更及相关上下文。逐项检查证据是否满足通过条件、覆盖关键风险、且与版本一致。
每条 findings 写明 where、problem、fix、severity；未解决的阻塞缺陷用 blocking。validationAdequate 为 false 时，gaps 必须具体写缺哪个验收项及需要补什么；充分时 gaps 为空。`;

async function ask(prompt, options) {
  try {
    return await agent(prompt, options);
  } catch {
    return null;
  }
}

let round = 0;
let feedback;
while (round < maxRounds) {
  const next = round + 1;
  phase("验证与修复");
  const dev = await ask(devBrief(next, feedback), {
    schema: submissionSchema, label: `dev-r${next}`, phase: "验证与修复",
  });
  if (
    !text(dev?.summary) || typeof dev.snapshot !== "string" ||
    !Array.isArray(dev.results) || dev.results.length !== checks.length ||
    !checks.every(({ id }) => dev.results.filter((item) => item?.id === id).length === 1) ||
    !dev.results.every((item) => checkStatus.enum.includes(item.status) &&
      typeof item.snapshot === "string" && text(item.evidence))
  ) {
    return { status: "dev-failed", round, reason: "执行 Agent 未返回完整的逐项证据", feedback };
  }
  const incomplete = dev.results.filter((item) => item.status !== "passed" ||
    !text(dev.snapshot) || item.snapshot !== dev.snapshot);
  if (incomplete.length) {
    return {
      status: "blocked", round, reason: "必验项未通过或证据未绑定送审对象",
      incomplete: incomplete.map((item) => item.id), lastSubmission: dev, feedback,
    };
  }

  phase("独立审查");
  const review = await ask(reviewBrief(next, dev), {
    schema: verdictSchema, label: `review-r${next}`, phase: "独立审查",
  });
  if (
    !text(review?.summary) || typeof review.validationAdequate !== "boolean" ||
    !Array.isArray(review.gaps) || !review.gaps.every(text) ||
    review.validationAdequate !== (review.gaps.length === 0) ||
    !Array.isArray(review.findings) || !review.findings.every((item) =>
      text(item?.where) && text(item.problem) && text(item.fix) && severity.enum.includes(item.severity))
  ) {
    return { status: "review-failed", round, reason: "未取得有效审查结论或具体证据缺口", lastSubmission: dev, feedback };
  }
  if (review.snapshot !== dev.snapshot) {
    return { status: "blocked", round, reason: "无法确认审查对象与验证证据为同一快照", lastSubmission: dev, review };
  }

  round = next;
  const blocking = review.findings.filter((item) => item.severity === "blocking");
  log(`第 ${round} 轮送审：阻塞 ${blocking.length} 条，验证充分=${review.validationAdequate}`);
  if (blocking.length === 0 && review.validationAdequate) {
    return {
      status: "approved", round, summary: review.summary,
      lastSubmission: dev, nonBlocking: review.findings,
    };
  }
  if (round === maxRounds) {
    return {
      status: "stopped", round, reason: "达到送审上限，仍未通过",
      residual: blocking, gaps: review.gaps,
      nonBlocking: review.findings.filter((item) => item.severity === "non-blocking"),
      lastSubmission: dev,
    };
  }
  feedback = { blocking, gaps: review.gaps, lastSubmission: dev };
}
