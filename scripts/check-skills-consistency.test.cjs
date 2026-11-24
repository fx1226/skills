"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkSkillsConsistency, ORCHESTRATION_SKILLS } = require("./check-skills-consistency.cjs");

const REPO_ROOT = path.resolve(__dirname, "..");

function copyRepoSubset(targetDir) {
  for (const rootFile of ["README.md", "CHANGELOG.md"]) {
    if (fs.existsSync(path.join(REPO_ROOT, rootFile))) {
      fs.copyFileSync(path.join(REPO_ROOT, rootFile), path.join(targetDir, rootFile));
    }
  }
  for (const extraDir of ["c-coding-standards", "svn-code-review", "xu-code-review", "write_richsun_log", "note-take", "docs"]) {
    const sourceDir = path.join(REPO_ROOT, extraDir);
    if (fs.existsSync(sourceDir)) {
      fs.cpSync(sourceDir, path.join(targetDir, extraDir), { recursive: true });
    }
  }
  for (const skillName of ORCHESTRATION_SKILLS) {
    fs.cpSync(path.join(REPO_ROOT, skillName), path.join(targetDir, skillName), { recursive: true });
  }
}

test("真实仓库通过全部跨技能一致性检查", () => {
  const report = checkSkillsConsistency(REPO_ROOT);
  assert.equal(report.ok, true, JSON.stringify(report.failures, null, 2));
  assert.deepEqual(report.checkedSkills, ORCHESTRATION_SKILLS);
});

test("检出技能目录内残留 HTML 资产、死链、外逸链接与缺失公共条款", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skills-consistency-"));
  try {
    copyRepoSubset(tempRoot);

    fs.writeFileSync(path.join(tempRoot, "xu-dev-review-loop", "stray-diagram.html"), "<html></html>");

    const designSkillPath = path.join(tempRoot, "xu-design-review-loop", "SKILL.md");
    const designContent = fs.readFileSync(designSkillPath, "utf8");
    fs.writeFileSync(
      designSkillPath,
      `${designContent}\n[bad](references/non-existent.md)\n[escape](../xu-fr-flow/SKILL.md)\n`
    );

    const utSkillPath = path.join(tempRoot, "xu-dev-ut-loop", "SKILL.md");
    const utRefPath = path.join(tempRoot, "xu-dev-ut-loop", "references", "dispatch-and-ledger.md");
    fs.writeFileSync(utSkillPath, fs.readFileSync(utSkillPath, "utf8").replace(/verified-zero-write/g, "removed"));
    fs.writeFileSync(utRefPath, fs.readFileSync(utRefPath, "utf8").replace(/verified-zero-write/g, "removed"));
    const utCaseRefPath = path.join(tempRoot, "xu-dev-ut-loop", "references", "case-design-and-review.md");
    fs.writeFileSync(utCaseRefPath, fs.readFileSync(utCaseRefPath, "utf8").replace(/verified-zero-write/g, "removed"));

    const report = checkSkillsConsistency(tempRoot);
    assert.equal(report.ok, false);
    assert.ok(report.failures.some((item) => item.code === "SKILL_HTML_ASSET_FORBIDDEN"));
    assert.ok(report.failures.some((item) => item.code === "BROKEN_MARKDOWN_LINK"));
    assert.ok(report.failures.some((item) => item.code === "STANDALONE_SKILL_EXTERNAL_LINK"));
    assert.ok(report.failures.some((item) => item.code === "MISSING_SHARED_CLAUSE" && item.path === "xu-dev-ut-loop"));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("检出超长正文、缺失离散终态、旧运行器和 Harness 绑定", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skills-lightweight-"));
  try {
    copyRepoSubset(tempRoot);

    const frSkillPath = path.join(tempRoot, "xu-fr-flow", "SKILL.md");
    fs.appendFileSync(frSkillPath, `\n${"长".repeat(221)}\n`);
    fs.mkdirSync(path.join(tempRoot, ".opencode", "agents"), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, ".opencode", "agents", "legacy.md"), "legacy\n");
    fs.writeFileSync(path.join(tempRoot, "xu-dev-review-loop", "workflow.js"), "return null;\n");

    for (const skillName of ["xu-fr-flow", "xu-design-review-loop", "xu-dev-review-loop", "xu-dev-ut-loop"]) {
      const skillPath = path.join(tempRoot, skillName, "SKILL.md");
      const content = fs.readFileSync(skillPath, "utf8");
      fs.writeFileSync(skillPath, content.replace(/ADVANCE/g, "GO"));
    }

    const report = checkSkillsConsistency(tempRoot);
    assert.equal(report.ok, false);
    assert.ok(report.failures.some((item) => item.code === "OVERLONG_PROSE_LINE"));
    assert.ok(report.failures.some((item) => item.code === "HARNESS_PROFILE_DIR_FORBIDDEN"));
    assert.ok(report.failures.some((item) => item.code === "HARNESS_RUNNER_ASSET_FORBIDDEN"));
    assert.ok(report.failures.some((item) => item.code === "MISSING_SHARED_CLAUSE"));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
