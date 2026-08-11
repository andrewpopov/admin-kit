---
kind: fixed
summary: MembershipsPanel and SessionsPanel no longer show a previous scope's rows under a new scope's label
---

Swapping the `adapter` prop on `MembershipsPanel` or `SessionsPanel` now immediately clears the previous scope's rows, dialogs, and pending state instead of leaving them on screen next to the new scope's label and count while the new load is pending — or indefinitely, if it fails. The reset happens during render (React's "adjust state when props change" pattern) rather than in a `useEffect`, so it lands in the same commit as the adapter swap instead of one commit later, closing a window where a request from the old scope could still land its result after the new scope's label had already committed.

Both panels now guard every load and mutation with a monotonic scope epoch instead of comparing adapter identity, so a scope that goes A → B → back to the same A object no longer lets a call queued during the first A visit land during the second. Every state write that follows an `await` — including the confirmation dialogs closing and the load-error banner — is checked against the current epoch before it lands, and a `reload` callback retained by host code past a scope change is now a no-op instead of corrupting the current scope's pending load or its error state.
