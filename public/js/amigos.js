/* ================= Liga entre amigos (Supabase) =================
   Solo se carga supabase-js cuando hay sesión. Requiere correr supabase/amigos.sql una vez.
   Amigos.sync(datos) · Amigos.list() · Amigos.add(codigo) · Amigos.remove(id) */
window.Amigos = (function(){
  const URL = "https://dxltbofpzyffcbqwpwtw.supabase.co";
  const KEY = "sb_publishable_9n1F7V2dUQYyQ5dD6xQTDQ_31ck857R";   // llave pública (la misma de auth.html)
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  let client = null, loading = null;

  function load(){
    if (client) return Promise.resolve(client);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const go = () => { client = window.supabase.createClient(URL, KEY); resolve(client); };
      if (window.supabase && window.supabase.createClient) return go();
      const s = document.createElement("script");
      s.src = LIB; s.async = true;
      s.onload = go;
      s.onerror = () => { loading = null; reject(new Error("cdn")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // Código de amigo: 8 caracteres sacados del id del usuario (no cambia nunca).
  const codeFor = id => String(id).replace(/-/g, "").slice(0, 8).toUpperCase();
  // Errores que significan "todavía no se corrió supabase/amigos.sql"
  const setupMissing = e => !!e && ["PGRST205", "PGRST202", "PGRST204", "42703", "42P01", "42883"].includes(e.code);
  const fail = e => ({ err: setupMissing(e) ? "setup" : "error", detail: e && e.message });

  async function session(){
    const c = await load();
    const { data } = await c.auth.getSession();
    return data && data.session;
  }

  async function sync(st){
    try {
      const s = await session(); if (!s) return { err: "no_session" };
      const c = await load(), u = s.user;
      const row = { id: u.id, friend_code: codeFor(u.id), xp: st.xp | 0, week_xp: st.weekXp | 0, week_key: st.week || null,
        level: st.level || null, updated_at: new Date().toISOString() };
      if (st.nombre) row.nombre = st.nombre;
      const { error } = await c.from("profiles").upsert(row);
      if (error) return fail(error);
      return { ok: true, code: row.friend_code, id: u.id };
    } catch (e) { return { err: "error", detail: String(e) }; }
  }

  async function list(){
    try {
      const s = await session(); if (!s) return { err: "no_session" };
      const c = await load(), me = s.user.id;
      const { data: fr, error } = await c.from("friendships").select("user_id,friend_id").or(`user_id.eq.${me},friend_id.eq.${me}`);
      if (error) return fail(error);
      const ids = [...new Set(fr.map(f => f.user_id === me ? f.friend_id : f.user_id))];
      if (!ids.length) return { ok: true, me, friends: [] };
      const { data: ps, error: e2 } = await c.from("profiles").select("id,nombre,xp,week_xp,week_key,level").in("id", ids);
      if (e2) return fail(e2);
      return { ok: true, me, friends: ps || [] };
    } catch (e) { return { err: "error", detail: String(e) }; }
  }

  async function add(code){
    try {
      const s = await session(); if (!s) return { err: "no_session" };
      const c = await load();
      const { data, error } = await c.rpc("add_friend", { code: String(code || "").trim().toUpperCase() });
      if (error) return fail(error);
      return data && data.ok ? { ok: true, nombre: data.nombre } : { err: (data && data.error) || "error" };
    } catch (e) { return { err: "error", detail: String(e) }; }
  }

  async function remove(id){
    try {
      const s = await session(); if (!s) return { err: "no_session" };
      const c = await load(), me = s.user.id;
      const { error } = await c.from("friendships").delete()
        .or(`and(user_id.eq.${me},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${me})`);
      if (error) return fail(error);
      return { ok: true };
    } catch (e) { return { err: "error", detail: String(e) }; }
  }

  return { load, sync, list, add, remove, codeFor };
})();
