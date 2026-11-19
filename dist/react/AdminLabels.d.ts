import { type ReactNode } from "react";
export interface AdminLabels {
    loading: string;
    errorTitle: string;
    retry: string;
    cancel: string;
    previousPage: string;
    nextPage: string;
    skipToContent: string;
    pageStatus: (page: number, pageCount: number) => string;
}
/** Renders a count with its noun, e.g. `(3, "en")` becomes "3 scopes". */
export type AdminCountMessage = (count: number, locale?: string) => string;
export declare function formatAdminCount(count: number, locale?: string): string;
type PluralForms = {
    other: string;
} & Partial<Record<Exclude<Intl.LDMLPluralRule, "other">, string>>;
/** Builds a count message from per-category nouns chosen by `Intl.PluralRules`. */
export declare function adminCountMessage(forms: PluralForms): AdminCountMessage;
declare const defaultMessageCatalog: {
    common: {
        loading: string;
        errorTitle: string;
        retry: string;
        cancel: string;
        previousPage: string;
        nextPage: string;
        skipToContent: string;
        pageStatus: (page: number, pageCount: number, locale?: string) => string;
        scopeCount: AdminCountMessage;
    };
    dialog: {
        close: string;
    };
    shell: {
        navigationLabel: string;
        mobileNavigationLabel: string;
    };
    portal: {
        mobileNavigationLabel: string;
        empty: string;
        unavailable: string;
    };
    switch: {
        on: string;
        off: string;
    };
    filterChip: {
        remove: (label: string) => string;
    };
    band: {
        showControls: string;
        hideControls: string;
        controlsGroup: string;
        filtersApplied: (count: number, locale?: string) => string;
    };
    table: {
        detailsLabel: string;
        resizeColumn: (header: string) => string;
        widthValue: (width: number, locale?: string) => string;
        resizeHint: string;
        columnWidth: (header: string) => string;
        narrowColumn: (header: string) => string;
        widenColumn: (header: string) => string;
        resetColumn: (header: string) => string;
        narrower: string;
        wider: string;
        resetWidth: string;
        view: string;
        hide: string;
        toggleDetails: (open: boolean, detailsLabel: string, rowLabel: string, locale?: string) => string;
    };
    scopePicker: {
        selectAll: (group: string) => string;
        selectNone: (group: string) => string;
        existingScopes: string;
        existingScope: string;
        unmatchedHelp: string;
    };
    apiKeyForm: {
        expiry: {
            days30: string;
            days90: string;
            days365: string;
            never: string;
        };
        createIntro: (noun?: string) => string;
        nameLabel: string;
        namePlaceholder: string;
        expiresLabel: string;
        editNoteLead: string;
        editNoteBeforeNot: (noun: string) => string;
        editNoteNot: string;
        editNoteAfterNot: (noun: string) => string;
        defaultNoun: string;
        scopesLegend: string;
        scopesLegendHint: (noun: string) => string;
        scopesSelected: (count: number, locale?: string) => string;
        createFooter: (noun: string) => string;
        editFooter: string;
        scopesRequired: (count: number, locale?: string) => string;
        createSubmit: (noun?: string) => string;
        saveChanges: string;
    };
    users: {
        title: string;
        searchLabel: string;
        searchPlaceholder: string;
        loading: string;
        empty: string;
        loadFailed: string;
        roleUpdateFailed: string;
        statusUpdateFailed: string;
        count: AdminCountMessage;
        detailCount: (count: number, locale?: string) => string;
        searchChip: (search: string) => string;
        roleFor: (label: string) => string;
        statusFor: (label: string) => string;
        pagination: string;
        columns: {
            user: string;
            details: string;
            role: string;
            status: string;
            actions: string;
        };
    };
    events: {
        title: string;
        refresh: string;
        search: string;
        all: string;
        loading: string;
        empty: string;
        loadFailed: string;
        details: string;
        total: (count: number, locale?: string) => string;
        source: (label: string, updated?: string) => string;
        actor: (label: string) => string;
        resource: (label: string) => string;
        returnedStatus: (status: number) => string;
        chips: {
            search: (value: string) => string;
            category: (value: string) => string;
            severity: (value: string) => string;
            outcome: (value: string) => string;
        };
        columns: {
            occurred: string;
            event: string;
            actor: string;
            resource: string;
            outcome: string;
            category: string;
            severity: string;
            action: string;
            message: string;
        };
    };
    logs: {
        title: string;
        loading: string;
        loadFailed: string;
        refreshed: (count: number, locale?: string) => string;
        refreshFailed: string;
        copied: string;
        copyFailed: string;
        matching: (count: number, locale?: string) => string;
        updated: (timestamp: string) => string;
        followLatest: (on: boolean) => string;
        autoRefresh: (on: boolean) => string;
        refresh: string;
        source: string;
        level: string;
        category: string;
        lines: string;
        allLevels: string;
        allCategories: string;
        search: string;
        searchPlaceholder: string;
        apply: string;
        showing: (shown: number, loaded: number, locale?: string) => string;
        copyVisible: string;
        empty: string;
        output: (title: string) => string;
    };
    sessions: {
        title: string;
        loading: string;
        empty: string;
        loadFailed: string;
        revokeFailed: string;
        revokeAllFailed: string;
        count: AdminCountMessage;
        current: string;
        revoke: string;
        revokeTitle: string;
        revokeConfirm: string;
        revokeDescription: (label: string) => string;
        columns: {
            session: string;
            details: string;
            created: string;
            lastActive: string;
            expires: string;
            actions: string;
        };
    };
    memberships: {
        title: string;
        loading: string;
        empty: string;
        loadFailed: string;
        addFailed: string;
        roleUpdateFailed: string;
        removeFailed: string;
        count: AdminCountMessage;
        inherited: string;
        direct: string;
        roleFor: (label: string) => string;
        remove: string;
        removeTitle: string;
        removeConfirm: string;
        removeDescription: (label: string, scopeLabel: string) => string;
        columns: {
            member: string;
            access: string;
            role: string;
            actions: string;
        };
    };
    featureFlags: {
        title: string;
        loading: string;
        loadFailed: string;
        updateFailed: string;
        storeHealth: string;
        source: (label: string) => string;
        sources: {
            store: string;
            environment: string;
            default: string;
            "store-error-policy": string;
        };
    };
    releaseNotes: {
        title: string;
        allUpdates: string;
        loading: string;
        errorTitle: string;
        errorDetail: string;
        missingTitle: string;
        missingDetail: string;
        emptyTitle: string;
        emptyDetail: string;
        fullNotes: string;
        pagination: string;
        newer: string;
        older: string;
        page: (page: number, locale?: string) => string;
    };
    jobs: {
        title: string;
        runLabel: string;
        loading: string;
        empty: string;
        loadFailed: string;
        runFailed: string;
        recentRuns: (count: number, locale?: string) => string;
        inProgress: string;
        pagination: string;
        columns: {
            job: string;
            started: string;
            finished: string;
            status: string;
        };
    };
    backups: {
        title: string;
        runLabel: string;
        loading: string;
        loadFailed: string;
        runFailed: string;
        restoreFailed: string;
        recoveryPoints: (count: number, locale?: string) => string;
        emptyTitle: string;
        emptyDetail: string;
        restore: string;
        restoreTitle: string;
        restoreConfirm: string;
        restoreDescription: (label: string) => string;
        pagination: string;
        columns: {
            backup: string;
            created: string;
            size: string;
            status: string;
            actions: string;
        };
    };
    settings: {
        title: string;
        loading: string;
        loadFailed: string;
        saveFailed: string;
        intro: string;
        save: string;
        saving: string;
        saved: string;
        enabled: string;
        disabled: string;
    };
    apiKeys: {
        title: string;
        singular: string;
        plural: string;
        credentialSingular: string;
        credentialPlural: string;
        loading: (plural: string) => string;
        empty: (plural: string) => string;
        loadFailed: (plural: string) => string;
        createFailed: (singular: string) => string;
        updateFailed: (singular: string) => string;
        rotateFailed: (singular: string) => string;
        revokeFailed: (singular: string) => string;
        count: (count: number, singular: string, plural: string, locale?: string) => string;
        active: (count: number, locale?: string) => string;
        copied: string;
        copyFailed: string;
        secretNotice: string;
        copySecret: string;
        secretCopied: string;
        editScopes: string;
        editScopesFor: (name: string) => string;
        rotate: string;
        rotateKey: (name: string) => string;
        revoke: string;
        revokeKey: (name: string) => string;
        scopesAndDetailsFor: (name: string) => string;
        noScopes: string;
        never: string;
        createNew: (noun: string) => string;
        createButton: (singular: string) => string;
        rotateTitle: (singular: string) => string;
        revokeTitle: (singular: string) => string;
        rotateDescription: (noun: string) => string;
        revokeDescription: (noun: string) => string;
        rotateConfirm: (noun: string) => string;
        revokeConfirm: (noun: string) => string;
        columns: {
            key: string;
            scope: string;
            details: string;
            state: string;
            created: string;
            lastUsed: string;
            expires: string;
            actions: string;
        };
    };
};
/** The typed message catalog: every user-visible string the React surface renders, grouped by component or panel. */
export type AdminMessages = typeof defaultMessageCatalog;
type Leaf = string | number | boolean | ((...args: never[]) => unknown);
export type AdminMessagesOverride<T = AdminMessages> = {
    [K in keyof T]?: T[K] extends Leaf ? T[K] : AdminMessagesOverride<T[K]>;
};
/** What `AdminLabelsProvider` accepts: the original flat label keys plus a deep partial of the catalog. */
export type AdminLabelsOverride = Partial<AdminLabels> & AdminMessagesOverride;
export declare const defaultAdminMessages: AdminMessages;
export declare const defaultAdminLabels: AdminLabels;
export interface AdminMessageContext {
    messages: AdminMessages;
    /** BCP 47 tag for plurals and number formatting; `undefined` is the runtime default. */
    locale: string | undefined;
}
/**
 * Localizes Admin Kit's user-visible strings for every descendant. `labels`
 * takes the original flat keys (`loading`, `cancel`, ...) and a deep partial of
 * the grouped catalog; both layer over what is already in context — so nested
 * providers (e.g. a host wrapping `AdminApp`, which installs its own provider)
 * compose instead of resetting unspecified strings to English — and
 * `undefined` overrides keep the inherited value rather than blanking it.
 * `locale` feeds plural rules and number formatting.
 */
export declare function AdminLabelsProvider({ labels, locale, children, }: {
    labels?: AdminLabelsOverride;
    locale?: string;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAdminMessages(): AdminMessageContext;
/** The latest messages for async callbacks that must not re-run when the catalog changes. */
export declare function useAdminMessagesRef(): {
    readonly current: AdminMessageContext;
};
export declare function useAdminLabels(): AdminLabels;
export {};
