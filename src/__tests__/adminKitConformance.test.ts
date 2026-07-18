import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageVersion = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
).version as string;
const fixtureRoots: string[] = [];

function createConsumerFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'admin-kit-conformance-'));
  fixtureRoots.push(root);
  mkdirSync(join(root, 'src', 'app'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    dependencies: {
      '@andrewpopov/admin-kit': `github:andrewpopov/admin-kit#v${packageVersion}`,
    },
  }));
  writeFileSync(
    join(root, 'src', 'app', 'layout.tsx'),
    'import "@andrewpopov/admin-kit/styles.css"; export default function Layout() { return null; }',
  );
  return root;
}

function runConformance(root: string) {
  return spawnSync(process.execPath, [resolve(process.cwd(), 'scripts', 'admin-kit-conformance.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('admin-kit-conformance', () => {
  it('ignores Next.js generated CSS after a consumer build', () => {
    const root = createConsumerFixture();
    const generated = join(root, '.next', 'static', 'css');
    mkdirSync(generated, { recursive: true });
    writeFileSync(join(generated, 'app.css'), ':root { --admin-kit-accent: red; }');

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[admin-kit-conformance] PASS');
  });

  it('still rejects a source-level core token override', () => {
    const root = createConsumerFixture();
    writeFileSync(join(root, 'src', 'app.css'), ':root { --admin-kit-accent: red; }');

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/app.css: do not override Admin Kit core tokens');
  });

  it('accepts a frameless AdminApp when host chrome supplies page identity', () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, 'src', 'app', 'main.tsx'),
      [
        'import { AdminApp } from "@andrewpopov/admin-kit";',
        'export default function Main() {',
        '  return (',
        '    <AdminApp>',
        '      <SomeChild frame={{ title: "not the AdminApp frame" }} />',
        '    </AdminApp>',
        '  );',
        '}',
      ].join('\n'),
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[admin-kit-conformance] PASS');
  });

  it('accepts a framed AdminApp', () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, 'src', 'app', 'main.tsx'),
      [
        'import { AdminApp } from "@andrewpopov/admin-kit";',
        'export default function Main() {',
        '  return (',
        '    <AdminApp frame={{ title: "Dashboard" }}>',
        '      <SomeChild />',
        '    </AdminApp>',
        '  );',
        '}',
      ].join('\n'),
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[admin-kit-conformance] PASS');
  });
});
