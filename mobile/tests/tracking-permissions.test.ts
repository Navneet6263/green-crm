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
  let allowRequest = false;
  const permissions = load<typeof import('../src/tracking/permissions')>('src/tracking/permissions.ts', {
    'react-native': { AppState: app },
    'expo-location': {
      getForegroundPermissionsAsync: async () => ({ granted, canAskAgain: true }),
      requestForegroundPermissionsAsync: async () => ({ granted }),
      getBackgroundPermissionsAsync: async () => ({ granted: allowRequest, canAskAgain: true }),
      requestBackgroundPermissionsAsync: async () => { backgroundRequests++; allowRequest = true; return { granted: true }; },
    },
  });
  await assert.rejects(permissions.setupTrackingPermissions(), /not allowed/);
  assert.equal(backgroundRequests, 0);
  granted = true;
  await permissions.setupTrackingPermissions();
  assert.equal(backgroundRequests, 1);
  app.currentState = 'background';
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

test('Settings return waits for active state and unregisters its listener', async () => {
  let listener: ((state: string) => void) | undefined;
  let removed = 0;
  const app = { currentState: 'background', addEventListener: (_event: string, callback: (state: string) => void) => {
    listener = callback; return { remove: () => { removed++; listener = undefined; } };
  } };
  const permissions = load<typeof import('../src/tracking/permissions')>('src/tracking/permissions.ts', { 'react-native': { AppState: app }, 'expo-location': {} });
  let finished = false;
  const waiting = permissions.waitForActiveApp().then(() => { finished = true; });
  await Promise.resolve(); assert.equal(finished, false);
  app.currentState = 'active'; listener!('active'); await waiting;
  assert.equal(finished, true); assert.equal(removed, 1);
  app.currentState = 'background';
  await assert.rejects(permissions.waitForActiveApp(5), /tap Start tracking again/);
  assert.equal(removed, 2);
});

test('permanently denied permission opens Settings without requesting GPS', async () => {
  let opened = 0;
  const permissions = load<typeof import('../src/tracking/permissions')>('src/tracking/permissions.ts', {
    'react-native': { AppState: { currentState: 'active' }, Linking: { openSettings: async () => { opened++; } } },
    'expo-location': { getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) },
  });
  await assert.rejects(permissions.setupTrackingPermissions(), /Settings/); assert.equal(opened, 1);
});
