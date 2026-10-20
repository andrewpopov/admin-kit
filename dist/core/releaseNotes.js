"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReleaseNote = validateReleaseNote;
exports.validateReleaseNoteDetail = validateReleaseNoteDetail;
exports.validateReleaseNotesPage = validateReleaseNotesPage;
function validateReleaseNote(value) {
    if (typeof value !== "object" || value === null)
        throw new Error("Invalid release note.");
    const r = value;
    for (const key of ["id", "product", "version", "releasedAt", "summary"]) {
        if (typeof r[key] !== "string" || !r[key].trim())
            throw new Error(`Invalid release ${key}.`);
    }
    if (!Number.isFinite(Date.parse(r.releasedAt)))
        throw new Error("Invalid release date.");
    return {
        id: r.id,
        product: r.product,
        version: r.version,
        releasedAt: r.releasedAt,
        summary: r.summary,
    };
}
function validateReleaseNoteDetail(value) {
    const summary = validateReleaseNote(value);
    const markdown = value.notesMarkdown;
    if (typeof markdown !== "string" || !markdown.trim())
        throw new Error("Invalid release notes.");
    return { ...summary, notesMarkdown: markdown };
}
function validateReleaseNotesPage(value) {
    if (typeof value !== "object" || value === null)
        throw new Error("Invalid release page.");
    const page = value;
    if (!Array.isArray(page.items) ||
        typeof page.hasMore !== "boolean" ||
        !Number.isSafeInteger(page.page) ||
        page.page < 1 ||
        !Number.isSafeInteger(page.pageSize) ||
        page.pageSize < 1 ||
        page.pageSize > 50 ||
        page.items.length > page.pageSize)
        throw new Error("Invalid release page.");
    return {
        items: page.items.map(validateReleaseNote),
        page: page.page,
        pageSize: page.pageSize,
        hasMore: page.hasMore,
    };
}
