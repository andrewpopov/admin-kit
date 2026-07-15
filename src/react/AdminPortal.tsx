import type {
  MouseEventHandler,
  ReactNode,
} from 'react';
import type {
  AdminPortalSectionDefinition,
  AdminSectionGroupDefinition,
  AdminSectionId,
} from '../core/contracts';

export interface AdminPortalReactSection extends AdminPortalSectionDefinition {
  render: () => ReactNode;
}

export interface AdminPortalReactGroup extends Omit<AdminSectionGroupDefinition, 'sections'> {
  sections: readonly AdminPortalReactSection[];
}

export interface AdminPortalNavigationItemProps {
  section: AdminPortalReactSection;
  active: boolean;
  className: string;
  ariaCurrent?: 'page';
  ariaDisabled?: true;
  tabIndex?: -1;
  onClick: MouseEventHandler<HTMLElement>;
}

interface AdminPortalBaseProps {
  /** The host derives this value from its router or other navigation state. */
  activeSection: AdminSectionId;
  groups: readonly AdminPortalReactGroup[];
  ariaLabel?: string;
  className?: string;
  emptyState?: ReactNode;
  inactiveSectionState?: (sectionId: AdminSectionId) => ReactNode;
}

export type AdminPortalProps = AdminPortalBaseProps & (
  | {
      /** Required when the portal renders its default controlled buttons. */
      onSectionChange: (sectionId: AdminSectionId) => void;
      renderNavigationItem?: (props: AdminPortalNavigationItemProps) => ReactNode;
    }
  | {
      /** Render a Next.js Link, React Router NavLink, or another host-owned link. */
      renderNavigationItem: (props: AdminPortalNavigationItemProps) => ReactNode;
      /** Optional notification when the custom router link is selected. */
      onSectionChange?: (sectionId: AdminSectionId) => void;
    }
);

/**
 * A grouped shell for routed administration areas. The host owns URLs,
 * navigation, and authorization; the portal owns grouping, selection,
 * responsive layout, disabled behavior, and accessible page semantics.
 */
export function AdminPortal({
  activeSection,
  groups,
  onSectionChange,
  renderNavigationItem,
  ariaLabel = 'Administration sections',
  className,
  emptyState = 'No administration sections are available.',
  inactiveSectionState,
}: AdminPortalProps) {
  if (!renderNavigationItem && !onSectionChange) {
    throw new Error('AdminPortal default navigation needs onSectionChange.');
  }

  const visibleGroups = groups
    .filter((group) => group.visible !== false)
    .map((group) => ({
      ...group,
      sections: group.sections.filter((section) => section.visible !== false),
    }))
    .filter((group) => group.sections.length > 0);
  const sections = visibleGroups.flatMap((group) => group.sections);
  const active = sections.find((section) => section.id === activeSection);

  if (!active) {
    return (
      <section className={['admin-kit', 'admin-kit--theme-core', 'admin-kit__portal-empty', className].filter(Boolean).join(' ')} data-admin-kit-theme="core">
        {sections.length === 0 ? emptyState : inactiveSectionState?.(activeSection) ?? 'This administration section is unavailable.'}
      </section>
    );
  }

  return (
    <section className={['admin-kit', 'admin-kit--theme-core', 'admin-kit__portal', className].filter(Boolean).join(' ')} data-admin-kit-theme="core">
      <nav aria-label={ariaLabel} className="admin-kit__portal-navigation">
        {visibleGroups.map((group) => (
          <section className="admin-kit__portal-group" key={group.id}>
            <header className="admin-kit__portal-group-header">
              <p className="admin-kit__portal-group-label">{group.label}</p>
              {group.description ? <p>{group.description}</p> : null}
            </header>
            <ul className="admin-kit__portal-list">
              {group.sections.map((section) => {
                const isActive = section.id === active.id;
                const onClick: MouseEventHandler<HTMLElement> = (event) => {
                  if (section.disabled) {
                    event.preventDefault();
                    return;
                  }
                  onSectionChange?.(section.id);
                };
                const navigationProps: AdminPortalNavigationItemProps = {
                  section,
                  active: isActive,
                  className: 'admin-kit__portal-link',
                  ariaCurrent: isActive ? 'page' : undefined,
                  ariaDisabled: section.disabled ? true : undefined,
                  tabIndex: section.disabled ? -1 : undefined,
                  onClick,
                };

                return (
                  <li key={section.id}>
                    {renderNavigationItem ? (
                      renderNavigationItem(navigationProps)
                    ) : (
                      <button
                        aria-current={navigationProps.ariaCurrent}
                        className={navigationProps.className}
                        disabled={section.disabled}
                        onClick={onClick}
                        type="button"
                      >
                        <span>{section.label}</span>
                        {section.description ? <small>{section.description}</small> : null}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="admin-kit__portal-content" data-admin-section={active.id}>
        {active.render()}
      </div>
    </section>
  );
}
