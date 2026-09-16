# Profile Overlays

Select only the overlays supported by project evidence. An overlay adds or refines rules; it does not erase the core safety baseline.

## Hosted ISO C

Use for ordinary applications and libraries that rely on the hosted implementation.

- Confirm the chosen language edition and actual library surface; do not assume every optional feature is implemented.
- Dynamic allocation, recursion, floating point, unions, signals, and standard I/O are permitted only when their contracts fit the application. They are not universally banned.
- Public libraries should avoid terminating the process for recoverable caller errors. Return a documented status and leave outputs defined.
- Keep platform extensions behind narrow adapters and provide a supported fallback or an explicit platform requirement.

## POSIX

Apply only when the build and target declare a POSIX environment.

- Record the targeted POSIX edition and feature-test macros. Set them in maintained build/header policy before system headers, not ad hoc in random source files.
- Follow POSIX namespace reservations when naming public typedefs, functions, and macros.
- Treat short reads/writes, interruption, partial progress, descriptor exhaustion, and concurrent filesystem changes as normal outcomes where the API permits them.
- Define file-descriptor ownership across `fork`, `exec`, threads, and error paths. Use close-on-exec facilities according to the race model.
- Signal handlers may call only functions defined as async-signal-safe by the applicable POSIX edition. Prefer a minimal notification mechanism and perform real work in normal control flow.
- For threads, use pthread synchronization consistently or a documented C-atomics bridge; do not mix models without a proven contract.

## Windows and Microsoft CRT

Apply when the actual target is Windows or a Microsoft CRT implementation; do not infer this from a generic C task.

- Verify the selected compiler's C language mode and supported library features. Do not introduce C++ templates or overloads into C source merely because a Microsoft documentation page covers both languages.
- Respect the target data model: 64-bit Windows commonly uses LLP64, so `long` is not a pointer-sized storage type. Use the actual API types and checked conversions for handles, sizes, and lengths.
- A buffer size must describe the real accessible destination, in the unit required by the API. Byte counts and wide-character counts are not interchangeable.
- Microsoft `_s` APIs have their own return, truncation, and invalid-parameter-handler contracts. Use them when the target/project adopts them, not as a universal portability rule. Do not assume Microsoft's interfaces and ISO C Annex K are interchangeable or available on all toolchains.
- Defining `_CRT_SECURE_NO_WARNINGS` suppresses diagnostics; it does not correct a buffer defect. A deliberate compatibility suppression needs a separately justified safe implementation.
- Distinguish CRT descriptors, Win32 handles, and allocated memory; pair each with its documented release operation. Use the exact API's error channel (`errno`, a return code, or `GetLastError`) rather than a generic failure test.

## Freestanding and embedded

Use for microcontrollers, boot code, firmware, DSPs, RTOS components, and other implementations where hosted facilities may be absent.

- Confirm which headers, library functions, integer types, atomics, and language features the compiler actually provides.
- Do not introduce heap allocation, recursion, variable-length arrays, floating point, or unbounded work when the project prohibits them. These are profile constraints, not universal C rules.
- Analyze maximum stack use, static storage, execution time, interrupt latency, and code size with target tools or bounded reasoning.
- For MMIO and ISR sharing, apply the [hardware](safety-and-portability.md#hardware-and-embedded-behavior) and [asynchronous-operation](safety-and-portability.md#concurrency-atomics-signals-and-interrupts) rules using target documentation. Choose a supported ISR/main-loop ownership model and account for its interrupt-latency cost.
- Handle watchdog, reset, brownout, persistent-state, and partial-initialization behavior according to the system safety design.

## Linux kernel

Use only for in-tree or explicitly kernel-style code.

- The kernel tree's current documentation, maintainer rules, supported compiler dialect, APIs, types, allocation flags, annotations, and checks are authoritative.
- Follow the kernel formatter/style, including its indentation and naming, rather than this skill's fallback style.
- Do not use libc, a hosted `main`, userspace synchronization, or ordinary userspace allocation/error assumptions.
- Use kernel helpers for allocation overflow, user-memory access, reference counting, endian conversion, locking, and cleanup.
- Respect context constraints: sleepable vs atomic context, IRQ state, RCU lifetime, locking order, and ownership annotations.
- Use the tree's configured checks such as compiler diagnostics, sparse, Coccinelle, KUnit, and relevant sanitizers when available.
- Kernel conventions are not universal. Do not copy 8-column tabs, kernel typedefs, GNU extensions, or kernel APIs into unrelated hosted projects.

## Safety-critical or high-assurance

Activate only when the project names an applicable standard, edition, integrity level, assurance plan, or equivalent controlled profile.

- Obtain or identify the exact licensed/authoritative rule set, project classification, tool configuration, and deviation process.
- Maintain a traceable rule map, enforcement method, reviewed deviations, generated/third-party treatment, and verification evidence.
- Restrict features such as dynamic allocation, recursion, unions, function pointers, variadic functions, floating point, or multiple exits only when the selected profile requires it and the restriction has a system rationale.
- Define safe/fail-secure states, watchdog/timeout behavior, redundancy, data-integrity checks, and invalid-state handling from the hazard or threat analysis—not from a generic naming guide.
- Analyze stack/resource bounds, worst-case timing, unreachable or hard-to-reach hazardous branches, and fault injection at the system level.
- Redundancy, diversity, integrity codes, replicated storage, and temporal-freshness controls are architectural safety measures, not generic coding defaults. Select and justify them through the system hazard analysis and applicable domain standards; do not add them merely because this skill lists them.
- Bound the final claim using [Assurance claims](verification.md#assurance-claims).
- Do not reproduce proprietary standards text without the required license. Paraphrase only independently supportable engineering principles.

## Security-sensitive parsers and protocol code

This overlay can combine with any environment.

- Parse from `(buffer, length)` without assuming termination.
- Reject noncanonical, contradictory, truncated, oversized, or trailing data according to a documented protocol policy.
- Separate syntax validation from semantic/authorization decisions. A failed parse must not expose a partially trusted object as valid.
- Bound loops, recursion, allocation, decompression ratios, and diagnostic output to resist denial of service.
- Fuzz supported host-side parser builds with sanitizers, then verify target-specific behavior separately.

## Legacy C

Use when the project intentionally targets C90/C99 or an older vendor compiler.

- Preserve the declared dialect; do not upgrade syntax to make a local edit convenient.
- Use project-compatible substitutes for unavailable language/library features and document limitations.
- Distinguish a legacy portability constraint from obsolete local habit. Narrow-scope declarations, standard prototypes, and checked arithmetic remain goals within the supported dialect.
- Do not import C23 semantics or remove compatibility workarounds without verifying every supported compiler and target.
- Modernize incrementally behind tests and stable interfaces rather than with a broad rewrite.

## Third-party and generated code

This section owns the external/generated editing policy for all task modes.

- Treat external source as a separate policy domain. Preserve its style and keep downstream patches narrow and upstreamable; direct changes require authorization.
- Change generated behavior or layout in the generator/template, then regenerate using the documented toolchain rather than hand-editing outputs.
- Report external vulnerabilities even when edits are out of scope. For authorized remediation, prefer an upstream update, vendor patch, wrapper, sandbox, feature disablement, or documented narrow fix.
- State exclusions and residual risk; claims cover the inspected scope, not silently omitted files.
