import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminConsole, AdminPanelStateView } from '../react';

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

describe('AdminPanelStateView', () => {
  it('renders failures as an assertive accessible state', () => {
    const html = renderToStaticMarkup(
      <AdminPanelStateView state={{ kind: 'error', detail: 'Service unavailable' }} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Service unavailable');
  });
});
