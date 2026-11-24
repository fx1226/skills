#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ORCHESTRATION_SKILLS = [
  "xu-fr-flow",
  "xu-design-review-loop",
  "xu-dev-review-loop",
  "xu-dev-ut-loop",
];
const STANDALONE_SKILLS = [
  "xu-design-review-loop",
  "xu-dev-review-loop",
  "xu-dev-ut-loop",
];
const UT_FULL_ROUND_SKILLS = ["xu-fr-flow", "xu-dev-ut-loop"];

const REQUIRED_CLAUSES = [
  {
    id: "role-isolation",
    description: "独立上下文隔离与禁止再次委派",
    patterns: [/独立上下文/, /禁止再次委派/],
  },
  {
    id: "context-identity-handles",
    description: "稳定上下文身份与运行/续接句柄分离",
    patterns: [/contextId/, /contextScope/, /runHandle|resumeHandle/],
  },
  {
    id: "two-tier-read-only",
    description: "两级只读隔离协议（enforced / verified-zero-write + 指纹核验）",
    patterns: [/enforced/, /verified-zero-write/, /指纹/],
  },
  {
    id: "round-stagnation-time-guardrails",
    description: "轮次上限、连续两轮停滞与 20–30 分钟耗时护栏",
    patterns: [/1[–-]20/, /20[–-]30/, /连续两轮/],
  },
  {
    id: "structured-flow-ledger",
    description: "统一结构化 flow-ledger 与 schemaVersion 契约",
    patterns: [/flow-ledger/, /schemaVersion/],
  },
  {
    id: "write-authorization-boundary",
    description: "默认对话输出与显式授权落盘边界",
    patterns: [/落盘/, /授权/],
  },
  {
    id: "discrete-terminal-states",
    description: "三种离散终态与无歧义推进条件",
    patterns: [/ADVANCE/, /WAIT_USER/, /BLOCKED/],
  },
  {
    id: "status-card-on-demand-ledger",
    description: "日常紧凑状态卡与按需稀疏 JSON",
    patterns: [/状态卡/, /按需|明确要求/, /稀疏/],
  },
];

const HARNESS_LINK_PATTERN = /https?:\/\/(?:opencode\.ai|learn\.chatgpt\.com|github\.com\/earendil-works\/pi|github\.com\/nicobailon\/pi-subagents|github\.com\/deepseek-ai\/deepseek-harness|www\.kimi\.com)\b/i;

function addFailure(failures, code, targetPath, message) {
  failures.push({ code, path: targetPath, message });
}

function walkFiles(dirPath) {
  const collected = [];
  if (!fs.existsSync(dirPath)) {
    return collected;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collected.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      collected.push(fullPath);
    }
  }
  return collected;
}

function stripCodeFences(markdownText) {
  return markdownText.replace(/```[\s\S]*?```/g, "");
}

function findOverlongProseLines(markdownText) {
  const violations = [];
  let inCodeFence = false;
  const lines = markdownText.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence || /^\s*\|/.test(line)) {
      continue;
    }
    if (line.length > 220) {
      violations.push({ line: index + 1, length: line.length });
    }
  }
  return violations;
}

function extractRelativeLinks(markdownText) {
  const cleaned = stripCodeFences(markdownText);
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const links = [];
  let match = linkPattern.exec(cleaned);
  while (match !== null) {
    const rawTarget = match[1];
    if (
      !rawTarget.startsWith("http://") &&
      !rawTarget.startsWith("https://") &&
      !rawTarget.startsWith("mailto:") &&
      !rawTarget.startsWith("#")
    ) {
      links.push(rawTarget.split("#")[0]);
    }
    match = linkPattern.exec(cleaned);
  }
  return links.filter((item) => item.length > 0);
}

function validateTestPrompts(skillName, promptsPath, failures) {
  if (!fs.existsSync(promptsPath)) {
    addFailure(failures, "TEST_PROMPTS_MISSING", `${skillName}/test-prompts.json`, "Missing test-prompts.json");
    return;
  }
  let prompts;
  try {
    prompts = JSON.parse(fs.readFileSync(promptsPath, "utf8"));
  } catch (parseError) {
    addFailure(failures, "TEST_PROMPTS_INVALID_JSON", `${skillName}/test-prompts.json`, parseError.message);
    return;
  }
  if (!Array.isArray(prompts) || prompts.length === 0) {
    addFailure(failures, "TEST_PROMPTS_EMPTY", `${skillName}/test-prompts.json`, "test-prompts.json must be a non-empty array");
    return;
  }
  const seenIds = new Set();
  for (const item of prompts) {
    if (!item || typeof item.id !== "string" || item.id.trim().length === 0) {
      addFailure(failures, "TEST_PROMPT_ID_MISSING", `${skillName}/test-prompts.json`, "Every prompt entry requires a non-empty string id");
      continue;
    }
    if (seenIds.has(item.id)) {
      addFailure(failures, "TEST_PROMPT_DUPLICATE_ID", `${skillName}/test-prompts.json`, `Duplicate test prompt id "${item.id}"`);
    }
    seenIds.add(item.id);
    for (const fieldName of ["category", "prompt"]) {
      if (typeof item[fieldName] !== "string" || item[fieldName].trim().length === 0) {
        addFailure(failures, "TEST_PROMPT_FIELD_INVALID", `${skillName}/test-prompts.json`, `Prompt "${item.id}" requires non-empty string "${fieldName}"`);
      }
    }
    for (const arrayField of ["expected", "hard_failures"]) {
      if (!Array.isArray(item[arrayField]) || item[arrayField].length === 0) {
        addFailure(failures, "TEST_PROMPT_FIELD_INVALID", `${skillName}/test-prompts.json`, `Prompt "${item.id}" requires non-empty array "${arrayField}"`);
      }
    }
  }
}

function checkLinksInFile(repoRoot, filePath, skillBoundaryDir, failures) {
  const relativeDisplay = path.relative(repoRoot, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const links = extractRelativeLinks(content);
  const fileDir = path.dirname(filePath);

  for (const target of links) {
    const resolvedTarget = path.resolve(fileDir, target);
    if (!fs.existsSync(resolvedTarget)) {
      addFailure(failures, "BROKEN_MARKDOWN_LINK", relativeDisplay, `Broken relative link "${target}"`);
      continue;
    }
    if (skillBoundaryDir) {
      const normalizedBoundary = skillBoundaryDir.endsWith(path.sep) ? skillBoundaryDir : `${skillBoundaryDir}${path.sep}`;
      if (!resolvedTarget.startsWith(normalizedBoundary)) {
        addFailure(
          failures,
          "STANDALONE_SKILL_EXTERNAL_LINK",
          relativeDisplay,
          `Standalone skill link "${target}" escapes its own skill directory`
        );
      }
    }
  }
}

function checkSkillsConsistency(repoRoot) {
  const resolvedRoot = path.resolve(repoRoot);
  const failures = [];

  const opencodeDir = path.join(resolvedRoot, ".opencode");
  if (fs.existsSync(opencodeDir)) {
    addFailure(failures, "HARNESS_PROFILE_DIR_FORBIDDEN", ".opencode", "Deprecated harness-specific profiles must not remain in the repository");
  }

  for (const rootDoc of ["README.md", "CHANGELOG.md"]) {
    const rootDocPath = path.join(resolvedRoot, rootDoc);
    if (fs.existsSync(rootDocPath)) {
      checkLinksInFile(resolvedRoot, rootDocPath, null, failures);
    }
  }

  for (const skillName of ORCHESTRATION_SKILLS) {
    const skillDir = path.join(resolvedRoot, skillName);
    if (!fs.existsSync(skillDir)) {
      addFailure(failures, "SKILL_DIR_MISSING", skillName, `Missing skill directory "${skillName}"`);
      continue;
    }

    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
      addFailure(failures, "SKILL_MD_MISSING", `${skillName}/SKILL.md`, "Missing SKILL.md");
      continue;
    }

    const requiredRefs =
      skillName === "xu-fr-flow"
        ? ["references/requirements-and-stages.md", "references/subagent-dispatch.md"]
        : ["references/dispatch-and-ledger.md"];

    for (const refRelPath of requiredRefs) {
      const fullRefPath = path.join(skillDir, refRelPath);
      if (!fs.existsSync(fullRefPath)) {
        addFailure(failures, "REQUIRED_REF_MISSING", `${skillName}/${refRelPath}`, `Missing required reference "${refRelPath}"`);
      }
    }

    validateTestPrompts(skillName, path.join(skillDir, "test-prompts.json"), failures);

    const allFiles = walkFiles(skillDir);
    const markdownFiles = [];
    for (const filePath of allFiles) {
      const lowerName = filePath.toLowerCase();
      const relativePath = path.relative(resolvedRoot, filePath);
      if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
        addFailure(
          failures,
          "SKILL_HTML_ASSET_FORBIDDEN",
          relativePath,
          "HTML diagram/report assets must live under docs/ rather than inside a skill package"
        );
      }
      if (path.basename(lowerName) === "workflow.js") {
        addFailure(failures, "HARNESS_RUNNER_ASSET_FORBIDDEN", relativePath, "Harness-specific workflow runner assets are forbidden");
      }
      if (lowerName.endsWith(".md")) {
        markdownFiles.push(filePath);
      }
    }

    const isStandalone = STANDALONE_SKILLS.includes(skillName);
    let combinedMarkdown = "";
    for (const markdownPath of markdownFiles) {
      const markdownContent = fs.readFileSync(markdownPath, "utf8");
      combinedMarkdown += `\n${markdownContent}`;
      for (const violation of findOverlongProseLines(markdownContent)) {
        addFailure(
          failures,
          "OVERLONG_PROSE_LINE",
          `${path.relative(resolvedRoot, markdownPath)}:${violation.line}`,
          `Prose line exceeds 220 characters (${violation.length})`
        );
      }
      if (HARNESS_LINK_PATTERN.test(markdownContent) || markdownContent.includes(".opencode/")) {
        addFailure(
          failures,
          "HARNESS_BINDING_REFERENCE_FORBIDDEN",
          path.relative(resolvedRoot, markdownPath),
          "Skill documentation must not bind to a specific harness or reference .opencode/"
        );
      }
      checkLinksInFile(resolvedRoot, markdownPath, isStandalone ? skillDir : null, failures);
    }

    for (const clause of REQUIRED_CLAUSES) {
      const missingPattern = clause.patterns.find((pattern) => !pattern.test(combinedMarkdown));
      if (missingPattern) {
        addFailure(
          failures,
          "MISSING_SHARED_CLAUSE",
          skillName,
          `Skill "${skillName}" is missing shared clause "${clause.id}" (${clause.description}; unmatched ${missingPattern})`
        );
      }
    }

    if (UT_FULL_ROUND_SKILLS.includes(skillName)) {
      const utFullRoundPatterns = [/fullRoundCompleted/, /整轮/, /中途/];
      const missingUtPattern = utFullRoundPatterns.find((pattern) => !pattern.test(combinedMarkdown));
      if (missingUtPattern) {
        addFailure(
          failures,
          "MISSING_UT_FULL_ROUND_CLAUSE",
          skillName,
          `Skill "${skillName}" is missing mandatory full-round UT execution clause (unmatched ${missingUtPattern})`
        );
      }
    }
  }

  return {
    ok: failures.length === 0,
    checkedSkills: ORCHESTRATION_SKILLS,
    failures,
  };
}

if (require.main === module) {
  const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "..");
  const report = checkSkillsConsistency(targetRoot);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

module.exports = {
  checkSkillsConsistency,
  findOverlongProseLines,
  ORCHESTRATION_SKILLS,
  STANDALONE_SKILLS,
  REQUIRED_CLAUSES,
};
