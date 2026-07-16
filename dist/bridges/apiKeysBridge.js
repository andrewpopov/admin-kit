"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiKeysAdapter = createApiKeysAdapter;
const apiKeys_1 = require("../core/apiKeys");
/**
 * Reimplements `api-access-kit`'s `formatApiAccessCredentialMask` — a pure,
 * dependency-free string format (`${prefix}${id}.…`) — so admin-kit needs no
 * runtime dependency on the backend to render it.
 */
function formatMask(prefix, credentialId) {
    return `${prefix}${credentialId}.…`;
}
/**
 * Reimplements `api-access-kit`'s `getApiAccessCredentialStatus` lifecycle
 * rules, plus an unknown-pepper check equivalent to its
 * `UNKNOWN_PEPPER_VERSION` authentication failure. `EXPIRED`/`INVALID` both
 * fold to admin-kit's `expired`... except `INVALID` (an unparseable
 * `expiresAt`, or a pepper version admin-kit doesn't recognize) folds to
 * `revoked` instead: an invalid credential must never present as merely
 * time-expired, since expiry implies "was valid until recently."
 */
function resolveState(credential, peppers, now) {
    if (credential.revokedAt)
        return { state: "revoked" };
    if (!peppers.some((pepper) => pepper.version === credential.pepperVersion)) {
        return { state: "revoked", detail: "Signed under an unrecognized pepper version." };
    }
    if (!credential.expiresAt)
        return { state: "active" };
    const expiresAtMs = new Date(credential.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
        return { state: "revoked", detail: "Expiry timestamp is unparseable." };
    }
    return expiresAtMs <= now.getTime() ? { state: "expired" } : { state: "active" };
}
function mapCredential(credential, options) {
    const now = options.now?.() ?? new Date();
    const resolved = resolveState(credential, options.peppers, now);
    return {
        id: credential.id,
        name: options.nameOf(credential),
        maskedKey: formatMask(options.prefix, credential.id),
        state: resolved.state,
        scopes: credential.scopes,
        createdAt: credential.createdAt,
        expiresAt: credential.expiresAt,
        revokedAt: credential.revokedAt,
        details: resolved.detail ? [{ label: "Note", value: resolved.detail }] : undefined,
    };
}
/**
 * Builds an `AdminApiKeysAdapter` over an `api-access-kit`-shaped credential
 * store. The host supplies `issue`/`issueReplacement` closures that already
 * call the backend's crypto-bearing functions — this bridge only persists
 * the result via `store` and maps it for display.
 */
function createApiKeysAdapter(options) {
    const nowIso = () => (options.now?.() ?? new Date()).toISOString();
    return {
        async list() {
            const credentials = await options.listCredentials();
            return (0, apiKeys_1.validateAdminApiKeys)(credentials.map((credential) => mapCredential(credential, options)));
        },
        async create(input) {
            const issued = await options.issue(input);
            await options.store.create(issued.credential);
            return (0, apiKeys_1.validateAdminApiKeyCreated)({
                key: mapCredential(issued.credential, options),
                secret: issued.secret,
            });
        },
        async revoke({ keyId }) {
            const result = await options.store.revokeActive({
                credentialId: keyId,
                revokedAt: nowIso(),
            });
            if (!result.applied) {
                throw new Error(`API credential revoke failed for ${keyId}: ${result.reason}`);
            }
        },
        async rotate({ keyId }) {
            const existing = await options.store.findById(keyId);
            if (!existing)
                throw new Error(`API credential not found: ${keyId}`);
            const issued = await options.issueReplacement({ credential: existing });
            const result = await options.store.replaceActive({
                previousCredentialId: keyId,
                replacement: issued.credential,
                revokedAt: nowIso(),
            });
            if (!result.applied) {
                throw new Error(`API credential rotation failed for ${keyId}: ${result.reason}`);
            }
            return (0, apiKeys_1.validateAdminApiKeyCreated)({
                key: mapCredential(issued.credential, options),
                secret: issued.secret,
            });
        },
    };
}
