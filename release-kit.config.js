const {
  defineConfig,
  stableSemver,
  npmPackage,
  changelogTarget,
} = require("@andrewpopov/release-kit");

module.exports = defineConfig({
  productName: "@andrewpopov/admin-kit",
  stage: "stable",
  rootDir: __dirname,
  // changelogTarget writes CHANGELOG.md; indexPath is unused by it but required by the type.
  paths: { notesDir: ".changes", indexPath: ".changes/INDEX.md" },
  // groupByKind mirrors this package's existing CHANGELOG convention (### Added /
  // ### Changed / ### Fixed subheadings per release) — these headings ARE rendered.
  kinds: [
    { id: "breaking", heading: "Breaking" },
    { id: "added", heading: "Added" },
    { id: "changed", heading: "Changed" },
    { id: "fixed", heading: "Fixed" },
    { id: "security", heading: "Security" },
  ],
  versionStrategy: stableSemver(),
  manifest: npmPackage(),
  notesTarget: changelogTarget({ groupByKind: true }),
  hygiene: {
    baseRef: "origin/main",
    relevantPrefixes: ["src/"],
    relevantFiles: ["package.json"],
    relevantScriptPrefixes: ["scripts/"],
    relevantDocFiles: ["CHANGELOG.md"],
    noteCommandHelp:
      'npm run release:note -- --kind fixed --slug short-slug --summary "User-facing summary"',
    publishCommandHelp: "npm run release:cut",
  },
  titleTemplate: "# {productName} {version}",
  versionLabel: "Package version",
  currentVersionLabel: "Current package version",
  fragmentBodyPlaceholder:
    "Describe the user-facing change in one short paragraph before releasing.",
  releaseNoteIntroTemplate: "",
  indexIntroTemplate: "",
});
