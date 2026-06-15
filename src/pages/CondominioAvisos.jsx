import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function CondominioAvisos() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [cond, setCond] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const { data: c } = await supabase.from('condominios').select('id, nombre').eq('id', id).maybeSingle()
    const { data: a } = await supabase.from('avisos')
      .select('id, titulo, cuerpo, audiencia, created_at')
      .eq('condominio_id', id).order('created_at', { ascending: false })
    setCond(c); setAvisos(a ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [id])

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <button className="back-link" onClick={() => navigate(`/condominio/${id}`)}>← Volver al condominio</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Avisos</h1>
            <p className="page-sub">{cond?.nombre}</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowNew(true)}>+ Nuevo aviso</button>
        </div>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Publicados</span></div>
          {loading ? (
            <div className="panel-empty">Cargando…</div>
          ) : avisos.length === 0 ? (
            <div className="panel-empty">Aún no hay avisos. Publica el primero.</div>
          ) : (
            avisos.map((a) => (
              <div className="aviso" key={a.id}>
                <div className="aviso__head">
                  <span className="aviso__title">{a.titulo}</span>
                  <span className={`pill ${a.audiencia === 'vigilancia' ? 'pill--accent' : 'pill--brand'}`}>
                    {a.audiencia === 'vigilancia' ? 'Vigilancia' : 'Comunidad'}
                  </span>
                  <span className="aviso__date">{new Date(a.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                <div className="aviso__body">{a.cuerpo}</div>
              </div>
            ))
          )}
        </section>
      </div>

      {showNew && (
        <NewAvisoModal condominioId={id} autorId={profile?.id}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />
      )}
    </div>
  )
}

function NewAvisoModal({ condominioId, autorId, onClose, onCreated }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [audiencia, setAudiencia] = useState('comunidad')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.from('avisos').insert({
      condominio_id: condominioId, titulo: titulo.trim(), cuerpo: cuerpo.trim(),
      audiencia, autor_id: autorId || null,
    })
    setBusy(false)
    if (error) setError(error.message)
    else onCreated()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Nuevo aviso</h2>
      <p className="sub">Comparte un mensaje con la comunidad o con vigilancia.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Título</label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Corte de agua programado" required /></div>
        <div className="field"><label>Mensaje</label>
          <textarea className="input" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)}
            style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Escribe el aviso…" required /></div>
        <div className="field"><label>Dirigido a</label>
          <select className="input" value={audiencia} onChange={(e) => setAudiencia(e.target.value)}>
            <option value="comunidad">Toda la comunidad</option>
            <option value="vigilancia">Solo vigilancia</option>
          </select></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Publicando…' : 'Publicar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
