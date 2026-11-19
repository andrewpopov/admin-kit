import type { ReactNode } from "react";
import {
  defineAdminApp,
  type AdminAppGroupDefinition,
  type AdminAppSectionDefinition,
} from "../core";
import { AdminLabelsProvider, type AdminLabelsOverride } from "./AdminLabels";
import {
  AdminPortal,
  type AdminPortalNavigationItemProps,
  type AdminPortalProps,
} from "./AdminPortal";
import { AdminFrameHeadingProvider } from "./AdminPanelHeader";
import {
  AdminContentTargetProvider,
  AdminContentTargetReset,
  AdminSkipLink,
} from "./AdminSkipLink";
import { AdminTheme, type AdminPaletteName, type AdminThemeName } from "./AdminTheme";

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
  /** Opt-in recolor of the core theme, inherited by every nested Admin Kit boundary. */
  palette?: AdminPaletteName;
  /** Localizes Admin Kit strings for the whole app: the flat chrome labels and any deep partial of the message catalog. */
  labels?: AdminLabelsOverride;
  /** BCP 47 tag for plural rules and number formatting; omit it for the runtime default. */
  locale?: string;
};

/**
 * The canonical Admin Kit application shell. Use this for every host
 * administration area; the lower-level AdminPortal remains available only for
 * product-specific navigation that has no capability registry.
 */
export function AdminApp({
  frame,
  theme,
  palette,
  labels,
  locale,
  className,
  ...portalProps
}: AdminAppProps) {
  defineAdminApp({ groups: portalProps.groups });
  return (
    <AdminLabelsProvider labels={labels} locale={locale}>
      <AdminTheme as="section" className="admin-kit__app" theme={theme} palette={palette}>
        <AdminContentTargetProvider>
          <AdminSkipLink />
          {frame ? (
            <AdminContentTargetReset>
              <header className="admin-kit__app-header">
                <div>
                  <h1>{frame.title}</h1>
                  {frame.description ? <p>{frame.description}</p> : null}
                </div>
                {frame.actions ? (
                  <div className="admin-kit__app-actions">{frame.actions}</div>
                ) : null}
              </header>
            </AdminContentTargetReset>
          ) : null}
          <AdminFrameHeadingProvider value={Boolean(frame)}>
            <AdminPortal
              {...portalProps}
              className={["admin-kit__app-portal", className].filter(Boolean).join(" ")}
              groups={portalProps.groups}
            />
          </AdminFrameHeadingProvider>
        </AdminContentTargetProvider>
      </AdminTheme>
    </AdminLabelsProvider>
  );
}

export type { AdminPortalNavigationItemProps };
