## 2026-04-01 - Dialog Header Button ARIA Labels
**Learning:** Icon-only buttons used for dialog window controls (e.g. Expand/Collapse, Close) in custom dialog headers often lack accessible names by default, unlike native HTML <dialog> elements. This makes them invisible to screen readers, especially when they use dynamic icons (like Expand/Minimize toggles).
**Action:** Always verify that custom dialog header controls, such as X (Close) or Maximize/Minimize buttons, have explicit 'aria-label' attributes. For stateful toggles like Expand/Collapse, ensure the 'aria-label' dynamically reflects the action the button will perform (e.g. `aria-label={expanded ? "Collapse dialog" : "Expand dialog"}`).

## 2024-04-05 - Radix PopoverTrigger Accessibility
**Learning:** When using Radix UI components like `PopoverTrigger` with `asChild`, passing a non-interactive element like a `<span>` removes the element from the tab order and prevents screen readers from understanding it as an interactive element.
**Action:** Always wrap icons or non-interactive elements in a semantic `<button>` with an `aria-label` when they are acting as a `PopoverTrigger` to preserve ref forwarding and accessibility.
