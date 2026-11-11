import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Health = { status: string; service: string; timestamp: string };
type Connection = 'checking' | 'online' | 'offline';
const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

function App() {
  const [connection, setConnection] = useState<Connection>('checking');
  const [health, setHealth] = useState<Health | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const request = useRef<AbortController | null>(null);

  async function checkHealth() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setConnection('checking');
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${apiUrl}/health`, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('API no disponible');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'ok' ||
        !('service' in data) || typeof data.service !== 'string' ||
        !('timestamp' in data) || typeof data.timestamp !== 'string' || Number.isNaN(Date.parse(data.timestamp))) {
        throw new Error('Respuesta inesperada');
      }
      if (request.current !== controller) return;
      setHealth(data as Health);
      setConnection('online');
    } catch {
      if (request.current !== controller) return;
      setHealth(null);
      setConnection('offline');
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) setCheckedAt(new Date());
    }
  }

  useEffect(() => {
    void checkHealth();
    return () => { request.current?.abort(); request.current = null; };
  }, []);

  const label = connection === 'online' ? 'Servidor disponible' : connection === 'offline' ? 'Sin conexión al servidor' : 'Comprobando conexión';

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="/" aria-label="Conocimiento, inicio"><span className="brand-icon">c.</span> conocimiento<span className="brand-dot">/</span></a>
        <span className="project-label">GRUPO 5 · UTP</span>
      </header>
      <main>
        <section className="welcome">
          <span className="eyebrow"><span /> ESPACIO DE CONOCIMIENTO</span>
          <h1>Las buenas ideas<br />empiezan <em>aquí.</em></h1>
          <p>Un espacio para organizar lo que sabemos<br className="desktop-break" /> y construir conocimiento en equipo.</p>
          <div className="welcome-note"><span className="note-line" /> Nuestra plataforma está dando sus primeros pasos.</div>
        </section>

        <section className={`status-card ${connection}`} aria-labelledby="status-title">
          <div className="card-top"><span className="eyebrow">ESTADO DEL SISTEMA</span><span className="api-badge">API</span></div>
          <div className="status-symbol" aria-hidden="true">{connection === 'online' ? '✓' : connection === 'offline' ? '!' : '↻'}</div>
          <div role="status" aria-live="polite">
            <h2 id="status-title">{label}</h2>
            <p className="status-description">{connection === 'online' ? 'Todo listo. La plataforma puede comunicarse con el servidor.' : connection === 'offline' ? 'No pudimos contactar con la API. Comprueba que el backend esté encendido y vuelve a intentarlo.' : 'Estamos verificando que la API esté disponible.'}</p>
          </div>
          <dl>
            <div><dt>Servicio</dt><dd>{health?.service || 'API de Gestión de Conocimiento'}</dd></div>
            <div><dt>Última comprobación</dt><dd>{checkedAt ? checkedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'En curso…'}</dd></div>
          </dl>
          <button type="button" onClick={() => void checkHealth()} disabled={connection === 'checking'}><span aria-hidden="true">↻</span> {connection === 'checking' ? 'Comprobando…' : 'Comprobar conexión'}</button>
          <p className="scope-note">Esta comprobación verifica la respuesta del servidor.</p>
        </section>
      </main>
      <footer><span>Plataforma colaborativa de gestión del conocimiento</span><span>Herramientas de Desarrollo <span className="footer-dot">·</span> Grupo 5</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
