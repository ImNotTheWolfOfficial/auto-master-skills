# Finding Categories

The scan checklist. Work through the categories relevant to the stack; note skipped categories and why in the report's Coverage section. Severity is always weighted by path temperature: waste on a hot path or in a long-lived process outranks the same waste in cold startup code.

## 1. Memory Leaks and Retention

- Listeners/subscriptions/observers added without a matching removal on teardown (event emitters, DOM listeners, signals, IPC channels, sockets).
- Timers and intervals never cleared; recurring tasks that outlive their owner.
- Caches and memoization without eviction or bounds; maps keyed by objects that should be weak references.
- Closures or globals capturing large structures long after use; growing arrays/logs never truncated.
- Unclosed resources: file handles, DB connections/cursors, streams, workers, child processes.
- Framework-specific: effects without cleanup, detached DOM trees kept via refs, stores accumulating dead entries, un-disposed native handles (GPU textures, canvases, wasm memory).

## 2. Rendering and Display

- Re-render storms: state updates fanning out wider than needed, missing memoization on expensive subtrees, unstable identities (new object/closure per render) defeating equality checks, context updates rerendering whole trees.
- Layout thrash: interleaved reads/writes of layout properties, forced synchronous layout in loops, animation of layout-affecting properties where transform/opacity would do.
- Long or unvirtualized lists; rendering off-screen content; work done every frame that could be done on change.
- Visual defects with a resource cause: flicker, jank, dropped frames, layout shift from late-loading content, unthrottled resize/scroll/mousemove handlers.
- Overdraw and oversized assets: images decoded far above display size, full-res assets where thumbnails suffice, effects (blur/shadow/filters) applied per-frame over large areas.

## 3. CPU and Algorithmic Waste

- Repeated recomputation of invariant values inside loops or per call — invariants that belong outside the loop, or results worth caching (bounded).
- Accidental O(n²): nested scans, `find`/`includes` inside loops where a set/map lookup fits, repeated sorting of already-sorted data.
- Sync work blocking an interactive thread (UI thread, event loop): parsing, crypto, compression, large JSON on the main thread.
- Polling where an event, watcher, or push mechanism exists; tight loops without backoff.
- Redundant serialization round-trips (parse→stringify→parse), needless deep copies of large structures, chained array passes (`map.filter.map`) over large data where one pass would do.
- Debounce/throttle missing on high-frequency inputs feeding expensive work.

## 4. I/O, Network, and Storage

- Duplicate fetches of the same resource per session/render; missing request de-duplication or caching where staleness is acceptable.
- N+1 query patterns; fetching full objects where a projection suffices; missing pagination on unbounded result sets.
- Chatty sequential requests that could batch or run concurrently; missing compression on large payloads.
- Re-reading unchanged files repeatedly; writes flushed more often than durability requires; unbounded growth of logs, temp files, or local storage.
- Retry logic without backoff/jitter hammering a failing endpoint.

## 5. Startup, Bundle, and Footprint

- Eagerly loading/initializing modules or subsystems used rarely or never — candidates for lazy/deferred loading.
- Bundle bloat: heavyweight dependencies used for one function, duplicate dependencies across chunks, dev-only code shipping to production, missing tree-shaking or code-splitting on clearly-splittable boundaries.
- Assets shipped unoptimized: uncompressed images/fonts, unused locales/icon sets.
- Work at startup that could be deferred until first use.

## 6. Concurrency and Scheduling

- Unbounded parallelism: spawning a task per item over unbounded input (promise floods, thread/worker-per-item) without a pool or semaphore.
- Serialized work that is safely parallel (independent awaits in sequence).
- Lock contention or shared-state churn on hot paths; work queued to run repeatedly when only the latest matters (missing coalescing).

## 7. Working-but-Fat Functions

For code that is correct but heavier than it needs to be:

- A leaner algorithm or data structure with the same observable behavior.
- Precomputation or caching of pure, repeated computation (bounded).
- Early exits: cheap checks before expensive work, short-circuiting on common cases.
- Doing work proportional to the change instead of recomputing from scratch (incremental updates, dirty flags).
- Rightsizing: allocating/processing at the size actually needed rather than a worst-case buffer.

Only report these when the win is real for the user (hot path, large data, or long-lived process) — micro-optimizations of cold code are noise and get listed, at most, as "not recommended".

## Rules

- Every finding names its category, the resource consumed (memory / CPU / GPU-render / network / disk / battery), and the mechanism.
- Confirm the mechanism in the code before reporting; a pattern match is a lead, not a finding.
- Note when the leaner alternative would change observable behavior (timing, ordering, cache staleness) — those route to a proposal, not a refactor.
