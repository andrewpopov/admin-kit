import type { ReactNode } from "react";
import {
  defineAdminApp,
  type AdminAppGroupDefinition,
  type AdminAppSectionDefinition,
} from "../core";
import {
  AdminPortal,
  type AdminPortalNavigationItemProps,
  type AdminPortalProps,
} from "./AdminPortal";
import { AdminTheme, type AdminThemeName } from "./AdminTheme";

export interface AdminAppReactSection extends AdminAppSectionDefinition {
  render: () => ReactNode;
}

export interface AdminAppReactGroup extends Omit<AdminAppGroupDefinition, "sections"> {
  sections: readonly AdminAppReactSection[];
}

type WithAdminAppGroups<T> = T extends AdminPortalProps
  ? Omit<T, "groups"> & { groups: readonly AdminAppReactGroup[] }
  : never;

export interface AdminAppFrame {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export type AdminAppProps = WithAdminAppGroups<AdminPortalProps> & {
  /** Optional application-level framing; omit it when host chrome already supplies page identity. */
  frame?: AdminAppFrame;
  theme?: AdminThemeName;
};

/**
 * The canonical Admin Kit application shell. Use this for every host
 * administration area; the lower-level AdminPortal remains available only for
 * product-specific navigation that has no capability registry.
 */
export function AdminApp({ frame, theme, className, ...portalProps }: AdminAppProps) {
  defineAdminApp({ groups: portalProps.groups });
  return (
    <AdminTheme as="section" className="admin-kit__app" theme={theme}>
      {frame ? (
        <header className="admin-kit__app-header">
          <div>
            <h1>{frame.title}</h1>
            {frame.description ? <p>{frame.description}</p> : null}
          </div>
          {frame.actions ? <div className="admin-kit__app-actions">{frame.actions}</div> : null}
        </header>
      ) : null}
      <AdminPortal
        {...portalProps}
        className={["admin-kit__app-portal", className].filter(Boolean).join(" ")}
        groups={portalProps.groups}
      />
    </AdminTheme>
  );
}

export type { AdminPortalNavigationItemProps };
