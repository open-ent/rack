import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const script = fileURLToPath(new URL('./refresh-open-ent-lock.mjs', import.meta.url));
for (const quote of ["'", '"']) {
  for (const eol of ['\n', '\r\n']) {
    test(`purges packages and snapshots with ${quote} and ${JSON.stringify(eol)}`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'rack-lock-test-'));
      try {
        const preserved = [
          'lockfileVersion: "9.0"',
          'overrides:',
          `  ${quote}@open-ent/react${quote}: 2.5.30-patched`,
          'importers:',
          '  frontend:',
          '    dependencies:',
          '      "@open-ent/react":',
          '        specifier: 2.5.30-patched',
          '        version: 2.5.30-patched',
        ];
        const input = [...preserved];
        const expected = [...preserved];
        for (const section of ['packages', 'snapshots']) {
          const other = ['  react@18.3.1:', '    unchanged: true'];
          input.push(`${section}:`, `  ${quote}@open-ent/react@2.5.30-patched${quote}:`,
            '    resolution:', '      tarball: https://example.invalid/stale', ...other);
          expected.push(`${section}:`, ...other);
        }
        const path = join(dir, 'pnpm-lock.yaml');
        writeFileSync(path, input.join(eol) + eol);
        execFileSync(process.execPath, [script], { cwd: dir });
        assert.equal(readFileSync(path, 'utf8'), expected.join(eol) + eol);
        execFileSync(process.execPath, [script], { cwd: dir });
        assert.equal(readFileSync(path, 'utf8'), expected.join(eol) + eol);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
}
