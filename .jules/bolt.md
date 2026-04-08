## 2024-04-07 - Add useDebounce optimization to CommandPalette
**Learning:** CommandPalette was triggering API calls on every keystroke (`searchQuery` length > 0) when searching for issues. Unnecessary network calls block performance on frequent keystrokes.
**Action:** Created `useDebounce` hook to wrap the `searchQuery` and applied it to the `useQuery` hook for `searchedIssues`, resulting in fewer backend requests and better perceived responsiveness. Wait 300ms before triggering the search.
