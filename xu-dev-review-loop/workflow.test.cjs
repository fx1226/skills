const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction(
  "args", "agent", "phase", "log",
  readFileSync(path.join(__dirname, "workflow.js"), "utf8"),
);

const args = {
  goal: "验证已有脚本",
  scope: "SVN 工作副本 verify.sh；只验当前 fixture-r4a，fixture-r4b 暂缓",
  notes: "只读，不部署",
  checks: [{ id: "observed", check: "sh verify.sh", pass: "输出 fixture-r4a 并退出 0" }],
};
const snapshot = "verify.sh 和 version.txt 的指纹 @ fixture-r4a";
const resultFor = (id, status, evidence, subject = snapshot) => ({
  id, status, snapshot: subject, evidence,
});
const submission = (...results) => ({
  snapshot, summary: "验证已有脚本，无改动",
  selfReview: "核对了 verify.sh 的版本判断及已有脚本的验证范围",
  roleHandoff: "首轮无前序交接", results,
});
const verified = submission(resultFor("observed", "passed", "隔离 SVN：输出 fixture-r4a，退出 0"));
const reworked = { ...verified, roleHandoff: "接收 fixture-r4a 的已有输出及审查未结项，核对后继续补证或澄清" };
const approval = { snapshot, summary: "证据充分", findings: [], validationAdequate: true, gaps: [] };
const gap = "observed 缺同一版本的原始输出，请补记录";
const rejection = { ...approval, validationAdequate: false, gaps: [gap] };

async function simulate(responses, options) {
  const requests = [];
  const result = await run(
    { ...args, ...options },
    async (prompt, { label, schema }) => {
      requests.push({ label, prompt, schema });
      const reply = responses[requests.length - 1];
      if (reply instanceof Error) throw reply;
      return reply;
    },
    () => {}, () => {},
  );
  return { result, requests };
}

test("开发说已完成但没有必验证据，不能通过", async () => {
  const { result, requests } = await simulate(
    ["全部完成", { ...approval, testsAdequate: true }],
    { base: "HEAD", build: "true", test: "sh verify.sh" },
  );

  assert.equal(result.status, "dev-failed");
  assert.equal(result.round, 0);
  assert.equal(requests.length, 1);
});

test("SVN 已有脚本无需构建命令，证据与审查一致即可通过", async () => {
  const { result } = await simulate([verified, approval]);
  assert.equal(result.status, "approved");
  assert.equal(result.round, 1);
  assert.deepEqual(result.lastSubmission.results, verified.results);
});

test("有通过的测试但没有开发者自查记录，不交给 Reviewer", async () => {
  const { requests, result } = await simulate([{ ...verified, selfReview: "  " }, approval]);
  assert.equal(result.status, "dev-failed");
  assert.equal(result.round, 0);
  assert.equal(requests.length, 1);
});

test("同一版本可以凭澄清通过，命名建议随批准保留", async () => {
  const concern = { where: "verify.sh:2", problem: "空参会导致失败", fix: "核实默认值", severity: "blocking" };
  const nit = { where: "verify.sh:3", problem: "变量名较短", fix: "可换成 version", severity: "non-blocking" };
  const explanation = "verify.sh:1 已设置默认值，原验收命令正是无参运行";
  const reply = { ...reworked, summary: explanation };
  const { requests, result } = await simulate([
    verified, { ...approval, findings: [concern, nit] }, reply, { ...approval, findings: [nit] },
  ]);
  assert.ok(requests[2].prompt.includes(nit.problem));
  assert.ok(requests[3].prompt.includes(explanation));
  assert.ok(requests[3].prompt.includes(concern.problem));
  assert.equal(result.status, "approved");
  assert.equal(result.round, 2);
  assert.equal(result.lastSubmission.snapshot, verified.snapshot);
  assert.deepEqual(result.nonBlocking, [nit]);
});

test("一个必验项受阻时保留其余验证证据，但不计轮也不判为通过", async () => {
  const { result, requests } = await simulate(
    [submission(...verified.results, resultFor("runtime", "blocked", "缺设备授权", ""))],
    { checks: [...args.checks, { id: "runtime", check: "核实指定运行版本", pass: "与送审对象一致" }] },
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.round, 0);
  assert.deepEqual(result.incomplete, ["runtime"]);
  assert.deepEqual(result.lastSubmission.results[0], verified.results[0]);
  assert.equal(requests.length, 1);
});

test("旧版的通过证据不能给送审版本判为通过", async () => {
  const { result } = await simulate([
    submission(resultFor("observed", "passed", "输出 fixture-r3", "fixture-r3")),
    approval,
  ]);
  assert.equal(result.status, "blocked");
  assert.equal(result.round, 0);
});

test("审查对象发生漂移，不把结论写为通过或计轮", async () => {
  const { result } = await simulate([verified, { ...approval, snapshot: "不同指纹" }]);
  assert.equal(result.status, "blocked");
  assert.equal(result.round, 0);
});

test("返工后审查快照不一致仍保留上一轮反馈台账", async () => {
  const blocking = { where: "verify.sh:2", problem: "缺断言", fix: "增加断言", severity: "blocking" };
  const rejected = { ...rejection, findings: [blocking] };
  const { result } = await simulate([
    verified, rejected, reworked, { ...approval, snapshot: "第二轮漂移快照" },
  ]);

  assert.equal(result.status, "blocked");
  assert.equal(result.round, 1);
  assert.deepEqual(result.feedback.blocking, [blocking]);
  assert.deepEqual(result.feedback.gaps, [gap]);
  assert.deepEqual(result.feedback.lastSubmission, verified);
  assert.equal(result.lastSubmission, reworked);
});

test("缺证据可原样补交同一对象，交接具体缺口后再次审查", async () => {
  const { result, requests } = await simulate([verified, rejection, reworked, approval]);
  assert.equal(result.status, "approved");
  assert.equal(result.round, 2);
  assert.match(requests[2].prompt, /observed 缺同一版本的原始输出/);
  assert.equal(result.lastSubmission.snapshot, snapshot);
});

test("达到有效送审上限仍未通过，保留阻塞项与证据缺口", async () => {
  const blocking = { where: "verify.sh:2", problem: "缺断言", fix: "增加断言", severity: "blocking" };
  const { result, requests } = await simulate(
    [verified, rejection, reworked, { ...rejection, findings: [blocking] }, reworked, approval],
    { maxRounds: 2 },
  );
  assert.equal(result.status, "stopped");
  assert.equal(result.round, 2);
  assert.deepEqual(result.residual, [blocking]);
  assert.deepEqual(result.gaps, [gap]);
  assert.equal(requests.length, 4);
});

test("审查工具故障不计轮，且不会自动重试", async () => {
  const { result, requests } = await simulate(
    [verified, rejection, reworked, new Error("审查工具不可用"), approval],
  );
  assert.equal(result.status, "review-failed");
  assert.equal(result.round, 1);
  assert.deepEqual(result.feedback.gaps, [gap]);
  assert.equal(requests.length, 4);
});

test("只说验证不充分却没有具体缺口，不是有效审查结论", async () => {
  const { result } = await simulate([verified, { ...rejection, gaps: [] }]);
  assert.equal(result.status, "review-failed");
  assert.equal(result.round, 0);
});

test("默认送审上限为 3 次", async () => {
  const blocking = { where: "verify.sh:2", problem: "缺断言", fix: "增加断言", severity: "blocking" };
  const rejected = { ...rejection, findings: [blocking] };
  const { result } = await simulate(
    [verified, rejected, reworked, rejected, reworked, rejected],
  );
  assert.equal(result.status, "stopped");
  assert.equal(result.round, 3);
  assert.equal(result.residual[0].problem, "缺断言");
});

test("返工轮把上一轮审查结论交给下一轮审查者闭环核对", async () => {
  const blocking = { where: "verify.sh:2", problem: "缺断言", fix: "增加断言", severity: "blocking" };
  const rejected = { ...rejection, findings: [blocking] };
  const { requests } = await simulate([verified, rejected, reworked, approval]);

  assert.doesNotMatch(requests[1].prompt, /上一轮（第/);
  assert.match(requests[3].prompt, /上一轮（第 1 次送审）审查结论/);
  assert.match(requests[3].prompt, /缺断言/);
  assert.match(requests[3].prompt, /observed 缺同一版本的原始输出/);
  assert.match(requests[3].prompt, /逐条确认上述阻塞项和证据缺口是否闭环/);
  assert.ok(requests[3].prompt.includes(verified.roleHandoff));
  assert.ok(requests[3].prompt.includes(verified.results[0].evidence));
  assert.ok(requests[3].prompt.includes(reworked.roleHandoff));
});

test("返工开发以同角色接手并收到上轮送审和审查台账", async () => {
  const blocking = { where: "verify.sh:2", problem: "缺断言", fix: "增加断言", severity: "blocking" };
  const handoff = { ...verified, roleHandoff: "接收 r4a 的输出证据和缺断言及原始输出缺口，补证后重送" };
  const { result, requests } = await simulate([verified, { ...rejection, findings: [blocking] }, handoff, approval]);

  assert.match(requests[0].prompt, /首轮.*开发/);
  assert.match(requests[2].prompt, /同一开发角色.*接手/);
  assert.match(requests[2].prompt, /不是原.*会话/);
  for (const value of ["lastSubmission", snapshot, verified.results[0].evidence, blocking.problem, gap]) {
    assert.ok(requests[2].prompt.includes(value));
  }
  assert.ok(requests[0].schema.required.includes("roleHandoff"));
  assert.equal(result.status, "approved");
});

test("缺少或空白角色交接记录时开发失败，不交审查且不计本轮", async () => {
  const { roleHandoff, ...missing } = verified;
  for (const dev of [missing, { ...verified, roleHandoff: "  " }]) {
    const first = await simulate([dev, approval]);
    assert.equal(first.result.status, "dev-failed");
    assert.equal(first.result.round, 0);
    assert.equal(first.requests.length, 1);

    const rework = await simulate([verified, rejection, dev, approval]);
    assert.equal(rework.result.status, "dev-failed");
    assert.equal(rework.result.round, 1);
    assert.equal(rework.requests.length, 3);
  }
});

test("首次门禁接收已有开发成果的同角色交接", async () => {
  const devHandoff = "原开发 Agent dev-42；基线 r1，实现快照 r2；已有 diff 及测试输出 PASS；未结项：边界测试";
  const handed = { ...verified, roleHandoff: "接收 dev-42 的 r2、diff 和 PASS 证据，补边界测试" };
  const { result, requests } = await simulate([handed, approval], { devHandoff });
  assert.match(requests[0].prompt, /同一开发角色.*接手/);
  assert.ok(requests[0].prompt.includes(devHandoff));
  assert.doesNotMatch(requests[0].prompt, /无前序交接/);
  assert.match(requests[1].prompt, /roleHandoff.*真实性.*完整性/);
  assert.ok(requests[1].prompt.includes(devHandoff));
  assert.ok(requests[1].prompt.includes(handed.roleHandoff));
  assert.equal(result.status, "approved");

  const invalid = await simulate([], { devHandoff: {} });
  assert.equal(invalid.result.status, "bad-args");
  assert.equal(invalid.requests.length, 0);
});
