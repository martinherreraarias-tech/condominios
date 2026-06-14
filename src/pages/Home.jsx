import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import ResidentHome from './ResidentHome'
import VigilanteHome from './VigilanteHome'

export default function Home() {
  const { role } = useAuth()
  if (role === 'residente') return <ResidentHome />
  if (role === 'vigilante') return <VigilanteHome />
  if (role === 'admin' || role === 'comite') return <AdminHome />
  return <PlaceholderHome />
}

function AdminHome() {
  const { profile, memberships, signOut } = useAuth()
  const navigate = useNavigate()
  const [condos, setCondos] = useState([])

  useEffect(() => {
    async function load() {
      const ids = [...new Set(memberships.map((m) => m.condominio_id))]
      if (!ids.length) { setCondos([]); return }
      const { data } = await supabase.from('condominios').select('id, nombre, direccion').in('id', ids)
      setCondos(data ?? [])
    }
    load()
  }, [memberships])

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>
      <div className="container">
        <div className="page-head">
          <div>
            <h1 className="page-title">Mis condominios</h1>
            <p className="page-sub">Administra los condominios a tu cargo.</p>
          </div>
        </div>
        {condos.length === 0 ? (
          <div className="empty"><h3>Sin condominios asignados</h3><p>Aún no te han asignado ningún condominio.</p></div>
        ) : (
          <div className="grid">
            {condos.map((c) => (
              <div className="cond-card" key={c.id} style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/condominio/${c.id}`)}>
                <div className="cond-card__name">{c.nombre}</div>
                <div className="cond-card__addr">{c.direccion || 'Sin dirección'}</div>
                <div className="cond-card__actions"><span className="link-btn">Abrir →</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PlaceholderHome() {
  const { profile, role, memberships, signOut } = useAuth()
  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>
      <div className="container">
        <h1 className="page-title">Hola{profile?.nombre ? `, ${profile.nombre}` : ''}</h1>
        <p className="page-sub">Tu rol: <strong>{role ?? 'sin rol asignado'}</strong></p>
        <p className="muted" style={{ marginTop: 8 }}>
          El panel para este rol se construye en el siguiente paso. Condominios donde participas: {memberships.length}
        </p>
      </div>
    </div>
  )
}
