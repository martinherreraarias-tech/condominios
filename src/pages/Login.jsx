import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="brand-mark">
          <Building size={26} color="#fff" />
          <span className="brand-mark__name">Condominios</span>
        </div>
        <h2 className="brand-headline">Administra tu comunidad con orden.</h2>
        <p className="brand-tag">
          Cobranza, accesos y comunicación en un solo lugar, con la seguridad
          que tu condominio merece.
        </p>
        <p className="brand-credit">Desarrollado por <strong>FortalezasConsultoria</strong> · Soluciones Digitales</p>
        <svg className="floors" width="320" height="300" viewBox="0 0 320 300" fill="none">
          <rect x="20" y="40" width="120" height="240" stroke="#fff" strokeWidth="2"/>
          <rect x="160" y="100" width="120" height="180" stroke="#fff" strokeWidth="2"/>
          {[80,120,160,200,240].map((y) => (
            <line key={'a'+y} x1="20" y1={y} x2="140" y2={y} stroke="#fff" strokeWidth="2"/>
          ))}
          {[140,180,220,260].map((y) => (
            <line key={'b'+y} x1="160" y1={y} x2="280" y2={y} stroke="#fff" strokeWidth="2"/>
          ))}
        </svg>
      </aside>

      <main className="auth__form-wrap">
        <div className="auth-card">
          <h1>Bienvenido de vuelta</h1>
          <p className="sub">Inicia sesión para continuar.</p>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" className="input" type="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" className="input" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>
          <p className="auth-credit">FortalezasConsultoria · Soluciones Digitales</p>
        </div>
      </main>
    </div>
  )
}

function Building({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="8" y1="7" x2="8" y2="7" /><line x1="12" y1="7" x2="12" y2="7" /><line x1="16" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="8" y2="11" /><line x1="12" y1="11" x2="12" y2="11" /><line x1="16" y1="11" x2="16" y2="11" />
      <line x1="10" y1="21" x2="10" y2="17" /><line x1="14" y1="21" x2="14" y2="17" />
    </svg>
  )
}
