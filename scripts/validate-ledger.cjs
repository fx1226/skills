#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const VALID_GATES = ["A", "B", "AB", "C", "ut-entry", "qa-handoff"];
const LOGICAL_ROLES = [
  "fr-requirements",
  "fr-designer",
  "fr-design-reviewer",
  "fr-developer",
  "fr-code-reviewer",
  "fr-test-case-author",
  "fr-test-case-reviewer",
  "fr-test-executor",
];
const READ_ONLY_ROLES = [
  "fr-requirements",
  "fr-design-reviewer",
  "fr-code-reviewer",
  "fr-test-case-reviewer",
];
const LITE_REDLINE_KEYS = [
  "crossModuleContractChange",
  "securityOrPermissionChange",
  "deviceFlashOrPersistentStateChange",
  "majorArchitectureOrMigrationTradeoff",
  "unresolvedRequirementAmbiguity",
];
const VALID_GATE_STATUSES = ["pending", "confirmed", "waived", "invalidated"];
const VALID_ROLE_STATUSES = ["not-started", "active", "completed", "waived", "blocked"];
const VALID_READ_ONLY_MODES = ["enforced", "verified-zero-write", "na"];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIntInRange(value, minValue, maxValue) {
  return Number.isInteger(value) && value >= minValue && value <= maxValue;
}

function addError(errors, code, fieldPath, message) {
  errors.push({ code, path: fieldPath, message });
}

function registerContextClaim(claims, roleId, contextScope, contextId, fieldPath, errors) {
  const compositeKey = `${contextScope}::${contextId}`;
  const existing = claims.get(compositeKey);
  if (existing && existing.roleId !== roleId) {
    addError(
      errors,
      "ROLE_CONTEXT_COLLISION",
      fieldPath,
      `Role "${roleId}" collides with "${existing.roleId}" on contextId "${contextId}" in scope "${contextScope}" (first seen at ${existing.fieldPath})`
    );
    return;
  }
  if (!existing) {
    claims.set(compositeKey, { roleId, fieldPath });
  }
}

function validateMeta(ledger, errors) {
  const meta = ledger.meta;
  if (!isPlainObject(meta)) {
    addError(errors, "META_MISSING", "meta", "Ledger must include a meta object");
    return { mode: null, standalone: false };
  }
  if (meta.schemaVersion !== 1) {
    addError(errors, "SCHEMA_VERSION_INVALID", "meta.schemaVersion", "meta.schemaVersion must be integer 1");
  }
  if (!isNonEmptyString(meta.taskId)) {
    addError(errors, "META_TASK_ID_MISSING", "meta.taskId", "meta.taskId must be a non-empty string");
  }
  if (meta.mode !== "standard" && meta.mode !== "lite") {
    addError(errors, "META_MODE_INVALID", "meta.mode", 'meta.mode must be "standard" or "lite"');
  }
  if (typeof meta.preDraftCases !== "boolean") {
    addError(errors, "META_PRE_DRAFT_INVALID", "meta.preDraftCases", "meta.preDraftCases must be a boolean");
  }
  if (!isNonEmptyString(meta.updatedAt)) {
    addError(errors, "META_UPDATED_AT_MISSING", "meta.updatedAt", "meta.updatedAt must be a non-empty string");
  }

  if (meta.mode === "lite") {
    if (!isPlainObject(meta.liteRedlines)) {
      addError(
        errors,
        "LITE_REDLINES_MISSING",
        "meta.liteRedlines",
        "lite mode requires explicit meta.liteRedlines evaluation object"
      );
    } else {
      for (const redlineKey of LITE_REDLINE_KEYS) {
        if (typeof meta.liteRedlines[redlineKey] !== "boolean") {
          addError(
            errors,
            "LITE_REDLINE_UNCHECKED",
            `meta.liteRedlines.${redlineKey}`,
            `lite mode requires boolean evaluation for redline "${redlineKey}"`
          );
        }
      }
      for (const [redlineKey, triggered] of Object.entries(meta.liteRedlines)) {
        if (triggered === true) {
          addError(
            errors,
            "LITE_REDLINE_TRIGGERED",
            `meta.liteRedlines.${redlineKey}`,
            `Redline "${redlineKey}" is triggered; lite mode is forbidden and must upgrade to standard`
          );
        }
      }
    }
  } else if (meta.liteRedlines !== undefined && meta.liteRedlines !== null) {
    if (!isPlainObject(meta.liteRedlines)) {
      addError(errors, "LITE_REDLINES_INVALID", "meta.liteRedlines", "meta.liteRedlines must be an object when provided");
    } else {
      for (const [redlineKey, flagValue] of Object.entries(meta.liteRedlines)) {
        if (typeof flagValue !== "boolean") {
          addError(
            errors,
            "LITE_REDLINES_INVALID",
            `meta.liteRedlines.${redlineKey}`,
            `meta.liteRedlines.${redlineKey} must be a boolean`
          );
        }
      }
    }
  }

  return { mode: meta.mode, standalone: meta.standalone === true };
}

function validateVersions(ledger, errors) {
  const versions = ledger.versions;
  if (!isPlainObject(versions)) {
    addError(errors, "VERSIONS_MISSING", "versions", "Ledger must include a versions object");
    return {};
  }
  if (
    versions.testCasesStatus !== undefined &&
    versions.testCasesStatus !== null &&
    versions.testCasesStatus !== "pre-draft" &&
    versions.testCasesStatus !== "formal"
  ) {
    addError(
      errors,
      "TEST_CASES_STATUS_INVALID",
      "versions.testCasesStatus",
      'versions.testCasesStatus must be "pre-draft", "formal", or null'
    );
  }
  return versions;
}

function validateRoles(ledger, errors) {
  const roles = ledger.roles;
  if (!isPlainObject(roles)) {
    addError(errors, "ROLES_MISSING", "roles", "Ledger must include a roles object");
    return {};
  }

  const claims = new Map();

  for (const [roleId, roleRecord] of Object.entries(roles)) {
    const basePath = `roles.${roleId}`;
    if (!LOGICAL_ROLES.includes(roleId)) {
      addError(errors, "ROLE_UNKNOWN", basePath, `Unknown logical role "${roleId}"`);
      continue;
    }
    if (!isPlainObject(roleRecord)) {
      addError(errors, "ROLE_INVALID", basePath, `Role entry "${roleId}" must be an object`);
      continue;
    }
    if (!VALID_ROLE_STATUSES.includes(roleRecord.status)) {
      addError(
        errors,
        "ROLE_STATUS_INVALID",
        `${basePath}.status`,
        `Role "${roleId}" status must be one of: ${VALID_ROLE_STATUSES.join(", ")}`
      );
      continue;
    }

    const actorType = roleRecord.actorType ?? "agent";
    if (actorType !== "agent" && actorType !== "external-human") {
      addError(
        errors,
        "ROLE_ACTOR_TYPE_INVALID",
        `${basePath}.actorType`,
        'actorType must be "agent" or "external-human"'
      );
      continue;
    }

    if (roleRecord.status === "active" || roleRecord.status === "completed") {
      if (!isNonEmptyString(roleRecord.contextId)) {
        addError(errors, "ROLE_CONTEXT_ID_MISSING", `${basePath}.contextId`, `Active/completed role "${roleId}" requires non-empty contextId`);
      }
      if (!isNonEmptyString(roleRecord.contextScope)) {
        addError(errors, "ROLE_CONTEXT_SCOPE_MISSING", `${basePath}.contextScope`, `Active/completed role "${roleId}" requires non-empty contextScope`);
      }
      if (isNonEmptyString(roleRecord.contextId) && isNonEmptyString(roleRecord.contextScope)) {
        registerContextClaim(claims, roleId, roleRecord.contextScope, roleRecord.contextId, `${basePath}.contextId`, errors);
      }

      if (actorType === "agent") {
        if (!isNonEmptyString(roleRecord.runHandle)) {
          addError(errors, "ROLE_RUN_HANDLE_MISSING", `${basePath}.runHandle`, `Agent role "${roleId}" requires non-empty runHandle`);
        }
        if (roleRecord.resumeHandle !== undefined && roleRecord.resumeHandle !== null && !isNonEmptyString(roleRecord.resumeHandle)) {
          addError(errors, "ROLE_RESUME_HANDLE_INVALID", `${basePath}.resumeHandle`, "resumeHandle must be null or a non-empty string");
        }
        if (READ_ONLY_ROLES.includes(roleId)) {
          validateReadOnlyRole(roleId, roleRecord, basePath, errors);
        } else if (roleRecord.readOnlyMode !== undefined && !VALID_READ_ONLY_MODES.includes(roleRecord.readOnlyMode)) {
          addError(errors, "READ_ONLY_MODE_INVALID", `${basePath}.readOnlyMode`, `Invalid readOnlyMode "${roleRecord.readOnlyMode}"`);
        }
      } else {
        if (roleRecord.runHandle !== undefined && roleRecord.runHandle !== null) {
          addError(errors, "EXTERNAL_HUMAN_AGENT_HANDLE", `${basePath}.runHandle`, "External human role must not fabricate an agent runHandle");
        }
        if (roleRecord.resumeHandle !== undefined && roleRecord.resumeHandle !== null) {
          addError(errors, "EXTERNAL_HUMAN_AGENT_HANDLE", `${basePath}.resumeHandle`, "External human role must not fabricate an agent resumeHandle");
        }
      }
    }

    if (roleRecord.handoffs !== undefined) {
      if (!Array.isArray(roleRecord.handoffs)) {
        addError(errors, "ROLE_HANDOFFS_INVALID", `${basePath}.handoffs`, "handoffs must be an array");
      } else {
        roleRecord.handoffs.forEach((handoff, index) => {
          const handoffPath = `${basePath}.handoffs[${index}]`;
          if (!isPlainObject(handoff)) {
            addError(errors, "ROLE_HANDOFF_INVALID", handoffPath, "Handoff entry must be an object");
            return;
          }
          if (!isNonEmptyString(handoff.reason)) {
            addError(errors, "ROLE_HANDOFF_REASON_MISSING", `${handoffPath}.reason`, "Handoff entry requires non-empty reason");
          }
          const handoffScope = isNonEmptyString(handoff.contextScope) ? handoff.contextScope : roleRecord.contextScope;
          if (isNonEmptyString(handoffScope)) {
            if (isNonEmptyString(handoff.fromContextId)) {
              registerContextClaim(claims, roleId, handoffScope, handoff.fromContextId, `${handoffPath}.fromContextId`, errors);
            }
            if (isNonEmptyString(handoff.toContextId)) {
              registerContextClaim(claims, roleId, handoffScope, handoff.toContextId, `${handoffPath}.toContextId`, errors);
            }
          }
        });
      }
    }
  }

  return roles;
}

function validateReadOnlyRole(roleId, roleRecord, basePath, errors) {
  const readOnlyMode = roleRecord.readOnlyMode;
  if (readOnlyMode !== "enforced" && readOnlyMode !== "verified-zero-write") {
    addError(
      errors,
      "READ_ONLY_MODE_INVALID",
      `${basePath}.readOnlyMode`,
      `Read-only role "${roleId}" must use readOnlyMode "enforced" or "verified-zero-write" (got "${String(readOnlyMode)}")`
    );
    return;
  }
  if (readOnlyMode === "verified-zero-write") {
    const evidence = roleRecord.readOnlyEvidence;
    if (!isPlainObject(evidence)) {
      addError(
        errors,
        "READ_ONLY_EVIDENCE_MISSING",
        `${basePath}.readOnlyEvidence`,
        `Role "${roleId}" using verified-zero-write requires readOnlyEvidence object`
      );
      return;
    }
    if (evidence.userApprovedDegradation !== true) {
      addError(
        errors,
        "READ_ONLY_DEGRADATION_UNAPPROVED",
        `${basePath}.readOnlyEvidence.userApprovedDegradation`,
        `Role "${roleId}" cannot use verified-zero-write without explicit userApprovedDegradation: true`
      );
    }
    if (!isNonEmptyString(evidence.approvalRef)) {
      addError(
        errors,
        "READ_ONLY_APPROVAL_REF_MISSING",
        `${basePath}.readOnlyEvidence.approvalRef`,
        `Role "${roleId}" requires non-empty approvalRef for verified-zero-write`
      );
    }
    const hasBefore = isNonEmptyString(evidence.beforeFingerprint);
    const hasAfter = isNonEmptyString(evidence.afterFingerprint);
    if (!hasBefore) {
      addError(
        errors,
        "READ_ONLY_FINGERPRINT_MISSING",
        `${basePath}.readOnlyEvidence.beforeFingerprint`,
        `Role "${roleId}" requires non-empty beforeFingerprint`
      );
    }
    if (!hasAfter) {
      addError(
        errors,
        "READ_ONLY_FINGERPRINT_MISSING",
        `${basePath}.readOnlyEvidence.afterFingerprint`,
        `Role "${roleId}" requires non-empty afterFingerprint`
      );
    }
    if (hasBefore && hasAfter && evidence.beforeFingerprint !== evidence.afterFingerprint) {
      addError(
        errors,
        "READ_ONLY_FINGERPRINT_DRIFT",
        `${basePath}.readOnlyEvidence`,
        `Role "${roleId}" detected workspace/VCS fingerprint drift (before !== after); verdict must be invalidated`
      );
    }
  }
}

function validateLoops(ledger, errors) {
  const loops = ledger.loops;
  if (loops === undefined) {
    return {};
  }
  if (!isPlainObject(loops)) {
    addError(errors, "LOOPS_INVALID", "loops", "loops must be an object");
    return {};
  }

  for (const loopKey of ["design", "code", "testCase"]) {
    const loopState = loops[loopKey];
    if (loopState === undefined) {
      continue;
    }
    const basePath = `loops.${loopKey}`;
    if (!isPlainObject(loopState)) {
      addError(errors, "LOOP_INVALID", basePath, `${basePath} must be an object`);
      continue;
    }
    const maxRounds = loopState.maxRounds ?? 3;
    if (!isIntInRange(maxRounds, 1, 20)) {
      addError(errors, "LOOP_MAX_ROUNDS_INVALID", `${basePath}.maxRounds`, "maxRounds must be an integer between 1 and 20");
    }
    if (!Number.isInteger(loopState.validRounds) || loopState.validRounds < 0) {
      addError(errors, "LOOP_VALID_ROUNDS_INVALID", `${basePath}.validRounds`, "validRounds must be a non-negative integer");
    } else if (isIntInRange(maxRounds, 1, 20) && loopState.validRounds > maxRounds) {
      addError(
        errors,
        "LOOP_ROUNDS_EXCEEDED",
        `${basePath}.validRounds`,
        `validRounds (${loopState.validRounds}) exceeds maxRounds (${maxRounds})`
      );
    }
    const stagnationCount = loopState.stagnationCount ?? 0;
    if (!Number.isInteger(stagnationCount) || stagnationCount < 0) {
      addError(errors, "LOOP_STAGNATION_INVALID", `${basePath}.stagnationCount`, "stagnationCount must be a non-negative integer");
    } else if (stagnationCount >= 2) {
      addError(
        errors,
        "LOOP_STAGNATION_REACHED",
        `${basePath}.stagnationCount`,
        `stagnationCount (${stagnationCount}) reached stop line (>= 2 consecutive rounds without blocker reduction)`
      );
    }
    if (!Array.isArray(loopState.openBlockers)) {
      addError(errors, "LOOP_OPEN_BLOCKERS_INVALID", `${basePath}.openBlockers`, "openBlockers must be an array");
    }
  }

  const defectReturn = loops.defectReturn;
  if (defectReturn !== undefined) {
    const basePath = "loops.defectReturn";
    if (!isPlainObject(defectReturn)) {
      addError(errors, "DEFECT_RETURN_INVALID", basePath, "loops.defectReturn must be an object");
    } else {
      const maxCycles = defectReturn.maxCycles ?? 2;
      if (!isIntInRange(maxCycles, 1, 10)) {
        addError(errors, "DEFECT_MAX_CYCLES_INVALID", `${basePath}.maxCycles`, "maxCycles must be an integer between 1 and 10");
      }
      if (!Number.isInteger(defectReturn.cycles) || defectReturn.cycles < 0) {
        addError(errors, "DEFECT_CYCLES_INVALID", `${basePath}.cycles`, "cycles must be a non-negative integer");
      } else if (isIntInRange(maxCycles, 1, 10)) {
        if (defectReturn.cycles > maxCycles) {
          addError(
            errors,
            "DEFECT_CYCLES_EXCEEDED",
            `${basePath}.cycles`,
            `defectReturn.cycles (${defectReturn.cycles}) exceeds maxCycles (${maxCycles})`
          );
        } else if (defectReturn.cycles === maxCycles && defectReturn.pendingReturn === true) {
          addError(
            errors,
            "DEFECT_CYCLES_EXCEEDED",
            `${basePath}.pendingReturn`,
            `defectReturn already reached maxCycles (${maxCycles}) and cannot start another return cycle without user escalation`
          );
        }
      }

      if (!Array.isArray(defectReturn.history)) {
        addError(errors, "DEFECT_HISTORY_INVALID", `${basePath}.history`, "defectReturn.history must be an array");
      } else {
        if (isIntInRange(maxCycles, 1, 10) && defectReturn.history.length > maxCycles) {
          addError(
            errors,
            "DEFECT_CYCLES_EXCEEDED",
            `${basePath}.history`,
            `defectReturn.history length (${defectReturn.history.length}) exceeds maxCycles (${maxCycles})`
          );
        }
        defectReturn.history.forEach((entry, index) => {
          const itemPath = `${basePath}.history[${index}]`;
          if (!isPlainObject(entry)) {
            addError(errors, "DEFECT_HISTORY_ITEM_INVALID", itemPath, "History item must be an object");
            return;
          }
          if (!Number.isInteger(entry.cycle) || entry.cycle < 1) {
            addError(errors, "DEFECT_HISTORY_CYCLE_INVALID", `${itemPath}.cycle`, "cycle must be a positive integer");
          }
          if (entry.fullRoundCompleted !== true) {
            addError(
              errors,
              "DEFECT_RETURN_MID_UT_ABORT_FORBIDDEN",
              `${itemPath}.fullRoundCompleted`,
              "UT defect return requires completing the full confirmed suite on the fixed version first (fullRoundCompleted: true)"
            );
          }
          if (!Array.isArray(entry.failedCaseIds) || entry.failedCaseIds.length === 0 || !entry.failedCaseIds.every(isNonEmptyString)) {
            addError(
              errors,
              "DEFECT_HISTORY_FAILED_CASES_MISSING",
              `${itemPath}.failedCaseIds`,
              "failedCaseIds must be a non-empty array of case IDs"
            );
          }
          const hasAffectedScope =
            isNonEmptyString(entry.affectedScope) ||
            (Array.isArray(entry.affectedScope) && entry.affectedScope.length > 0 && entry.affectedScope.every(isNonEmptyString));
          if (!hasAffectedScope) {
            addError(
              errors,
              "DEFECT_HISTORY_AFFECTED_SCOPE_MISSING",
              `${itemPath}.affectedScope`,
              "Developer must provide explicit non-empty affectedScope for defect return"
            );
          }
          if (entry.reviewerVerifiedScope !== true) {
            addError(
              errors,
              "DEFECT_HISTORY_SCOPE_UNVERIFIED",
              `${itemPath}.reviewerVerifiedScope`,
              "Code reviewer must verify affectedScope (reviewerVerifiedScope: true)"
            );
          }
          if (!isIntInRange(entry.codeReviewRounds, 1, 20)) {
            addError(
              errors,
              "DEFECT_HISTORY_REVIEW_ROUNDS_INVALID",
              `${itemPath}.codeReviewRounds`,
              "codeReviewRounds must be an integer between 1 and 20"
            );
          }
          if (!isNonEmptyString(entry.retestSnapshot)) {
            addError(
              errors,
              "DEFECT_HISTORY_RETEST_SNAPSHOT_MISSING",
              `${itemPath}.retestSnapshot`,
              "retestSnapshot must be a non-empty string"
            );
          }
        });
      }
    }
  }

  return loops;
}

function requireRoleCompleted(roles, roleId, errors) {
  const roleRecord = roles[roleId];
  if (!isPlainObject(roleRecord) || roleRecord.status !== "completed") {
    addError(errors, "ROLE_NOT_COMPLETED", `roles.${roleId}`, `Role "${roleId}" must be recorded with status "completed"`);
  }
}

function requireConfirmedGate(gates, gateName, expectedVersion, errors, options = {}) {
  const gateRecord = isPlainObject(gates) ? gates[gateName] : null;
  const basePath = `gates.${gateName}`;
  if (!isPlainObject(gateRecord)) {
    addError(errors, "GATE_MISSING", basePath, `Gate "${gateName}" record is required`);
    return;
  }
  if (!VALID_GATE_STATUSES.includes(gateRecord.status)) {
    addError(errors, "GATE_STATUS_INVALID", `${basePath}.status`, `Gate "${gateName}" has invalid status "${String(gateRecord.status)}"`);
    return;
  }
  if (gateRecord.status !== "confirmed") {
    addError(errors, "GATE_NOT_CONFIRMED", `${basePath}.status`, `Gate "${gateName}" must be "confirmed" (got "${gateRecord.status}")`);
    return;
  }
  if (!isNonEmptyString(gateRecord.targetVersion) || gateRecord.targetVersion !== expectedVersion) {
    addError(
      errors,
      "GATE_VERSION_MISMATCH",
      `${basePath}.targetVersion`,
      `Gate "${gateName}" targetVersion ("${String(gateRecord.targetVersion)}") must match version "${String(expectedVersion)}"`
    );
  }
  if (!isNonEmptyString(gateRecord.confirmedBy)) {
    addError(errors, "GATE_CONFIRMED_BY_MISSING", `${basePath}.confirmedBy`, `Gate "${gateName}" requires non-empty confirmedBy`);
  }
  if (!isNonEmptyString(gateRecord.evidence)) {
    addError(errors, "GATE_EVIDENCE_MISSING", `${basePath}.evidence`, `Gate "${gateName}" requires non-empty evidence`);
  }
  if (options.requireImplAuth && gateRecord.implementationAuthorized !== true) {
    addError(
      errors,
      "IMPLEMENTATION_AUTH_MISSING",
      `${basePath}.implementationAuthorized`,
      `Gate "${gateName}" requires explicit implementationAuthorized: true before coding`
    );
  }
}

function checkGateA(ledger, context, errors) {
  if (context.mode === "lite") {
    addError(errors, "GATE_INVALID_FOR_MODE", "gates.A", 'Gate "A" is superseded by merged gate "AB" in lite mode');
    return;
  }
  if (!isNonEmptyString(context.versions.requirements)) {
    addError(errors, "VERSION_REQUIREMENTS_MISSING", "versions.requirements", "versions.requirements must be non-empty for gate A");
  }
  requireRoleCompleted(context.roles, "fr-requirements", errors);
  requireConfirmedGate(ledger.gates, "A", context.versions.requirements, errors);
}

function checkGateAB(ledger, context, errors) {
  if (context.mode !== "lite") {
    addError(errors, "GATE_INVALID_FOR_MODE", "gates.AB", 'Gate "AB" is only valid when meta.mode is "lite"');
    return;
  }
  if (!isNonEmptyString(context.versions.requirements)) {
    addError(errors, "VERSION_REQUIREMENTS_MISSING", "versions.requirements", "versions.requirements must be non-empty for gate AB");
  }
  requireRoleCompleted(context.roles, "fr-requirements", errors);
  requireConfirmedGate(ledger.gates, "AB", context.versions.requirements, errors, { requireImplAuth: true });
}

function checkGateB(ledger, context, errors) {
  if (context.mode === "lite") {
    addError(errors, "GATE_INVALID_FOR_MODE", "gates.B", 'Gate "B" is waived in lite mode; validate gate "AB" instead');
    return;
  }
  checkGateA(ledger, context, errors);
  if (!isNonEmptyString(context.versions.design)) {
    addError(errors, "VERSION_DESIGN_MISSING", "versions.design", "versions.design must be non-empty for gate B");
  }
  requireRoleCompleted(context.roles, "fr-designer", errors);
  requireRoleCompleted(context.roles, "fr-design-reviewer", errors);

  const designLoop = context.loops.design;
  if (!isPlainObject(designLoop) || !Number.isInteger(designLoop.validRounds) || designLoop.validRounds < 1) {
    addError(errors, "DESIGN_REVIEW_MISSING", "loops.design.validRounds", "Gate B requires at least 1 valid independent design review round");
  } else if (Array.isArray(designLoop.openBlockers) && designLoop.openBlockers.length > 0) {
    addError(errors, "DESIGN_BLOCKERS_OPEN", "loops.design.openBlockers", "Gate B cannot pass while design openBlockers is non-empty");
  }

  requireConfirmedGate(ledger.gates, "B", context.versions.design, errors, { requireImplAuth: true });
}

function checkUtEntry(ledger, context, errors) {
  if (!context.standalone) {
    if (context.mode === "standard") {
      checkGateB(ledger, context, errors);
    } else if (context.mode === "lite") {
      checkGateAB(ledger, context, errors);
    }
  }

  const snapshot = context.versions.codeSnapshot;
  if (!isNonEmptyString(snapshot)) {
    addError(errors, "VERSION_CODE_SNAPSHOT_MISSING", "versions.codeSnapshot", "versions.codeSnapshot must be non-empty for ut-entry");
  }
  requireRoleCompleted(context.roles, "fr-developer", errors);
  requireRoleCompleted(context.roles, "fr-code-reviewer", errors);

  const utEntry = ledger.utEntry;
  if (!isPlainObject(utEntry)) {
    addError(errors, "UT_ENTRY_MISSING", "utEntry", "ut-entry requires utEntry evidence object");
  } else {
    if (!isNonEmptyString(utEntry.codeSnapshot) || utEntry.codeSnapshot !== snapshot) {
      addError(
        errors,
        "UT_ENTRY_SNAPSHOT_MISMATCH",
        "utEntry.codeSnapshot",
        `utEntry.codeSnapshot ("${String(utEntry.codeSnapshot)}") must match versions.codeSnapshot ("${String(snapshot)}")`
      );
    }

    const selfTest = utEntry.devSelfTest;
    if (!isPlainObject(selfTest) || selfTest.passed !== true || selfTest.snapshot !== snapshot || !isNonEmptyString(selfTest.evidence)) {
      addError(
        errors,
        "UT_ENTRY_SELF_TEST_INVALID",
        "utEntry.devSelfTest",
        "utEntry.devSelfTest must be passed with matching snapshot and non-empty evidence"
      );
    }

    const diffSelfReview = utEntry.devDiffSelfReview;
    if (
      !isPlainObject(diffSelfReview) ||
      diffSelfReview.passed !== true ||
      diffSelfReview.snapshot !== snapshot ||
      !isNonEmptyString(diffSelfReview.evidence)
    ) {
      addError(
        errors,
        "UT_ENTRY_DIFF_REVIEW_INVALID",
        "utEntry.devDiffSelfReview",
        "utEntry.devDiffSelfReview must be passed with matching snapshot and non-empty evidence"
      );
    }

    const codeReview = utEntry.codeReview;
    if (
      !isPlainObject(codeReview) ||
      codeReview.passed !== true ||
      codeReview.snapshot !== snapshot ||
      codeReview.openBlockers !== 0 ||
      !isNonEmptyString(codeReview.evidence)
    ) {
      addError(
        errors,
        "UT_ENTRY_CODE_REVIEW_INVALID",
        "utEntry.codeReview",
        "utEntry.codeReview must be passed with matching snapshot, openBlockers: 0, and non-empty evidence"
      );
    }
  }

  const codeLoop = context.loops.code;
  if (!isPlainObject(codeLoop) || !Number.isInteger(codeLoop.validRounds) || codeLoop.validRounds < 1) {
    addError(errors, "CODE_REVIEW_MISSING", "loops.code.validRounds", "ut-entry requires at least 1 valid independent code review round");
  } else if (Array.isArray(codeLoop.openBlockers) && codeLoop.openBlockers.length > 0) {
    addError(errors, "CODE_BLOCKERS_OPEN", "loops.code.openBlockers", "ut-entry cannot pass while code openBlockers is non-empty");
  }
}

function checkGateC(ledger, context, errors) {
  checkUtEntry(ledger, context, errors);

  if (!isNonEmptyString(context.versions.testCases)) {
    addError(errors, "VERSION_TEST_CASES_MISSING", "versions.testCases", "versions.testCases must be non-empty for gate C");
  }
  if (context.versions.testCasesStatus === "pre-draft") {
    addError(
      errors,
      "TEST_CASES_PRE_DRAFT_NOT_ALLOWED",
      "versions.testCasesStatus",
      'Pre-draft test cases ("pre-draft") must be aligned to final codeSnapshot and promoted to "formal" before gate C'
    );
  }
  requireRoleCompleted(context.roles, "fr-test-case-author", errors);
  requireRoleCompleted(context.roles, "fr-test-case-reviewer", errors);

  const testCaseLoop = context.loops.testCase;
  if (!isPlainObject(testCaseLoop) || !Number.isInteger(testCaseLoop.validRounds) || testCaseLoop.validRounds < 1) {
    addError(errors, "TEST_CASE_REVIEW_MISSING", "loops.testCase.validRounds", "Gate C requires at least 1 valid independent test case review round");
  } else if (Array.isArray(testCaseLoop.openBlockers) && testCaseLoop.openBlockers.length > 0) {
    addError(errors, "TEST_CASE_BLOCKERS_OPEN", "loops.testCase.openBlockers", "Gate C cannot pass while testCase openBlockers is non-empty");
  }

  requireConfirmedGate(ledger.gates, "C", context.versions.testCases, errors);
}

function checkQaHandoff(ledger, context, errors) {
  checkGateC(ledger, context, errors);
  requireRoleCompleted(context.roles, "fr-test-executor", errors);

  if (!isNonEmptyString(context.versions.buildOrDevice)) {
    addError(errors, "VERSION_BUILD_OR_DEVICE_MISSING", "versions.buildOrDevice", "versions.buildOrDevice must be non-empty for qa-handoff");
  }

  const defectReturn = context.loops.defectReturn;
  if (isPlainObject(defectReturn) && Number.isInteger(defectReturn.cycles) && defectReturn.cycles > 0) {
    if (!Array.isArray(defectReturn.history) || defectReturn.history.length < defectReturn.cycles) {
      addError(
        errors,
        "DEFECT_HISTORY_COUNT_MISMATCH",
        "loops.defectReturn.history",
        `defectReturn.history must contain at least ${defectReturn.cycles} entries matching defectReturn.cycles`
      );
    } else {
      const latestEntry = defectReturn.history[defectReturn.history.length - 1];
      if (isPlainObject(latestEntry) && latestEntry.retestSnapshot !== context.versions.codeSnapshot) {
        addError(
          errors,
          "DEFECT_RETEST_SNAPSHOT_MISMATCH",
          "loops.defectReturn.history",
          `Latest defect return retestSnapshot ("${String(latestEntry.retestSnapshot)}") must match current codeSnapshot ("${String(context.versions.codeSnapshot)}")`
        );
      }
    }
  }

  const qaHandoff = ledger.qaHandoff;
  if (!isPlainObject(qaHandoff)) {
    addError(errors, "QA_HANDOFF_MISSING", "qaHandoff", "qa-handoff requires qaHandoff object");
    return;
  }
  if (qaHandoff.codeSnapshot !== context.versions.codeSnapshot) {
    addError(errors, "QA_HANDOFF_VERSION_MISMATCH", "qaHandoff.codeSnapshot", "qaHandoff.codeSnapshot must match versions.codeSnapshot");
  }
  if (qaHandoff.testCases !== context.versions.testCases) {
    addError(errors, "QA_HANDOFF_VERSION_MISMATCH", "qaHandoff.testCases", "qaHandoff.testCases must match versions.testCases");
  }
  if (qaHandoff.buildOrDevice !== context.versions.buildOrDevice) {
    addError(errors, "QA_HANDOFF_VERSION_MISMATCH", "qaHandoff.buildOrDevice", "qaHandoff.buildOrDevice must match versions.buildOrDevice");
  }
  if (qaHandoff.qaAccepted === true) {
    addError(errors, "QA_ACCEPTANCE_CLAIMED_BY_DEV", "qaHandoff.qaAccepted", "Developer UT handoff must never claim QA acceptance (qaAccepted must be false)");
  }

  const summary = qaHandoff.mandatorySummary;
  if (!isPlainObject(summary)) {
    addError(errors, "QA_SUMMARY_MISSING", "qaHandoff.mandatorySummary", "qaHandoff.mandatorySummary is required");
    return;
  }
  for (const counterKey of ["passed", "failed", "blocked", "notRun"]) {
    if (!Number.isInteger(summary[counterKey]) || summary[counterKey] < 0) {
      addError(
        errors,
        "QA_SUMMARY_INVALID",
        `qaHandoff.mandatorySummary.${counterKey}`,
        `mandatorySummary.${counterKey} must be a non-negative integer`
      );
    }
  }
  if (qaHandoff.readyForQa === true) {
    if (summary.passed <= 0 || summary.failed > 0 || summary.blocked > 0 || summary.notRun > 0) {
      addError(
        errors,
        "QA_HANDOFF_INCOMPLETE_RESULTS",
        "qaHandoff.readyForQa",
        "readyForQa cannot be true while mandatory tests have failed/blocked/notRun items or zero passed items"
      );
    }
  }
}

function validateLedger(ledger, options = {}) {
  const gate = options.gate;
  const errors = [];
  const warnings = [];

  if (!VALID_GATES.includes(gate)) {
    addError(errors, "INVALID_TARGET_GATE", "gate", `Target gate must be one of: ${VALID_GATES.join(", ")}`);
    return { ok: false, gate: gate ?? null, errors, warnings };
  }
  if (!isPlainObject(ledger)) {
    addError(errors, "LEDGER_INVALID", "$", "Ledger payload must be a JSON object");
    return { ok: false, gate, errors, warnings };
  }

  const metaInfo = validateMeta(ledger, errors);
  const versions = validateVersions(ledger, errors);
  const roles = validateRoles(ledger, errors);
  const loops = validateLoops(ledger, errors);
  const context = {
    mode: metaInfo.mode,
    standalone: Boolean(options.standalone || metaInfo.standalone),
    versions,
    roles,
    loops,
  };

  if (gate === "A") {
    checkGateA(ledger, context, errors);
  } else if (gate === "B") {
    checkGateB(ledger, context, errors);
  } else if (gate === "AB") {
    checkGateAB(ledger, context, errors);
  } else if (gate === "ut-entry") {
    checkUtEntry(ledger, context, errors);
  } else if (gate === "C") {
    checkGateC(ledger, context, errors);
  } else if (gate === "qa-handoff") {
    checkQaHandoff(ledger, context, errors);
  }

  return { ok: errors.length === 0, gate, errors, warnings };
}

function parseCliArgs(argv) {
  let gate = null;
  let standalone = false;
  let inputPath = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--gate") {
      gate = argv[index + 1] ?? null;
      index += 1;
    } else if (token.startsWith("--gate=")) {
      gate = token.slice("--gate=".length);
    } else if (token === "--standalone") {
      standalone = true;
    } else if (token === "--help" || token === "-h") {
      return { help: true };
    } else if (!inputPath) {
      inputPath = token;
    } else {
      return { error: `Unexpected argument: ${token}` };
    }
  }

  if (!gate || !inputPath) {
    return { error: "Usage: node scripts/validate-ledger.cjs --gate <A|B|AB|C|ut-entry|qa-handoff> <ledger.json | -> [--standalone]" };
  }
  return { gate, standalone, inputPath };
}

function runCli(argv) {
  const parsed = parseCliArgs(argv);
  if (parsed.help) {
    console.log("Usage: node scripts/validate-ledger.cjs --gate <A|B|AB|C|ut-entry|qa-handoff> <ledger.json | -> [--standalone]");
    process.exit(0);
  }
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(2);
  }

  let rawText;
  try {
    rawText = parsed.inputPath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(parsed.inputPath, "utf8");
  } catch (readError) {
    console.error(`Failed to read ledger input: ${readError.message}`);
    process.exit(2);
  }

  let ledger;
  try {
    ledger = JSON.parse(rawText);
  } catch (parseError) {
    console.error(`Failed to parse JSON: ${parseError.message}`);
    process.exit(2);
  }

  const result = validateLedger(ledger, { gate: parsed.gate, standalone: parsed.standalone });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  runCli(process.argv.slice(2));
}

module.exports = {
  validateLedger,
  VALID_GATES,
  LOGICAL_ROLES,
  READ_ONLY_ROLES,
  LITE_REDLINE_KEYS,
};
