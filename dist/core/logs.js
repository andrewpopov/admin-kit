"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminLogsAdapter = defineAdminLogsAdapter;
exports.validateAdminLogsSnapshot = validateAdminLogsSnapshot;
function requireText(value, description) {
    if (!value.trim())
        throw new Error(`${description} must not be empty.`);
}
function validateOptions(options, name) {
    const values = new Set();
    for (const option of options ?? []) {
        requireText(option.value, `${name} value`);
        requireText(option.label, `${name} ${option.value} label`);
        if (values.has(option.value))
            throw new Error(`Duplicate ${name.toLowerCase()} value: ${option.value}.`);
        values.add(option.value);
    }
}
function defineAdminLogsAdapter(adapter) {
    const lineLimits = adapter.lineLimits ?? [100, 200, 500, 1000];
    if (lineLimits.length === 0 ||
        lineLimits.some((limit) => !Number.isInteger(limit) || limit <= 0)) {
        throw new Error("Runtime log line limits must be positive integers.");
    }
    if (new Set(lineLimits).size !== lineLimits.length) {
        throw new Error("Runtime log line limits must be unique.");
    }
    const defaultLineLimit = adapter.defaultLineLimit ?? lineLimits[0];
    if (!lineLimits.includes(defaultLineLimit)) {
        throw new Error("The default runtime log line limit must be declared in lineLimits.");
    }
    if (adapter.defaultSource !== undefined)
        requireText(adapter.defaultSource, "Default runtime log source");
    return Object.freeze({
        ...adapter,
        lineLimits: Object.freeze([...lineLimits]),
        defaultLineLimit,
    });
}
function validateAdminLogsSnapshot(snapshot) {
    if (!Number.isInteger(snapshot.total) || snapshot.total < snapshot.entries.length) {
        throw new Error("Runtime log total must be an integer at least as large as the returned entries.");
    }
    const sourceValues = new Set();
    const sources = snapshot.sources.map((source) => {
        requireText(source.value, "Runtime log source value");
        requireText(source.label, `Runtime log source ${source.value} label`);
        if (sourceValues.has(source.value))
            throw new Error(`Duplicate runtime log source: ${source.value}.`);
        sourceValues.add(source.value);
        return Object.freeze({ ...source });
    });
    if (snapshot.sources.length === 0) {
        if (snapshot.source !== null || snapshot.entries.length > 0) {
            throw new Error("Runtime logs without sources cannot select a source or return entries.");
        }
    }
    else if (!snapshot.source || !sourceValues.has(snapshot.source)) {
        throw new Error(`Selected runtime log source ${snapshot.source} is not declared.`);
    }
    validateOptions(snapshot.levels, "Runtime log level");
    validateOptions(snapshot.categories, "Runtime log category");
    const declaredLevels = new Set(snapshot.levels?.map((option) => option.value));
    const declaredCategories = new Set(snapshot.categories?.map((option) => option.value));
    const ids = new Set();
    const entries = snapshot.entries.map((entry) => {
        requireText(entry.id, "Runtime log entry id");
        requireText(entry.message, `Runtime log entry ${entry.id} message`);
        if (ids.has(entry.id))
            throw new Error(`Duplicate runtime log entry: ${entry.id}.`);
        if (entry.level) {
            requireText(entry.level.value, `Runtime log entry ${entry.id} level value`);
            requireText(entry.level.label, `Runtime log entry ${entry.id} level label`);
        }
        if (entry.category)
            requireText(entry.category, `Runtime log entry ${entry.id} category`);
        if (entry.level && snapshot.levels && !declaredLevels.has(entry.level.value)) {
            throw new Error(`Runtime log entry ${entry.id} has an undeclared level.`);
        }
        if (entry.category && snapshot.categories && !declaredCategories.has(entry.category)) {
            throw new Error(`Runtime log entry ${entry.id} has an undeclared category.`);
        }
        ids.add(entry.id);
        return Object.freeze({
            ...entry,
            level: entry.level ? Object.freeze({ ...entry.level }) : entry.level,
        });
    });
    return Object.freeze({
        ...snapshot,
        sources: Object.freeze(sources),
        entries: Object.freeze(entries),
        levels: snapshot.levels
            ? Object.freeze(snapshot.levels.map((option) => Object.freeze({ ...option })))
            : undefined,
        categories: snapshot.categories
            ? Object.freeze(snapshot.categories.map((option) => Object.freeze({ ...option })))
            : undefined,
    });
}
