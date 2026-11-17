const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

test('crear → proponer → aprobar/rechazar → historial; conflictos y permisos', async t => {
  const c = JSON.parse(readFileSync(join(tmpdir(), 'pgc-demo-local.json'), 'utf8'));
  assert.match(new URL(c.databaseUrl).pathname, /^\/pgc_demo_[a-z0-9_]+$/);
  const db = new PrismaClient({ datasources: { db: { url: c.databaseUrl } } });
  let createdId;
  t.after(async () => {
    try { if (createdId) await db.documento.delete({ where: { id: createdId } }); }
    finally { await db.$disconnect(); }
  });
  async function req(path, method = 'GET', body, token) {
    const r = await fetch('http://127.0.0.1:4014/api' + path, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  }
  // Check this server's database and secret before any HTTP mutation.
  const user = await db.usuario.findUniqueOrThrow({ where: { email: c.email } });
  const jwt = require('jsonwebtoken');
  const check = await req('/auth/me', 'GET', undefined, jwt.sign({ id: user.id }, c.jwtSecret));
  assert.equal(check.status, 200); assert.equal(check.data.usuario.id, user.id);
  const analyst = (await req('/auth/login', 'POST', { email: c.email, password: c.password })).data;
  const reviewer = (await req('/auth/login', 'POST', { email: c.reviewerEmail, password: c.reviewerPassword })).data;
  assert.equal(analyst.usuario.rol, 'ANALISTA'); assert.equal(reviewer.usuario.rol, 'REVISOR');
  assert.equal((await req('/auth/login', 'POST', { email: c.email, password: randomUUID() })).status, 401);
  const category = await db.categoria.findUniqueOrThrow({ where: { nombre: 'Demo · Operaciones' } });
  const created = await req('/documentos', 'POST', { titulo: `Prueba flujo ${randomUUID()}`, contenido: 'FARO V1', categoriaId: category.id }, analyst.token);
  assert.equal(created.status, 201);
  const id = created.data.documento.id;
  // Retirar únicamente el documento creado por esta ejecución y sus relaciones en cascada.
  createdId = id;
  const path = `/documentos/${id}`;
  async function snapshot() {
    const d = await req(path, 'GET', undefined, analyst.token);
    const v = await req(`${path}/versiones`, 'GET', undefined, analyst.token);
    assert.equal(d.status, 200); assert.equal(v.status, 200);
    return { documento: d.data.documento, versiones: v.data.versiones };
  }
  const initial = await snapshot();
  assert.equal(initial.documento.categoria.id, category.id);
  assert.equal(initial.documento.contenidoActual, 'FARO V1');
  assert.deepEqual(initial.versiones.map(v => v.numeroVersion), [1]);
  const propose = (content, versionBase) => req('/propuestas', 'POST', { documentoId: id, contenidoPropuesto: content, mensaje: 'Motivo ficticio', versionBase }, analyst.token);
  assert.equal((await propose('Sin base')).status, 400);
  const a = await propose('FARO V2', 1); const old = await propose('OBSOLETO', 1);
  assert.equal(a.status, 201); assert.equal(old.status, 201);
  assert.deepEqual(await snapshot(), initial, 'La propuesta pendiente no cambia documento ni versiones');
  assert.equal((await req(`/propuestas/${a.data.propuesta.id}/aprobar`, 'PUT', {}, analyst.token)).status, 403);
  assert.equal((await req(`/propuestas/${a.data.propuesta.id}/rechazar`, 'PUT', {}, analyst.token)).status, 403);
  const approved = await req(`/propuestas/${a.data.propuesta.id}/aprobar`, 'PUT', {}, reviewer.token);
  assert.equal(approved.status, 200);
  const afterApproval = await snapshot();
  assert.equal(afterApproval.documento.contenidoActual, 'FARO V2');
  assert.deepEqual(afterApproval.versiones.map(v => v.numeroVersion), [2, 1]);
  assert.equal(afterApproval.versiones[1].contenido, 'FARO V1');
  assert.equal((await req(`/propuestas/${old.data.propuesta.id}/aprobar`, 'PUT', {}, reviewer.token)).status, 409);
  assert.equal((await propose('BASE ANTIGUA', 1)).status, 409);
  assert.equal((await req(`/propuestas/${a.data.propuesta.id}/aprobar`, 'PUT', {}, reviewer.token)).status, 409);
  assert.deepEqual(await snapshot(), afterApproval, 'Los conflictos no alteran documento ni historial');
  const rejected = await propose('NO APLICAR', 2);
  assert.equal(rejected.status, 201);
  assert.equal((await req(`/propuestas/${rejected.data.propuesta.id}/rechazar`, 'PUT', { comentarioRevision: 'Rechazo ficticio' }, reviewer.token)).status, 200);
  assert.deepEqual(await snapshot(), afterApproval, 'Rechazar conserva el documento completo y su historial');
  const legacy = await db.propuestaCambio.create({ data: { documentoId: id, autorId: user.id, contenidoPropuesto: 'SIN BASE', mensaje: 'Propuesta anterior', versionBase: null } });
  assert.equal((await req(`/propuestas/${legacy.id}/aprobar`, 'PUT', {}, reviewer.token)).status, 409);
  assert.equal((await req(`/propuestas/${legacy.id}/rechazar`, 'PUT', { comentarioRevision: 'Base desconocida' }, reviewer.token)).status, 200);
  assert.deepEqual(await snapshot(), afterApproval);
  // Dos propuestas basadas en v2 se aprueban simultáneamente: solo una debe ganar.
  const b = await propose('CONCURRENCIA A', 2); const d = await propose('CONCURRENCIA B', 2);
  const concurrent = await Promise.all([b, d].map(p => req(`/propuestas/${p.data.propuesta.id}/aprobar`, 'PUT', {}, reviewer.token)));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  const afterConcurrent = await snapshot();
  assert.deepEqual(afterConcurrent.versiones.map(v => v.numeroVersion), [3, 2, 1]);
  assert.equal(afterConcurrent.documento.contenidoActual, concurrent.find(r => r.status === 200).data.documento.contenidoActual);
  // Aprobar y rechazar la misma propuesta a la vez también deben tener una sola decisión.
  const same = await propose('DECISIÓN ÚNICA', 3);
  const race = await Promise.all(['aprobar', 'rechazar'].map(action => req(`/propuestas/${same.data.propuesta.id}/${action}`, 'PUT', {}, reviewer.token)));
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
  const final = await snapshot();
  const state = await db.propuestaCambio.findUniqueOrThrow({ where: { id: same.data.propuesta.id } });
  assert.equal(final.versiones.length, state.estado === 'APROBADA' ? 4 : 3);
  assert.equal(final.documento.contenidoActual, state.estado === 'APROBADA' ? 'DECISIÓN ÚNICA' : afterConcurrent.documento.contenidoActual);
  assert.equal((await req(path)).status, 401);
  const empty = await req('/documentos?busqueda=' + randomUUID(), 'GET', undefined, analyst.token);
  assert.equal(empty.data.total, 0);
  console.log('OK: v1, pendiente intacta, 403 analista, aprobación v2, rechazo intacto, bases antiguas/sin base 409, decisiones concurrentes, lectura anónima 401 y búsqueda vacía.');
});
