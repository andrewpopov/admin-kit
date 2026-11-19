"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAdminLabels = exports.defaultAdminMessages = void 0;
exports.formatAdminCount = formatAdminCount;
exports.adminCountMessage = adminCountMessage;
exports.AdminLabelsProvider = AdminLabelsProvider;
exports.useAdminMessages = useAdminMessages;
exports.useAdminMessagesRef = useAdminMessagesRef;
exports.useAdminLabels = useAdminLabels;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function formatAdminCount(count, locale) {
    return new Intl.NumberFormat(locale).format(count);
}
/** Builds a count message from per-category nouns chosen by `Intl.PluralRules`. */
function adminCountMessage(forms) {
    return (count, locale) => {
        const category = new Intl.PluralRules(locale).select(count);
        return `${formatAdminCount(count, locale)} ${forms[category] ?? forms.other}`;
    };
}
const scopeCount = adminCountMessage({ one: "scope", other: "scopes" });
const defaultMessageCatalog = {
    common: {
        loading: "Loading…",
        errorTitle: "Unable to load this section",
        retry: "Try again",
        cancel: "Cancel",
        previousPage: "Previous",
        nextPage: "Next",
        skipToContent: "Skip to content",
        pageStatus: (page, pageCount, locale) => `Page ${formatAdminCount(page, locale)} of ${formatAdminCount(pageCount, locale)}`,
        scopeCount,
    },
    dialog: { close: "Close dialog" },
    shell: {
        navigationLabel: "Administration sections",
        mobileNavigationLabel: "Browse administration",
    },
    portal: {
        mobileNavigationLabel: "Menu",
        empty: "No administration sections are available.",
        unavailable: "This administration section is unavailable.",
    },
    switch: { on: "On", off: "Off" },
    filterChip: { remove: (label) => `Remove filter: ${label}` },
    band: {
        showControls: "Show controls",
        hideControls: "Hide controls",
        controlsGroup: "Page controls",
        filtersApplied: (count, locale) => `, ${adminCountMessage({ one: "filter", other: "filters" })(count, locale)} applied`,
    },
    table: {
        detailsLabel: "Details",
        resizeColumn: (header) => `Resize ${header} column`,
        widthValue: (width, locale) => `${formatAdminCount(width, locale)} pixels`,
        resizeHint: "Click for a width menu, or drag or use the arrow keys to resize. Home or double-click resets.",
        columnWidth: (header) => `${header} column width`,
        narrowColumn: (header) => `Narrow ${header} column`,
        widenColumn: (header) => `Widen ${header} column`,
        resetColumn: (header) => `Reset ${header} column width`,
        narrower: "Narrower",
        wider: "Wider",
        resetWidth: "Reset width",
        view: "View",
        hide: "Hide",
        toggleDetails: (open, detailsLabel, rowLabel, locale) => `${open ? "Hide" : "View"} ${detailsLabel.toLocaleLowerCase(locale)} for ${rowLabel}`,
    },
    scopePicker: {
        selectAll: (group) => `Select all in ${group}`,
        selectNone: (group) => `Select none in ${group}`,
        existingScopes: "Existing scopes",
        existingScope: "Existing scope",
        unmatchedHelp: "These scopes are not part of the current vocabulary. Keep or remove them explicitly.",
    },
    apiKeyForm: {
        expiry: { days30: "30 days", days90: "90 days", days365: "365 days", never: "Never" },
        createIntro: (noun) => noun
            ? `Name the ${noun}, choose how long it should live, and pick the scopes it may use. These settings apply to the ${noun} you're about to create.`
            : "Name the credential, choose how long it should live, and pick the scopes it may use. These settings apply to the key you're about to create.",
        nameLabel: "Name",
        namePlaceholder: "e.g. CI deploy",
        expiresLabel: "Expires",
        editNoteLead: "Scopes only.",
        editNoteBeforeNot: (noun) => `Saving updates what this ${noun} can do and takes effect immediately — it does`,
        editNoteNot: "not",
        editNoteAfterNot: (noun) => `issue a new secret, and the ${noun} keeps working. To replace the secret, rotate the ${noun} instead.`,
        defaultNoun: "key",
        scopesLegend: "Scopes",
        scopesLegendHint: (noun) => `— what this ${noun} is allowed to do`,
        scopesSelected: (count, locale) => `${scopeCount(count, locale)} selected`,
        createFooter: (noun) => ` · the secret is shown once, right after you create the ${noun}.`,
        editFooter: " · saving changes permissions only — the secret is unchanged.",
        scopesRequired: (count, locale) => ` Select at least ${scopeCount(count, locale)} to continue.`,
        createSubmit: (noun) => `Create ${noun ?? "API key"}`,
        saveChanges: "Save changes",
    },
    users: {
        title: "Users",
        searchLabel: "Search users",
        searchPlaceholder: "Search by name or email",
        loading: "Loading users…",
        empty: "No users found.",
        loadFailed: "Unable to load users.",
        roleUpdateFailed: "Unable to update the user role.",
        statusUpdateFailed: "Unable to update the user status.",
        count: adminCountMessage({ one: "user", other: "users" }),
        detailCount: (count, locale) => `${count} ${new Intl.PluralRules(locale).select(count) === "one" ? "user" : "users"}`,
        searchChip: (search) => `Search: ${search}`,
        roleFor: (label) => `Role for ${label}`,
        statusFor: (label) => `Status for ${label}`,
        pagination: "User pagination",
        columns: {
            user: "User",
            details: "Details",
            role: "Role",
            status: "Status",
            actions: "Actions",
        },
    },
    events: {
        title: "Administrative events",
        refresh: "Refresh",
        search: "Search",
        all: "All",
        loading: "Loading administrative events…",
        empty: "No administrative events found.",
        loadFailed: "Unable to load administrative events.",
        details: "Details",
        total: (count, locale) => `${formatAdminCount(count, locale)} events`,
        source: (label, updated) => `Source: ${label}${updated ? ` · updated ${updated}` : ""}`,
        actor: (label) => ` · actor: ${label}`,
        resource: (label) => ` · resource: ${label}`,
        returnedStatus: (status) => `returned ${status}`,
        chips: {
            search: (value) => `Search: ${value}`,
            category: (value) => `Category: ${value}`,
            severity: (value) => `Severity: ${value}`,
            outcome: (value) => `Outcome: ${value}`,
        },
        columns: {
            occurred: "Occurred",
            event: "Event",
            actor: "Actor",
            resource: "Resource",
            outcome: "Outcome",
            category: "Category",
            severity: "Severity",
            action: "Action",
            message: "Message",
        },
    },
    logs: {
        title: "Runtime logs",
        loading: "Loading runtime logs…",
        loadFailed: "Unable to load runtime logs.",
        refreshed: (count, locale) => `Refreshed: ${adminCountMessage({ one: "new log line", other: "new log lines" })(count, locale)}.`,
        refreshFailed: "Refresh failed. The previously loaded output remains available.",
        copied: "Visible log output copied.",
        copyFailed: "Unable to copy log output.",
        matching: (count, locale) => adminCountMessage({ one: "matching line", other: "matching lines" })(count, locale),
        updated: (timestamp) => `Updated ${timestamp}`,
        followLatest: (on) => `Follow latest ${on ? "on" : "off"}`,
        autoRefresh: (on) => `Auto-refresh ${on ? "on" : "off"}`,
        refresh: "Refresh",
        source: "Source",
        level: "Level",
        category: "Category",
        lines: "Lines",
        allLevels: "All levels",
        allCategories: "All categories",
        search: "Search logs",
        searchPlaceholder: "Message or raw output",
        apply: "Apply",
        showing: (shown, loaded, locale) => `Showing ${formatAdminCount(shown, locale)} of ${formatAdminCount(loaded, locale)} loaded`,
        copyVisible: "Copy visible",
        empty: "No log lines matched.",
        output: (title) => `${title} output`,
    },
    sessions: {
        title: "Active sessions",
        loading: "Loading active sessions…",
        empty: "No active sessions.",
        loadFailed: "Unable to load active sessions.",
        revokeFailed: "Unable to revoke the session.",
        revokeAllFailed: "Unable to revoke sessions.",
        count: adminCountMessage({ one: "session", other: "sessions" }),
        current: "Current",
        revoke: "Revoke",
        revokeTitle: "Revoke session",
        revokeConfirm: "Revoke session",
        revokeDescription: (label) => `Revoke the session for ${label}? That client will need to sign in again.`,
        columns: {
            session: "Session",
            details: "Details",
            created: "Created",
            lastActive: "Last active",
            expires: "Expires",
            actions: "Actions",
        },
    },
    memberships: {
        title: "Members",
        loading: "Loading members…",
        empty: "No members found.",
        loadFailed: "Unable to load members.",
        addFailed: "Unable to add the member.",
        roleUpdateFailed: "Unable to update the member role.",
        removeFailed: "Unable to remove the member.",
        count: adminCountMessage({ one: "member", other: "members" }),
        inherited: "Inherited",
        direct: "Direct",
        roleFor: (label) => `Role for ${label}`,
        remove: "Remove",
        removeTitle: "Remove member",
        removeConfirm: "Remove member",
        removeDescription: (label, scopeLabel) => `Remove ${label} from ${scopeLabel}? Their access through this direct membership will end.`,
        columns: { member: "Member", access: "Access", role: "Role", actions: "Actions" },
    },
    featureFlags: {
        title: "Feature flags",
        loading: "Loading feature flags…",
        loadFailed: "Unable to load feature flags.",
        updateFailed: "Unable to update the feature flag.",
        storeHealth: "Store health:",
        source: (label) => `Source: ${label}`,
        sources: {
            store: "Store override",
            environment: "Environment controlled",
            default: "Default value",
            "store-error-policy": "Store unavailable policy",
        },
    },
    releaseNotes: {
        title: "What's new",
        allUpdates: "All updates",
        loading: "Loading release notes…",
        errorTitle: "Couldn't load release notes",
        errorDetail: "Try again in a moment.",
        missingTitle: "Release notes not found",
        missingDetail: "Choose another update from the history.",
        emptyTitle: "No updates yet",
        emptyDetail: "Release notes will appear here when an update ships.",
        fullNotes: "Full release notes",
        pagination: "Release history pages",
        newer: "Newer",
        older: "Older",
        page: (page, locale) => `Page ${formatAdminCount(page, locale)}`,
    },
    jobs: {
        title: "Operational jobs",
        runLabel: "Run now",
        loading: "Loading operational jobs…",
        empty: "No operational runs yet.",
        loadFailed: "Unable to load operational jobs.",
        runFailed: "Unable to run the operational job.",
        recentRuns: (count, locale) => `${formatAdminCount(count, locale)} recent runs`,
        inProgress: "In progress",
        pagination: "Operational jobs pagination",
        columns: { job: "Job", started: "Started", finished: "Finished", status: "Status" },
    },
    backups: {
        title: "Backups",
        runLabel: "Run backup",
        loading: "Loading backups…",
        loadFailed: "Unable to load backups.",
        runFailed: "Unable to run backup.",
        restoreFailed: "Unable to restore backup.",
        recoveryPoints: (count, locale) => `${formatAdminCount(count, locale)} recent recovery points`,
        emptyTitle: "No backups yet",
        emptyDetail: "Run a backup to create your first recovery point.",
        restore: "Restore",
        restoreTitle: "Restore backup",
        restoreConfirm: "Restore backup",
        restoreDescription: (label) => `This will overwrite the current database with the recovery point "${label}". This action is destructive and cannot be reversed.`,
        pagination: "Backups pagination",
        columns: {
            backup: "Backup",
            created: "Created",
            size: "Size",
            status: "Status",
            actions: "Actions",
        },
    },
    settings: {
        title: "Settings",
        loading: "Loading settings…",
        loadFailed: "Unable to load settings.",
        saveFailed: "Unable to save settings.",
        intro: "Changes are applied when saved.",
        save: "Save changes",
        saving: "Saving…",
        saved: "Changes saved.",
        enabled: "Enabled",
        disabled: "Disabled",
    },
    apiKeys: {
        title: "API keys",
        singular: "API key",
        plural: "API keys",
        credentialSingular: "credential",
        credentialPlural: "credentials",
        loading: (plural) => `Loading ${plural}…`,
        empty: (plural) => `No ${plural} yet.`,
        loadFailed: (plural) => `Unable to load ${plural}.`,
        createFailed: (singular) => `Unable to create ${singular}.`,
        updateFailed: (singular) => `Unable to update ${singular}.`,
        rotateFailed: (singular) => `Unable to rotate ${singular}.`,
        revokeFailed: (singular) => `Unable to revoke ${singular}.`,
        count: (count, singular, plural, locale) => `${formatAdminCount(count, locale)} ${new Intl.PluralRules(locale).select(count) === "one" ? singular : plural}`,
        active: (count, locale) => `${formatAdminCount(count, locale)} active`,
        copied: "Copied",
        copyFailed: "Copy failed. Select and copy the secret manually.",
        secretNotice: "Copy this secret now. It will not be shown again.",
        copySecret: "Copy secret",
        secretCopied: "I copied it",
        editScopes: "Edit scopes",
        editScopesFor: (name) => `Edit scopes for ${name}`,
        rotate: "Rotate",
        rotateKey: (name) => `Rotate ${name}`,
        revoke: "Revoke",
        revokeKey: (name) => `Revoke ${name}`,
        scopesAndDetailsFor: (name) => `Scopes and details for ${name}`,
        noScopes: "No scopes assigned.",
        never: "never",
        createNew: (noun) => `Create a new ${noun}`,
        createButton: (singular) => `Create ${singular}`,
        rotateTitle: (singular) => `Rotate ${singular}`,
        revokeTitle: (singular) => `Revoke ${singular}`,
        rotateDescription: (noun) => `The current ${noun} will stop working. Copy the replacement secret immediately after rotating it.`,
        revokeDescription: (noun) => `This ${noun} will stop working immediately and cannot be restored.`,
        rotateConfirm: (noun) => `Rotate ${noun}`,
        revokeConfirm: (noun) => `Revoke ${noun}`,
        columns: {
            key: "Key",
            scope: "Scope",
            details: "Details",
            state: "State",
            created: "Created",
            lastUsed: "Last used",
            expires: "Expires",
            actions: "Actions",
        },
    },
};
function deepFreeze(value) {
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
}
exports.defaultAdminMessages = deepFreeze(defaultMessageCatalog);
const isRecord = (value) => typeof value === "object" && value !== null;
function mergeMessages(base, override) {
    if (override === undefined)
        return base;
    if (isRecord(base) && isRecord(override)) {
        return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, mergeMessages(value, override[key])]));
    }
    return override;
}
/** Each original flat label key is an alias for one catalog entry. */
function flatLabelsAsCatalog(labels) {
    const { pageStatus, ...strings } = labels;
    return { common: { ...strings, pageStatus } };
}
function resolveMessages(base, override) {
    const flatKeys = [
        "loading",
        "errorTitle",
        "retry",
        "cancel",
        "previousPage",
        "nextPage",
        "skipToContent",
        "pageStatus",
    ];
    const flat = Object.fromEntries(flatKeys.map((key) => [key, override[key]]));
    const grouped = Object.fromEntries(Object.entries(override).filter(([key]) => !flatKeys.includes(key)));
    const withFlat = mergeMessages(base, flatLabelsAsCatalog(flat));
    return mergeMessages(withFlat, grouped);
}
function flatLabels(messages, locale) {
    const { common } = messages;
    return {
        loading: common.loading,
        errorTitle: common.errorTitle,
        retry: common.retry,
        cancel: common.cancel,
        previousPage: common.previousPage,
        nextPage: common.nextPage,
        skipToContent: common.skipToContent,
        pageStatus: (page, pageCount) => common.pageStatus(page, pageCount, locale),
    };
}
exports.defaultAdminLabels = Object.freeze(flatLabels(exports.defaultAdminMessages, undefined));
const defaultMessageContext = {
    messages: exports.defaultAdminMessages,
    locale: undefined,
};
const AdminLabelsContext = (0, react_1.createContext)(defaultMessageContext);
/**
 * Localizes Admin Kit's user-visible strings for every descendant. `labels`
 * takes the original flat keys (`loading`, `cancel`, ...) and a deep partial of
 * the grouped catalog; both layer over what is already in context — so nested
 * providers (e.g. a host wrapping `AdminApp`, which installs its own provider)
 * compose instead of resetting unspecified strings to English — and
 * `undefined` overrides keep the inherited value rather than blanking it.
 * `locale` feeds plural rules and number formatting.
 */
function AdminLabelsProvider({ labels, locale, children, }) {
    const inherited = useAdminMessages();
    const value = (0, react_1.useMemo)(() => {
        if (!labels && locale === undefined)
            return inherited;
        return {
            messages: labels ? resolveMessages(inherited.messages, labels) : inherited.messages,
            locale: locale ?? inherited.locale,
        };
    }, [inherited, labels, locale]);
    return (0, jsx_runtime_1.jsx)(AdminLabelsContext.Provider, { value: value, children: children });
}
function useAdminMessages() {
    return (0, react_1.useContext)(AdminLabelsContext);
}
/** The latest messages for async callbacks that must not re-run when the catalog changes. */
function useAdminMessagesRef() {
    const context = useAdminMessages();
    const ref = (0, react_1.useRef)(context);
    ref.current = context;
    return ref;
}
function useAdminLabels() {
    const { messages, locale } = useAdminMessages();
    return (0, react_1.useMemo)(() => flatLabels(messages, locale), [messages, locale]);
}
