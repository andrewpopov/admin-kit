import { describe, expect, it } from 'vitest';
import { defineAdminConsole, normalizeAdminFailure } from '../core';
import { createAdminPageFixture } from '../testing';

describe('defineAdminConsole', () => {
  it('freezes valid, uniquely named section metadata', () => {
    const consoleDefinition = defineAdminConsole({
      sections: [{ id: 'users', label: 'Users' }, { id: 'flags', label: 'Feature flags' }],
    });

    expect(consoleDefinition.sections.map((section) => section.id)).toEqual(['users', 'flags']);
    expect(Object.isFrozen(consoleDefinition.sections)).toBe(true);
  });

  it.each([
    [{ sections: [] }, /at least one/i],
    [{ sections: [{ id: 'users', label: 'Users' }, { id: 'users', label: 'More users' }] }, /duplicate/i],
    [{ sections: [{ id: ' ', label: 'Users' }] }, /must not be empty/i],
    [{ sections: [{ id: 'users', label: ' ' }] }, /needs a label/i],
  ])('rejects invalid configuration', (definition, message) => {
    expect(() => defineAdminConsole(definition)).toThrow(message);
  });
});

describe('admin adapter helpers', () => {
  it('preserves an error message without coupling to an HTTP response type', () => {
    expect(normalizeAdminFailure(new Error('Network unavailable'))).toEqual({
      message: 'Network unavailable', retryable: true,
    });
  });

  it('creates immutable consumer-shaped page data', () => {
    const page = createAdminPageFixture([{ id: 'first' }, { id: 'second' }], 2, 25);
    expect(page).toMatchObject({ page: 2, pageSize: 25, total: 2 });
    expect(Object.isFrozen(page.items)).toBe(true);
  });
});
