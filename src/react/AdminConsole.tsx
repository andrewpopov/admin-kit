import type { KeyboardEvent, ReactNode } from "react";
import { useId, useRef } from "react";
import type { AdminSectionDefinition, AdminSectionId } from "../core/contracts";

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
/** @deprecated Use AdminApp with grouped sections and a capability registry. */
export function AdminConsole({
  activeSection,
  sections,
  onSectionChange,
  ariaLabel = "Administration sections",
  className,
}: AdminConsoleProps) {
  const idBase = useId();
  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  if (!active) {
    throw new Error("AdminConsole needs at least one rendered section.");
  }

  const tabRefs = useRef(new Map<AdminSectionId, HTMLButtonElement>());

  const tabId = (sectionId: string) => `${idBase}-tab-${sectionId}`;
  const panelId = (sectionId: string) => `${idBase}-panel-${sectionId}`;

  const focusTab = (sectionId: AdminSectionId) => {
    tabRefs.current.get(sectionId)?.focus();
  };

  const enabledSections = () => sections.filter((section) => !section.disabled);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, sectionId: AdminSectionId) => {
    const focusable = enabledSections();
    if (focusable.length === 0) return;
    const currentIndex = focusable.findIndex((section) => section.id === sectionId);
    let nextIndex: number | undefined;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % focusable.length;
        break;
      case "ArrowLeft":
        nextIndex =
          currentIndex === -1 ? 0 : (currentIndex - 1 + focusable.length) % focusable.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = focusable.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextSection = focusable[nextIndex];
    if (!nextSection) return;
    onSectionChange(nextSection.id);
    focusTab(nextSection.id);
  };

  return (
    <section className={["admin-kit", className].filter(Boolean).join(" ")}>
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
                onKeyDown={(event) => handleTabKeyDown(event, section.id)}
                ref={(element) => {
                  if (element) tabRefs.current.set(section.id, element);
                  else tabRefs.current.delete(section.id);
                }}
                role="tab"
                tabIndex={selected ? 0 : -1}
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
