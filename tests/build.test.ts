import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

describe('Build compatibility (Netlify)', () => {
  it('TypeScript compiles without errors (tsc --noEmit)', () => {
    // This is the exact check Netlify runs: "tsc && vite build"
    // tsc must pass with zero errors before vite can bundle.
    expect(() => {
      execSync('npx tsc --noEmit', {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 60000,
      });
    }).not.toThrow();
  }, 60000);

  it('Vite build succeeds', () => {
    expect(() => {
      execSync('npx vite build', {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 120000,
      });
    }).not.toThrow();
  }, 120000);

  it('package.json has no invalid dependency versions', () => {
    // Verify all deps can be resolved by checking package-lock.json integrity
    expect(() => {
      execSync('npm ls --json 2>/dev/null', {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 30000,
      });
    }).not.toThrow();
  }, 30000);

  it('package-lock.json has no merge conflict markers', () => {
    const lockfile = readFileSync(resolve(ROOT, 'package-lock.json'), 'utf-8');
    expect(lockfile).not.toContain('<<<<<<<');
    expect(lockfile).not.toContain('>>>>>>>');
    expect(lockfile).not.toContain('=======');
  });

  it('tsconfig.json excludes test files from production build', () => {
    const tsconfig = JSON.parse(readFileSync(resolve(ROOT, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.exclude).toContain('tests');
  });
});
