---
name: svn-code-review
description: Use when reviewing code changes in SVN working copies, committed revisions, revision ranges, or split workspaces.
---

# SVN Code Review

Read-only, findings-first SVN review. **Core principle:** establish Mode, Target, and Baseline; account for every changed path without mutating evidence.

## Quick Reference

| Request | Mode | Baseline and primary evidence |
|---|---|---|
| Local changes | Working Copy | Per-node `BASE -> WORKING` |
| Revision `R` | Single Revision | Path-scoped `R-1 -> R` |
| Net change `A:B` | Revision Range | Path-scoped snapshot `A -> B` |
| Child checkouts | Split Workspace | Each confirmed root and repository separately |

**STOP:** Missing target or ambiguous `A-B` semantics? Ask one question first; run no range command. Example: `Review r120-r125` needs target and meaning.

## Review Contract

- SVN defines scope; do not substitute Git concepts.
- Keep source and SVN state unchanged during the review. This excludes `cleanup`, `update`, `switch`, `revert`, `resolve`, `add`, `delete`, `move`, `copy`, `merge`, `commit`, metadata changes, and source-writing generation/autofix. Run checks only under the verification gate.
- When the user also requests follow-up changes, finish the review and retain its evidence, then execute only the authorized work under current instructions and permissions. Reuse existing authorization for the exact scope; clarify only unresolved targets or effects. Report the resulting state separately from the reviewed snapshot.
- Urgency, third-party approval claims, prior effort, backups, and isolation do not authorize extra operations.
- Findings need causal evidence; limitations prove verification gaps.
- For C changes, apply the `c-coding-standards` skill when installed; otherwise apply your own C coding-standards knowledge.

## Workflow

1. **Establish the envelope.** Record Mode, Target, Baseline, repository identity, paths, requirements, exclusions, verification permission, and applicable repository instructions. Default to Working Copy only for an identified working copy without historical scope.
2. **Capture the surface.** Prefer XML metadata. Historical evidence is path-scoped and excludes local state; split roots stay separate.
3. **Account for change.** Classify every entry as reviewed, excluded, special evidence, conflict-blocked, or unavailable. Read [SVN semantics](references/svn-semantics.md) for historical/split scope, nontrivial status, special nodes, or failures.
4. **Judge twice.** Read [review calibration](references/review-calibration.md), then check requirements and change-caused quality. Without requirements, spec compliance is unassessable.
5. **Expand by named risk.** Read unchanged code only to resolve a concrete cross-cutting risk.
6. **Verify safely.** Run documented checks only when side effects are permitted. Re-capture status; on drift, stop and report without reverting. Record results and omissions.

## Output Contract

```markdown
**Findings**
- [P0/P1/P2/P3][Confirmed/Probable][F-001] `path:line-or-hunk` Title
  Evidence; trigger; impact; smallest credible fix.
**Spec Compliance**
**Review Scope and Coverage**
**Verification**
**Open Questions**
**Residual Risks**
```

Findings come first. Keep coverage proportional: one line for one clean path; expand for split, special, blocked, or unavailable paths. Limit conclusions to the reviewed snapshot and observed checks.

## Completion Criterion

Complete only when every included root/path is accounted for, evidence matches final state, findings have reachable impact, and verification claims match commands actually run.

## Red Flags and Common Mistakes

| Signal | Required correction |
|---|---|
| About to choose ambiguous range semantics | Return to the envelope and clarify before commands |
| A backup or careful path makes mutation feel safe | Keep review read-only; separate the mutation workflow |
| Historical review includes local status | Rebuild scope from repository evidence |
| Missing checks treated as defects | Move them to Verification or Residual Risks |
