/** Read-only product updates. Hosts admit every signed-in user, independently of admin roles. */
export interface ReleaseNoteSummary {
    id: string;
    product: string;
    version: string;
    releasedAt: string;
    summary: string;
}
export interface ReleaseNoteDetail extends ReleaseNoteSummary {
    notesMarkdown: string;
}
export interface ReleaseNotesPage {
    items: ReleaseNoteSummary[];
    page: number;
    pageSize: number;
    hasMore: boolean;
}
export interface ReleaseNotesAdapter {
    list(query: {
        page: number;
        pageSize: number;
    }): Promise<ReleaseNotesPage>;
    get(id: string): Promise<ReleaseNoteDetail | null>;
}
export declare function validateReleaseNote(value: unknown): ReleaseNoteSummary;
export declare function validateReleaseNoteDetail(value: unknown): ReleaseNoteDetail;
export declare function validateReleaseNotesPage(value: unknown): ReleaseNotesPage;
