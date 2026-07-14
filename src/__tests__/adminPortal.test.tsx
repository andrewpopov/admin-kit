// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminPortal } from '../react';
import type { AdminPortalProps } from '../react';

afterEach(cleanup);

const groups = [
  {
    id: 'core',
    label: 'Core administration',
    description: 'Shared operational controls',
    sections: [
      { id: 'users', label: 'Users', description: 'Manage accounts', render: () => <p>User content</p> },
      { id: 'security', label: 'Security', visible: false, render: () => <p>Security content</p> },
    ],
  },
  {
    id: 'application',
    label: 'Application',
    sections: [
      { id: 'catalog', label: 'Catalog', render: () => <p>Catalog content</p> },
      { id: 'integration', label: 'Integration', disabled: true, render: () => <p>Integration content</p> },
    ],
  },
] as const;

describe('AdminPortal', () => {
  it('renders visible grouped navigation and the controlled routed section', () => {
    render(
      <AdminPortal activeSection="catalog" groups={groups} onSectionChange={() => undefined} />,
    );

    expect(screen.getByRole('heading', { name: 'Core administration' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Application' })).toBeTruthy();
    expect(screen.queryByText('Security')).toBeNull();
    expect(screen.getByRole('button', { name: 'Catalog' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Catalog content')).toBeTruthy();
    expect(screen.queryByText('User content')).toBeNull();
  });

  it('offers controlled selection and prevents disabled navigation', () => {
    const onSectionChange = vi.fn();
    render(
      <AdminPortal activeSection="users" groups={groups} onSectionChange={onSectionChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Catalog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Integration' }));

    expect(onSectionChange).toHaveBeenCalledOnce();
    expect(onSectionChange).toHaveBeenCalledWith('catalog');
  });

  it('lets hosts render router links with package-owned navigation semantics', () => {
    const onSectionChange = vi.fn();
    render(
      <AdminPortal
        activeSection="users"
        groups={groups}
        onSectionChange={onSectionChange}
        renderNavigationItem={({
          section,
          className,
          ariaCurrent,
          ariaDisabled,
          tabIndex,
          onClick,
        }) => (
          <a
            aria-current={ariaCurrent}
            aria-disabled={ariaDisabled}
            className={className}
            href={`/admin/${section.id}`}
            onClick={(event) => {
              event.preventDefault();
              onClick(event);
            }}
            tabIndex={tabIndex}
          >
            {section.label}
          </a>
        )}
      />,
    );

    const catalog = screen.getByRole('link', { name: 'Catalog' });
    expect(catalog.getAttribute('href')).toBe('/admin/catalog');
    fireEvent.click(catalog);
    expect(onSectionChange).toHaveBeenCalledWith('catalog');

    const disabled = screen.getByRole('link', { name: 'Integration' });
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.getAttribute('tabindex')).toBe('-1');
    fireEvent.click(disabled);
    expect(onSectionChange).toHaveBeenCalledOnce();
  });

  it('renders an explicit empty state when capabilities hide every section', () => {
    render(
      <AdminPortal
        activeSection="users"
        groups={[{ ...groups[0], visible: false }]}
        emptyState={<p>No access</p>}
        onSectionChange={() => undefined}
      />,
    );

    expect(screen.getByText('No access')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('does not substitute another section when the active route is unavailable', () => {
    render(
      <AdminPortal
        activeSection="security"
        groups={groups}
        onSectionChange={() => undefined}
        inactiveSectionState={(sectionId) => <p>Unavailable: {sectionId}</p>}
      />,
    );

    expect(screen.getByText('Unavailable: security')).toBeTruthy();
    expect(screen.queryByText('User content')).toBeNull();
    expect(screen.queryByText('Catalog content')).toBeNull();
  });

  it('rejects inert default navigation from untyped consumers', () => {
    const invalid = { activeSection: 'users', groups } as unknown as AdminPortalProps;
    expect(() => AdminPortal(invalid)).toThrow(/needs onSectionChange/i);
  });
});
