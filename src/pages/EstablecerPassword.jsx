import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function EstablecerPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // supabase-js procesa el enlace del correo y crea la sesión solo.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setHasSession(true); setReady(true) }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true)
      setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (pw.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (pw !== pw2) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true); setError('')
    const { error: upErr } = await supabase.auth.updateUser({ password: pw })
    if (upErr) { setBusy(false); setError(upErr.message); return }
    // Como puso su propia contraseña, ya no hace falta forzar el cambio.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    setBusy(false)
    navigate('/')
  }

  return (
    <div className="auth">
      <main className="auth__form-wrap" style={{ margin: '0 auto' }}>
        <div className="auth-card">
          <h1>Establece tu contraseña</h1>

          {!ready && <p className="sub">Validando el enlace…</p>}

          {ready && !hasSession && (
            <p className="sub">
              Este enlace no es válido o ya expiró. Pide al administrador que te envíe una
              nueva invitación, o usa la opción de recuperar contraseña.
            </p>
          )}

          {ready && hasSession && (
            <>
              <p className="sub">Crea tu contraseña para entrar a la app.</p>
              <form onSubmit={submit}>
                <div className="field">
                  <label>Nueva contraseña</label>
                  <input className="input" type="password" autoComplete="new-password"
                    value={pw} onChange={(e) => setPw(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Repite la contraseña</label>
                  <input className="input" type="password" autoComplete="new-password"
                    value={pw2} onChange={(e) => setPw2(e.target.value)} required />
                </div>
                {error && <p className="form-error">{error}</p>}
                <button className="btn btn--primary" type="submit" disabled={busy} style={{ width: '100%' }}>
                  {busy ? 'Guardando…' : 'Guardar y entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
