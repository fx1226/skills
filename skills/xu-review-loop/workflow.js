// xu-review-loop —— workflow 工具的函数体，不是能直接 node 执行的文件。
// 用法见 SKILL.md：把本文件内容原样作为 script 传入，args 形如
// { goal, base, build, test, maxRounds, notes }

const a = args || {};
const goal = String(a.goal || "").trim();
const base = String(a.base || "HEAD").trim();
const build = String(a.build || "").trim();
const test = String(a.test || "").trim();
const notes = String(a.notes || "无").trim();
const maxRounds = Math.min(Math.max(Number(a.maxRounds) || 10, 1), 20);

if (!goal || !build || !test) {
  return {
    status: "bad-args",
    reason: "args 需要 goal、build、test；base 默认 HEAD，maxRounds 默认 10",
  };
}

// 审查结论由脚本判定，不采信子 Agent 自报的「通过」：
// blocking 为 0 且 testsAdequate 为真才算过。
const verdictSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "testsAdequate", "findings"],
  properties: {
    summary: { type: "string" },
    testsAdequate: { type: "boolean" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["where", "problem", "fix", "severity"],
        properties: {
          where: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
          severity: { type: "string", enum: ["blocking", "non-blocking"] },
        },
      },
    },
  },
};

const devBrief = (round, feedback) => `你是本次改动的开发 Agent，负责实现、构建和自测，没有独立 QA。
目标：${goal}
仓库：当前工作目录
审查基线：${base}（审查 Agent 会用 git diff ${base} 看你的改动）
构建：${build}
功能测试：${test}
额外约束：${notes}

这是第 ${round} 次送审。
${feedback.length
    ? `上一轮审查意见，逐条处理；不处理的要说明理由：\n${feedback
        .map((f, i) => `${i + 1}. [${f.where}] ${f.problem} → ${f.fix}`)
        .join("\n")}`
    : "这是第一轮，没有历史意见。"}

要求：
1. 只做达成目标所必需的改动，不夹带无关重构；不碰与目标无关的文件。
2. 必须真的执行构建和功能测试命令并报告实际结果，失败就修到通过。同一处测试连续修复 3 次仍不通过时，别再硬撑：以 "BLOCKED:" 开头返回，写清卡点、已尝试的做法和需要什么才能继续。
3. 全绿后写送审说明，包含四项：性质（新增功能 / 修 Bug / 重构）、处理逻辑与关键取舍、测试（跑了哪些命令、覆盖到哪里、结果如何）、改动范围（主要文件）。
4. 闭环期间不要 git commit；提交在闭环外、两道门禁都通过后才做。`;

const reviewBrief = (round, submission) => `你是独立审查 Agent，只读，不改代码、不改仓库状态。
审查基线：${base}。当前工作目录就是仓库。
目标：${goal}
额外约束：${notes}

第 ${round} 次送审，开发 Agent 的送审说明：
---
${submission}
---

自己核对 git diff ${base}、相关源码与测试证据，按下面五条审：
- 目标达成：改动是否真的做到目标，有没有漏做或做偏。
- 正确性：边界、空值、错误路径、重复或并发、失败后的状态。
- 范围：有没有夹带无关改动，或动了不该动的地方。
- 测试充分：覆盖到改动点了吗？失败路径测了吗？结论是真跑出来的还是只是声称？需要时可以用只读命令抽查或复跑测试。
- 可维护性：命名、重复、与仓库既有写法是否一致。

输出要求：
- findings 每条给 where（文件:行或函数）、problem、fix、severity。blocking 表示不改完不能提交；non-blocking 是可以后续处理的问题或建议。
- testsAdequate 表示测试是否足以支撑这次改动；不够就 false，它和 blocking 一样会打回开发。
- 送审说明缺项（性质 / 处理逻辑 / 测试情况）各记一条 blocking。
- 没有问题时 findings 返回空数组，summary 写结论和遗留风险。`;

phase("开发自测");
log(`目标：${goal}；基线 ${base}；上限 ${maxRounds} 轮`);

let feedback = [];

for (let round = 1; round <= maxRounds; round += 1) {
  const dev = await agent(devBrief(round, feedback), {
    label: `dev-r${round}`,
    phase: "开发自测",
  });
  if (!dev) {
    return { status: "dev-failed", round, reason: "开发 Agent 未返回结果" };
  }
  if (dev.trim().startsWith("BLOCKED")) {
    return { status: "blocked", round, reason: dev.trim().slice(0, 4000) };
  }

  phase("审查");
  const review = await agent(reviewBrief(round, dev), {
    schema: verdictSchema,
    label: `review-r${round}`,
    phase: "审查",
  });
  if (!review) {
    return { status: "review-failed", round, reason: "审查 Agent 未返回结构化结论" };
  }

  const blocking = review.findings.filter((f) => f.severity === "blocking");
  const passed = blocking.length === 0 && review.testsAdequate;
  log(
    `第 ${round} 轮送审：blocking ${blocking.length} 条，测试充分=${review.testsAdequate}`,
  );

  if (passed) {
    return {
      status: "approved",
      round,
      summary: review.summary,
      nonBlocking: review.findings.filter((f) => f.severity !== "blocking"),
    };
  }

  if (round === maxRounds) {
    return {
      status: "stopped",
      round,
      reason: `第 ${round} 轮送审仍不通过`,
      residual: review.findings,
      testsAdequate: review.testsAdequate,
      lastSubmission: dev,
    };
  }

  feedback = review.findings;
}

return { status: "stopped", round: maxRounds, reason: "达到轮次上限" };
