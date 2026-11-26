#!/bin/sh
# Runs the REAL hook and REAL `release-kit hygiene` in a throwaway repo (PKG-354); install and verify are stubbed.
set -u

# Never act on the live repo.
for v in $(git rev-parse --local-env-vars 2>/dev/null) GIT_QUARANTINE_PATH; do unset "$v"; done

src="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
zero=0000000000000000000000000000000000000000

[ -x "$src/node_modules/.bin/release-kit" ] || { echo 'test-pre-push: run npm install first (needs release-kit)'; exit 1; }
real_npm="$(command -v npm)"

fail() { printf 'test-pre-push: FAIL — %s\n' "$1"; exit 1; }

shims="$tmp/shims"; mkdir "$shims"
printf '#!/bin/sh\ncase "$*" in *release:hygiene*) exec "%s" "$@" ;; esac\nexit 0\n' "$real_npm" > "$shims/npm"
printf '#!/bin/sh\nexit 0\n' > "$shims/npx"
chmod +x "$shims/npm" "$shims/npx"

new_repo() {
  rm -rf "$tmp/r" "$tmp/r.git"
  git init -q --bare "$tmp/r.git"
  git init -q -b main "$tmp/r"
  cd "$tmp/r" || exit 1
  mkdir -p .githooks src .changes/unreleased
  cp "$src/.githooks/pre-push" .githooks/
  cp "$src/release-kit.config.js" .
  printf '{"name":"fx","version":"1.2.3","scripts":{"release:hygiene":"release-kit hygiene"}}\n' > package.json
  printf '# Changelog\n\n## 1.2.3\n\n### Fixed\n\n- x\n' > CHANGELOG.md
  : > src/a.ts; : > .changes/unreleased/.gitkeep
  ln -s "$src/node_modules" node_modules
  printf 'node_modules\n' > .gitignore
  git add -A && git commit -qm base
  git remote add origin "$tmp/r.git"
  git push -q --no-verify origin main
  git checkout -q -b feature
}

# Runs the hook for one pushed ref line. Sets $out and $code.
run_hook() {
  out="$(printf '%s\n' "$1" | PATH="$shims:$PATH" sh .githooks/pre-push origin url 2>&1)"
  code=$?
}
expect_blocked() {
  [ "$code" -ne 0 ] || fail "$1: hook exited 0, expected a block: $out"
  printf '%s' "$out" | grep -q -- "$2" || fail "$1: expected '$2' in the output: $out"
}
expect_passed() { [ "$code" -eq 0 ] || fail "$1: hook exited $code, expected 0: $out"; }

branch_push() { printf 'refs/heads/feature %s refs/heads/feature %s' "$(git rev-parse HEAD)" "$zero"; }
tag_push() { printf 'refs/tags/%s %s refs/tags/%s %s' "$1" "$(git rev-parse "$1^{commit}")" "$1" "$zero"; }

new_repo
echo change > src/a.ts; git commit -qam 'src change, no fragment'
run_hook "$(branch_push)"
expect_blocked 'src change without a fragment' 'release hygiene FAILED'

printf -- '---\nkind: fixed\nsummary: s\n---\n\nbody\n' > .changes/unreleased/fixed-x.md
git add -A && git commit -qm 'add fragment'
run_hook "$(branch_push)"
expect_passed 'src change with a fragment'

new_repo
git tag -a v1.2.3 -m v1.2.3
run_hook "$(tag_push v1.2.3)"
expect_passed 'tag matching package.json and CHANGELOG'

git tag -a v1.2.4 -m v1.2.4
run_hook "$(tag_push v1.2.4)"
expect_blocked 'tag differing from package.json' 'release tag refs/tags/v1.2.4 FAILED'

new_repo
sed -i.bak 's/## 1.2.3/## 1.2.2/' CHANGELOG.md && rm CHANGELOG.md.bak
git commit -qam 'stale changelog'; git tag -a v1.2.3 -m v1.2.3
run_hook "$(tag_push v1.2.3)"
expect_blocked 'tag without a CHANGELOG heading' "no '## 1.2.3' heading"

run_hook "refs/tags/v1.2.3 $zero refs/tags/v1.2.3 $(git rev-parse HEAD)"
expect_passed 'tag deletion'

echo 'test-pre-push: ok'
