import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadFlag, setReloadFlag] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setProfile(null); setMemberships([]); setLoading(false); return
      }
      setLoading(true)
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, nombre, email, is_super_admin, must_change_password, aviso_aceptado_at')
        .eq('id', session.user.id).single()
      const { data: mem } = await supabase
        .from('membresias')
        .select('id, condominio_id, rol, unidad_id, estado')
        .eq('user_id', session.user.id).eq('estado', 'activo')
      setProfile(prof ?? null)
      setMemberships(mem ?? [])
      setLoading(false)
    }
    load()
  }, [session, reloadFlag])

  const role = profile?.is_super_admin ? 'super_admin' : (memberships[0]?.rol ?? null)
  const mustChangePassword = !!profile?.must_change_password
  const avisoAceptado = !!profile?.aviso_aceptado_at

  const value = {
    session,
    user: session?.user ?? null,
    profile, memberships, role, loading, mustChangePassword, avisoAceptado,
    refreshProfile: () => setReloadFlag((f) => f + 1),
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
