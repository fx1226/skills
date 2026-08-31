# Core C Rules

Read this reference for every writing, modification, or review task.

## Rule levels

- **Required**: a language, safety, security, or explicit project constraint. Deviate only with a documented, reviewed reason and compensating evidence.
- **Recommended**: the default when no stronger project evidence applies. A consistent local alternative is acceptable.
- **Profile-specific**: required only after the relevant environment or assurance profile is selected.

Rule IDs are stable review labels for this skill. They are not ISO, CERT, or MISRA identifiers and do not establish external compliance.

## Environment and authority

### ENV-01 — Select the actual language and execution profile (Required)

Use the project's declared C edition, compiler mode, extensions, target ABI, and hosted/freestanding environment. Do not introduce a newer feature, GNU extension, hosted API, or host assumption merely because the local compiler accepts it. Prefer an explicit language mode in maintained build configuration.

### ENV-02 — Let project evidence override fallback style (Required)

Follow applicable repository instructions, formatter configuration, public compatibility policy, and target constraints. Report a conflict when a local rule would cause undefined behavior, violate the chosen language mode, or weaken a required safety property.

### ENV-03 — Expose nonportable assumptions (Required)

Document and test material implementation-defined, unspecified, or ABI-dependent behavior: integer widths, plain `char` signedness, byte order, alignment, padding, bit-field layout, floating-point model, calling convention, object representation, and compiler extensions. Isolate such assumptions behind a narrow boundary.

### ENV-04 — Keep ownership boundaries intact (Required)

Identify generated and vendored code before edits. Change the generator/template for generated behavior. Prefer a wrapper, configuration change, upstream update, or documented narrow patch for third-party code; do not mass-normalize it into a local style.

## Interfaces, declarations, and linkage

### API-01 — Make interfaces type-correct and visible (Required)

Use prototypes with compatible declarations and definitions. Public declarations belong in self-contained headers included by both callers and implementations. In C17 and earlier, declare a no-argument function with `(void)`, not an unspecified parameter list. Do not duplicate `extern` declarations ad hoc in consumers.

### API-02 — State the complete contract (Required)

For each nontrivial interface, establish valid inputs, ranges, units, lengths/capacities, termination, alias/overlap policy, ownership transfer, lifetime, output state on failure, error semantics, reentrancy, and synchronization. Encode the contract in types and structure where practical; comment only the parts the signature cannot express.

### API-03 — Minimize linkage and namespace exposure (Required)

Give file-private functions and objects internal linkage with `static`. Export only deliberate interfaces. Prefix public identifiers when the project needs collision resistance; do not add prefixes to every local name without a project convention.

### API-04 — Keep headers safe to include (Required)

Headers must compile in a representative translation unit without relying on include order. Use a project-safe include guard or supported `#pragma once`; never create reserved identifiers such as names beginning with `__`, `_` followed by an uppercase letter, or any leading-underscore name at file scope. Avoid storage definitions and hidden side effects in ordinary public headers.

## Declarations, types, and representations

### DCL-01 — Initialize before use and keep scope narrow (Required)

No execution path may read an indeterminate value. Initialize to a semantically valid state, not merely zero when zero is invalid. Declare an object in the narrowest scope that preserves clarity and lifetime requirements. Do not move large locals to `static` solely to save stack: that changes sharing, reentrancy, and thread safety.

### DCL-02 — Use qualifiers for their real semantics (Required)

Use `const` for data that an interface does not modify. Use `volatile` for implementation-defined hardware access or the narrow cases required by the language/platform contract; it is not atomicity, mutual exclusion, a general memory barrier, or a thread-safety mechanism. Do not cast away qualifiers to modify an object.

### TYPE-01 — Choose types by domain (Required)

Use `size_t` for object sizes and counts accepted by `sizeof`-based APIs, and `ptrdiff_t` for pointer differences. Use fixed-width integer types when an exact width is part of the domain, algorithm, wire/file format, register, or ABI, and validate availability and relevant layout. Do not create aliases that imply widths the implementation does not guarantee.

### TYPE-02 — Validate before conversion (Required)

Before narrowing, changing signedness, converting between integer and floating-point domains, or converting a pointer representation, prove the source value is representable and the operation is permitted. An explicit cast documents a decision; it does not make an invalid conversion safe.

### TYPE-03 — Treat layout as a contract (Required)

Do not serialize, hash, compare, or transmit raw structs unless representation, padding, byte order, alignment, and versioning are explicitly controlled. Prefer field-wise encoding/decoding. Do not reorder fields in ABI-, protocol-, persistent-, or hardware-controlled layouts merely to reduce padding.

## Expressions and arithmetic

### EXP-01 — Do not rely on undefined behavior (Required)

Prevent out-of-bounds access, invalid or misaligned dereference, use after lifetime, uninitialized read, signed overflow, division by zero, invalid shifts, incompatible variadic arguments, strict-aliasing violations, modification of string literals, unsequenced conflicting side effects, and data races. Treat compiler optimization as allowed to exploit the language rules.

### EXP-02 — Make evaluation and intent explicit (Required)

Keep side effects separate from complex expressions. Do not depend on operand or argument evaluation order. Use parentheses when mixed operators obscure intent, while recognizing that parentheses do not change sequencing or prevent repeated macro evaluation.

### INT-01 — Check arithmetic before performing it (Required)

Validate addition, subtraction, multiplication, negation, shifts, and allocation-size calculations before the potentially overflowing operation. Compare against a limit transformed into the operand's domain; do not detect signed overflow after it has occurred. Use unsigned wraparound only when modular arithmetic is the explicit, documented design.

### INT-02 — Control signed/unsigned interactions (Required)

Avoid implicit conversions that change the value domain or turn negative values into large unsigned values. Align operand types deliberately and verify ranges at the boundary. Do not silence conversion diagnostics with unchecked casts.

### BIT-01 — Constrain bit operations (Required)

Prefer unsigned operands for masks and shifts. Prove every shift count is within `[0, width - 1]` and the promoted left operand has the intended width. For signed left shift, the left operand must be nonnegative and the result representable; otherwise use an intentionally sized unsigned domain. Use named masks and document register/protocol bit numbering.

### FLP-01 — Define floating-point expectations (Required when floating point is used)

State accepted NaN, infinity, rounding, precision, and comparison behavior. Do not use exact equality when the domain requires tolerance, but do use exact comparison when values are deliberately discrete and exactly representable. Validate before converting floating point to integer.

## Pointers, arrays, strings, and resources

### PTR-01 — Prove pointer validity for each access (Required)

Establish non-nullness when required, alignment, pointee type, object lifetime, available extent, and permitted aliasing before dereference. Pointer arithmetic and relational comparison must stay within the language-permitted object/array relationship.

### ARR-01 — Carry bounds with buffers (Required)

Buffer interfaces must carry a length or capacity with a documented unit. Validate indices and ranges before access, including zero-length cases and `offset + length` overflow. Never use `sizeof` on a decayed array parameter to infer the caller's element count.

### STR-01 — Make termination and formatting explicit (Required)

Establish a maximum accessible length before scanning untrusted text. Reserve space for the terminator when producing a C string and define whether truncation is an error. Do not treat `strncpy`/`strncat` as universally safe replacements or assume nonstandard `strlcpy`/`strlcat` are portable. Format strings must be trusted literals or otherwise controlled, with argument types matching the format.

### MEM-01 — Give every allocation one clear owner (Required)

Check `count * sizeof *ptr` before allocation, check the result, pair compatible allocators/deallocators, and define transfer semantics. Every path releases each owned resource exactly once. Assigning one pointer variable `NULL` after `free` may prevent reuse through that variable but does not repair dangling aliases.

### RES-01 — Model partial initialization and cleanup (Required)

Acquire resources in a known order and make cleanup safe after any partial failure. A forward-only `goto cleanup` chain is acceptable when it makes exactly-once release clearer; arbitrary jumps and cycles are not. Apply the same ownership discipline to files, handles, locks, mappings, and device resources.

## Control flow, errors, and concurrency

### CTL-01 — Keep control flow reviewable (Required)

Use braces for controlled statements, including single statements, unless an established project profile explicitly requires otherwise and ambiguity cannot result. Prefer shallow, direct control flow and small cohesive functions. Complexity thresholds are project metrics, not universal line-count laws.

### CTL-02 — Make every switch outcome deliberate (Required)

Handle valid values and define the invalid-value strategy. Mark intentional fallthrough using the project's supported annotation or an unambiguous comment. Do not insert a silent `default` that hides a newly added enumerator when exhaustive handling is required.

### ERR-01 — Follow each API's failure contract (Required)

Check results that can fail or carry status, including allocation, I/O, parsing, conversion, synchronization, and bounded formatting. Interpret results exactly as documented: for example, a bounded formatting function may report the length that would have been produced rather than bytes stored. Do not invent generic success tests for APIs with different conventions.

### ERR-02 — Leave outputs and state defined on failure (Required)

Choose and document one of: no observable change, a valid partial result, or an explicitly invalidated result. Propagate useful error context without exposing secrets, losing the primary failure, or leaking resources.

### CON-01 — Synchronize shared state with a real mechanism (Required when concurrency exists)

Use the project's locks, C atomics, interrupt masking, or another documented synchronization primitive. Record ownership, lock order, atomic/non-atomic access discipline, and memory-order rationale. `volatile` alone does not prevent a data race. Signal handlers and ISRs may use only operations guaranteed safe by the selected platform contract and must respect latency constraints.

## Preprocessor, documentation, and verification

### PRE-01 — Prefer language constructs to function-like macros (Recommended)

Prefer functions, `static inline`, enums, and typed constants when they provide the needed behavior. Use a macro when preprocessing, type-generic syntax, constant-expression requirements, or conditional compilation genuinely requires it.

### PRE-02 — Make necessary macros single-evaluation and statement-safe (Required)

Parenthesize expression parameters and the complete result. A newly written value-like macro must not evaluate an argument more than once; prefer a type-specific inline function when single evaluation is impractical. When maintaining an unavoidable legacy/restricted macro that repeats an argument, document the limitation and forbid side-effecting arguments. Wrap a multi-statement macro as one syntactic statement without hiding `return`, `break`, `continue`, or `goto` from the caller.

### PRE-03 — Keep conditional compilation coherent (Required)

Each supported configuration must remain syntactically valid, type-correct, and tested. Keep paired directives in one file, explain non-obvious feature gates, and avoid redefining reserved library names or globally suppressing diagnostics.

### DOC-01 — Document intent and contracts, not syntax (Recommended)

Explain why, invariants, units, ownership, concurrency, hardware effects, error behavior, and surprising constraints. Keep comments adjacent and synchronized. Do not use comment percentage, boilerplate headers, or restated code as a quality proxy.

### VER-01 — Use complementary evidence and report limits (Required)

Compile in the selected language mode, run relevant tests, preserve meaningful diagnostics, and use static/dynamic analysis where supported. No single tool proves correctness. Report exact commands and observed results; identify unavailable target builds, hardware tests, analyzers, coverage, or licensed compliance evidence.
