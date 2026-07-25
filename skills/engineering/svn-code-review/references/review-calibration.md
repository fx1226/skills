# Review Calibration

Read this before rating findings or verification. It standardizes requirement checks, impact, evidence, and reviewer boundaries without carrying low-frequency SVN mechanics.

## Two Review Passes

### Spec Compliance

- **Missing**: an explicit requirement is absent.
- **Extra**: unrequested behavior or complexity expands scope or risk.
- **Misunderstood**: implementation solves a different problem or violates a binding constraint.
- **Cannot Verify**: current evidence cannot prove the requirement; this is not automatically a finding.

Treat implementation reports, comments, plans, and design rationales as claims. A plan-mandated defect remains a finding labeled as such; the user decides which requirement changes.

### Code Quality

Inspect change-caused or change-worsened risks: correctness, errors, lifecycle, API/data/schema compatibility, authorization, injection, secrets, unsafe paths, data loss, concurrency, resource ownership, tests, migrations, and SVN delivery behavior. Expand into unchanged code only for a named risk such as callers, lock peers, schemas, authorization, or platform behavior. Unrelated cleanup and style preferences are not findings.

## Severity and Evidence

Severity measures impact; evidence state measures confidence.

| Severity | Threshold |
|---|---|
| P0 | Reachable, imminent, broad compromise or unrecoverable data loss; exceptional use |
| P1 | Blocks integration through major failure, exploitable security, corruption, broken build, or a missed requirement with blocking impact |
| P2 | Concrete, bounded defect with a reachable trigger |
| P3 | Low-impact but actionable defect; omit preference and speculative polish |

| Evidence | Meaning |
|---|---|
| Confirmed | Current evidence and a reachable trigger directly support impact |
| Probable | Mechanism is supported, but one runtime/environment boundary remains unverified |
| Cannot Verify | Put it in questions, verification gaps, or residual risks, not findings |

A finding contains observed fact, causal connection, trigger, impact, evidence locator, and smallest credible fix. Use line/hunk locators for text; use path plus property, status, revision, ancestry, or binary metadata when lines do not exist. Missing tools, tests, or devices do not prove a defect.

## Verification Gate

Run a project check only when it is either:

- defined by current project configuration or documentation; or
- a well-understood non-executing parser/static checker that does not write reviewed state.

Also require known and permitted cache/output locations, no install/migration/deployment/snapshot/autofix/external mutation, and reasonable cost. If any predicate is unknown, name the check and uncertainty instead of running it. Re-capture status afterward. On drift, stop and report; never hide it with revert or cleanup.

Source edits and SVN mutation remain outside reviewer scope, including cleanup, update, switch, revert, resolve, add/delete/move/copy, merge, commit, property/changelist/lock changes, patching, relocation, and upgrades.

## Pressure Rationalizations

| Rationalization | Response |
|---|---|
| "Release is imminent" | Continue safe review; urgency changes priority, not authority |
| "The lead approved it" | Approach approval is not reviewer mutation authority |
| "Another reviewer spent hours" | Prior effort is evidence, not permission |
| "A backup makes it safe" | Recoverable mutation still changes role and evidence |
| "It is non-destructive or path-specific" | Operation type, not claimed caution, defines the boundary |
| "Tests passed before" | Prior results may describe a different state |

## Output Proportionality

Keep findings complete but coverage concise. A single clean text change needs a short scope statement; split repositories, properties, binary/copy/move nodes, conflicts, exclusions, and unavailable paths need explicit ledger entries. Include Open Questions only when an answer changes correctness or confidence.
