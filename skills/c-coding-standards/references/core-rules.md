# Core C Rules

Baseline for implementation and correctness/security review. For API-contract prose, read **Interfaces**; format-only work uses the style reference instead. Rule IDs are stable labels within this skill, not external compliance identifiers.

## Rule levels

- **Required**: language, safety, or explicit project constraints. Language semantics and actual target/API contracts cannot be waived by approval. Discretionary project-policy exceptions need documented rationale and compensating evidence.
- **Recommended**: a default that yields to a consistent project convention.
- **Profile-specific**: applies only when the environment or assurance requirement is selected.

The rules below are **Required** unless marked otherwise. Examples and mechanisms live in the linked references; evaluate only rules relevant to the code or claims in scope.

## Environment

- **ENV-01 — Language profile.** Preserve the selected C edition, extensions, library surface, and execution environment; local compiler acceptance alone does not establish target support.
- **ENV-02 — Project conventions.** Project instructions and maintained configuration override fallback style, within the language and required safety contracts.
- **ENV-03 — Portability assumptions.** Isolate and substantiate material assumptions about widths, signedness, byte order, alignment, padding, bit-fields, floating point, and ABI.
- **ENV-04 — Ownership boundaries.** For external or generated code, follow [Third-party and generated code](profile-overlays.md#third-party-and-generated-code).

## Interfaces

- **API-01 — Declarations.** Use compatible prototypes and definitions. Put public declarations in self-contained headers included by implementation and callers; use `(void)` for no arguments in C17 and earlier.
- **API-02 — Contracts.** Establish applicable input ranges/units, lengths/capacities, termination, overlap, ownership/lifetime, failure outputs, errors, and synchronization. Express these through types where possible and document what the signature cannot convey.
- **API-03 — Linkage.** Give private functions/objects `static` linkage. Export only intentional interfaces and use the project's public namespace.
- **API-04 — Headers.** Make headers usable without incidental include order; avoid ordinary storage definitions and hidden effects. Use non-reserved include guards or project-supported `#pragma once`; see [header conventions](style-and-organization.md#include-guards).

## Declarations and types

- **DCL-01 — Initialization.** Every read needs a valid initialized value. Keep scope narrow within the dialect; replacing automatic storage with `static` changes sharing and reentrancy.
- **DCL-02 — Qualifiers.** Use `const` to express non-modification and preserve the underlying object's qualifiers. `volatile` serves target/language access contracts, not general synchronization.
- **TYPE-01 — Domain types.** Use `size_t` for object sizes, `ptrdiff_t` for pointer differences, and supported exact-width types when width is part of the contract. Avoid aliases that promise unsupported widths.
- **TYPE-02 — Conversions.** Establish representability and permission before narrowing, changing signedness, converting numeric domains, or converting pointer representations. Casts do not perform validation.
- **TYPE-03 — Layout.** Preserve externally controlled layouts. Serialize fields explicitly unless padding, representation, alignment, byte order, and versioning are controlled; raw struct comparison/hashing needs the same care.

## Expressions and arithmetic

For implementations and edge cases, read [integer operations](safety-and-portability.md#integer-operations) and the matching safety sections.

- **EXP-01 — Defined behavior.** Prevent invalid access/lifetime, indeterminate reads, signed overflow, division by zero, invalid shifts, aliasing violations, mismatched variadic arguments, string-literal modification, unsequenced conflicting effects, and data races.
- **EXP-02 — Evaluation.** Separate confusing side effects and avoid dependence on unspecified operand/argument order. Parentheses clarify grouping, not sequencing or macro evaluation count.
- **INT-01 — Checked arithmetic.** Establish safe ranges before potentially overflowing arithmetic, including allocation sizing. Use unsigned wrap only for explicitly intended modular arithmetic.
- **INT-02 — Signedness.** Control promotions and signed/unsigned comparisons; validate rather than silence conversion diagnostics with casts.
- **BIT-01 — Shifts.** Use an appropriate promoted unsigned domain for masks/shifts. Bound the count by that domain's width; signed left shift requires a nonnegative operand and representable result.
- **FLP-01 — Floating point.** When used, define relevant NaN/infinity, precision, rounding, and comparison expectations. Check range before integer conversion; choose exact or tolerant comparison according to the domain.

## Buffers and resources

Read the corresponding [safety sections](safety-and-portability.md) for the operations in scope.

- **PTR-01 — Valid access.** Establish lifetime, extent, alignment, type, aliasing, and non-nullness where required. Keep pointer arithmetic/comparison within language-permitted relationships.
- **ARR-01 — Bounds.** Carry lengths/capacities and their units. Validate indices, ranges, zero-length cases, and size arithmetic before access; a decayed array parameter has no recoverable element count via `sizeof`.
- **STR-01 — Text.** Bound untrusted scans, reserve termination space, define truncation/overlap behavior, and use controlled format strings with matching argument types. Choose APIs by contract, not a supposedly safe suffix.
- **MEM-01 — Ownership.** Check allocation sizing and results; make transfer/lifetime explicit and pair each owned allocation with its release. Setting one freed pointer to `NULL` does not repair aliases.
- **RES-01 — Cleanup.** Release resources exactly once on every ownership-ending path, including partial initialization. Structured forward cleanup labels are acceptable when they clarify release order.

## Control flow, errors, and concurrency

- **CTL-01 — Control flow.** Make branch binding, loop bodies, and exits unambiguous. Braces for single statements are a [Recommended fallback style](style-and-organization.md#fallback-style-when-the-project-has-none), not a universal safety requirement; complexity thresholds are project policy.
- **CTL-02 — Switches.** Handle the valid domain and invalid-value policy deliberately; mark intentional fallthrough. Preserve exhaustive-enum diagnostics rather than hiding missing handling behind a silent `default`.
- **ERR-01 — Results.** Check fallible/status-bearing operations according to each API's actual contract; bounded formatting, I/O, parsing, and synchronization have different success conventions.
- **ERR-02 — Failure state.** Define unchanged, valid-partial, or invalidated outputs on failure; retain useful context without leaks, secrets, or loss of the primary error.
- **CON-01 — Shared state.** When concurrency exists, establish ownership, synchronization, lock ordering, and permitted access contexts. Read [concurrency, atomics, signals, and interrupts](safety-and-portability.md#concurrency-atomics-signals-and-interrupts) for asynchronous-operation constraints.

## Preprocessor, documentation, and verification

- **PRE-01 — Abstractions (Recommended).** Prefer functions, `static inline`, enums, or typed constants when preprocessing is unnecessary.
- **PRE-02 — Macros.** Parenthesize value-expression arguments/results and make newly written value-like macros single-evaluation. Document unavoidable legacy repetition and exclude side-effecting arguments. Wrap multi-statement macros as one statement without hidden control transfers; see [macro examples](safety-and-portability.md#macros-and-preprocessing).
- **PRE-03 — Configurations.** Keep supported configurations syntactically valid and type-correct, paired directives in one file, and feature gates understandable. Preserve reserved names and diagnostics; select affected-configuration tests through the verification guidance.
- **DOC-01 — Comments (Recommended).** Document intent and contracts using [Comments and documentation](style-and-organization.md#comments-and-documentation), rather than restating syntax.
- **VER-01 — Evidence.** Use [Verification](verification.md) to select checks and bound claims; unavailable checks are gaps, not passes.
