import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function AceptarAviso() {
  const { session, refreshProfile, signOut } = useAuth()
  const [acepto, setAcepto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function continuar() {
    setBusy(true); setError('')
    const { error } = await supabase.from('profiles')
      .update({ aviso_aceptado_at: new Date().toISOString() })
      .eq('id', session.user.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    refreshProfile()
  }

  return (
    <div className="auth">
      <main className="auth__form-wrap" style={{ margin: '0 auto' }}>
        <div className="auth-card">
          <h1>Aviso de privacidad</h1>
          <p className="sub">Para continuar, lee y acepta nuestro aviso de privacidad.</p>

          <a href="/aviso-privacidad" target="_blank" rel="noopener noreferrer"
            className="btn btn--ghost" style={{ display: 'block', width: '100%', textAlign: 'center', marginBottom: 16 }}>
            Leer aviso completo
          </a>

          <label className="check-row">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
            <span>He leído y acepto el aviso de privacidad.</span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn--primary" style={{ width: '100%' }}
            disabled={!acepto || busy} onClick={continuar}>
            {busy ? 'Guardando…' : 'Continuar'}
          </button>
          <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </main>
    </div>
  )
}
