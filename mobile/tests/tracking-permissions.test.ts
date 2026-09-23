import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';

function load<T>(file: string, modules: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${code}\n})`)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected native import: ${name}`);
    return modules[name];
  }, module, module.exports);
  return module.exports as T;
}

test('permission setup does not start GPS and stops if foreground permission is denied', async () => {
  let backgroundRequests = 0;
  const app = { currentState: 'active' };
  let granted = false;
  const permissions = load<typeof import('../src/tracking/permissions')>('src/tracking/permissions.ts', {
    'react-native': { AppState: app },
    'expo-location': {
      requestForegroundPermissionsAsync: async () => ({ granted }),
      getBackgroundPermissionsAsync: async () => ({ granted: false }),
      requestBackgroundPermissionsAsync: async () => { backgroundRequests++; app.currentState = 'background'; return { granted: true }; },
    },
  });
  await assert.rejects(permissions.setupTrackingPermissions(), /not allowed/);
  assert.equal(backgroundRequests, 0);
  granted = true;
  await permissions.setupTrackingPermissions();
  assert.equal(backgroundRequests, 1);
  assert.throws(permissions.requireActiveApp, /Return to GreenCRM/);
});

test('native readiness rejects old APKs and service failures, not a registered task success', async () => {
  const app = { OS: 'android' };
  let bridge: any = {};
  const service = load<typeof import('../src/tracking/nativeService')>('src/tracking/nativeService.ts', {
    'react-native': { Platform: app }, 'expo': { requireOptionalNativeModule: () => bridge },
  });
  await assert.rejects(service.nativeServiceHealth(), /Install the new APK/);
  bridge = { getGreenCrmServiceHealthAsync: async () => ({ running: false, error: 'SecurityException: rejected' }) };
  await assert.rejects(service.waitForNativeService(() => {}), /SecurityException/);
  bridge = { getGreenCrmServiceHealthAsync: async () => ({ running: true, error: '' }) };
  await service.waitForNativeService(() => {});
  await assert.rejects(service.waitForNativeService(() => { throw new Error('Start cancelled'); }), /cancelled/);
  app.OS = 'ios'; assert.equal(await service.nativeServiceHealth(), null);
});
