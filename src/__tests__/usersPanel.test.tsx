// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersPanel } from '../react';

afterEach(cleanup);

const users = [
  {
    id: 'u1',
    label: 'ada@example.test',
    secondaryLabel: 'Ada Lovelace',
    role: { value: 'owner', label: 'Owner' },
    status: { value: 'active', label: 'Active' },
    details: [
      { label: 'Created', value: 'Jul 10, 2026' },
      { label: 'Last login', value: 'Never' },
    ],
  },
];

describe('UsersPanel', () => {
  it('maps opt-in search to the adapter, resets pagination, and retains account facts', async () => {
    const list = vi.fn().mockImplementation(async ({ page, pageSize, search }) => ({
      items: users,
      page,
      pageSize,
      total: 51,
      search,
    }));
    render(
      <UsersPanel
        adapter={{ list }}
        pageSize={25}
        search={{ placeholder: 'Find an account' }}
      />,
    );

    await screen.findByText('Ada Lovelace');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('Jul 10, 2026')).toBeTruthy();
    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 2, pageSize: 25, search: undefined }));

    fireEvent.change(screen.getByPlaceholderText('Find an account'), { target: { value: 'ada' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, search: 'ada' }));
  });

  it('keeps host header actions available while loading, empty, and failed', async () => {
    const list = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    const headerAction = vi.fn(({ reload }: { reload: () => Promise<void> }) => (
      <button type="button" onClick={() => void reload()}>Invite user</button>
    ));
    render(<UsersPanel adapter={{ list }} renderHeaderActions={headerAction} />);

    await screen.findByText('No users found.');
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(headerAction).toHaveBeenLastCalledWith(expect.objectContaining({ isLoading: false }));
  });

  it('shows an error with host actions still available and retries the adapter', async () => {
    const list = vi.fn()
      .mockRejectedValueOnce(new Error('Directory unavailable'))
      .mockResolvedValueOnce({ items: users, page: 1, pageSize: 25, total: 1 });
    render(
      <UsersPanel
        adapter={{ list }}
        renderHeaderActions={() => <button type="button">Create user</button>}
      />,
    );

    await screen.findByText('Directory unavailable');
    expect(screen.getByRole('button', { name: 'Create user' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await screen.findByText('Ada Lovelace');
  });

  it('keeps a newer search result when an earlier request resolves late', async () => {
    let resolveInitial: ((value: { items: typeof users; page: number; pageSize: number; total: number }) => void) | undefined;
    const list = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockResolvedValueOnce({
        items: [{ ...users[0], label: 'grace@example.test', secondaryLabel: 'Grace Hopper' }],
        page: 1,
        pageSize: 25,
        total: 1,
      });
    render(<UsersPanel adapter={{ list }} search={{}} />);

    await waitFor(() => expect(list).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'grace' } });
    await screen.findByText('Grace Hopper');
    resolveInitial?.({ items: users, page: 1, pageSize: 25, total: 1 });

    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeTruthy());
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  it('renders protected accounts as values when an adapter capability is unavailable for that account', async () => {
    render(
      <UsersPanel
        adapter={{
          list: async () => ({
            items: [{
              ...users[0],
              permissions: { canChangeRole: false, canChangeStatus: false },
            }],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
          roles: [{ value: 'owner', label: 'Owner' }, { value: 'member', label: 'Member' }],
          statuses: [{ value: 'active', label: 'Active' }],
          setRole: { execute: async () => users[0] },
          setStatus: { execute: async () => users[0] },
        }}
      />,
    );

    await screen.findByText('Ada Lovelace');
    expect(screen.queryByRole('combobox', { name: 'Role for ada@example.test' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Status for ada@example.test' })).toBeNull();
    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('omits empty details and actions columns instead of rendering blank table cells', async () => {
    render(
      <UsersPanel
        adapter={{
          list: async () => ({
            items: [{
              id: 'u2',
              label: 'grace@example.test',
              role: { value: 'member', label: 'Member' },
              status: { value: 'active', label: 'Active' },
            }],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
        }}
      />,
    );

    await screen.findByText('grace@example.test');
    expect(screen.queryByRole('columnheader', { name: 'Details' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).toBeNull();
  });
});
