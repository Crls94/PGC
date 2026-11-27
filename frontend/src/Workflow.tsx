import { StateBadge } from './Visual';
import { DocumentActions, TagSelector } from './Extras';
import { Correction } from './Correction';
import { documentSnapshot } from './documentSnapshot';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, categoryService, documentService, proposalService } from './services/api';
import type { Categoria, Documento, DocumentoListado, PropuestaCambio, Usuario, VersionDocumento } from './types';

type Failure = (error: unknown) => void;
type Props = { fail: Failure };
type Diff = Awaited<ReturnType<typeof documentService.compararDiff>>;

export function CreateDocument({ fail }: Props) {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [relatedDocuments, setRelatedDocuments] = useState<DocumentoListado[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryError, setCategoryError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setCategoryError(false);
    Promise.all([categoryService.listarCategorias(), documentService.listar()]).then(([r, documents]) => {
      if (active) { setCategories(r.categorias); setRelatedDocuments(documents.documentos); }
    })
      .catch(e => { if (active) { setCategoryError(true); fail(e); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const titulo = String(data.get('titulo')).trim();
    const contenido = String(data.get('contenido'));
    const etiquetas = [...new Set(String(data.get('etiquetas')).split(',').map(x => x.trim().toLowerCase()).filter(Boolean))];
    etiquetas.push(...data.getAll('etiquetaSeleccionada').map(String).filter(x => !etiquetas.includes(x)));
    const documentosRelacionadosIds = data.getAll('relacionados').map(String);
    if (!titulo || !contenido.trim()) { fail(new Error('Completa el título y el contenido.')); return; }
    setBusy(true);
    try {
      const { documento } = await documentService.crear({ titulo, contenido, categoriaId: String(data.get('categoriaId')) || undefined, etiquetas, documentosRelacionadosIds });
      location.hash = `/documentos/${documento.id}`;
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  return <section className="status-card"><span className="eyebrow">BIBLIOTECA / NUEVO DOCUMENTO</span><h1>Crear documento</h1>
    <p>Se creará como borrador con su versión 1.</p>
    {loading && <p role="status">Cargando categorías…</p>}
    {categoryError && <div role="alert">No se pudieron cargar categorías o documentos relacionados. <button type="button" className="secondary" onClick={() => setAttempt(n => n + 1)}>Reintentar carga</button></div>}
    <div className="editor-layout"><form onSubmit={create}>
      <label>Título<input name="titulo" required maxLength={200} /></label>
      <label>Contenido<textarea name="contenido" required rows={8} /></label>
      <label>Categoría<select name="categoriaId" disabled={loading || categoryError}><option value="">Sin categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <TagSelector fail={fail} />
      <label>Documentos relacionados<select name="relacionados" multiple size={Math.min(5, Math.max(2, relatedDocuments.length))} disabled={loading || relatedDocuments.length === 0}>{relatedDocuments.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}</select></label>
      {!loading && relatedDocuments.length === 0 && <p>Aún no hay documentos para relacionar.</p>}
      {!loading && !categoryError && categories.length === 0 && <p>No hay categorías disponibles. Puedes crear el documento sin categoría.</p>}
      <button disabled={busy || loading || categoryError}>{busy ? 'Guardando…' : 'Guardar documento'}</button>
    </form><aside className="editor-help"><h2>Del borrador al conocimiento</h2><ol><li>Describe el proceso con claridad.</li><li>Organiza por categoría y etiquetas.</li><li>Relaciona documentos del equipo.</li></ol><p>El documento se guarda con su primera versión. Los cambios propuestos se revisan antes de aplicarse.</p></aside></div></section>;
}

export function DocumentWorkflow({ initial, user, fail }: Props & { initial: Documento; user: Usuario }) {
  const [doc, setDoc] = useState(initial);
  const [versions, setVersions] = useState<VersionDocumento[]>([]);
  const [proposals, setProposals] = useState<PropuestaCambio[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState('');
  const [draft, setDraft] = useState(initial.contenidoActual);
  const [reason, setReason] = useState('');
  const [base, setBase] = useState<number | null>(null);
  const [v1, setV1] = useState<number | null>(null);
  const [v2, setV2] = useState<number | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([documentService.obtenerVersiones(doc.id), proposalService.listar({ documentoId: doc.id })]).then(([v, p]) => {
      if (!active) return;
      const snapshot = documentSnapshot(initial, v.versiones);
      setVersions(v.versiones); setProposals(p.propuestas);
      setBase(snapshot.versionBase);
      setV1(v.versiones[1]?.numeroVersion ?? v.versiones[0]?.numeroVersion ?? null);
      setV2(v.versiones[0]?.numeroVersion ?? null); setLoaded(true);
    }).catch(e => { if (active) { setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); fail(e); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [doc.id]);
  async function refresh(propagateError = false) {
    setBusy(true); setLoading(true); setLoadError('');
    try {
      const [d, v, p] = await Promise.all([documentService.obtenerPorId(doc.id), documentService.obtenerVersiones(doc.id), proposalService.listar({ documentoId: doc.id })]);
      documentSnapshot(d.documento, v.versiones);
      setDoc(d.documento); setVersions(v.versiones); setProposals(p.propuestas); setLoaded(true); setDiff(null);
      // El borrador conserva su base original; recargarlo requiere una acción explícita.
      setNotice('Documento e historial actualizados. La propuesta conserva su borrador y base original; la edición conserva los cambios sin guardar y su base.');
    } catch (e) { setLoadError(e instanceof Error ? e.message : 'No se pudo actualizar.'); fail(e); if (propagateError) throw e; }
    finally { setBusy(false); setLoading(false); }
  }
  async function propose(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !reason.trim() || !base) return;
    setBusy(true); setNotice(''); setConflict('');
    try {
      const result = await proposalService.crear({ documentoId: doc.id, contenidoPropuesto: draft, mensaje: reason, versionBase: base });
      setProposals(items => [result.propuesta, ...items]);
      setReason(''); setNotice('Propuesta pendiente enviada. El contenido vigente no se ha modificado.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(`${e.message} Actualiza el documento y luego elige «Usar contenido vigente».`);
      else fail(e);
    } finally { setBusy(false); }
  }
  async function compare(event: FormEvent) {
    event.preventDefault();
    if (v1 == null || v2 == null) return;
    setDiffLoading(true); setDiff(null);
    try { setDiff(await documentService.compararDiff(doc.id, v1, v2)); }
    catch (e) { fail(e); } finally { setDiffLoading(false); }
  }
  return <>
    <h1>{doc.titulo}</h1><div className="document-meta"><StateBadge state={doc.estado} /><span>{doc.autor?.nombre}</span><span>{doc.categoria?.nombre || 'Sin categoría'}</span></div>
    {!!doc.etiquetas?.length && <p>Etiquetas: {doc.etiquetas.map(e => typeof e === 'string' ? e : e.nombre).join(', ')}</p>}
    {!!doc.relaciones?.length && <p>Relacionados: {doc.relaciones.map((r, i) => <span key={r.id}>{i > 0 && ', '}<a href={`#/documentos/${r.id}`}>{r.titulo}</a></span>)}</p>}
    <DocumentActions doc={doc} user={user} fail={fail} refresh={() => refresh(true)} versions={versions} /><div className="document-reading-grid"><section className="reading-panel"><h2>Contenido vigente</h2><div className="document-content">{doc.contenidoActual}</div>
    <button className="secondary" onClick={() => void refresh()} disabled={busy}>Actualizar documento e historial</button>
    {notice && <p role="status">{notice}</p>}
    {conflict && <p role="alert" className="error">{conflict}</p>}
    </section><section className="workflow-section history-panel"><h2>Historial</h2>
      {loading && <p role="status">Cargando historial…</p>}
      {loadError && <p role="alert">{loadError} Usa «Actualizar documento e historial» para reintentar.</p>}
      {loaded && versions.length === 0 && <p>No hay versiones registradas.</p>}
      <ol className="history">{versions.map(v => <li key={v.id}><details><summary>Versión {v.numeroVersion} · {v.mensajeCambio}</summary>
        <p>{v.autor?.nombre} · {new Date(v.creadoEn).toLocaleString('es-PE')}</p><pre>{v.contenido}</pre></details></li>)}</ol>
      {versions.length >= 2 && <form className="compare-form" onSubmit={compare}>
        <h3>Comparar versiones</h3>
        <label>Versión original<select value={v1 ?? ''} onChange={e => setV1(Number(e.target.value))}>{versions.map(v => <option key={v.id} value={v.numeroVersion}>Versión {v.numeroVersion}</option>)}</select></label>
        <label>Versión comparada<select value={v2 ?? ''} onChange={e => setV2(Number(e.target.value))}>{versions.map(v => <option key={v.id} value={v.numeroVersion}>Versión {v.numeroVersion}</option>)}</select></label>
        <button disabled={diffLoading || v1 == null || v2 == null || v1 === v2}>{diffLoading ? 'Comparando…' : 'Ver diferencias'}</button>
      </form>}
      {diff && <div role="status" className="diff-result"><h3>Versión {diff.versionOriginal} → {diff.versionComparada}</h3><pre>{diff.diferencias.map((part, i) => <span key={i} className={part.agregado ? 'diff-added' : part.eliminado ? 'diff-removed' : undefined}>{part.valor}</span>)}</pre></div>}
    </section>
    </div><section className="workflow-section"><h2>Propuestas de este documento</h2>
      {loaded && proposals.length === 0 && <p>No hay propuestas.</p>}
      <ul className="document-proposals">{proposals.map(p => <li key={p.id}><StateBadge state={p.estado} /> · Base: {p.versionBase ?? 'desconocida'} · {p.mensaje} · {p.autor?.nombre}{p.revisor && <> · Revisó: {p.revisor.nombre}</>}{p.comentarioRevision && <p className="observation">Comentario: {p.comentarioRevision}</p>}{p.estado === 'DEVUELTA' && p.autorId === user.id && <Correction proposal={p} fail={fail} done={refresh} />}</li>)}</ul>
    </section>
    <section className="workflow-section"><h2>Proponer cambio</h2>
      <p>Basado en la versión {base ?? '…'}. La revisión debe aprobarlo antes de cambiar el contenido vigente.</p>
      <form onSubmit={propose}>
        <label>Contenido propuesto<textarea value={draft} onChange={e => setDraft(e.target.value)} required rows={8} /></label>
        <label>Motivo del cambio<textarea value={reason} onChange={e => setReason(e.target.value)} required rows={2} /></label>
        <button disabled={busy || !loaded || base == null}>{busy ? 'Enviando…' : 'Enviar propuesta'}</button>
        <button className="secondary" type="button" disabled={busy || !loaded || !!loadError} onClick={() => { try { const snapshot = documentSnapshot(doc, versions); setDraft(snapshot.contenido); setBase(snapshot.versionBase); setConflict(''); setNotice('Borrador reemplazado por el contenido vigente mostrado.'); } catch (e) { fail(e); } }}>Usar contenido vigente como nuevo borrador</button>
      </form></section>
  </>;
}

export function ReviewInbox({ fail, user }: Props & { user: Usuario }) {
  const [filter, setFilter] = useState('PENDIENTE');
  const [documentFilter, setDocumentFilter] = useState('');
  const [documents, setDocuments] = useState<DocumentoListado[]>([]);
  useEffect(() => { documentService.listar().then(r => setDocuments(r.documentos)).catch(fail); }, []);
  const [items, setItems] = useState<PropuestaCambio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState('');
  const [selected, setSelected] = useState<PropuestaCambio | null>(null);
  const [current, setCurrent] = useState<Documento | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [reviewedId, setReviewedId] = useState<string | null>(null);
  async function load() { setItems((await proposalService.listar({ estado: filter, documentoId: documentFilter })).propuestas); }
  useEffect(() => {
    let active = true;
    proposalService.listar({ estado: 'PENDIENTE' }).then(p => { if (active) setItems(p.propuestas); })
      .catch(e => { if (active) fail(e); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function reload() {
    setLoading(true); setSelected(null); setCurrent(null); setConflict('');
    try { await load(); } catch (e) { fail(e); } finally { setLoading(false); }
  }
  async function select(p: PropuestaCambio) {
    setBusy(true); setSelected(null); setCurrent(null); setVersion(null); setComment(''); setNotice('');
    try {
      const d = await documentService.obtenerPorId(p.documentoId);
      setCurrent(d.documento); setVersion(d.documento.versiones?.[0]?.numeroVersion ?? null); setSelected(p);
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function decide(action: 'aprobar' | 'rechazar' | 'devolver') {
    if (!selected) return;
    setBusy(true); setNotice(''); setConflict('');
    try {
      const result = await proposalService[action](selected.id, comment);
      setReviewedId(selected.documentoId);
      setSelected(null); setCurrent(null); setNotice(result.message);
      await load().catch(fail);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflict(`${e.message} Actualiza la bandeja para consultar su estado.`);
        setSelected(null); setCurrent(null); await load().catch(fail);
      } else fail(e);
    } finally { setBusy(false); }
  }
  const stale = selected && (selected.versionBase == null || selected.versionBase !== version);
  // Separación de funciones: nadie decide sobre su propia propuesta (el backend también lo impide).
  const own = selected?.autorId === user.id;
  const canDecide = user.rol !== 'ANALISTA' && !own;
  return <section className="status-card inbox-page"><div className="page-heading"><div><span className="eyebrow">CONTROL DE CALIDAD DOCUMENTAL</span><h1>Revisión de propuestas</h1><p>Compara el contenido y revisa cada cambio del equipo.</p></div><span className="badge">{items.length} propuestas en la consulta</span></div><div className="filter-bar">
    <label>Estado<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option>{['PENDIENTE', 'DEVUELTA', 'APROBADA', 'RECHAZADA'].map(estado => <option key={estado} value={estado}>{estado}</option>)}</select></label>
    <label>Documento<select value={documentFilter} onChange={e => setDocumentFilter(e.target.value)}><option value="">Todos</option>{documents.map(documento => <option key={documento.id} value={documento.id}>{documento.titulo}</option>)}</select></label>
    <button className="secondary" disabled={busy || loading} onClick={() => void reload()}>Actualizar bandeja</button></div>
    {loading && <p role="status">Cargando propuestas…</p>}
    {busy && !selected && <p role="status">Cargando comparación o procesando decisión…</p>}
    {!loading && items.length === 0 && <p>No hay propuestas para esta consulta.</p>}
    <div className="review-grid"><aside><h2>Cola de revisión</h2><ul className="results proposal-list">{items.map(p => <li key={p.id} className={selected?.id === p.id ? 'selected' : undefined}><StateBadge state={p.estado} /><strong>{p.documento?.titulo}</strong><p>{p.mensaje}</p><div className="proposal-meta"><span>{p.autor?.nombre}</span><span>Base: {p.versionBase ?? 'desconocida'}</span></div>
      <button disabled={busy} onClick={() => void select(p)}>Comparar propuesta</button></li>)}</ul><div className="review-rules"><h3>Reglas de revisión</h3><p>Solo revisor y administrador pueden decidir. La aprobación requiere una propuesta pendiente con base vigente. Una devolución permite al autor corregir y reenviar.</p></div></aside><div>
    {!selected && <div className="review-placeholder"><span className="eyebrow">COMPARACIÓN EN PARALELO</span><h2>Selecciona una propuesta</h2><p>Revisa su motivo, el contenido vigente y los cambios propuestos antes de decidir.</p></div>}{selected && current && <section className="review-panel"><h2>Comparación: {current.titulo}</h2>
      <p className="reason"><span className="eyebrow">MOTIVO DEL CAMBIO</span>{selected.mensaje}</p><div className="comparison"><div><h3>Vigente · versión {version}</h3><pre>{current.contenidoActual}</pre></div>
        <div><h3>Propuesto · base {selected.versionBase ?? 'desconocida'}</h3><pre>{selected.contenidoPropuesto}</pre></div></div>
      {stale && <p role="alert" className="error">La base es antigua o desconocida: no se puede aprobar. Si está DEVUELTA, su autor puede revisar el contenido vigente y confirmar una nueva base al reenviar.</p>}
      {selected.comentarioRevision && <p className="observation">Observación de revisión: {selected.comentarioRevision}</p>}
      {user.rol === 'ANALISTA' && <p>Solo un Revisor o Administrador puede aprobar, rechazar o devolver.</p>}
      {user.rol !== 'ANALISTA' && own && <p className="muted">No puedes revisar tu propia propuesta: debe decidirla otro Revisor o Administrador.</p>}
      {selected.estado !== 'PENDIENTE' && <p>No se puede decidir: la propuesta está {selected.estado}. Las devueltas requieren corrección y reenvío del autor.</p>}
      {selected.estado === 'DEVUELTA' && selected.autorId === user.id && <Correction key={selected.id} proposal={selected} fail={fail} done={reload} />}
      {canDecide && selected.estado === 'PENDIENTE' && <label>Comentario de revisión<textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} /></label>}
      {user.rol !== "ANALISTA" && <div className="actions"><button disabled={busy || !canDecide || !!stale || selected.estado !== "PENDIENTE"} onClick={() => void decide('aprobar')}>{stale ? 'Aprobación bloqueada: base antigua' : busy ? 'Procesando…' : 'Aprobar propuesta'}</button>
        <button className="danger" disabled={busy || !canDecide || selected.estado !== "PENDIENTE"} onClick={() => void decide('rechazar')}>Rechazar propuesta</button>
        <button className="warning" disabled={busy || !canDecide || selected.estado !== 'PENDIENTE' || !comment.trim()} onClick={() => void decide('devolver')}>Devolver para corrección</button></div>}
      {canDecide && selected.estado === 'PENDIENTE' && !comment.trim() && <p>Para devolver, escribe una observación obligatoria.</p>}
      <a href={`#/documentos/${current.id}`}>Abrir documento e historial</a>
    </section>}
    </div></div>{notice && <p className="success-banner" role="status">{notice}</p>}
    {conflict && <p role="alert" className="error">{conflict}</p>}
    {reviewedId && <a href={`#/documentos/${reviewedId}`}>Ver documento e historial tras la revisión</a>}
  </section>;
}
