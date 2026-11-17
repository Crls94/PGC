const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

test("registro y permisos de propuestas sobre un documento publicado", async (t) => {
  const database = new URL(process.env.DATABASE_URL);
  assert.match(database.pathname, /^\/pgc_permissions_test_/,
    "Usar exclusivamente una base pgc_permissions_test_* migrada");
  const prisma = new PrismaClient();
  const port = "4003";
  const server = spawn(process.execPath, ["--require", "dotenv/config", "dist/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: port, JWT_SECRET: randomUUID() },
    stdio: "pipe",
  });
  t.after(async () => {
    server.kill();
    await prisma.$disconnect();
  });
  const base = `http://127.0.0.1:${port}/api`;
  async function request(path, method = "GET", body, token) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      ready = (await request("/health")).status === 200;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "La API debe arrancar");
  const password = randomUUID();
  let analyst;
  for (const rol of ["ADMIN", "REVISOR", "ANALISTA", "INVALIDO", undefined]) {
    const registered = await request("/auth/register", "POST", {
      nombre: "Prueba", email: `${randomUUID()}@example.test`, password, rol,
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.usuario.rol, "ANALISTA");
    const saved = await prisma.usuario.findUniqueOrThrow({
      where: { id: registered.body.usuario.id },
    });
    assert.equal(saved.rol, "ANALISTA");
    analyst = registered.body;
  }
  // El revisor se provisiona directamente en la base de prueba.
  const reviewer = await prisma.usuario.create({
    data: {
      nombre: "Revisor de prueba", email: `${randomUUID()}@example.test`,
      password: await bcrypt.hash(password, 10), rol: "REVISOR",
    },
  });
  const login = await request("/auth/login", "POST", { email: reviewer.email, password });
  assert.equal(login.status, 200);
  const document = await prisma.documento.create({
    data: {
      titulo: "Publicado", contenidoActual: "Original", estado: "PUBLICADO",
      autorId: analyst.usuario.id,
      versiones: { create: {
        numeroVersion: 1, contenido: "Original", mensajeCambio: "Inicial",
        autorId: analyst.usuario.id,
      } },
    },
    include: { versiones: true },
  });
  const path = `/documentos/${document.id}`;
  for (const change of [{ contenido: "Edición directa" }, { titulo: "Otro título" }]) {
    assert.equal((await request(path, "PUT", change, analyst.token)).status, 403);
  }
  assert.equal((await request(path, "PUT", {
    contenido: "Sin revisión", estado: "BORRADOR",
  }, analyst.token)).status, 403);
  assert.equal((await request(`${path}/restaurar/${document.versiones[0].id}`,
    "POST", undefined, analyst.token)).status, 403);
  assert.equal((await request(path, "PUT", { contenido: "Anónimo" })).status, 401);
  assert.equal(await prisma.version.count({ where: { documentoId: document.id } }), 1);
  const unchanged = await prisma.documento.findUniqueOrThrow({
    where: { id: document.id },
  });
  assert.equal(unchanged.contenidoActual, "Original");
  assert.equal(unchanged.estado, "PUBLICADO");
  assert.equal(unchanged.titulo, "Publicado");
  for (const action of ["aprobar", "rechazar"]) {
    const proposal = await request("/propuestas", "POST", {
      documentoId: document.id, contenidoPropuesto: "Propuesto", mensaje: action,
      versionBase: action === "aprobar" ? 1 : 2,
    }, analyst.token);
    assert.equal(proposal.status, 201);
    const decision = `/propuestas/${proposal.body.propuesta.id}/${action}`;
    assert.equal((await request(decision, "PUT", {}, analyst.token)).status, 403);
    const resolved = await request(decision, "PUT", {
      comentarioRevision: "Revisado",
    }, login.body.token);
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.propuesta.estado, action === "aprobar" ? "APROBADA" : "RECHAZADA");
  }
  assert.equal(await prisma.version.count({ where: { documentoId: document.id } }), 2);
  assert.equal((await prisma.documento.findUniqueOrThrow({
    where: { id: document.id },
  })).contenidoActual, "Propuesto");
});
