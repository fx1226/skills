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
const submission = (...results) => ({ snapshot, summary: "验证已有脚本，无改动", results });
const verified = submission(resultFor("observed", "passed", "隔离 SVN：输出 fixture-r4a，退出 0"));
const approval = { snapshot, summary: "证据充分", findings: [], validationAdequate: true, gaps: [] };
const gap = "observed 缺同一版本的原始输出，请补记录";
const rejection = { ...approval, validationAdequate: false, gaps: [gap] };

async function simulate(responses, options) {
  const requests = [];
  const result = await run(
    { ...args, ...options },
    async (prompt, { label }) => {
      requests.push({ label, prompt });
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

test("缺证据可原样补交同一对象，交接具体缺口后再次审查", async () => {
  const { result, requests } = await simulate([verified, rejection, verified, approval]);
  assert.equal(result.status, "approved");
  assert.equal(result.round, 2);
  assert.match(requests[2].prompt, /observed 缺同一版本的原始输出/);
  assert.equal(result.lastSubmission.snapshot, snapshot);
});

test("达到有效送审上限仍未通过，保留阻塞项与证据缺口", async () => {
  const blocking = { where: "verify.sh:2", problem: "缺断言", fix: "增加断言", severity: "blocking" };
  const { result, requests } = await simulate(
    [verified, rejection, verified, { ...rejection, findings: [blocking] }, verified, approval],
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
    [verified, rejection, verified, new Error("审查工具不可用"), approval],
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
