import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminAppShell } from '../react';

describe('AdminAppShell', () => {
  it('renders route-owned navigation in desktop and dismissible mobile landmarks', () => {
    const renderNavigation = vi.fn(({ idPrefix, onNavigate }) => (
      <a href="/admin/users" id={`${idPrefix}-users`} onClick={(event) => { event.preventDefault(); onNavigate?.(); }}>Users</a>
    ));

    render(
      <AdminAppShell frame={{ title: 'Administration', description: 'Manage the service.' }} renderNavigation={renderNavigation}>
        <p>Users page</p>
      </AdminAppShell>,
    );

    expect(screen.getByRole('navigation', { name: 'Administration sections' })).toBeTruthy();
    expect(screen.getByRole('main').textContent).toContain('Users page');
    expect(renderNavigation).toHaveBeenCalledWith({ idPrefix: 'admin-kit-desktop' });

    fireEvent.click(screen.getByRole('button', { name: 'Browse administration' }));
    expect(screen.getAllByRole('navigation', { name: 'Administration sections' })).toHaveLength(2);
    fireEvent.click(screen.getByText('Users', { selector: '#admin-kit-mobile-users' }));
    expect(screen.getAllByRole('navigation', { name: 'Administration sections' })).toHaveLength(1);
  });
});
