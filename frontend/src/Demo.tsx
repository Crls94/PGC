import { StateBadge } from './Visual';
import { Health, Catalogs, Registration } from './Extras';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, authService, categoryService, documentService } from './services/api';
import type { Categoria, Documento, EstadoDocumento, Usuario } from './types';
import { CreateDocument, DocumentWorkflow, ReviewInbox } from './Workflow';

export default function Demo() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<EstadoDocumento | ''>('');
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [docs, setDocs] = useState<Documento[] | null>(null);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [route, setRoute] = useState(location.hash);
  const generation = useRef(0);
  function logout() {
    generation.current++;
    localStorage.removeItem('token');
    setUser(null); setDoc(null); setDocs(null); setQuery(''); setCategoryId(''); setStatus(''); setError(''); setBusy(false);
    location.hash = '/login';
  }
  function failure(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      logout(); setError('Tu sesión ha caducado. Inicia sesión de nuevo.');
    } else setError(e instanceof Error ? e.message : 'No se pudo contactar con el servidor');
  }
  useEffect(() => {
    const changed = () => setRoute(location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setCategoriesLoading(true);
    categoryService.listarCategorias().then(r => { if (active) setCategories(r.categorias); })
      .catch(e => { if (active) failure(e); }).finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, [user?.id, route]);
  useEffect(() => {
    let active = true;
    if (!localStorage.getItem('token')) { setReady(true); return; }
    authService.getMe().then(({ usuario }) => { if (active) setUser(usuario); })
      .catch(e => { if (active) failure(e); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    setDoc(null); setError('');
    const id = route.startsWith('#/documentos/') ? route.slice(13) : '';
    if (!user || !id) return;
    let active = true;
    setBusy(true);
    documentService.obtenerPorId(encodeURIComponent(id)).then(({ documento }) => {
      if (active) setDoc(documento);
    }).catch(e => { if (active) failure(e); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [route, user]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await authService.login({ email: String(data.get('email')), password: String(data.get('password')) });
      localStorage.setItem('token', result.token); setUser(result.usuario);
      if (!location.hash.startsWith('#/documentos/')) location.hash = '/buscar';
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo contactar con el servidor'); }
    finally { setBusy(false); }
  }
  async function search(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setDocs(null);
    const current = generation.current;
    try {
      const result = await documentService.listar({ busqueda: query.trim(), categoriaId: categoryId, estado: status });
      if (current === generation.current) setDocs(result.documentos);
    } catch (e) { if (current === generation.current) failure(e); }
    finally { if (current === generation.current) setBusy(false); }
  }
  const detail = route.startsWith('#/documentos/');
  return <div className="app demo"><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById("main-content")?.focus(); }}>Saltar al contenido</a>
    <header className="header"><a className="brand" href="#/buscar"><span className="brand-icon">c.</span> conocimiento/</a>
      {user && <nav className="workflow-nav" aria-label="Navegación principal">{[["#/buscar","Buscar"],["#/crear","Crear documento"],["#/catalogos","Categorías y etiquetas"],["#/revision","Propuestas"]].map(([href,label]) => <a key={href} href={href} aria-current={(route === href || (href === "#/buscar" && detail)) ? "page" : undefined}>{label}</a>)}</nav>}{user && <div className="session"><span>{user.nombre} · {user.rol}</span><button onClick={logout}>Cerrar sesión</button></div>}</header>
    <Health /><main id="main-content" tabIndex={-1} className="demo-main"><div className="context-strip">PGC / {user ? route === "#/revision" ? "Revisión colaborativa" : route === "#/crear" ? "Nuevo documento" : route === "#/catalogos" ? "Organización del conocimiento" : detail ? "Documento e historial" : "Biblioteca del equipo" : "Acceso al espacio de conocimiento"}</div>
      {!ready ? <p role="status">Recuperando sesión…</p> : !user ? <div className="auth-layout"><section className="auth-intro"><span className="eyebrow">CONOCIMIENTO COMPARTIDO</span><h1>Un espacio para construir conocimiento.</h1><p>Documenta los procesos de tu equipo, propone mejoras y revisa cada cambio con su historial de versiones.</p><div className="archive-art" aria-hidden="true">DOCUMENTAR / REVISAR / COMPARTIR<span /><span /><span />Un mismo conocimiento. Cada versión cuenta.</div></section><section className="status-card auth-card">
        <span className="eyebrow">ESPACIO DE CONOCIMIENTO</span><h1>Inicio de sesión</h1>
        {detail && <p>Inicia sesión para abrir este documento.</p>}
        <form onSubmit={login}><label>Correo electrónico<input name="email" type="email" autoComplete="username" required /></label>
          <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
          <button disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button></form>
        <Registration fail={failure} />
      </section></div> : route === '#/catalogos' ? <Catalogs fail={failure} /> : route === '#/crear' ? <CreateDocument key={user.id} fail={failure} /> : route === '#/revision' ?
        <ReviewInbox key={user.id} user={user} fail={failure} /> : detail ? <section className="status-card document">
        <a href="#/buscar">← Volver a la búsqueda</a>
        {busy && <p role="status">Cargando documento…</p>}
        {doc && <DocumentWorkflow key={`${doc.id}:${user.id}`} initial={doc} user={user} fail={failure} />}
      </section> : <section className="status-card">
        <span className="eyebrow">BIBLIOTECA DEL EQUIPO</span><h1>Buscar documentos</h1>
        <form className="filter-bar search-filters" onSubmit={search}><label>Buscar por título o contenido<input value={query} onChange={e => setQuery(e.target.value)} type="search" /></label>
          <label>Categoría<select value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={categoriesLoading}><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <label>Estado<select value={status} onChange={e => setStatus(e.target.value as EstadoDocumento | '')}><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="EN_REVISION">En revisión</option><option value="PUBLICADO">Publicado</option><option value="OBSOLETO">Obsoleto</option></select></label>
          <button disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button></form>
        {categoriesLoading && <p role="status">Cargando categorías…</p>}
        {busy && <p role="status">Buscando documentos…</p>}
        <div role="status">{docs?.length === 0 ? <p>No se encontraron documentos.</p> : docs && <p>{docs.length} documento(s) encontrado(s).</p>}</div>
        {docs && <ul className="results library-results">{docs.map(item => <li key={item.id}><a href={`#/documentos/${item.id}`}>{item.titulo}</a><p><StateBadge state={item.estado} /></p></li>)}</ul>}
      </section>}
      {error && <p role="alert" className="error">{error}</p>}
    </main><footer>Plataforma colaborativa de gestión del conocimiento · Prueba de concepto local</footer>
  </div>;
}
