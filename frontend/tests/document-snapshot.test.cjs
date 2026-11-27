const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/documentSnapshot.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(output, context);
const { documentSnapshot } = context.exports;
const version = (n, contenido) => ({ numeroVersion: n, contenido });
const document = (n, contenido) => ({ contenidoActual: contenido, versiones: [{ numeroVersion: n }] });

test('historial avanzado: el contenido inicial conserva su base original', () => {
  const snapshot = documentSnapshot(document(1, 'Original'), [version(2, 'Nuevo'), version(1, 'Original')]);
  assert.equal(snapshot.versionBase, 1);
  assert.equal(snapshot.contenido, 'Original');
});
test('rechaza contenido que no coincide con la versión indicada', () => {
  assert.throws(() => documentSnapshot(document(2, 'Antiguo'), [version(2, 'Nuevo')]), /no coinciden/);
});
test('sin base comprobable no se inventa una', () => {
  assert.throws(() => documentSnapshot({ contenidoActual: 'Texto' }, [version(1, 'Texto')]), /no coinciden/);
});
test('una lectura nueva y coherente puede usarse explícitamente como nuevo borrador', () => {
  const snapshot = documentSnapshot(document(2, '  Nuevo\n'), [version(2, '  Nuevo\n'), version(1, 'Original')]);
  assert.equal(snapshot.versionBase, 2);
  assert.equal(snapshot.contenido, '  Nuevo\n');
});
