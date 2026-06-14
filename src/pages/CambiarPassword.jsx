import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function CambiarPassword() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (pwd.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (pwd !== pwd2) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true); setError('')
    const { error: upErr } = await supabase.auth.updateUser({ password: pwd })
    if (upErr) { setBusy(false); setError(upErr.message); return }
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
    setBusy(false)
    refreshProfile()
  }

  return (
    <div className="auth__form-wrap" style={{ minHeight: '100vh' }}>
      <div className="auth-card">
        <h1>Crea tu contraseña</h1>
        <p className="sub">Por seguridad, define una contraseña nueva para tu cuenta.</p>
        <form onSubmit={submit}>
          <div className="field"><label>Nueva contraseña</label>
            <input className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
              placeholder="Al menos 8 caracteres" required /></div>
          <div className="field"><label>Confirmar contraseña</label>
            <input className="input" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required /></div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
        <p style={{ marginTop: 16 }}>
          <button className="link-btn" onClick={signOut}>Cerrar sesión</button>
        </p>
      </div>
    </div>
  )
}
