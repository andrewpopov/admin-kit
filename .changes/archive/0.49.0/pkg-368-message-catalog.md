---
kind: added
summary: A typed message catalog covers every user-visible string in the React surface, overridable per group through AdminLabelsProvider, with locale-aware plurals and counts
---

`AdminLabels` grows into `AdminMessages`, grouped per component or panel, with frozen English defaults in `defaultAdminMessages`. `AdminLabelsProvider` and `AdminApp` accept a deep partial of the catalog plus a `locale`; the original flat label keys keep working as aliases, and `useAdminLabels()` and the `AdminLabels` type are unchanged. Plural and count entries are `(count, locale)` functions built on `Intl.PluralRules` and `Intl.NumberFormat` (`adminCountMessage`, `formatAdminCount`), so counts such as the events total are now formatted. A pseudo-locale test renders every panel and component with each message wrapped in `⟦…⟧` and fails on any unwrapped text, `aria-label`, `title` or `placeholder`.

`AdminSwitch` is now a client component because it reads the catalog. `AdminWorkspace` stays a Server Component and takes a localized `summaryLabel` prop instead.
