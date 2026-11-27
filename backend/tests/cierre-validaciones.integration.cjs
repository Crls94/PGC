const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const { PrismaClient } = require('@prisma/client');

test('JWT_SECRET ausente o vacío impide arrancar sin revelar credenciales', () => {
  for (const value of [undefined, '', '   ']) {
    const env = { ...process.env, DOTENV_CONFIG_PATH: path.join(os.tmpdir(), 'pgc-no-env-file') };
    delete env.JWT_SECRET;
    if (value !== undefined) env.JWT_SECRET = value;
    const result = spawnSync(process.execPath, [path.resolve('dist/index.js')], { env, cwd: os.tmpdir(), encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /JWT_SECRET es obligatorio/);
  }
});

test('entradas inválidas no escriben documento ni historial; etiquetas y diff', async () => {
  assert.ok(process.env.PGC_TEST_CONFIG, 'Define PGC_TEST_CONFIG con configuración de una base exclusiva');
  const config = JSON.parse(fs.readFileSync(process.env.PGC_TEST_CONFIG, 'utf8'));
  const database = new URL(config.databaseUrl);
  assert.match(database.pathname, /^\/pgc_demo_(audit|test)_[a-z0-9_]+$/);
  assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
  const base = process.env.PGC_TEST_API_URL;
  assert.ok(base && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api$/.test(base));
  const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
  let id;
  async function request(route, method, body, token) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }
  try {
    const user = await db.usuario.findUniqueOrThrow({ where: { email: config.email } });
    const token = require('jsonwebtoken').sign({ id: user.id }, config.jwtSecret);
    const identity = await request('/auth/me', 'GET', undefined, token);
    assert.equal(identity.status, 200); assert.equal(identity.data.usuario.id, user.id);
    const count = await db.documento.count();
    for (const bad of ['', '   ', null, 42, {}, []]) {
      for (const field of ['titulo', 'contenido']) {
        const result = await request('/documentos', 'POST', { titulo: 'Prueba', contenido: 'Texto', [field]: bad }, token);
        assert.equal(result.status, 400, JSON.stringify({ field, bad, result }));
      }
    }
    assert.equal(await db.documento.count(), count);
    const created = await request('/documentos', 'POST', { titulo: ' Cierre desechable ', contenido: '  Texto\n', etiquetas: [' Prueba ', 'PRUEBA', 'otra', '', ' otra '] }, token);
    assert.equal(created.status, 201); id = created.data.documento.id;
    const original = await db.documento.findUniqueOrThrow({ where: { id } });
    assert.equal(original.titulo, 'Cierre desechable'); assert.equal(original.contenidoActual, '  Texto\n');
    assert.equal(await db.documentoEtiqueta.count({ where: { documentoId: id } }), 2);
    for (const bad of ['', '  ', null, 7, {}, []]) for (const field of ['titulo', 'contenido']) {
      assert.equal((await request(`/documentos/${id}`, 'PUT', { [field]: bad, versionEsperada: 1 }, token)).status, 400);
    }
    assert.deepEqual(await db.documento.findUniqueOrThrow({ where: { id } }), original);
    assert.equal(await db.version.count({ where: { documentoId: id } }), 1);
    for (const query of ['', '?v1=abc&v2=1', '?v1=0&v2=1', '?v1=-1&v2=1', '?v1=1.5&v2=1', '?v1=1x&v2=1', '?v1=2147483648&v2=1', '?v1=9007199254740992&v2=1', '?v1=1&v1=2&v2=1']) {
      assert.equal((await request(`/documentos/${id}/diff${query}`, 'GET', undefined, token)).status, 400);
    }
    assert.equal((await request(`/documentos/${id}/diff?v1=1&v2=2`, 'GET', undefined, token)).status, 404);
    assert.equal((await request(`/documentos/${id}/diff?v1=1&v2=1`, 'GET', undefined, token)).status, 200);
    // La versión esperada sigue siendo opcional: no se cambia este contrato.
    assert.equal((await request(`/documentos/${id}`, 'PUT', { contenido: 'Actualizado' }, token)).status, 200);
    assert.equal(await db.version.count({ where: { documentoId: id } }), 2);
  } finally {
    if (id) await db.documento.delete({ where: { id } });
    await db.$disconnect();
  }
});
