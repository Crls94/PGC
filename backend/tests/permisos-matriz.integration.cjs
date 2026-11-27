const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

// Matriz de permisos por rol, propiedad y estado del documento, y separación de
// funciones en la revisión de propuestas. Requiere `npm run build` previo.
test("matriz de permisos de documentos y bloqueo de auto-revisión", async (t) => {
  const database = new URL(process.env.DATABASE_URL);
  assert.match(database.pathname, /^\/pgc_permissions_test_/,
    "Usar exclusivamente una base pgc_permissions_test_* migrada");
  const prisma = new PrismaClient();
  const secret = randomUUID();
  const port = "4004";
  const server = spawn(process.execPath, ["--require", "dotenv/config", "dist/index.js"], {
    cwd: process.cwd(), env: { ...process.env, PORT: port, JWT_SECRET: secret }, stdio: "pipe",
  });
  const userIds = [];
  t.after(async () => {
    server.kill();
    await prisma.propuestaCambio.deleteMany({ where: { autorId: { in: userIds } } });
    await prisma.documento.deleteMany({ where: { autorId: { in: userIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
  const base = `http://127.0.0.1:${port}/api`;
  async function request(path, method = "GET", body, user) {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${user.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  let ready = false;
  for (let attempt = 0; attempt < 50 && !ready; attempt++) {
    try { ready = (await request("/health")).status === 200; } catch {}
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "La API debe arrancar");

  async function makeUser(rol) {
    const user = await prisma.usuario.create({ data: {
      nombre: `Prueba ${rol}`, email: `${randomUUID()}@example.test`, password: "sin-uso", rol,
    } });
    userIds.push(user.id);
    return { ...user, token: jwt.sign({ id: user.id }, secret) };
  }
  const autor = await makeUser("ANALISTA");
  const otroAnalista = await makeUser("ANALISTA");
  const revisor = await makeUser("REVISOR");
  const otroRevisor = await makeUser("REVISOR");
  const admin = await makeUser("ADMIN");

  async function makeDoc(estado, owner = autor) {
    return prisma.documento.create({
      data: {
        titulo: `Matriz ${estado}`, contenidoActual: "Original", estado, autorId: owner.id,
        versiones: { create: { numeroVersion: 1, contenido: "Original", mensajeCambio: "Inicial", autorId: owner.id } },
      },
      include: { versiones: true },
    });
  }
  async function assertUnchanged(doc, label) {
    const saved = await prisma.documento.findUniqueOrThrow({ where: { id: doc.id } });
    assert.equal(saved.contenidoActual, "Original", label);
    assert.equal(saved.estado, doc.estado, label);
    assert.equal(await prisma.version.count({ where: { documentoId: doc.id } }), 1, label);
  }

  await t.test("editar contenido directamente", async () => {
    const estados = ["BORRADOR", "EN_REVISION", "PUBLICADO", "OBSOLETO"];
    const esperado = {
      autor: { BORRADOR: 200, EN_REVISION: 403, PUBLICADO: 403, OBSOLETO: 403 },
      otroAnalista: { BORRADOR: 403, EN_REVISION: 403, PUBLICADO: 403, OBSOLETO: 403 },
      revisor: { BORRADOR: 403, EN_REVISION: 200, PUBLICADO: 200, OBSOLETO: 200 },
      admin: { BORRADOR: 200, EN_REVISION: 200, PUBLICADO: 200, OBSOLETO: 200 },
    };
    const actores = { autor, otroAnalista, revisor, admin };
    for (const [nombre, actor] of Object.entries(actores)) {
      for (const estado of estados) {
        const doc = await makeDoc(estado);
        const label = `${nombre} edita ${estado}`;
        const result = await request(`/documentos/${doc.id}`, "PUT", { contenido: "Editado", versionEsperada: 1 }, actor);
        assert.equal(result.status, esperado[nombre][estado], label);
        if (result.status === 403) await assertUnchanged(doc, label);
        else assert.equal(await prisma.version.count({ where: { documentoId: doc.id } }), 2, label);
      }
    }
  });

  await t.test("cambiar estado", async () => {
    const casos = [
      [autor, "BORRADOR", "EN_REVISION", 200],
      [autor, "BORRADOR", "PUBLICADO", 403],
      [autor, "BORRADOR", "OBSOLETO", 403],
      [autor, "EN_REVISION", "BORRADOR", 403],
      [otroAnalista, "EN_REVISION", "OBSOLETO", 403],
      [otroAnalista, "OBSOLETO", "BORRADOR", 403],
      [revisor, "BORRADOR", "EN_REVISION", 403],
      [revisor, "EN_REVISION", "PUBLICADO", 200],
      [revisor, "PUBLICADO", "OBSOLETO", 200],
      [admin, "BORRADOR", "PUBLICADO", 200],
    ];
    for (const [actor, desde, hacia, status] of casos) {
      const doc = await makeDoc(desde);
      const label = `${actor.rol} ${actor === autor ? "(autor)" : ""} ${desde} → ${hacia}`;
      const result = await request(`/documentos/${doc.id}`, "PUT", { estado: hacia, versionEsperada: 1 }, actor);
      assert.equal(result.status, status, label);
      if (status === 403) { await assertUnchanged(doc, label); continue; }
      assert.equal(result.body.documento.estado, hacia, label);
      assert.equal(result.body.version.mensajeCambio, `Cambio de estado: ${desde} → ${hacia}`, label);
      assert.equal(result.body.version.contenido, "Original", label);
    }
  });

  await t.test("eliminar", async () => {
    const casos = [
      [autor, "PUBLICADO", 403], [autor, "EN_REVISION", 403], [autor, "BORRADOR", 200],
      [otroAnalista, "BORRADOR", 403], [revisor, "PUBLICADO", 403], [admin, "PUBLICADO", 200],
    ];
    for (const [actor, estado, status] of casos) {
      const doc = await makeDoc(estado);
      const label = `${actor.rol} elimina ${estado}`;
      assert.equal((await request(`/documentos/${doc.id}`, "DELETE", undefined, actor)).status, status, label);
      if (status === 403) await assertUnchanged(doc, label);
      else {
        assert.equal(await prisma.documento.count({ where: { id: doc.id } }), 0, label);
        assert.equal(await prisma.version.count({ where: { documentoId: doc.id } }), 0, label);
      }
    }
  });

  await t.test("restaurar", async () => {
    const borrador = await makeDoc("BORRADOR");
    const path = (doc) => `/documentos/${doc.id}/restaurar/${doc.versiones[0].id}`;
    assert.equal((await request(path(borrador), "POST", { versionEsperada: 1 }, revisor)).status, 403);
    await assertUnchanged(borrador, "revisor restaura borrador ajeno");
    const publicado = await makeDoc("PUBLICADO");
    assert.equal((await request(path(publicado), "POST", { versionEsperada: 1 }, autor)).status, 403);
    assert.equal((await request(path(publicado), "POST", { versionEsperada: 1 }, revisor)).status, 200);
  });

  await t.test("permisos expuestos en el detalle", async () => {
    const borrador = await makeDoc("BORRADOR");
    assert.deepEqual((await request(`/documentos/${borrador.id}`, "GET", undefined, autor)).body.documento.permisos,
      { editar: true, eliminar: true, restaurar: false, estadosPermitidos: ["EN_REVISION"] });
    assert.deepEqual((await request(`/documentos/${borrador.id}`, "GET", undefined, otroAnalista)).body.documento.permisos,
      { editar: false, eliminar: false, restaurar: false, estadosPermitidos: [] });
    const publicado = await makeDoc("PUBLICADO");
    assert.deepEqual((await request(`/documentos/${publicado.id}`, "GET", undefined, revisor)).body.documento.permisos,
      { editar: true, eliminar: false, restaurar: true, estadosPermitidos: ["BORRADOR", "EN_REVISION", "OBSOLETO"] });
  });

  await t.test("crear con estado inválido", async () => {
    const result = await request("/documentos", "POST", { titulo: "X", contenido: "Y", estado: "INVENTADO" }, revisor);
    assert.equal(result.status, 400);
  });

  await t.test("nadie decide sobre su propia propuesta", async () => {
    for (const [proponente, decisor] of [[revisor, otroRevisor], [admin, revisor]]) {
      const doc = await makeDoc("PUBLICADO", otroAnalista);
      const created = await request("/propuestas", "POST", {
        documentoId: doc.id, contenidoPropuesto: "Propio", mensaje: "Auto-revisión", versionBase: 1,
      }, proponente);
      assert.equal(created.status, 201);
      const id = created.body.propuesta.id;
      for (const action of ["aprobar", "rechazar", "devolver"]) {
        const result = await request(`/propuestas/${id}/${action}`, "PUT", { comentarioRevision: "Propio" }, proponente);
        assert.equal(result.status, 403, `${proponente.rol} ${action} su propuesta`);
      }
      const pending = await prisma.propuestaCambio.findUniqueOrThrow({ where: { id } });
      assert.equal(pending.estado, "PENDIENTE");
      assert.equal(pending.revisorId, null);
      assert.equal(await prisma.version.count({ where: { documentoId: doc.id } }), 1);
      const approved = await request(`/propuestas/${id}/aprobar`, "PUT", {}, decisor);
      assert.equal(approved.status, 200, "Otro revisor sí puede decidir");
      assert.equal(approved.body.propuesta.revisorId, decisor.id);
    }
  });
});
