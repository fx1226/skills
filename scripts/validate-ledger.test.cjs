"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { validateLedger } = require("./validate-ledger.cjs");

function readEmbeddedJson(relativePath) {
  const content = require("node:fs").readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
  const match = content.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, `${relativePath} must contain a JSON example`);
  return JSON.parse(match[1]);
}

function makeRole(overrides = {}) {
  return {
    status: "completed",
    actorType: "agent",
    harness: "generic",
    contextId: "ctx-default",
    contextScope: "root-tree-01",
    runHandle: "run-default",
    resumeHandle: "resume-default",
    readOnlyMode: "na",
    readOnlyEvidence: null,
    handoffs: [],
    ...overrides,
  };
}

function makeStandardLedger() {
  return {
    meta: {
      schemaVersion: 1,
      taskId: "FR-2026-001",
      mode: "standard",
      preDraftCases: false,
      updatedAt: "2026-11-24T16:00:00+08:00",
    },
    versions: {
      requirements: "req-v1",
      design: "design-v1",
      codeSnapshot: "git:abc1234",
      testCases: "ut-v1",
      testCasesStatus: "formal",
      buildOrDevice: "build-20261124-01",
      caseFormat: "markdown",
    },
    roles: {
      "fr-requirements": makeRole({ contextId: "ctx-req-1", runHandle: "run-req-1", resumeHandle: "res-req-1", readOnlyMode: "enforced" }),
      "fr-designer": makeRole({ contextId: "ctx-des-1", runHandle: "run-des-1", resumeHandle: "res-des-1" }),
      "fr-design-reviewer": makeRole({ contextId: "ctx-drev-1", runHandle: "run-drev-1", resumeHandle: "res-drev-1", readOnlyMode: "enforced" }),
      "fr-developer": makeRole({ contextId: "ctx-dev-1", runHandle: "run-dev-1", resumeHandle: "res-dev-1" }),
      "fr-code-reviewer": makeRole({ contextId: "ctx-crev-1", runHandle: "run-crev-1", resumeHandle: "res-crev-1", readOnlyMode: "enforced" }),
      "fr-test-case-author": makeRole({ contextId: "ctx-tca-1", runHandle: "run-tca-1", resumeHandle: "res-tca-1" }),
      "fr-test-case-reviewer": makeRole({ contextId: "ctx-tcr-1", runHandle: "run-tcr-1", resumeHandle: "res-tcr-1", readOnlyMode: "enforced" }),
      "fr-test-executor": makeRole({ contextId: "ctx-tex-1", runHandle: "run-tex-1", resumeHandle: "res-tex-1" }),
    },
    gates: {
      A: { status: "confirmed", targetVersion: "req-v1", confirmedBy: "user", evidence: "chat-turn-2" },
      B: { status: "confirmed", targetVersion: "design-v1", confirmedBy: "user", evidence: "chat-turn-5", implementationAuthorized: true },
      AB: { status: "waived", targetVersion: null, confirmedBy: null, evidence: null, implementationAuthorized: false },
      C: { status: "confirmed", targetVersion: "ut-v1", confirmedBy: "user", evidence: "chat-turn-9" },
    },
    utEntry: {
      codeSnapshot: "git:abc1234",
      devSelfTest: { passed: true, snapshot: "git:abc1234", evidence: "unit 42/42" },
      devDiffSelfReview: { passed: true, snapshot: "git:abc1234", evidence: "reviewed 5 files" },
      codeReview: { passed: true, snapshot: "git:abc1234", openBlockers: 0, evidence: "approved R1" },
    },
    loops: {
      design: { validRounds: 1, maxRounds: 3, stagnationCount: 0, openBlockers: [] },
      code: { validRounds: 1, maxRounds: 3, stagnationCount: 0, openBlockers: [] },
      testCase: { validRounds: 1, maxRounds: 3, stagnationCount: 0, openBlockers: [] },
      defectReturn: { cycles: 0, maxCycles: 2, pendingReturn: false, history: [] },
    },
    qaHandoff: {
      buildOrDevice: "build-20261124-01",
      codeSnapshot: "git:abc1234",
      testCases: "ut-v1",
      mandatorySummary: { passed: 10, failed: 0, blocked: 0, notRun: 0 },
      readyForQa: true,
      qaAccepted: false,
    },
  };
}

function makeLiteLedger() {
  const ledger = makeStandardLedger();
  ledger.meta.mode = "lite";
  ledger.meta.liteRedlines = {
    crossModuleContractChange: false,
    securityOrPermissionChange: false,
    deviceFlashOrPersistentStateChange: false,
    majorArchitectureOrMigrationTradeoff: false,
    unresolvedRequirementAmbiguity: false,
  };
  ledger.versions.design = null;
  delete ledger.roles["fr-designer"];
  delete ledger.roles["fr-design-reviewer"];
  ledger.gates.A = { status: "waived", targetVersion: null, confirmedBy: null, evidence: null };
  ledger.gates.B = { status: "waived", targetVersion: null, confirmedBy: null, evidence: null, implementationAuthorized: false };
  ledger.gates.AB = {
    status: "confirmed",
    targetVersion: "req-v1",
    confirmedBy: "user",
    evidence: "chat-turn-2-lite-ab",
    implementationAuthorized: true,
  };
  delete ledger.loops.design;
  return ledger;
}

function makeDevReviewLedger() {
  const { meta, versions, roles, utEntry, loops } = makeStandardLedger();
  return {
    meta: { schemaVersion: meta.schemaVersion, taskId: "DEV-01", updatedAt: meta.updatedAt, standalone: true },
    versions: { codeSnapshot: versions.codeSnapshot },
    roles: { developer: roles["fr-developer"], "code-reviewer": roles["fr-code-reviewer"] },
    utEntry,
    loops: { code: loops.code },
  };
}

test("合法 standard 全流程台账通过所有适用门禁", () => {
  const ledger = makeStandardLedger();
  for (const gate of ["A", "B", "ut-entry", "C", "qa-handoff"]) {
    const result = validateLedger(ledger, { gate });
    assert.equal(result.ok, true, `gate ${gate} failed: ${JSON.stringify(result.errors)}`);
  }
  const abResult = validateLedger(ledger, { gate: "AB" });
  assert.equal(abResult.ok, false);
  assert.ok(abResult.errors.some((item) => item.code === "GATE_INVALID_FOR_MODE"));
});

test("合法 lite 全流程台账通过 AB、ut-entry、C 与 qa-handoff，且拒绝门禁 B", () => {
  const ledger = makeLiteLedger();
  for (const gate of ["AB", "ut-entry", "C", "qa-handoff"]) {
    const result = validateLedger(ledger, { gate });
    assert.equal(result.ok, true, `lite gate ${gate} failed: ${JSON.stringify(result.errors)}`);
  }
  const gateBResult = validateLedger(ledger, { gate: "B" });
  assert.equal(gateBResult.ok, false);
  assert.ok(gateBResult.errors.some((item) => item.code === "GATE_INVALID_FOR_MODE"));
});

test("最小稀疏 JSON 省略未激活角色、门禁和空环后仍通过各门禁", () => {
  const sparse = makeStandardLedger();
  for (const key of ["actorType", "harness", "resumeHandle", "readOnlyEvidence", "handoffs"]) {
    for (const role of Object.values(sparse.roles)) {
      delete role[key];
    }
  }
  delete sparse.gates.AB;
  delete sparse.loops.defectReturn;

  for (const gate of ["A", "B", "ut-entry", "C", "qa-handoff"]) {
    const result = validateLedger(sparse, { gate });
    assert.equal(result.ok, true, `sparse gate ${gate} failed: ${JSON.stringify(result.errors)}`);
  }

  const sparseLite = makeLiteLedger();
  for (const key of ["actorType", "harness", "resumeHandle", "readOnlyEvidence", "handoffs"]) {
    for (const role of Object.values(sparseLite.roles)) {
      delete role[key];
    }
  }
  delete sparseLite.gates.A;
  delete sparseLite.gates.B;
  delete sparseLite.loops.defectReturn;
  assert.equal(validateLedger(sparseLite, { gate: "AB" }).ok, true);
});

test("参考文档中的最小充分 JSON 样例通过对应门禁", () => {
  const examples = [
    ["xu-fr-flow/references/requirements-and-stages.md", "A", false],
    ["xu-design-review-loop/references/dispatch-and-ledger.md", "B", true, false],
    ["xu-dev-review-loop/references/dispatch-and-ledger.md", "ut-entry", true],
    ["xu-dev-ut-loop/references/dispatch-and-ledger.md", "qa-handoff", true],
  ];
  for (const [relativePath, gate, standalone, requireConfirmed = true] of examples) {
    const result = validateLedger(readEmbeddedJson(relativePath), { gate, standalone, requireConfirmed });
    assert.equal(result.ok, true, `${relativePath}: ${JSON.stringify(result.errors)}`);
  }
  const pendingDesign = readEmbeddedJson("xu-design-review-loop/references/dispatch-and-ledger.md");
  assert.equal(validateLedger(pendingDesign, { gate: "B", standalone: true }).ok, false);
  assert.equal(validateLedger(pendingDesign, { gate: "ut-entry", standalone: true, requireConfirmed: false }).ok, false);
});

test("pending 模式仅接受等待态，并保留 B/AB 实现授权约束", () => {
  const pendingDesign = readEmbeddedJson("xu-design-review-loop/references/dispatch-and-ledger.md");

  for (const status of ["confirmed", "waived", "invalidated"]) {
    const ledger = structuredClone(pendingDesign);
    ledger.gates.B.status = status;
    ledger.gates.B.confirmedBy = "user";
    ledger.gates.B.evidence = "chat-turn-5";
    ledger.gates.B.implementationAuthorized = true;

    const result = validateLedger(ledger, { gate: "B", standalone: true, requireConfirmed: false });
    assert.equal(result.ok, false, `${status} must not pass as a pending gate`);
    assert.ok(result.errors.some((item) => item.code === "GATE_NOT_CONFIRMED"));
  }

  const unauthorized = structuredClone(pendingDesign);
  unauthorized.gates.B.implementationAuthorized = false;
  const result = validateLedger(unauthorized, { gate: "B", standalone: true, requireConfirmed: false });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "IMPLEMENTATION_AUTH_MISSING"));

  const authorized = structuredClone(pendingDesign);
  authorized.gates.B.implementationAuthorized = true;
  assert.equal(validateLedger(authorized, { gate: "B", standalone: true, requireConfirmed: false }).ok, true);

  const unauthorizedLite = makeLiteLedger();
  unauthorizedLite.gates.AB.status = "pending";
  unauthorizedLite.gates.AB.implementationAuthorized = false;
  const liteResult = validateLedger(unauthorizedLite, { gate: "AB", requireConfirmed: false });
  assert.equal(liteResult.ok, false);
  assert.ok(liteResult.errors.some((item) => item.code === "IMPLEMENTATION_AUTH_MISSING"));
});

test("pending 在 C 上只允许放宽 C 自身，A/B 仍须已确认且已授权", () => {
  const ledger = makeStandardLedger();
  ledger.gates.C = { status: "pending", targetVersion: "ut-v1", confirmedBy: null, evidence: null };
  assert.equal(validateLedger(ledger, { gate: "C", requireConfirmed: false }).ok, true);

  ledger.gates.B.implementationAuthorized = false;
  const result = validateLedger(ledger, { gate: "C", requireConfirmed: false });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "IMPLEMENTATION_AUTH_MISSING"));
});

test("lite 模式触发任一红线即被拦截", () => {
  const ledger = makeLiteLedger();
  ledger.meta.liteRedlines.deviceFlashOrPersistentStateChange = true;
  const result = validateLedger(ledger, { gate: "AB" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "LITE_REDLINE_TRIGGERED"));
});

test("跨角色 contextId 在同 contextScope 下碰撞（含 handoffs 历史）被拦截", () => {
  const directCollision = makeStandardLedger();
  directCollision.roles["fr-test-executor"].contextId = directCollision.roles["fr-developer"].contextId;
  const directResult = validateLedger(directCollision, { gate: "qa-handoff" });
  assert.equal(directResult.ok, false);
  assert.ok(directResult.errors.some((item) => item.code === "ROLE_CONTEXT_COLLISION"));

  const handoffCollision = makeStandardLedger();
  handoffCollision.roles["fr-developer"].handoffs = [
    { fromContextId: "ctx-dev-legacy", toContextId: "ctx-dev-1", reason: "session expired" },
  ];
  handoffCollision.roles["fr-code-reviewer"].contextId = "ctx-dev-legacy";
  const handoffResult = validateLedger(handoffCollision, { gate: "ut-entry" });
  assert.equal(handoffResult.ok, false);
  assert.ok(handoffResult.errors.some((item) => item.code === "ROLE_CONTEXT_COLLISION"));
});

test("同角色续接刷新 runHandle/resumeHandle 但 contextId 不变时放行", () => {
  const ledger = makeStandardLedger();
  ledger.roles["fr-developer"].runHandle = "run-dev-2";
  ledger.roles["fr-developer"].resumeHandle = "res-dev-2";
  ledger.roles["fr-developer"].handoffs = [
    { fromContextId: "ctx-dev-1", toContextId: "ctx-dev-1", reason: "same-context resume updated handle" },
  ];
  const result = validateLedger(ledger, { gate: "ut-entry" });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test("研发 UT 以已绑定开发者完成交接，独立调用和 FR 使用各自的角色标识", () => {
  const fr = makeStandardLedger();
  delete fr.roles["fr-test-executor"];
  fr.qaHandoff.executorRole = "fr-developer";
  const options = { gate: "qa-handoff" };
  const frResult = validateLedger(fr, options);
  assert.equal(frResult.ok, true, JSON.stringify(frResult.errors));

  const standalone = structuredClone(fr);
  standalone.meta.standalone = true;
  standalone.roles.developer = standalone.roles["fr-developer"];
  delete standalone.roles["fr-developer"];
  standalone.qaHandoff.executorRole = "developer";
  const standaloneResult = validateLedger(standalone, options);
  assert.equal(standaloneResult.ok, true, JSON.stringify(standaloneResult.errors));

  fr.qaHandoff.executorRole = "fr-code-reviewer";
  const wrongExecutor = validateLedger(fr, options);
  assert.ok(wrongExecutor.errors.some((error) => error.code === "QA_EXECUTOR_ROLE_MISMATCH"));
});

test("用例评审前可通过 ut-entry，门禁 C 必须标记正式用例，构建留到执行阶段", () => {
  const ledger = makeStandardLedger();
  delete ledger.versions.buildOrDevice;
  delete ledger.versions.testCasesStatus;

  assert.equal(validateLedger(ledger, { gate: "ut-entry" }).ok, true);
  const missingFormalStatus = validateLedger(ledger, { gate: "C" });
  assert.ok(missingFormalStatus.errors.some((error) => error.code === "TEST_CASES_FORMAL_REQUIRED"));

  ledger.versions.testCasesStatus = "formal";
  assert.equal(validateLedger(ledger, { gate: "C" }).ok, true);
  assert.ok(validateLedger(ledger, { gate: "qa-handoff" }).errors.some((error) =>
    error.code === "VERSION_BUILD_OR_DEVICE_MISSING"
  ));
});

test("独立 ut-entry 缺项或快照漂移被拦截；standalone 模式仅核对四项与角色隔离", () => {
  const missingDiffCheck = makeStandardLedger();
  missingDiffCheck.utEntry.devDiffSelfReview.passed = false;
  const missingResult = validateLedger(missingDiffCheck, { gate: "ut-entry" });
  assert.equal(missingResult.ok, false);
  assert.ok(missingResult.errors.some((item) => item.code === "UT_ENTRY_DIFF_REVIEW_INVALID"));

  const snapshotDrift = makeStandardLedger();
  snapshotDrift.utEntry.codeReview.snapshot = "git:old0000";
  const driftResult = validateLedger(snapshotDrift, { gate: "ut-entry" });
  assert.equal(driftResult.ok, false);
  assert.ok(driftResult.errors.some((item) => item.code === "UT_ENTRY_CODE_REVIEW_INVALID"));

  const standaloneLedger = {
    meta: { schemaVersion: 1, standalone: true, taskId: "UT-01", mode: "standard", preDraftCases: false, updatedAt: "2026-11-24T16:00:00+08:00" },
    versions: { codeSnapshot: "git:abc1234" },
    roles: {
      "fr-developer": makeRole({ contextId: "ctx-dev-1", runHandle: "run-1", resumeHandle: null }),
      "fr-code-reviewer": {
        status: "completed",
        actorType: "external-human",
        contextId: "human:reviewer-alice",
        contextScope: "external",
        runHandle: null,
        resumeHandle: null,
        readOnlyMode: "na",
        readOnlyEvidence: null,
        handoffs: [],
      },
    },
    utEntry: {
      codeSnapshot: "git:abc1234",
      devSelfTest: { passed: true, snapshot: "git:abc1234", evidence: "ok" },
      devDiffSelfReview: { passed: true, snapshot: "git:abc1234", evidence: "ok" },
      codeReview: { passed: true, snapshot: "git:abc1234", openBlockers: 0, evidence: "PR #12 approved by alice" },
    },
    loops: { code: { validRounds: 1, maxRounds: 3, stagnationCount: 0, openBlockers: [] } },
  };
  const standaloneResult = validateLedger(standaloneLedger, { gate: "ut-entry" });
  assert.equal(standaloneResult.ok, true, JSON.stringify(standaloneResult.errors));
});

test("独立开发审查支持原生角色名和最小元数据，完整流程保留原契约", () => {
  const ledger = makeDevReviewLedger();
  const result = validateLedger(ledger, { gate: "ut-entry" });
  assert.equal(result.ok, true, JSON.stringify(result.errors));

  const otherGate = validateLedger(ledger, { gate: "C" });
  assert.ok(otherGate.errors.some((error) => error.code === "META_MODE_INVALID"));
  assert.ok(otherGate.errors.some((error) => error.code === "META_PRE_DRAFT_INVALID"));

  const invalidMeta = structuredClone(ledger);
  Object.assign(invalidMeta.meta, { mode: null, preDraftCases: "false" });
  const invalid = validateLedger(invalidMeta, { gate: "ut-entry" });
  assert.ok(invalid.errors.some((error) => error.code === "META_MODE_INVALID"));
  assert.ok(invalid.errors.some((error) => error.code === "META_PRE_DRAFT_INVALID"));

  delete ledger.meta.standalone;
  const cliResult = execFileSync(process.execPath, [path.resolve(__dirname, "validate-ledger.cjs"), "--gate", "ut-entry", "--standalone", "-"], {
    input: JSON.stringify(ledger),
    encoding: "utf8",
  });
  assert.equal(JSON.parse(cliResult).ok, true);
  const integrated = validateLedger(ledger, { gate: "ut-entry" });
  assert.ok(integrated.errors.some((error) => error.code === "ROLE_UNKNOWN" && error.path === "roles.developer"));
  assert.ok(integrated.errors.some((error) => error.code === "ROLE_UNKNOWN" && error.path === "roles.code-reviewer"));
  assert.ok(integrated.errors.some((error) => error.code === "META_MODE_INVALID"));
  assert.ok(integrated.errors.some((error) => error.code === "META_PRE_DRAFT_INVALID"));
});

test("独立角色保持只读与交接隔离、完成状态和唯一身份校验", () => {
  const ledger = makeDevReviewLedger();
  const reviewer = ledger.roles["code-reviewer"];
  reviewer.status = "active";
  reviewer.readOnlyMode = "na";
  reviewer.handoffs = [{ fromContextId: ledger.roles.developer.contextId, reason: "handoff" }];
  const result = validateLedger(ledger, { gate: "ut-entry" });
  assert.ok(result.errors.some((error) => error.code === "ROLE_NOT_COMPLETED" && error.path === "roles.code-reviewer"));
  assert.ok(result.errors.some((error) => error.code === "ROLE_CONTEXT_COLLISION" && error.path === "roles.code-reviewer.handoffs[0].fromContextId"));
  assert.ok(result.errors.some((error) => error.code === "READ_ONLY_MODE_INVALID" && error.path === "roles.code-reviewer.readOnlyMode"));

  for (const roleId of ["developer", "code-reviewer"]) {
    const duplicate = makeDevReviewLedger();
    duplicate.roles[`fr-${roleId}`] = duplicate.roles[roleId];
    const ambiguous = validateLedger(duplicate, { gate: "ut-entry" });
    assert.ok(ambiguous.errors.some((error) => error.code === "ROLE_DUPLICATE_ALIAS" && error.path === `roles.${roleId}`));
  }
});

test("pre-draft 用例骨架未转为 formal 时不得通过门禁 C", () => {
  const ledger = makeStandardLedger();
  ledger.meta.preDraftCases = true;
  ledger.versions.testCasesStatus = "pre-draft";
  const result = validateLedger(ledger, { gate: "C" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "TEST_CASES_PRE_DRAFT_NOT_ALLOWED"));
});

test("两级只读合规性：拒绝口头降级、无批准降级与指纹漂移，放行合法 verified-zero-write", () => {
  const verbalOnly = makeStandardLedger();
  verbalOnly.roles["fr-design-reviewer"].readOnlyMode = "na";
  const verbalResult = validateLedger(verbalOnly, { gate: "B" });
  assert.equal(verbalResult.ok, false);
  assert.ok(verbalResult.errors.some((item) => item.code === "READ_ONLY_MODE_INVALID"));

  const unapprovedDegradation = makeStandardLedger();
  unapprovedDegradation.roles["fr-design-reviewer"].readOnlyMode = "verified-zero-write";
  unapprovedDegradation.roles["fr-design-reviewer"].readOnlyEvidence = {
    userApprovedDegradation: false,
    approvalRef: "",
    beforeFingerprint: "sha256:111",
    afterFingerprint: "sha256:111",
  };
  const unapprovedResult = validateLedger(unapprovedDegradation, { gate: "B" });
  assert.equal(unapprovedResult.ok, false);
  assert.ok(unapprovedResult.errors.some((item) => item.code === "READ_ONLY_DEGRADATION_UNAPPROVED"));

  const fingerprintDrift = makeStandardLedger();
  fingerprintDrift.roles["fr-code-reviewer"].readOnlyMode = "verified-zero-write";
  fingerprintDrift.roles["fr-code-reviewer"].readOnlyEvidence = {
    userApprovedDegradation: true,
    approvalRef: "chat-turn-6",
    beforeFingerprint: "sha256:aaa",
    afterFingerprint: "sha256:bbb",
  };
  const driftResult = validateLedger(fingerprintDrift, { gate: "ut-entry" });
  assert.equal(driftResult.ok, false);
  assert.ok(driftResult.errors.some((item) => item.code === "READ_ONLY_FINGERPRINT_DRIFT"));

  const validDegraded = makeStandardLedger();
  validDegraded.roles["fr-code-reviewer"].readOnlyMode = "verified-zero-write";
  validDegraded.roles["fr-code-reviewer"].readOnlyEvidence = {
    userApprovedDegradation: true,
    approvalRef: "chat-turn-6",
    beforeFingerprint: "sha256:aaa",
    afterFingerprint: "sha256:aaa",
  };
  const validResult = validateLedger(validDegraded, { gate: "ut-entry" });
  assert.equal(validResult.ok, true, JSON.stringify(validResult.errors));
});

test("进行中的缺陷批次可以交接，但完成复审和复测后才通过 QA 门禁", () => {
  const ledger = makeStandardLedger();
  const returned = ledger.loops.defectReturn;
  returned.cycles = 1;
  const batch = { cycle: 1, status: "active", fullRoundCompleted: true, failedCaseIds: ["UT-04"] };
  returned.history.push(batch);

  const inProgress = validateLedger(ledger, { gate: "ut-entry" });
  assert.equal(inProgress.ok, true, JSON.stringify(inProgress.errors));
  assert.ok(validateLedger(ledger, { gate: "qa-handoff" }).errors.some((error) =>
    error.code === "DEFECT_HISTORY_STILL_ACTIVE"
  ));

  batch.fullRoundCompleted = false;
  assert.ok(validateLedger(ledger, { gate: "ut-entry" }).errors.some((error) =>
    error.code === "DEFECT_RETURN_MID_UT_ABORT_FORBIDDEN"
  ));
  batch.fullRoundCompleted = true;

  batch.codeReviewRounds = 6;
  assert.ok(validateLedger(ledger, { gate: "ut-entry" }).errors.some((error) =>
    error.code === "DEFECT_HISTORY_REVIEW_ROUNDS_INVALID"
  ));
  batch.codeReviewRounds = 1;

  batch.status = "completed";
  assert.ok(validateLedger(ledger, { gate: "qa-handoff" }).errors.some((error) =>
    error.code === "DEFECT_HISTORY_RETEST_SNAPSHOT_MISSING"
  ));
  Object.assign(batch, {
    affectedScope: ["parser/retry.js"],
    reviewerVerifiedScope: true,
    codeReviewRounds: 1,
    retestSnapshot: ledger.versions.codeSnapshot,
    retestBuildOrDevice: ledger.versions.buildOrDevice,
  });
  assert.equal(validateLedger(ledger, { gate: "qa-handoff" }).ok, true);

  returned.pendingReturn = true;
  assert.ok(validateLedger(ledger, { gate: "qa-handoff" }).errors.some((error) =>
    error.code === "DEFECT_RETURN_PENDING"
  ));
  returned.pendingReturn = false;

  returned.cycles = 0;
  assert.ok(validateLedger(ledger, { gate: "qa-handoff" }).errors.some((error) =>
    error.code === "DEFECT_HISTORY_COUNT_MISMATCH"
  ));
});

test("UT 缺陷回流外环熔断、affectedScope 核验与停滞计数校验", () => {
  const validDefectReturn = makeStandardLedger();
  validDefectReturn.versions.codeSnapshot = "git:def5678";
  validDefectReturn.utEntry.codeSnapshot = "git:def5678";
  validDefectReturn.utEntry.devSelfTest.snapshot = "git:def5678";
  validDefectReturn.utEntry.devDiffSelfReview.snapshot = "git:def5678";
  validDefectReturn.utEntry.codeReview.snapshot = "git:def5678";
  validDefectReturn.qaHandoff.codeSnapshot = "git:def5678";
  validDefectReturn.loops.code.maxRounds = 6;
  validDefectReturn.loops.code.validRounds = 6;
  validDefectReturn.loops.defectReturn = {
    cycles: 1,
    maxCycles: 2,
    pendingReturn: false,
    history: [
      {
        cycle: 1,
        fullRoundCompleted: true,
        failedCaseIds: ["UT-04"],
        affectedScope: ["parser/retry.js", "config/validator.js"],
        reviewerVerifiedScope: true,
        codeReviewRounds: 5,
        retestSnapshot: "git:def5678",
        retestBuildOrDevice: "build-20261124-01",
      },
    ],
  };
  const sixthReturnRound = structuredClone(validDefectReturn);
  sixthReturnRound.loops.defectReturn.history[0].codeReviewRounds = 6;
  for (const options of [{ gate: "qa-handoff" }, { gate: "ut-entry", standalone: true }]) {
    const validRes = validateLedger(validDefectReturn, options);
    assert.equal(validRes.ok, true, JSON.stringify(validRes.errors));
    const rejected = validateLedger(sixthReturnRound, options);
    assert.ok(rejected.errors.some((error) =>
      error.code === "DEFECT_HISTORY_REVIEW_ROUNDS_INVALID" && error.path === "loops.defectReturn.history[0].codeReviewRounds"
    ));
  }

  const midUtAbort = structuredClone(validDefectReturn);
  midUtAbort.loops.defectReturn.history[0].fullRoundCompleted = false;
  const midAbortRes = validateLedger(midUtAbort, { gate: "qa-handoff" });
  assert.equal(midAbortRes.ok, false);
  assert.ok(midAbortRes.errors.some((item) => item.code === "DEFECT_RETURN_MID_UT_ABORT_FORBIDDEN"));

  const unverifiedScope = structuredClone(validDefectReturn);
  unverifiedScope.loops.defectReturn.history[0].reviewerVerifiedScope = false;
  const scopeRes = validateLedger(unverifiedScope, { gate: "qa-handoff" });
  assert.equal(scopeRes.ok, false);
  assert.ok(scopeRes.errors.some((item) => item.code === "DEFECT_HISTORY_SCOPE_UNVERIFIED"));

  const developerRetest = structuredClone(validDefectReturn);
  delete developerRetest.roles["fr-test-executor"];
  developerRetest.qaHandoff.executorRole = "fr-developer";
  const currentBuild = validateLedger(developerRetest, { gate: "qa-handoff" });
  assert.equal(currentBuild.ok, true, JSON.stringify(currentBuild.errors));
  developerRetest.loops.defectReturn.history[0].retestBuildOrDevice = "old-build";
  const oldBuild = validateLedger(developerRetest, { gate: "qa-handoff" });
  assert.ok(oldBuild.errors.some((error) => error.code === "DEFECT_RETEST_BUILD_MISMATCH"));
  delete developerRetest.loops.defectReturn.history[0].retestBuildOrDevice;
  const missingBuild = validateLedger(developerRetest, { gate: "qa-handoff" });
  assert.ok(missingBuild.errors.some((error) => error.code === "DEFECT_RETEST_BUILD_MISMATCH"));

  const exceededCycles = structuredClone(validDefectReturn);
  exceededCycles.loops.defectReturn.cycles = 3;
  const exceededRes = validateLedger(exceededCycles, { gate: "qa-handoff" });
  assert.equal(exceededRes.ok, false);
  assert.ok(exceededRes.errors.some((item) => item.code === "DEFECT_CYCLES_EXCEEDED"));

  const pendingAtLimit = structuredClone(validDefectReturn);
  pendingAtLimit.loops.defectReturn.cycles = 2;
  pendingAtLimit.loops.defectReturn.pendingReturn = true;
  const pendingRes = validateLedger(pendingAtLimit, { gate: "qa-handoff" });
  assert.equal(pendingRes.ok, false);
  assert.ok(pendingRes.errors.some((item) => item.code === "DEFECT_CYCLES_EXCEEDED"));

  const stagnant = makeStandardLedger();
  stagnant.loops.design.stagnationCount = 2;
  const stagnantRes = validateLedger(stagnant, { gate: "B" });
  assert.equal(stagnantRes.ok, false);
  assert.ok(stagnantRes.errors.some((item) => item.code === "LOOP_STAGNATION_REACHED"));
});

test("qa-handoff 拦截未通过必测项宣称完成或越权宣称 QA 通过", () => {
  const incomplete = makeStandardLedger();
  incomplete.qaHandoff.mandatorySummary.blocked = 1;
  incomplete.qaHandoff.readyForQa = true;
  const incompleteRes = validateLedger(incomplete, { gate: "qa-handoff" });
  assert.equal(incompleteRes.ok, false);
  assert.ok(incompleteRes.errors.some((item) => item.code === "QA_HANDOFF_INCOMPLETE_RESULTS"));

  const claimedQa = makeStandardLedger();
  claimedQa.qaHandoff.qaAccepted = true;
  const qaRes = validateLedger(claimedQa, { gate: "qa-handoff" });
  assert.equal(qaRes.ok, false);
  assert.ok(qaRes.errors.some((item) => item.code === "QA_ACCEPTANCE_CLAIMED_BY_DEV"));
});

test("CLI 模式支持 stdin 输入并返回正确退出码", () => {
  const scriptPath = path.resolve(__dirname, "validate-ledger.cjs");
  const validOutput = execFileSync(process.execPath, [scriptPath, "--gate", "qa-handoff", "-"], {
    input: JSON.stringify(makeStandardLedger()),
    encoding: "utf8",
  });
  assert.equal(JSON.parse(validOutput).ok, true);

  const invalidLedger = makeLiteLedger();
  invalidLedger.meta.liteRedlines.securityOrPermissionChange = true;
  let exitCode = 0;
  let stdoutText = "";
  try {
    execFileSync(process.execPath, [scriptPath, "--gate", "AB", "-"], {
      input: JSON.stringify(invalidLedger),
      encoding: "utf8",
    });
  } catch (execError) {
    exitCode = execError.status;
    stdoutText = execError.stdout;
  }
  assert.equal(exitCode, 1);
  assert.equal(JSON.parse(stdoutText).ok, false);

  const pendingOutput = execFileSync(process.execPath, [scriptPath, "--gate", "B", "--standalone", "--pending", "-"], {
    input: JSON.stringify(readEmbeddedJson("xu-design-review-loop/references/dispatch-and-ledger.md")),
    encoding: "utf8",
  });
  assert.equal(JSON.parse(pendingOutput).ok, true);
});
