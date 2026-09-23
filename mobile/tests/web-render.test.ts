import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';

const root = process.cwd();
const nodeRequire = createRequire(resolve(root, 'package.json'));
const web = nodeRequire('react-native-web');
const { renderToStaticMarkup } = nodeRequire('react-dom/server');
const emptyLead = {
  lead_id: 'test-lead', company_name: 'Test store', contact_person: 'Test contact',
  status: 'new', priority: '', email: '', phone: '', product_name: '', team_name: '',
  requirements: '', latest_note: '',
};

// Render the authored TSX with real React Native Web primitives. Only platform
// integrations/navigation/data hooks are mocked. SVG primitives are DOM elements
// so React development mode validates the real Icon component's web props.
function loadScreen(entry: string, platform = 'web') {
  const cache = new Map<string, { exports: any }>();
  const session = { token: 'test-only', user: { user_id: 'test-user', name: 'Test', role: 'sales' } };
  function load(file: string): any {
    if (cache.has(file)) return cache.get(file)!.exports;
    const module = { exports: {} as any };
    cache.set(file, module);
    const localRequire = (name: string): any => {
      if (name === 'react-native') return platform === 'web' ? web : { ...web, Platform: { ...web.Platform, OS: platform } };
      if (name === 'react-native-svg') return { __esModule: true, default: 'svg', Path: 'path', Circle: 'circle', Rect: 'rect', Polyline: 'polyline' };
      if (name === 'expo-linear-gradient') return { LinearGradient: web.View };
      if (name === 'react-native-safe-area-context') return { SafeAreaView: web.View };
      if (name === 'expo-router') return { router: {}, useLocalSearchParams: () => ({ id: emptyLead.lead_id }), useNavigation: () => ({}), useFocusEffect: () => {} };
      if (name === 'expo-router/react-navigation') return { usePreventRemove: () => {} };
      if (name.endsWith('/auth/SessionProvider')) return { useSession: () => ({ session }) };
      if (name.endsWith('/api/runtime')) return { API_BASE: 'https://crm.example.test/api' };
      if (name.endsWith('/api/crm')) return {};
      if (name.endsWith('/tracking/engine')) return { nativeTracking: false };
      if (name.endsWith('/photos/photoApi') || name === './photoApi') return {};
      if (name.endsWith('/hooks/useResource')) return { useResource: (key: string) => ({ data: key.startsWith('lead:') ? emptyLead : key.startsWith('photos:') ? [] : { items: [], total: 0, totalPages: 1 }, loading: false, error: '', reload: () => {} }) };
      if (name.endsWith('/features/leads/NoteHistory')) return { NoteHistory: () => null };
      if (!name.startsWith('.')) return nodeRequire(name);
      const base = resolve(dirname(file), name);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(path => existsSync(path));
      if (!target) throw new Error(`Missing test import: ${name}`);
      return load(target);
    };
    const output = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    runInThisContext(`(function(require, module, exports) {\n${output}\n})`, { filename: file })(localRequire, module, module.exports);
    return module.exports;
  }
  return load(resolve(root, entry));
}

function renderWithoutTextWarnings(context: TestContext, element: React.ReactElement) {
  const errors: string[] = [];
  const spy = context.mock.method(console, 'error', (...args: unknown[]) => { errors.push(args.map(String).join(' ')); });
  try {
    const html = renderToStaticMarkup(element);
    assert.deepEqual(errors, []);
    return html as string;
  } finally { spy.mock.restore(); }
}

test('web login renders its initially empty error without raw View text', context => {
  const Login = loadScreen('app/login.tsx').default;
  const html = renderWithoutTextWarnings(context, React.createElement(Login));
  assert.match(html, /Welcome back/);
  assert.doesNotMatch(html, /Explore demo|sample data|Foundation preview/);
});

test('web lead details tolerate empty optional fields, notice and error', context => {
  const Detail = loadScreen('app/leads/[id].tsx').default;
  assert.match(renderWithoutTextWarnings(context, React.createElement(Detail)), /Test store/);
});

test('web lead cards and shared screens tolerate empty text props', context => {
  const { LeadCard } = loadScreen('src/features/leads/LeadCard.tsx');
  renderWithoutTextWarnings(context, React.createElement(LeadCard, { lead: emptyLead }));
  const { Screen } = loadScreen('src/ui/components.tsx');
  renderWithoutTextWarnings(context, React.createElement(Screen, { title: 'Test', subtitle: '' }));
});

test('real sales tabs and creation forms render without raw View text', context => {
  for (const route of ['app/(tabs)/index.tsx', 'app/(tabs)/leads.tsx', 'app/(tabs)/tasks.tsx', 'app/(tabs)/profile.tsx', 'app/(tabs)/tracking.tsx', 'app/leads/new.tsx', 'app/tasks/new.tsx']) {
    const Screen = loadScreen(route).default;
    const html = renderWithoutTextWarnings(context, React.createElement(Screen));
    assert.doesNotMatch(html, /Explore demo|sample data|Foundation preview/);
  }
});

test('decorative web icons use ARIA and never leak native accessibility props to DOM', context => {
  const { Icon } = loadScreen('src/ui/Icon.tsx');
  const html = renderWithoutTextWarnings(context, React.createElement(Icon, { name: 'calendar' }));
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /focusable="false"/);
  assert.doesNotMatch(html, /importantForAccessibility|accessibilityElementsHidden/i);
});

test('native icons retain platform accessibility hiding without web-only props', () => {
  for (const platform of ['android', 'ios']) {
    const { Icon } = loadScreen('src/ui/Icon.tsx', platform);
    const element = Icon({ name: 'home' });
    assert.equal(element.props.accessibilityElementsHidden, true);
    assert.equal(element.props.importantForAccessibility, 'no-hide-descendants');
    assert.equal('aria-hidden' in element.props, false);
    assert.equal('focusable' in element.props, false);
  }
});
