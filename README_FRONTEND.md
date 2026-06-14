# Frontend — Administración de Condominios

Proyecto Vite + React (PWA) conectado a Supabase. Ya viene completo y validado.

## Qué necesitas instalado
- Node.js 18 o superior (revisa con: node --version)
- Un editor de código (recomiendo VS Code)

## Pasos (3 comandos)

1) Descomprime el .zip. Abre una terminal DENTRO de la carpeta
   `condominios-frontend` (la que tiene el archivo package.json).

2) Instala las dependencias:
   npm install

3) Crea tu archivo de variables. Copia .env.example como .env.local
   y pon tus valores reales de Supabase (Settings -> API Keys):

   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx

   En Mac/Linux:   cp .env.example .env.local
   En Windows:     copy .env.example .env.local
   (o copia el archivo a mano y renómbralo)

4) Arranca:
   npm run dev

   Abre la URL que aparezca (normalmente http://localhost:5173).

## Prueba de éxito
1. Te manda a /login.
2. Entra con tu usuario super admin.
3. Verás "Hola..." con tu rol = super_admin.

Si llegas ahí, todo el cableado funciona:
env -> cliente Supabase -> Auth -> lectura de rol con RLS.

## Estructura
- src/lib/supabase.js        conexión a Supabase (un solo lugar)
- src/context/AuthContext.jsx sesión + perfil + rol
- src/components/ProtectedRoute.jsx  protege rutas por sesión/rol
- src/pages/Login.jsx, Home.jsx      pantallas (versión sencilla, temporal)

NOTA: nunca subas .env.local a GitHub (ya está en .gitignore).
La publishable key va en el frontend; la secret key JAMAS.
