# Profile Overlays

Select only the overlays supported by project evidence. An overlay adds or refines rules; it does not erase the core safety baseline.

## Hosted ISO C

Use for ordinary applications and libraries that rely on the hosted implementation.

- Confirm the chosen language edition and actual library surface; do not assume every optional feature is implemented.
- Dynamic allocation, recursion, floating point, unions, signals, and standard I/O are permitted only when their contracts fit the application. They are not universally banned.
- Treat command-line arguments, environment variables, files, locale, and external I/O as trust boundaries.
- Public libraries should avoid terminating the process for recoverable caller errors. Return a documented status and leave outputs defined.
- Keep platform extensions behind narrow adapters and provide a supported fallback or an explicit platform requirement.

## POSIX

Apply only when the build and target declare a POSIX environment.

- Record the targeted POSIX edition and feature-test macros. Set them in maintained build/header policy before system headers, not ad hoc in random source files.
- Follow POSIX namespace reservations when naming public typedefs, functions, and macros.
- Treat short reads/writes, interruption, partial progress, descriptor exhaustion, and concurrent filesystem changes as normal outcomes where the API permits them.
- Use `errno` only after a function reports failure according to its contract; save it before cleanup if the original value matters.
- Define file-descriptor ownership across `fork`, `exec`, threads, and error paths. Use close-on-exec facilities according to the race model.
- Signal handlers may call only functions defined as async-signal-safe by the applicable POSIX edition. Prefer a minimal notification mechanism and perform real work in normal control flow.
- For threads, use pthread synchronization consistently or a documented C-atomics bridge; do not mix models without a proven contract.

## Freestanding and embedded

Use for microcontrollers, boot code, firmware, DSPs, RTOS components, and other implementations where hosted facilities may be absent.

- Confirm which headers, library functions, integer types, atomics, and language features the compiler actually provides.
- Make target ABI, endian, alignment, address-space, and integer-width assumptions explicit and statically checked where possible.
- Do not introduce heap allocation, recursion, variable-length arrays, floating point, or unbounded work when the project prohibits them. These are profile constraints, not universal C rules.
- Analyze maximum stack use, static storage, execution time, interrupt latency, and code size with target tools or bounded reasoning.
- Use platform MMIO accessors and barriers when available. `volatile` does not supply atomicity, inter-core ordering, or device-specific barriers.
- For ISR/main-loop or ISR/thread sharing, establish single-producer/single-consumer, critical-section, or atomic invariants supported by the target. Use an atomic operation asynchronously only when target documentation confirms that exact type/operation is lock-free and permitted in the ISR context. Keep ISR work bounded and nonblocking.
- Handle watchdog, reset, brownout, persistent-state, and partial-initialization behavior according to the system safety design.
- Keep wire/register layouts separate from ordinary in-memory structs unless the ABI and hardware manuals make the overlay contract explicit.

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
- Do not claim MISRA compliance, CERT conformance, ISO conformance, SIL, or certification from an ordinary code review or tool pass. State exactly what was checked and which assurance artifacts are missing.
- Do not reproduce proprietary standards text without the required license. Paraphrase only independently supportable engineering principles.

## Security-sensitive parsers and protocol code

This overlay can combine with any environment.

- Parse from `(buffer, length)` without assuming termination.
- Check every length, offset, count, and multiplication before advancing or allocating.
- Reject noncanonical, contradictory, truncated, oversized, or trailing data according to a documented protocol policy.
- Separate syntax validation from semantic/authorization decisions.
- Keep output unchanged or explicitly invalid on failure; never leave a partially trusted object appearing valid.
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

- Treat external source as a separate policy domain, not automatically as first-party conformance scope.
- Preserve local patch minimality and upstreamability.
- Fix generated behavior in the generator/template and regenerate with the documented toolchain.
- When a vulnerability exists in external code, do not ignore it because of ownership. Prefer an upstream update, vendor patch, wrapper, sandbox, feature disablement, or documented narrow fix.
- Report exclusions and residual risk explicitly; never claim full-tree conformance while silently omitting code.
