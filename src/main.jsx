import './remote-nav.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Hls from 'hls.js';
import { Tv, Film, Clapperboard, Search, Settings, Star, Clock3, LogOut, Play, Menu, X, ChevronRight, LoaderCircle, AlertCircle, MonitorPlay } from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || '/api/xtream';
const saved = () => { try { return JSON.parse(sessionStorage.getItem('iptvCredentials') || 'null'); } catch { return null; } };
const img = (item) => item?.stream_icon || item?.cover || item?.movie_image || '';
const title = (item) => item?.name || item?.title || 'Sin título';

function App() {
  const [credentials, setCredentials] = useState(saved());
  const [auth, setAuth] = useState(null);
  const [section, setSection] = useState('live');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('iptvFavorites') || '[]'));
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('iptvHistory') || '[]'));
  const [showSidebar, setShowSidebar] = useState(true);
  const [view, setView] = useState('catalog');
  const [detail, setDetail] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const callApi = async (action, extra = {}) => {
    const r = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...credentials, action, extra }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.user_info?.auth === 0) throw new Error(data.error || 'Error consultando Xtream Codes.');
    return data;
  };

  const login = async (form) => {
    setLoginBusy(true); setError('');
    const normalized = { ...form, server: form.server.trim().replace(/\/+$/, '') };
    try {
      const r = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...normalized }) });
      const data = await r.json();
      if (!r.ok || data?.user_info?.auth !== 1) throw new Error(data.error || 'Credenciales no válidas o servidor no disponible.');
      setCredentials(normalized); sessionStorage.setItem('iptvCredentials', JSON.stringify(normalized));
      setAuth(data); setSection('live');
    } catch(e) { setError(e.message); }
    finally { setLoginBusy(false); }
  };

  const loadSection = async (s = section) => {
    if (!credentials) return;
    setLoading(true); setError(''); setSelected(null); setDetail(null); setView('catalog'); setSection(s); setCategory('all'); setQuery('');
    const actions = s === 'live'
      ? ['get_live_categories','get_live_streams']
      : s === 'movies' ? ['get_vod_categories','get_vod_streams']
      : ['get_series_categories','get_series'];
    try {
      const [cats, content] = await Promise.all([callApi(actions[0]), callApi(actions[1])]);
      setCategories(Array.isArray(cats) ? cats : []);
      setItems(Array.isArray(content) ? content : []);
    } catch(e) { setError(e.message); setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (credentials && !auth) { (async()=>{ try { const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)}); const d=await r.json(); if(d?.user_info?.auth===1){setAuth(d); await loadSection('live');} else {setCredentials(null);sessionStorage.removeItem('iptvCredentials');} } catch { setError('No se pudo recuperar la sesión. Vuelve a iniciar sesión.'); } })(); } }, []);
  useEffect(() => { if (auth) loadSection(section); }, [auth]);
  useEffect(() => {
    const onRemoteBack = () => {
      if (view === 'player') { setView('catalog'); return; }
      if (view === 'episodes') { setView('catalog'); return; }
      if (view !== 'catalog') { setView('catalog'); return; }
      if (section !== 'live') { loadSection('live'); return; }
    };
    window.addEventListener('iptv-back', onRemoteBack);
    return () => window.removeEventListener('iptv-back', onRemoteBack);
  }, [view, section]);
  useEffect(() => { localStorage.setItem('iptvFavorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('iptvHistory', JSON.stringify(history)); }, [history]);

  const visible = useMemo(() => items.filter(x => (category === 'all' || String(x.category_id) === String(category)) && title(x).toLowerCase().includes(query.toLowerCase())), [items,category,query]);
  const streamUrl = (item, kind = section) => {
    const ext = kind === 'live' ? (item.container_extension || 'ts') : (item.container_extension || 'mp4');
    const type = kind === 'live' ? 'live' : kind === 'movies' ? 'movie' : 'series';
    return `${credentials.server}/${type}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${item.stream_id || item.series_id}.${ext}`;
  };
  const play = async (item) => {
    if (section === 'series') {
      setLoading(true);
      try { const d = await callApi('get_series_info', { series_id:item.series_id }); setDetail(d); setView('episodes'); }
      catch(e) { setError(e.message); }
      finally { setLoading(false); }
      return;
    }
    setSelected(item); setView('player');
    const entry = { name:title(item), url:streamUrl(item), section, at:Date.now() };
    setHistory(h => [entry, ...h.filter(x=>x.url!==entry.url)].slice(0,30));
  };
  const playEpisode = (ep) => {
    const item = { ...ep, stream_id: ep.id, container_extension: ep.container_extension || 'mp4' };
    setSelected(item); setView('player');
  };
  const toggleFavorite = (item) => setFavorites(f => f.some(x=>x.id===(item.stream_id||item.series_id)) ? f.filter(x=>x.id!==(item.stream_id||item.series_id)) : [...f,{id:item.stream_id||item.series_id,name:title(item),section}]);
  const logout = () => { sessionStorage.removeItem('iptvCredentials'); setCredentials(null); setAuth(null); setItems([]); setSelected(null); };

  if (!credentials || !auth) return <Login onLogin={login} busy={loginBusy} error={error} />;
  const isFav = (item) => favorites.some(x => x.id === (item.stream_id || item.series_id));
  const nav = [{id:'live',label:'TV en directo',icon:Tv},{id:'movies',label:'Películas',icon:Film},{id:'series',label:'Series',icon:Clapperboard}];

  return <div className="app-shell">
    <aside className={`sidebar ${showSidebar?'':'collapsed'}`}>
      <div className="brand"><div className="brand-mark"><MonitorPlay size={23}/></div>{showSidebar && <div><b>IPTV Player</b><small>ENTERTAINMENT</small></div>}</div>
      <div className="nav-label">MENÚ PRINCIPAL</div>
      {nav.map(n=><button key={n.id} className={`nav-item ${section===n.id?'active':''}`} onClick={()=>loadSection(n.id)}><n.icon size={19}/>{showSidebar&&n.label}</button>)}
      <div className="nav-label">TU BIBLIOTECA</div>
      <button className="nav-item" onClick={()=>{setView('favorites');setSelected(null)}}><Star size={19}/>{showSidebar&&'Favoritos'}</button>
      <button className="nav-item" onClick={()=>{setView('history');setSelected(null)}}><Clock3 size={19}/>{showSidebar&&'Vistos recientemente'}</button>
      <div className="sidebar-bottom"><div className="user-dot">{credentials.username?.slice(0,1).toUpperCase()}</div>{showSidebar&&<div className="user-info"><b>{credentials.username}</b><small>Cuenta conectada</small></div>}<button className="icon-button" title="Cerrar sesión" onClick={logout}><LogOut size={17}/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button" onClick={()=>setShowSidebar(v=>!v)}><Menu size={20}/></button><div className="crumb">Inicio <ChevronRight size={14}/> <b>{view==='catalog'?nav.find(n=>n.id===section)?.label:view==='player'?'Reproductor':view==='episodes'?'Episodios':view==='favorites'?'Favoritos':'Historial'}</b></div><div className="top-spacer"/><div className="status"><span/> Conectado</div></header>
      <div className="content">
        {error && <div className="error-banner"><AlertCircle size={17}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
        {view==='player' && selected && <Player item={selected} url={section==='series'?`${credentials.server}/series/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${selected.id}.${selected.container_extension||'mp4'}`:streamUrl(selected)} onClose={()=>setView('catalog')}/>}
        {view==='episodes' && <section><button className="back-link" onClick={()=>setView('catalog')}>← Volver al catálogo</button><h1>{detail?.info?.name || 'Episodios'}</h1><p className="muted">Selecciona un episodio para reproducirlo.</p>{Object.entries(detail?.episodes||{}).map(([season,eps])=><div className="season" key={season}><h3>Temporada {season}</h3><div className="episode-list">{eps.map(ep=><button className="episode" key={ep.id} onClick={()=>playEpisode(ep)}><Play size={16}/><span>{ep.title || `Episodio ${ep.episode_num}`}</span><small>{ep.info?.duration || ''}</small></button>)}</div></div>)}</section>}
        {view==='favorites' && <><h1>Mis favoritos</h1><div className="catalog-grid">{favorites.map(f=><div className="mini-card" key={f.id}><b>{f.name}</b><small>{f.section}</small><button onClick={()=>{setSection(f.section);loadSection(f.section)}}>Abrir categoría</button></div>)}</div></>}
        {view==='history' && <><h1>Vistos recientemente</h1><div className="catalog-grid">{history.map((h,i)=><div className="mini-card" key={h.url+i}><b>{h.name}</b><small>{new Date(h.at).toLocaleString()}</small><button onClick={()=>{setSection(h.section);setSelected({name:h.name,stream_id:0});setView('player')}}>Reproducir</button></div>)}</div></>}
        {view==='catalog' && <>
          <div className="hero"><div><div className="eyebrow">TU CONTENIDO, EN UN SOLO LUGAR</div><h1>{section==='live'?'Televisión en directo':section==='movies'?'Explora películas':'Tus series favoritas'}</h1><p>Descubre y disfruta de tu biblioteca IPTV.</p></div><div className="hero-art"><div className="orb">▶</div></div></div>
          <div className="toolbar"><div><h2>{section==='live'?'Canales':section==='movies'?'Películas':'Series'}</h2><small>{visible.length} elementos disponibles</small></div><div className="filters"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar contenido..."/></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Todas las categorías</option>{categories.map(c=><option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select></div></div>
          {loading ? <div className="loading"><LoaderCircle className="spin" size={30}/>Cargando catálogo…</div> : <div className="catalog-grid">{visible.map(item=><article className="media-card" key={item.stream_id||item.series_id}><div className="poster" onClick={()=>play(item)}>{img(item)?<img src={img(item)} alt="" loading="lazy"/>:<div className="poster-placeholder"><MonitorPlay size={34}/></div>}<div className="poster-overlay"><span className="play-circle"><Play size={20} fill="currentColor"/></span></div><button className={`fav ${isFav(item)?'chosen':''}`} onClick={e=>{e.stopPropagation();toggleFavorite(item)}}><Star size={16} fill={isFav(item)?'currentColor':'none'}/></button></div><div className="media-meta"><b title={title(item)}>{title(item)}</b><small>{item.category_name || (section==='live'?'Canal IPTV':section==='movies'?'Película':'Serie')}</small></div></article>)}</div>}
          {!loading && visible.length===0 && <div className="empty">No hay resultados. Prueba otra categoría o búsqueda.</div>}
        </>}
      </div>
    </main>
  </div>;
}

function Login({onLogin,busy,error}) {
  const [server,setServer]=useState(''); const [username,setUsername]=useState(''); const [password,setPassword]=useState('');
  return <div className="login-page"><div className="login-glow"/><div className="login-card"><div className="login-logo"><MonitorPlay size={29}/></div><div className="eyebrow">BIENVENIDO A TU ENTRETENIMIENTO</div><h1>IPTV Player</h1><p>Conecta tu cuenta para acceder a tus canales, películas y series.</p><form onSubmit={e=>{e.preventDefault();onLogin({server,username,password})}}><label>URL del servidor</label><input required value={server} onChange={e=>setServer(e.target.value)} placeholder="http://servidor:puerto"/><label>Usuario</label><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="Tu usuario"/><label>Contraseña</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña"/>{error&&<div className="login-error"><AlertCircle size={16}/>{error}</div>}<button className="submit" disabled={busy}>{busy?<><LoaderCircle className="spin" size={18}/> Conectando…</>:<>Conectar <ChevronRight size={18}/></>}</button></form><small className="secure-note">Conexión mediante Xtream Codes API · Usa solo servicios autorizados.</small></div></div>;
}

function Player({item,url,onClose}) {
  const ref=useRef(null); const [err,setErr]=useState('');
  useEffect(()=>{const video=ref.current;if(!video)return;let hls;
    setErr('');
    if(url.toLowerCase().includes('.m3u8') && Hls.isSupported()){hls=new Hls();hls.loadSource(url);hls.attachMedia(video);hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)setErr('No se pudo reproducir este flujo. Puede que el formato o el servidor no sean compatibles.');});}
    else if(video.canPlayType('application/vnd.apple.mpegurl')) video.src=url;
    else video.src=url;
    return()=>hls?.destroy();
  },[url]);
  return <div className="player-view"><button className="back-link" onClick={onClose}>← Volver al catálogo</button><div className="player-heading"><div><div className="eyebrow">REPRODUCIENDO AHORA</div><h1>{item.name||item.title||'Contenido'}</h1></div></div><div className="video-frame"><video ref={ref} controls autoPlay playsInline/><div className="player-watermark">IPTV PLAYER</div></div>{err&&<div className="error-banner"><AlertCircle size={17}/>{err}</div>}<p className="muted player-hint">Si no comienza automáticamente, pulsa reproducir. La compatibilidad depende del formato del flujo y del navegador.</p></div>;
}

createRoot(document.getElementById('root')).render(<App/>);