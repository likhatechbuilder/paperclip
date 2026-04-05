## 2024-05-24 - React.memo on List Row Components
**Learning:** In list views that render many items (like `Agents` or `MyIssues`), parent components re-render frequently due to selection changes or filtering. Shallow comparisons of React node props in list items can defeat `React.memo` if parent passes inline JSX.
**Action:** When applying `React.memo` to row components, ensure parent props are also stable or accept that `memo` primarily saves on deeper tree rendering.
