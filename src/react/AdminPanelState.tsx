import type { ReactNode } from 'react';

export type AdminPanelState =
  | { kind: 'ready'; children: ReactNode }
  | { kind: 'loading'; label?: string }
  | { kind: 'empty'; title: string; detail?: string }
  | { kind: 'error'; title?: string; detail: string; onRetry?: () => void };

/** Accessible, framework-style-neutral state surface for adapter-backed panels. */
export function AdminPanelStateView({ state }: { state: AdminPanelState }) {
  if (state.kind === 'ready') return <>{state.children}</>;

  if (state.kind === 'loading') {
    return <p aria-live="polite" className="admin-kit__state">{state.label ?? 'Loading…'}</p>;
  }

  if (state.kind === 'empty') {
    return (
      <div className="admin-kit__state" role="status">
        <strong>{state.title}</strong>
        {state.detail ? <p>{state.detail}</p> : null}
      </div>
    );
  }

  return (
    <div className="admin-kit__state admin-kit__state--error" role="alert">
      <strong>{state.title ?? 'Unable to load this section'}</strong>
      <p>{state.detail}</p>
      {state.onRetry ? <button type="button" onClick={state.onRetry}>Try again</button> : null}
    </div>
  );
}
