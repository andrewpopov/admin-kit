import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AdminConfirmationDialog,
  AdminConsole,
  AdminPanelStateView,
  ApiKeysPanel,
  EventsPanel,
  FeatureFlagsPanel,
  UsersPanel,
} from '../react';

describe('AdminConsole', () => {
  it('renders controlled accessible tabs and only the active panel', () => {
    const html = renderToStaticMarkup(
      <AdminConsole
        activeSection="users"
        onSectionChange={() => undefined}
        sections={[
          { id: 'users', label: 'Users', render: () => <p>User content</p> },
          { id: 'flags', label: 'Feature flags', render: () => <p>Flag content</p> },
        ]}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('User content');
    expect(html).not.toContain('Flag content');
  });
});

describe('host styling seams', () => {
  it('preserves a host class on every shared panel and portaled dialog', () => {
    const html = renderToStaticMarkup(
      <>
        <UsersPanel className="host-users" adapter={{ list: async () => ({ items: [], page: 1, pageSize: 25, total: 0 }) }} />
        <FeatureFlagsPanel className="host-flags" adapter={{ list: async () => ({ flags: [], storeHealth: 'healthy' }) }} />
        <EventsPanel className="host-events" adapter={{ list: async () => ({ items: [], page: 1, pageSize: 25, total: 0 }) }} />
        <ApiKeysPanel className="host-keys" adapter={{ list: async () => [], create: async () => ({ secret: 'secret', key: { id: 'key', name: 'Key', maskedKey: '…', scopes: [], state: 'active', createdAt: '2026-01-01T00:00:00Z' } }), revoke: async () => undefined }} />
        <AdminConfirmationDialog className="host-dialog" confirmLabel="Confirm" description="Description" onCancel={() => undefined} onConfirm={() => undefined} open title="Title" />
      </>,
    );

    expect(html).toContain('host-users');
    expect(html).toContain('host-flags');
    expect(html).toContain('host-events');
    expect(html).toContain('host-keys');
    expect(html).toContain('host-dialog');
  });
});

describe('AdminPanelStateView', () => {
  it('renders failures as an assertive accessible state', () => {
    const html = renderToStaticMarkup(
      <AdminPanelStateView state={{ kind: 'error', detail: 'Service unavailable' }} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Service unavailable');
  });
});
