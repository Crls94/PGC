import { useEffect, useState, type FormEvent } from 'react';
import { documentService } from './services/api';
import type { Documento, Usuario, VersionDocumento } from './types';

export function DocumentActions({ doc, user, versions, refresh, fail }: {
  doc: Documento; user: Usuario; versions: VersionDocumento[];
  refresh: () => Promise<void>; fail: (error: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [baseline, setBaseline] = useState(doc);
  const [draft, setDraft] = useState({ titulo: doc.titulo, contenido: doc.contenidoActual, motivo: '' });
  const dirty = draft.titulo !== baseline.titulo || draft.contenido !== baseline.contenidoActual || draft.motivo !== '';
  const draftVersion = baseline.versiones?.[0]?.numeroVersion;
  const allowed = (user.rol !== 'ANALISTA' || doc.estado !== 'PUBLICADO') &&
    (doc.estado !== 'BORRADOR' || doc.autorId === user.id || user.rol === 'ADMIN');
  const expected = doc.versiones?.[0]?.numeroVersion;
  const newer = expected != null && draftVersion != null && expected > draftVersion;
  useEffect(() => {
    if (!busy && !dirty && (doc.versiones?.[0]?.numeroVersion ?? 0) >= (draftVersion ?? 0)) {
      setBaseline(doc);
      setDraft({ titulo: doc.titulo, contenido: doc.contenidoActual, motivo: '' });
    }
  }, [doc, busy, dirty, draftVersion]);

  function useCurrent() {
    if (dirty && !window.confirm('¿Descartar los cambios sin guardar y cargar la versión vigente?')) return;
    setBaseline(doc); setDraft({ titulo: doc.titulo, contenido: doc.contenidoActual, motivo: '' });
    setError(''); setNotice('Formulario actualizado con la versión vigente.');
  }

  async function run(action: () => Promise<unknown>, remove = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      await action();
      if (remove) { location.hash = '/buscar'; return; }
      setNotice('Cambio guardado. Si la actualización de la vista falla, reintenta la lectura; no repitas el guardado.');
      try { await refresh(); }
      catch { setNotice('Cambio guardado, pero no se pudo actualizar la vista. Reintenta «Actualizar documento e historial»; no repitas el guardado.'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.'); fail(e);
    } finally { setBusy(false); }
  }
  async function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || draftVersion == null) return;
    const titulo = draft.titulo.trim(), contenido = draft.contenido;
    const mensajeCambio = draft.motivo.trim();
    if (!titulo || !contenido.trim() || !mensajeCambio) { setError('Completa título, contenido y motivo sin usar solo espacios.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await documentService.actualizar(doc.id, { titulo, contenido, mensajeCambio, versionEsperada: draftVersion });
      // La respuesta del guardado fija la nueva base incluso si falla la lectura posterior.
      const saved = { ...result.documento, versiones: [result.version] };
      setBaseline(saved);
      setDraft({ titulo: saved.titulo, contenido: saved.contenidoActual, motivo: '' });
      setNotice('Nueva versión guardada.');
      try { await refresh(); }
      catch { setNotice('Nueva versión guardada, pero no se pudo actualizar la vista. Reintenta «Actualizar documento e historial»; no repitas el guardado.'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.'); fail(e);
    } finally { setBusy(false); }
  }
  return <section className="workflow-section document-actions">
    {error && <p role="alert">{error} Usa «Actualizar documento e historial» antes de reintentar.</p>}
    {notice && <p role="status">{notice}</p>}
    {!allowed && <p className="muted">{doc.estado === 'BORRADOR' ? 'Editar este borrador requiere ser Autor o Administrador.' : 'Un Analista debe proponer cambios para modificar un documento publicado.'}</p>}
    {allowed && <details><summary>Editar documento</summary><form onSubmit={edit}>
      <p>Edición basada en la versión {draftVersion ?? 'desconocida'}.</p>
      {newer && dirty && <p role="alert">El documento vigente cambió. Tu edición conserva su texto y su versión base. Revisa el contenido vigente antes de continuar.</p>}
      <label>Título<input name="titulo" value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} disabled={busy} required /></label>
      <label>Contenido<textarea rows={8} name="contenido" value={draft.contenido} onChange={e => setDraft(d => ({ ...d, contenido: e.target.value }))} disabled={busy} required /></label>
      <label>Motivo<input name="motivo" value={draft.motivo} onChange={e => setDraft(d => ({ ...d, motivo: e.target.value }))} disabled={busy} required /></label>
      <button disabled={busy || draftVersion == null}>{busy ? 'Guardando…' : 'Guardar nueva versión'}</button>
      {newer && dirty && <button type="button" className="secondary" disabled={busy} onClick={useCurrent}>Descartar mi edición y cargar versión actual</button>}
    </form></details>}
    {user.rol === 'ANALISTA' && <p className="muted">Restaurar versiones requiere ser Revisor o Administrador.</p>}
    {user.rol !== 'ANALISTA' && <details><summary>Restaurar una versión</summary>
      {versions.length === 0 && <p>No hay versiones cargadas para restaurar.</p>}
      {versions.map(v => <button className="secondary" key={v.id} disabled={busy} onClick={() => {
        if (window.confirm(`¿Restaurar versión ${v.numeroVersion}? Se creará una nueva versión.`)) void run(() => documentService.restaurarVersion(doc.id, v.id, expected));
      }}>Restaurar versión {v.numeroVersion}</button>)}
    </details>}
    {(user.id === doc.autorId || user.rol === 'ADMIN') ? <button className="danger" disabled={busy} onClick={() => {
      if (window.confirm(`¿Eliminar definitivamente «${doc.titulo}» y su historial?`)) void run(() => documentService.eliminar(doc.id), true);
    }}>Eliminar documento</button> : <p className="muted">Eliminar este documento requiere ser Autor o Administrador.</p>}
  </section>;
}
