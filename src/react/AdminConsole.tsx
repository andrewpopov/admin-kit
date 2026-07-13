import type { ReactNode } from 'react';
import { useId } from 'react';
import type { AdminSectionDefinition, AdminSectionId } from '../core/contracts';

export interface AdminReactSection extends AdminSectionDefinition {
  render: () => ReactNode;
}

export interface AdminConsoleProps {
  /** The host owns this state so it can map sections to any router or URL shape. */
  activeSection: AdminSectionId;
  sections: readonly AdminReactSection[];
  onSectionChange: (sectionId: AdminSectionId) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * A controlled admin shell. It intentionally has no router, data client, or
 * authorization dependency: the host determines navigation, supplies panels,
 * and enforces every action on the server.
 */
export function AdminConsole({
  activeSection,
  sections,
  onSectionChange,
  ariaLabel = 'Administration sections',
  className,
}: AdminConsoleProps) {
  const idBase = useId();
  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  if (!active) {
    throw new Error('AdminConsole needs at least one rendered section.');
  }

  const tabId = (sectionId: string) => `${idBase}-tab-${sectionId}`;
  const panelId = (sectionId: string) => `${idBase}-panel-${sectionId}`;

  return (
    <section className={['admin-kit', className].filter(Boolean).join(' ')}>
      <nav aria-label={ariaLabel} className="admin-kit__navigation">
        <div role="tablist" aria-orientation="horizontal" className="admin-kit__tabs">
          {sections.map((section) => {
            const selected = section.id === active.id;
            return (
              <button
                aria-controls={panelId(section.id)}
                aria-selected={selected}
                className="admin-kit__tab"
                disabled={section.disabled}
                id={tabId(section.id)}
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                role="tab"
                type="button"
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        aria-labelledby={tabId(active.id)}
        className="admin-kit__panel"
        id={panelId(active.id)}
        role="tabpanel"
      >
        {active.render()}
      </div>
    </section>
  );
}
