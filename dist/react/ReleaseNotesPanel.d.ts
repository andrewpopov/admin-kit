import { type ReactNode } from "react";
import { type ReleaseNotesAdapter } from "../core/releaseNotes";
export interface ReleaseNotesPanelProps {
    adapter: ReleaseNotesAdapter;
    /** Omit for the history index; set from the host's detail route for a durable deep link. */
    releaseId?: string;
    hrefForRelease: (id: string) => string;
    listHref: string;
    /** Host's Markdown renderer must escape raw HTML and reject unsafe URL schemes. */
    renderNotes: (markdown: string) => ReactNode;
    renderLink?: (href: string, children: ReactNode) => ReactNode;
    pageSize?: number;
    title?: string;
}
/** Mount in the product's signed-in shell, without an AdminApp or an admin-role gate. */
export declare function ReleaseNotesPanel({ adapter, releaseId, hrefForRelease, listHref, renderNotes, renderLink, pageSize, title, }: ReleaseNotesPanelProps): import("react").JSX.Element;
