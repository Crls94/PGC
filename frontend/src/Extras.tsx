export { DocumentActions } from './DocumentActions';
﻿import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, authService, categoryService } from './services/api';
import type { Etiqueta } from './types';
type Props = { fail: (e: unknown) => void };
export function TagSelector({ fail }: Props) {
  const [tags, setTags] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    categoryService.listarEtiquetas().then(r => { if (active) setTags(r.etiquetas); })
      .catch(e => { if (active) { setError('No se pudieron cargar las etiquetas.'); fail(e); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return <><label>Etiquetas existentes<select multiple name="etiquetaSeleccionada" disabled={loading || !!error}>
    {tags.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
  </select></label>
    {loading && <p role="status">Cargando etiquetas…</p>}
    {error && <div role="alert">{error} <button type="button" className="secondary" onClick={() => setAttempt(n => n + 1)}>Reintentar etiquetas</button></div>}
    {!loading && !error && tags.length === 0 && <p>No hay etiquetas existentes.</p>}
    <label>Otras etiquetas separadas por comas<input name="etiquetas" /></label></>;
}
export function Health() {
 const [status,setStatus]=useState('Comprobando conexión…'); const [busy,setBusy]=useState(false);
 async function check(){setBusy(true);try{const r=await apiRequest<{status:string}>('/health');setStatus(r.status==='ok'?'API disponible':'API sin confirmar');}catch{setStatus('No se puede conectar con la API');}finally{setBusy(false);}}
 useEffect(()=>{void check();},[]);
 return <aside className="health" aria-label="Estado de conexión"><p role="status">{status}</p><button className="secondary" disabled={busy} onClick={()=>void check()}>Reintentar conexión</button></aside>;
}
export function Registration({fail}:Props){const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=e.currentTarget,d=new FormData(f);setBusy(true);try{await authService.register({nombre:String(d.get('nombre')),email:String(d.get('email')),password:String(d.get('password'))});setNotice('Cuenta ANALISTA creada. Ya puedes iniciar sesión.');f.reset();}catch(e){fail(e);}finally{setBusy(false);}}return <details className="registration"><summary>Registrar una cuenta de analista</summary><form onSubmit={submit}><label>Nombre<input name="nombre" required /></label><label>Correo<input name="email" type="email" required /></label><label>Contraseña<input name="password" type="password" required autoComplete="new-password" /></label><button disabled={busy}>{busy?'Registrando…':'Registrar'}</button></form><p role="status">{notice}</p></details>;}
export function Catalogs({fail}:Props){const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');async function submit(e:FormEvent<HTMLFormElement>,tag:boolean){e.preventDefault();const f=e.currentTarget,d=new FormData(f);setBusy(true);try{if(tag)await categoryService.crearEtiqueta(String(d.get('nombre')));else await categoryService.crearCategoria({nombre:String(d.get('nombre')),descripcion:String(d.get('descripcion'))});setNotice('Creado. Disponible al abrir de nuevo el formulario o filtro.');f.reset();}catch(e){fail(e);}finally{setBusy(false);}}return <section className="status-card"><h1>Categorías y etiquetas</h1><p className="muted">Organiza los documentos del equipo con un lenguaje compartido.</p><div className="catalog-grid">{[false,true].map(tag=><form key={String(tag)} onSubmit={e=>void submit(e,tag)}><h2>{tag?'Crear etiqueta':'Crear categoría'}</h2><label>Nombre<input name="nombre" required /></label>{!tag&&<label>Descripción<textarea name="descripcion" /></label>}<button disabled={busy}>Crear</button></form>)}</div><p role="status">{notice}</p></section>;}
