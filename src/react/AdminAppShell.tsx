import { useState, type ReactNode } from 'react';
import { AdminTheme, type AdminThemeName } from './AdminTheme';
import type { AdminAppFrame } from './AdminApp';

export interface AdminAppShellNavigationContext {
  idPrefix: string;
  onNavigate?: () => void;
}

export interface AdminAppShellProps {
  /** Optional application-level framing; omit it when host chrome already supplies identity. */
  frame?: AdminAppFrame;
  /** Hosts render their route-aware navigation from their validated registry. */
  renderNavigation: (context: AdminAppShellNavigationContext) => ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  mobileNavigationLabel?: string;
  theme?: AdminThemeName;
  className?: string;
}

/**
 * Responsive shell for URL-owning hosts. It deliberately accepts rendered
 * navigation rather than section content so frameworks retain route ownership.
 */
export function AdminAppShell({
  frame,
  renderNavigation,
  children,
  ariaLabel = 'Administration sections',
  mobileNavigationLabel = 'Browse administration',
  theme,
  className,
}: AdminAppShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const closeMobileNavigation = () => setMobileNavigationOpen(false);

  return (
    <AdminTheme as="section" className={['admin-kit__app-shell', className].filter(Boolean).join(' ')} theme={theme}>
      {frame ? <header className="admin-kit__app-header">
          <div>
            <h1>{frame.title}</h1>
            {frame.description ? <p>{frame.description}</p> : null}
          </div>
          {frame.actions ? <div className="admin-kit__app-actions">{frame.actions}</div> : null}
        </header> : null}
      <button
        aria-controls="admin-kit-mobile-navigation"
        aria-expanded={mobileNavigationOpen}
        className="admin-kit__app-shell-mobile-toggle"
        onClick={() => setMobileNavigationOpen((open) => !open)}
        type="button"
      >
        {mobileNavigationLabel}
      </button>
      {mobileNavigationOpen ? (
        <nav aria-label={ariaLabel} className="admin-kit__app-shell-mobile-navigation" id="admin-kit-mobile-navigation">
          {renderNavigation({ idPrefix: 'admin-kit-mobile', onNavigate: closeMobileNavigation })}
        </nav>
      ) : null}
      <div className="admin-kit__app-shell-body">
        <aside className="admin-kit__app-shell-navigation">
          <nav aria-label={ariaLabel}>{renderNavigation({ idPrefix: 'admin-kit-desktop' })}</nav>
        </aside>
        <main className="admin-kit__app-shell-content">{children}</main>
      </div>
    </AdminTheme>
  );
}
