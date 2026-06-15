// Edge Function: reset-demo
// Borra TODOS los condominios (en cascada se va lo demás) y todos los
// usuarios de Auth que NO sean super admin. Pensado para limpiar entre demos.
// Solo lo puede ejecutar un super admin.
//
// Cómo desplegar (igual que crear-usuario):
//   Supabase Dashboard -> Edge Functions -> Deploy a new function ->
//   Via Editor -> nombre EXACTO: reset-demo -> pega este código -> Deploy.
// No necesita variables extra: SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY ya están disponibles por defecto.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // 1) Identificar a quien llama con su propio token
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "No autenticado." }, 401);

    const admin = createClient(url, service);

    // 2) Verificar que sea super admin
    const { data: prof } = await admin
      .from("profiles").select("is_super_admin").eq("id", user.id).single();
    if (!prof?.is_super_admin) {
      return json({ error: "Solo el super admin puede resetear los datos." }, 403);
    }

    // 3) Borrar todos los condominios (cascada borra unidades, cuotas,
    //    pagos, visitas, avisos, áreas, reservas, paquetes, recibos, etc.)
    await admin.from("condominios").delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // 4) Borrar usuarios de Auth que NO sean super admin
    const { data: supers } = await admin.from("profiles")
      .select("id").eq("is_super_admin", true);
    const superIds = new Set((supers ?? []).map((s: { id: string }) => s.id));

    let page = 1;
    let borrados = 0;
    while (true) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = list?.users ?? [];
      if (users.length === 0) break;
      for (const u of users) {
        if (!superIds.has(u.id)) {
          await admin.auth.admin.deleteUser(u.id);
          borrados++;
        }
      }
      if (users.length < 200) break;
      page++;
    }

    return json({ ok: true, usuarios_borrados: borrados });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
