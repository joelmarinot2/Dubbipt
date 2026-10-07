/* DublajeCast — proxy mínimo para APIs de modelos compatibles con OpenAI que no permiten CORS (NVIDIA NIM).
   - La clave la envía el navegador en Authorization y sólo se reenvía al proveedor; no se guarda nada en el servidor.
   - Sólo se permiten los proveedores y rutas listados abajo.
   - Edge runtime: reenvía el streaming (SSE) tal cual. */
export const config = { runtime: "edge" };

const PROVIDERS = {
  nvidia: "https://integrate.api.nvidia.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1"
};
const PATHS = new Set(["/chat/completions", "/models"]);
const MAX_BODY = 6 * 1024 * 1024; // 6 MB: libreto + show guide sobran

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async function handler(req) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "";
  const path = url.searchParams.get("path") || "/chat/completions";
  if (!PROVIDERS[provider]) return json(400, { error: { message: "Proveedor no permitido: " + provider } });
  if (!PATHS.has(path)) return json(400, { error: { message: "Ruta no permitida: " + path } });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: { message: "Método no permitido" } });
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json(401, { error: { message: "Falta la clave de API (Authorization: Bearer …)" } });

  const init = { method: req.method, headers: { authorization: auth, accept: req.headers.get("accept") || "*/*" } };
  if (req.method === "POST") {
    const body = await req.text();
    if (body.length > MAX_BODY) return json(413, { error: { message: "El contenido supera el máximo permitido (6 MB)" } });
    init.headers["content-type"] = "application/json";
    init.body = body;
  }
  let up;
  try {
    up = await fetch(PROVIDERS[provider] + path, init);
  } catch (e) {
    return json(502, { error: { message: "No se pudo contactar con el proveedor: " + (e && e.message) } });
  }
  const headers = new Headers();
  headers.set("content-type", up.headers.get("content-type") || "application/json");
  headers.set("cache-control", "no-store");
  headers.set("x-accel-buffering", "no");
  return new Response(up.body, { status: up.status, headers });
}
