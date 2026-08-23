import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadSchemas() {
  const source = read('src/lib/validate.js')
    .replace(/^import .*$/m, '')
    .replaceAll('export ', '');
  const factory = new Function('z', `${source}; return { loginSchema, adminSettingsSchema, sendCodeSchema };`);
  return factory(z);
}

test('getSessionUser 可按需查询 passwordHash，默认不暴露', () => {
  const source = read('src/lib/auth.js');

  assert.match(source, /export async function getSessionUser\(includePasswordHash = false\)/);
  assert.match(source, /passwordHash: includePasswordHash/);
  assert.match(source, /const user = await db\.user\.findUnique\([\s\S]*?select:/);

  const profileRoute = read('src/app/api/user/profile/route.js');
  assert.match(profileRoute, /const user = await getSessionUser\(true\)/);
});

test('RootLayout 将 ToastProvider 与 Toast 置于全局布局', () => {
  const source = read('src/app/layout.jsx');

  assert.match(source, /import \{ ToastProvider \} from '@\/context\/ToastContext';/);
  assert.match(source, /import Toast from '@\/components\/ui\/Toast';/);
  assert.match(source, /<ToastProvider>[\s\S]*<Toast \/>[\s\S]*<\/ToastProvider>/);
});

test('loginSchema 拒绝无效邮箱和超长密码，接受合法登录数据', () => {
  const { loginSchema } = loadSchemas();

  assert.equal(loginSchema.safeParse({ email: 'invalid', password: 'secret' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(129) }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'user@example.com', password: 'secret' }).success, true);
});

test('adminSettingsSchema 只接受合法枚举配置', () => {
  const { adminSettingsSchema } = loadSchemas();

  assert.equal(adminSettingsSchema.safeParse({ allow_registration: 'maybe' }).success, false);
  assert.equal(adminSettingsSchema.safeParse({ email_mode: 'invalid' }).success, false);
  assert.equal(adminSettingsSchema.safeParse({ allow_registration: 'true', email_mode: 'whitelist' }).success, true);
});

test('sendCodeSchema 只接受合法邮箱', () => {
  const { sendCodeSchema } = loadSchemas();

  assert.equal(sendCodeSchema.safeParse({ email: 'invalid' }).success, false);
  assert.equal(sendCodeSchema.safeParse({ email: 'user@example.com' }).success, true);
});

test('三个接口均通过 validateBody 接入对应 schema', () => {
  const routes = [
    ['src/app/api/auth/login/route.js', 'loginSchema'],
    ['src/app/api/admin/settings/route.js', 'adminSettingsSchema'],
    ['src/app/api/auth/send-code/route.js', 'sendCodeSchema'],
  ];

  for (const [route, schema] of routes) {
    const source = read(route);
    assert.match(source, new RegExp(`validateBody\\(req, ${schema}\\)`), route);
    assert.match(source, /if \(!validation\.success\)/, route);
  }
});
