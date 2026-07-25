# SVN Scope and Evidence

Read this for historical or split scope, nontrivial status, special nodes, or SVN failures.

## Modes

| Mode | Inputs | Baseline | Evidence | Exclude |
|---|---|---|---|---|
| Working Copy | Root/subtree | Per-node `BASE -> WORKING` | `svn info --xml`, `status --xml`, `diff` | Repository changes absent locally |
| Single Revision | Target and `R` | `R-1 -> R` | Target `diff -c R`; filtered `log -v -r R` context | Local state and unrelated paths in global rR |
| Revision Range | Target and `A:B` | Snapshot `A -> B` | Target `diff -r A:B`; `log -v -r A+1:B` context | Local state and intermediate changes absent from net diff |
| Split Workspace | Boundary and confirmed roots | Per child mode | Separate evidence per root | Parent assumptions and cross-repository revision comparisons |

`svn diff -c R` means `R-1:R`. `A:B` compares endpoints and excludes the change that created A. If the user means the inclusive commit set A through B, confirm before using `A-1:B`. Always pair global revisions with a target and repository identity.

The target diff defines the review surface. `svn log -v` may list sibling paths changed in the same global revision; filter them out of the ledger. For endpoint `A:B`, query log context from `A+1:B` when possible, or explicitly discard rA if the client returns it.

Use repository URL evidence when a dirty, switched, or mixed-revision working copy could distort historical scope. An empty diff requires checking target, peg revision, changed paths, and authorization before concluding no change.

## Identity and Boundary

For each working copy record root/subtree, URL, repository root/UUID, BASE distribution, switched or sparse nodes, externals, and whether remote out-of-date state was checked. Never update merely to refresh evidence.

Use explicit quoted targets and stay inside the user-provided workspace. If the parent is not a working copy, inspect explicitly named children rather than scanning broadly. A discovered external or nested checkout is a candidate boundary, not automatic scope; include it only when clearly requested or confirmed.

## Status Ledger

Prefer `svn status --xml --no-ignore --depth infinity TARGET`. Account for semantic fields, not only the first printed column.

| Signal | Meaning |
|---|---|
| `M/A/D/R` | Modified, added, deleted, or replaced node |
| text/property/tree conflict | Evidence is unstable; mark conflict-blocked |
| `!/~/?/I` | Missing, obstructed, unversioned, ignored; inspect with a relevance signal |
| copied/moved | Preserve ancestry; do not double-report delete plus add |
| switched/external | Confirm separate boundary and identity |
| property-only | Review behavior-changing properties without fake lines |
| locks | Distinguish working-copy and repository locks; mutate neither |

Every entry ends as Reviewed, Excluded with reason, Special Evidence, Conflict-Blocked, or Unavailable. Unversioned/ignored files are not automatically missing adds; establish relevance from imports, manifests, build configuration, tests, or requirements.

## Failure Handling

| Trigger | First response | Fallback |
|---|---|---|
| Not a working copy | Ask for root or repository URL | Report no established surface |
| Ambiguous target/range | Ask one question before range commands | Stop without guessing |
| Missing SVN, auth, or network | Preserve exact error; use available evidence only | Report incomplete repository verification; never use Git fallback |
| Truncated/large diff | Build changed-path ledger and review bounded chunks | Mark uninspected paths unavailable |
| Conflict | Separate status from intended code | Mark conflict-blocked; do not resolve |
| Property/directory/binary/symlink/copy/move/replacement | Use type-specific metadata and ancestry | State what could not be inspected |
| State drift | Discard old status/diff evidence and stop | Report; do not revert or merge time-separated evidence |
