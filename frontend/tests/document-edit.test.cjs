const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/DocumentActions.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
// Permisos que el backend calcula para un Analista sobre su propio borrador.
const ownDraft = { editar: true, eliminar: true, restaurar: false, estadosPermitidos: ['EN_REVISION'] };
const document = (n, permisos = ownDraft) => ({ id: 'doc', titulo: `Título ${n}`, contenidoActual: `Contenido ${n}`, actualizadoEn: `fecha-${n}`, estado: 'BORRADOR', autorId: 'user', versiones: [{ numeroVersion: n }], permisos });

// Ejecuta el componente real con estado y efectos controlados, sin DOM ni red.
function setup() {
  const states = [], deps = [];
  let cursor, effects, changed, tree;
  const calls = [], errors = [];
  const props = { doc: document(1), user: { id: 'user', rol: 'ANALISTA' }, versions: [], refresh: async () => {}, fail: e => errors.push(e) };
  const service = { actualizar: async (...args) => { calls.push(args); return { documento: document(2), version: { numeroVersion: 2 } }; } };
  const confirm = { value: false, calls: 0 };
  const context = { exports: {}, window: { confirm: () => { confirm.calls++; return confirm.value; } }, require(name) {
    if (name === './services/api') return { documentService: service };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react') return {
      useState(initial) {
        const i = cursor++;
        if (!(i in states)) states[i] = initial;
        return [states[i], value => { const next = typeof value === 'function' ? value(states[i]) : value; if (!Object.is(next, states[i])) { states[i] = next; changed = true; } }];
      },
      useEffect(fn, values) {
        const i = cursor++;
        if (!deps[i] || values.some((v, j) => !Object.is(v, deps[i][j]))) { deps[i] = values; effects.push(fn); }
      },
    };
    throw new Error(name);
  } };
  vm.runInNewContext(source, context);
  function render() {
    for (let n = 0; n < 20; n++) {
      cursor = 0; effects = []; changed = false;
      tree = context.exports.DocumentActions(props);
      effects.forEach(fn => fn());
      if (!changed) return tree;
    }
    throw new Error('Render no converge');
  }
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children ?? null)];
  }
  const field = name => nodes().find(n => n.props?.name === name);
  const button = label => nodes().find(n => n.type === 'button' && n.props.children === label);
  const forms = () => nodes().filter(n => n.type === 'form');
  function change(name, value) { field(name).props.onChange({ target: { value } }); render(); }
  async function submit() { await nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); render(); }
  render();
  return { props, service, calls, errors, confirm, render, nodes, field, button, forms, change, submit };
}

test('actualizar con edición local conserva los tres campos y envía la base original', async () => {
  const h = setup();
  h.change('titulo', 'Mi título'); h.change('contenido', 'Mi edición'); h.change('motivo', 'Mi motivo');
  h.props.doc = document(2); h.render();
  assert.equal(h.field('titulo').props.value, 'Mi título');
  assert.equal(h.field('contenido').props.value, 'Mi edición');
  assert.equal(h.field('motivo').props.value, 'Mi motivo');
  h.service.actualizar = async (id, data) => { h.calls.push([id, data]); throw new Error('Conflicto 409'); };
  await h.submit();
  assert.equal(h.calls[0][1].versionEsperada, 1);
  assert.equal(h.field('contenido').props.value, 'Mi edición');
  assert.equal(h.field('motivo').props.value, 'Mi motivo');
});

test('el reemplazo solo aparece con cambios locales sobre una versión antigua', () => {
  const h = setup();
  const label = 'Descartar mi edición y cargar versión actual';
  assert.equal(h.button(label), undefined);
  h.change('contenido', 'Mi borrador');
  assert.equal(h.button(label), undefined);
  h.props.doc = document(2); h.render();
  assert.ok(h.button(label));
  h.confirm.value = true; h.button(label).props.onClick(); h.render();
  assert.equal(h.button(label), undefined);
});

test('sin cambios locales se sincroniza con el documento actualizado', () => {
  const h = setup(); h.props.doc = document(2); h.render();
  assert.equal(h.field('contenido').props.value, 'Contenido 2');
});

test('reemplazar un borrador exige confirmación y actualiza su base', async () => {
  const h = setup(); h.change('contenido', 'Borrador'); h.props.doc = document(2); h.render();
  h.button('Descartar mi edición y cargar versión actual').props.onClick(); h.render();
  assert.equal(h.field('contenido').props.value, 'Borrador');
  h.confirm.value = true;
  h.button('Descartar mi edición y cargar versión actual').props.onClick(); h.render();
  assert.equal(h.confirm.calls, 2);
  assert.equal(h.field('contenido').props.value, 'Contenido 2');
  h.change('motivo', 'Nuevo motivo'); await h.submit();
  assert.equal(h.calls[0][1].versionEsperada, 2);
});

test('guardado exitoso conserva la nueva base aunque falle la recarga', async () => {
  const h = setup(); h.change('contenido', 'Contenido 2'); h.change('motivo', 'Cambio');
  h.props.refresh = async () => { throw new Error('Sin conexión'); };
  h.render();
  await h.submit();
  assert.equal(h.field('contenido').props.value, 'Contenido 2');
  assert.equal(h.field('motivo').props.value, '');
  assert.ok(h.nodes().some(n => n.props?.role === 'status' && n.props.children.includes('no repitas el guardado')));
  assert.equal(h.errors.length, 0);
  h.change('motivo', 'Siguiente cambio'); await h.submit();
  assert.equal(h.calls[1][1].versionEsperada, 2);
});

test('el selector de estado solo ofrece los estados permitidos y envía la versión vigente', async () => {
  const h = setup();
  // Los objetos nacen en otro contexto de vm: se comparan por JSON.
  const plain = value => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(h.field('estadoNuevo').props.children[1].map(o => o.props.value)), ['EN_REVISION']);
  h.change('estadoNuevo', 'EN_REVISION'); h.change('motivoEstado', '  Listo para revisar ');
  h.forms()[1].props.onSubmit({ preventDefault() {} });
  await new Promise(r => setImmediate(r)); h.render();
  assert.deepEqual(plain(h.calls[0]), ['doc', { estado: 'EN_REVISION', mensajeCambio: 'Listo para revisar', versionEsperada: 1 }]);
  assert.equal(h.field('estadoNuevo').props.value, '');
  assert.equal(h.errors.length, 0);
});

test('sin permisos no se ofrece editar, cambiar estado, restaurar ni eliminar', () => {
  for (const permisos of [{ editar: false, eliminar: false, restaurar: false, estadosPermitidos: [] }, undefined]) {
    const h = setup(); h.props.doc = { ...document(1), permisos, estado: 'PUBLICADO', autorId: 'otro' }; h.render();
    assert.equal(h.forms().length, 0);
    assert.equal(h.button('Eliminar documento'), undefined);
    assert.ok(h.nodes().some(n => n.props?.className === 'muted' && String(n.props.children).includes('envía una propuesta')));
  }
});

test('los campos se bloquean durante el guardado y se sincronizan al completarlo', async () => {
  const h = setup(); h.change('motivo', 'Cambio');
  let resolve;
  h.props.refresh = async () => { h.props.doc = document(2); };
  h.render();
  h.service.actualizar = () => new Promise(r => { resolve = r; });
  const pending = h.submit(); h.render();
  for (const name of ['titulo', 'contenido', 'motivo']) assert.equal(h.field(name).props.disabled, true);
  resolve({ documento: document(2), version: { numeroVersion: 2 } }); await pending;
  assert.equal(h.field('contenido').props.value, 'Contenido 2');
  assert.equal(h.field('motivo').props.value, '');
  assert.equal(h.field('contenido').props.disabled, false);
});
