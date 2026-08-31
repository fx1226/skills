# Safety and Portability

Read this reference for code that handles memory, integers, external data, serialization, resources, concurrency, signals/interrupts, hardware, or multiple targets.

## Trust boundaries and contracts

Treat command-line data, environment state, files, sockets, IPC, device input, packets, persistent storage, foreign-function calls, plugin callbacks, and values produced by another privilege or trust domain as untrusted.

Validate at the boundary before the value influences allocation, indexing, pointer arithmetic, control flow, resource selection, or formatting. Validation should cover the dimensions the operation actually relies on:

- presence and nullability;
- encoded and decoded length, capacity, and unit;
- numeric range and representability;
- enumeration/tag validity;
- required termination and character encoding;
- alignment and object representation;
- aliasing or overlap permission;
- ownership and lifetime;
- state-machine and authorization context.

Avoid redundant checks in every internal helper. Once a boundary establishes an invariant, encode it in a narrow internal interface and preserve it. Revalidate when data crosses another trust boundary or can be modified by concurrent or external actors.

## Integer operations

### Addition and multiplication

Check before arithmetic. The examples below assume validated `size_t` inputs and `size_t` destinations; use the limits and domain of the real destination type:

```c
if (right > SIZE_MAX - left) {
    return ERR_RANGE;
}
sum = left + right;

if ((count != 0U) && (item_size > SIZE_MAX / count)) {
    return ERR_RANGE;
}
bytes = count * item_size;
```

Use limits for the real destination type. For signed values, account for both positive and negative ranges; do not compute the overflowing intermediate as part of the check. Compiler overflow builtins may be used only when the compiler profile permits them and the wrapper makes portability explicit.

### Conversions

Validate values before narrowing or changing signedness:

```c
if ((value < 0) || ((uintmax_t)value > UINT16_MAX)) {
    return ERR_RANGE;
}
wire_value = (uint16_t)value;
```

The exact comparison must be valid for the source type; do not introduce a signed/unsigned conversion inside the guard. Use static assertions for compile-time ABI assumptions and run-time checks for external values.

### Shifts and masks

Integer promotions can make an apparently unsigned small operand operate as signed `int`. Cast or choose the operand type before shifting, not only after. Verify the shift count against the width of the promoted/selected type. A signed left operand must be nonnegative and the shifted result representable; otherwise use an intentionally sized unsigned type. Define whether right shift of negative values is forbidden or depends on a documented implementation.

Use unsigned constants of the intended width for masks. Avoid assigning protocol bit fields directly to C bit-fields when wire layout matters; C bit-field ordering and allocation are implementation-defined.

## Arrays and memory regions

Prefer half-open ranges `[begin, end)` or `(pointer, length)` contracts. For any range operation, separately establish:

1. the base designates a live object or a permitted zero-length sentinel;
2. the offset is within the object;
3. the length fits after the offset without overflow;
4. the destination has enough capacity;
5. source and destination overlap is either forbidden for `memcpy` or deliberately supported with `memmove`;
6. element-size multiplication is representable.

Do not transform `offset + length <= capacity` into a check that can overflow. Prefer `offset <= capacity && length <= capacity - offset` after type domains are aligned.

For flexible array members, allocation must include the header and payload with checked arithmetic, and access must remain within the allocated complete object. Variable length arrays are profile decisions: they can create unbounded stack usage and have changed optionality across C editions.

## Strings and text

A pointer is not proof of a C string. Before `strlen` or another unbounded scan, establish that a terminator exists in the accessible region. For untrusted bounded input, scan within the supplied bound or operate as bytes until validation succeeds.

When producing a C string:

- capacity zero permits no write;
- content length must be strictly less than capacity when a terminator is required;
- define whether truncation is rejected, reported, or intentionally accepted;
- keep byte count, character count, and code-point count distinct;
- check locale/encoding assumptions before character classification or case conversion.

For `snprintf`-style APIs, a nonnegative return commonly represents the number of characters that would have been written, excluding the terminator. Treat a return greater than or equal to the destination size as truncation, while respecting the exact platform contract and integer conversion of the size/result.

For `<ctype.h>` classification and case-conversion functions, the argument must be `EOF` or a value representable as `unsigned char`. Convert a non-EOF byte through `unsigned char` before promotion; never pass a possibly negative plain or signed `char` directly.

Never pass untrusted text as the format argument. Use a controlled format such as `"%s"` and ensure its pointed-to value satisfies the required string contract. Match every conversion specifier to the promoted argument type.

## Object lifetime, allocation, and ownership

Model ownership in the interface:

- **borrowed**: valid only for a documented lifetime; callee does not release;
- **owned**: receiver must release with the paired operation;
- **transferred**: success and failure paths say exactly when ownership moves;
- **shared**: reference, synchronization, and final-release rules are explicit.

Prefer `sizeof *pointer` for allocation sizing because it follows the destination type. This illustrative policy treats a zero count as success with `*out_items == NULL`; assume `sample_item **out_items` is a validated output parameter:

```c
sample_item *items = NULL;

*out_items = NULL;
if (count == 0U) {
    return OK;
}
if (count > SIZE_MAX / sizeof *items) {
    return ERR_RANGE;
}

items = malloc(count * sizeof *items);
if (items == NULL) {
    return ERR_NOMEM;
}
*out_items = items;
return OK;
```

Another project may reject zero count or deliberately request a nonzero sentinel allocation. Choose and document one policy rather than depending on the implementation's `malloc(0)` result.

Never use an object after its lifetime ends, return a pointer to an automatic object, or retain a borrowed pointer past its owner. `realloc` needs a temporary result and an explicit zero-size policy; on ordinary failure, the original allocation remains owned by the caller.

For secrets, ordinary `memset` may be optimized away when the bytes are no longer observably used. Use a standard or platform-provided explicit erasure operation, or a reviewed project abstraction with verified compiler behavior. Test-only sanitizer runtimes are not production hardening.

## Aliasing, alignment, and representation

Do not cast arbitrary byte addresses to a more strictly aligned pointer and dereference them. Decode unaligned external data field by field or copy bytes into a properly aligned object when permitted, then apply byte-order conversion.

Do not use pointer casts to reinterpret unrelated object representations in violation of effective-type/aliasing rules. `memcpy` is often the portable representation-transfer tool, but padding, trap/indeterminate representations, and semantic validity still matter.

Use `_Static_assert` in C11/C17 or `static_assert` where supported by the selected edition to verify compile-time invariants such as widths and offsets. A static assertion documents one build target; it does not make raw structure serialization portable across targets.

## Errors and cleanup

Error handling must preserve the first meaningful failure and release everything acquired so far. Initialize handles to known invalid states, acquire in a documented order, and clean up in reverse order.

```c
int result = ERR_IO;
resource_t *resource = NULL;
FILE *stream = NULL;

resource = resource_open();
if (resource == NULL) {
    return ERR_RESOURCE;
}

stream = fopen(path, "rb");
if (stream == NULL) {
    goto cleanup;
}

result = consume(resource, stream);

cleanup:
if (stream != NULL) {
    (void)fclose(stream);
}
resource_close(resource);
return result;
```

Adapt the example to the API: some close/unlock operations can themselves fail and need policy. Casting a result to `void` is acceptable only when intentionally ignoring it is allowed and the reason is evident or documented.

Avoid global error state when a return/result object can carry the information. When using `errno`, follow the called API's contract: set or inspect it only when the API says it is meaningful, and preserve it if cleanup calls can overwrite it.

## Macros and preprocessing

Parentheses solve precedence, not repeated evaluation:

```c
#define MAX_VALUE(a, b) (((a) > (b)) ? (a) : (b))
```

`MAX_VALUE(index++, limit)` can modify `index` more than once. Prefer a type-specific `static inline` function, or evaluate arguments into well-typed temporaries at the call site. Do not introduce GNU statement expressions or `typeof` under a strict ISO C profile.

For a necessary multi-statement macro, use the project's conventional single-statement wrapper and prohibit control-flow surprises. Avoid `#` and `##` unless token/string generation is the actual requirement and inputs are constrained.

## Concurrency, atomics, signals, and interrupts

Any conflicting unsynchronized accesses to shared state can be a data race. Select one synchronization model and use it consistently:

- locks for compound invariants and ownership transfer;
- C atomics for operations the target implements with the required semantics;
- platform primitives or critical sections for freestanding/ISR interaction;
- immutable snapshots or message passing when they simplify ownership.

Use relaxed atomic ordering only with a written invariant that proves ordering is unnecessary. Do not mix atomic and ordinary accesses to the same shared object. Document lock order and make every failure path release held locks.

Do not assume that declaring an object `_Atomic` makes its operations safe in a signal handler or ISR. Require target evidence that the exact atomic type and operation are lock-free and permitted in that asynchronous context; otherwise use the platform's documented signal/ISR primitive or critical-section protocol.

`volatile sig_atomic_t` has a narrow signal-related role; it does not make general multi-threaded state safe. In POSIX signal handlers, call only operations the applicable POSIX edition defines as async-signal-safe. In an ISR, use the compiler/ABI's supported declaration mechanism, keep work bounded, and avoid blocking or non-reentrant services.

## Hardware and embedded behavior

Memory-mapped I/O requires target documentation for width, alignment, access ordering, and side effects. `volatile` may force individual accesses but does not necessarily provide the device barriers or atomic read-modify-write operations the hardware requires. Use platform barrier/accessor abstractions when available.

Do not assume a C struct overlays a register block correctly without documented layout guarantees and assertions. Beware read-to-clear, write-one-to-clear, reserved bits, torn accesses, and compiler-generated read-modify-write sequences.

Resource budgets—stack, heap, interrupt latency, code size, and execution time—are profile requirements. Verify them with target-specific evidence rather than universal percentages or arbitrary function-size limits.

## Security review checklist

For security-sensitive code, explicitly inspect:

- length and integer calculations before allocation or access;
- all buffer termination, truncation, and overlap behavior;
- format strings and variadic argument types;
- lifetime, double release, use after free, and cleanup on partial failure;
- parser state transitions and fail-open/fail-closed policy;
- authentication/authorization before effectful operations;
- filesystem path, environment, locale, and race assumptions;
- concurrency ownership and synchronization;
- sensitive-data exposure in logs and errors;
- compiler/platform assumptions that differ between test and target.
