## 2024-04-03 - O(1) Lookups in React List Renders
**Learning:** Performing O(N) array `.find()` operations inside a React component's render loop (such as rendering lists) can quickly degrade performance, especially as datasets grow. The Dashboard component suffered from this when resolving agent names. In addition, sorting arrays synchronously during the render cycle causes unnecessary re-computations and main thread blocking on every re-render.
**Action:** Always utilize `useMemo` for any list sorting/filtering operations. Pre-compute O(1) lookup maps (like `agentMap`) via `useMemo` at the component root, and use those maps for resolving relationships when rendering lists, rather than repeatedly searching arrays.

## 2024-04-09 - Replace useDeferredValue with time-based debounce for network calls
**Learning:** React's `useDeferredValue` is not a replacement for a time-based debounce when it comes to API calls. It's intended to defer UI rendering updates, but on fast keystrokes, it will still trigger the underlying effect and therefore the network request near-immediately.
**Action:** When debouncing network or API calls in React components based on fast-changing user input, always use a time-based `useDebounce` hook rather than `useDeferredValue`.
