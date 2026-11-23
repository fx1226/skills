// workflow 工具的函数体。运行器按 references/workflow.md 核验角色、权限与直接履约。
const { goal, scope, checks, maxRounds = 3, notes = "仅执行用户已授权的操作", devHandoff = "" } = args || {};
const text = (value) => typeof value === "string" && value.trim().length > 0;
if (
  !text(goal) || !text(scope) || !text(notes) || typeof devHandoff !== "string" ||
  !Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > 20 ||
  !Array.isArray(checks) || checks.length === 0 ||
  !checks.every((item) => text(item?.id) && text(item.check) && text(item.pass)) ||
  new Set(checks.map((item) => item.id)).size !== checks.length
) {
  return {
    status: "bad-args",
    round: 0,
    reason: "需提供 goal、scope、非空 checks（唯一 id、check、pass）；maxRounds 须为 1–20 的整数（默认 3），devHandoff 须为字符串",
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
  selfReview: string,
  roleHandoff: string,
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
const delegationBoundary = "直接完成本角色工作，禁止再次委派。需要额外分派时向主 Agent 说明所需工作和原因。";
const devBrief = (round, feedback) => `你是开发 Agent，负责验证、按授权修复和复验，然后交接独立审查。
${delegationBoundary}
${contract}
当前目录是已定位的目标工作目录。第 ${round} 次拟送审。
${feedback ? `运行器不能恢复原开发会话；你是同一开发角色的接手 Agent，不是原开发会话。以下上一轮送审及审查反馈是交接台账，含 lastSubmission、快照、已有证据、阻塞项和缺口：\n${JSON.stringify(feedback, null, 2)}` : text(devHandoff) ? `门禁首轮已有前序开发；你是同一开发角色的接手 Agent，不是原开发会话。以下是交接台账：\n${devHandoff}` : "你是门禁首轮开发 Agent，本任务无前序开发，无前序交接。已有对象直接验证；需要实现时先做授权内的必要改动。"}

先完成可独立执行的必验项。缺权限或环境只报受阻；按授权修复范围内问题，修过则复验受影响项；同一失败反复修复仍不过就报告卡点。只缺证据时先补证据，不为返工而改代码。无提交、部署或中断外部环境的隐含授权。
首轮送审前自行通读完整 diff（无 diff 时核对约定对象），检查任务范围、实现及测试覆盖；修改后自查增量并复验。selfReview 写实际检查的范围与结论，同一快照可沿用自查记录。
roleHandoff ${feedback || text(devHandoff) ? "如实记录接手及实际收到的版本、已有证据、未结项和继续方式" : "记录无前序交接"}，不得留空。
summary 写改动范围、处理及取舍。复审时逐项答复反馈，说明修复、补证或澄清的依据。可引用已有代码或测试解释原实现，同一快照可原样送审。非阻塞建议可说明采纳与否。
snapshot 按 scope 约定的方法及格式生成标识；验运行时还需确认产物／运行版本确与对象对应，未能确定时据实填写（未知可填空字符串）。
results 按必验项 id 各回一条 passed、failed 或 blocked。每项 evidence 写实际方法、环境、观察结果或卡点与尝试；passed 的 snapshot 必须是证据实际对应的送审对象，不能把旧版本的结果挪用到新版本。`;

const priorLedger = (review, round) => !review || round <= 1 ? "" : `\n上一轮（第 ${round - 1} 次送审）审查结论，供闭环核对（待核实，不得直接当作本轮通过依据）：\n${JSON.stringify({
  snapshot: review.snapshot,
  summary: review.summary,
  blocking: review.findings.filter((item) => item.severity === "blocking"),
  gaps: review.gaps,
}, null, 2)}
逐条确认上述阻塞项和证据缺口是否闭环；范围外的历史问题只作观察，不计入阻塞。`;

const reviewBrief = (round, submission, previousReview, previousDev) => `你是独立审查 Agent，只读。独立核对范围和对应证据；不要修改工作区、VCS 或设备状态，需要复跑有副作用的验证时报告缺口。
${delegationBoundary}
${contract}
${text(devHandoff) ? `首次门禁原始开发交接台账（待核实）：\n${devHandoff}` : ""}
第 ${round} 次拟送审，开发侧送审材料（待核实）：\n${JSON.stringify(submission, null, 2)}
${previousDev ? `上一轮开发侧送审材料（待核实）：\n${JSON.stringify(previousDev, null, 2)}` : ""}
${priorLedger(previousReview, round)}
从现场核实可复核版本／指纹与运行版本对应关系，snapshot 按 scope 约定的方法及格式生成（若无法确认则填空字符串，不照抄）。每轮按 xu-code-review 独立审查本次完整 diff（无 diff 时核对约定对象）及必要上下文，核实开发者的自查与逐项答复，对照原始或上一轮台账核对 roleHandoff 的真实性和完整性。逐项检查证据是否满足通过条件、覆盖关键风险、且与版本一致。澄清成立可关闭原阻塞项并在同一版本上批准，非阻塞建议可随批准保留。
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
let previousReview;
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
    return { status: "dev-failed", round, reason: "开发 Agent 未返回完整的逐项证据", feedback };
  }
  if (!text(dev.roleHandoff)) {
    return { status: "dev-failed", round, reason: "送审缺少开发角色交接记录", lastSubmission: dev, feedback };
  }
  const incomplete = dev.results.filter((item) => item.status !== "passed" ||
    !text(dev.snapshot) || item.snapshot !== dev.snapshot);
  if (incomplete.length) {
    return {
      status: "blocked", round, reason: "必验项未通过或证据未绑定送审对象",
      incomplete: incomplete.map((item) => item.id), lastSubmission: dev, feedback,
    };
  }
  if (!text(dev.selfReview)) {
    return { status: "dev-failed", round, reason: "送审缺少开发者自查范围与结论", lastSubmission: dev, feedback };
  }

  phase("独立审查");
  const review = await ask(reviewBrief(next, dev, previousReview, feedback?.lastSubmission), {
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
    return { status: "blocked", round, reason: "无法确认审查对象与验证证据为同一快照", lastSubmission: dev, review, feedback };
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
  feedback = {
    blocking, gaps: review.gaps,
    nonBlocking: review.findings.filter((item) => item.severity === "non-blocking"),
    lastSubmission: dev,
  };
  previousReview = review;
}
