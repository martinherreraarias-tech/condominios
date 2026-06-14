import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  console.error(
    'Faltan variables de entorno. Crea un archivo .env.local con ' +
    'VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.'
  )
}

// Cliente único de Supabase para toda la app.
// Usa la PUBLISHABLE key (bajo privilegio). La SECRET key jamás va aquí.
export const supabase = createClient(url, publishableKey)
