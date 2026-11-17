// Local-only fixture. Secrets are generated under the OS temporary directory.
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const configPath = join(tmpdir(), 'pgc-demo-local.json');
const mode = process.argv[2];
async function main() {
  if (mode === 'prepare') {
    if (!process.env.DEMO_DATABASE_URL) throw new Error('Define DEMO_DATABASE_URL explícitamente; no se usa DATABASE_URL ni .env.');
    const target = new URL(process.env.DEMO_DATABASE_URL);
    const name = target.pathname.slice(1);
    if (!/^pgc_demo_[a-z0-9_]+$/.test(name)) throw new Error('La base debe llamarse pgc_demo_* (solo minúsculas, números y guiones bajos).');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error('Solo se permiten bases locales.');
    const adminUrl = new URL(target); adminUrl.pathname = '/postgres';
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.href } } });
    try {
      const found = await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${name}`;
      if (!found.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    } finally { await admin.$disconnect(); }
    const env = { ...process.env, DATABASE_URL: target.href };
    const migration = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { env, stdio: 'inherit' });
    if (migration.status !== 0) throw new Error('Falló la migración de la base de demo');
    let config;
    try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}
    if (!config || config.databaseUrl !== target.href) config = {
      databaseUrl: target.href, jwtSecret: randomUUID() + randomUUID(),
      email: `analista-${randomUUID()}@example.test`, password: randomUUID(),
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    console.log('Base de demo migrada. Configuración privada:', configPath);
  } else if (mode === 'seed') {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (!/^\/pgc_demo_[a-z0-9_]+$/.test(new URL(config.databaseUrl).pathname)) throw new Error('Configuración de demo inválida');
    // Verify that the running API uses the same isolated database before writing via HTTP.
    const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
    async function request(path, body, token, method = 'POST') {
      const response = await fetch('http://127.0.0.1:4014/api' + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      return data;
    }
    // Require a JWT signed with this demo's secret: /auth/me must find a marker in this DB.
    const jwt = require('jsonwebtoken');
    const marker = await db.usuario.create({ data: { nombre: 'Verificación local', email: `${randomUUID()}@example.test`, password: 'cuenta-sin-login', rol: 'ANALISTA' } });
    try {
      const token = jwt.sign({ id: marker.id }, config.jwtSecret, { expiresIn: '1m' });
      await request('/auth/me', undefined, token, 'GET');
      const existing = await db.usuario.findUnique({ where: { email: config.email } });
      const session = existing ? await request('/auth/login', config) : await request('/auth/register', { nombre: 'Analista de demostración', email: config.email, password: config.password });
      if (session.usuario.rol !== 'ANALISTA') throw new Error('Se esperaba un analista');
      if (!config.reviewerEmail || !config.reviewerPassword) {
        config.reviewerEmail = `revisor-${randomUUID()}@example.test`;
        config.reviewerPassword = randomUUID();
      }
      await db.usuario.upsert({
        where: { email: config.reviewerEmail }, update: {},
        create: { nombre: 'Revisor de demostración', email: config.reviewerEmail,
          password: await require('bcryptjs').hash(config.reviewerPassword, 10), rol: 'REVISOR' },
      });
      await db.categoria.upsert({ where: { nombre: 'Demo · Operaciones' }, update: {},
        create: { nombre: 'Demo · Operaciones', descripcion: 'Categoría ficticia para el recorrido local' } });
      let document = await db.documento.findFirst({ where: { autorId: session.usuario.id, titulo: 'Guía de despliegue' } });
      if (!document) document = (await request('/documentos', {
        titulo: 'Guía de despliegue', contenido: 'DEMOSTRACIÓN PGC · FARO AZUL 42\n\n1. Compilar la aplicación de prueba.\n2. Aplicar las migraciones en la base de demo.\n3. Iniciar la API y comprobar el servicio.\n\nDatos ficticios: este documento no describe un despliegue de producción.',
      }, session.token)).documento;
      config.documentId = document.id;
      writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      console.log('Analista y documento preparados. Credenciales solo en', configPath);
    } finally {
      await db.usuario.delete({ where: { id: marker.id } });
      await db.$disconnect();
    }
  } else throw new Error('Uso: node scripts/demo.cjs prepare|seed');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
