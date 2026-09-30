import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(message: string, status = 200) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") return json("WebSocket upgrade required", 426);

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const symbol = url.searchParams.get("symbol") || "EUR/USD";
  if (!token) return json("Missing user token", 401);
  if (!/^[A-Za-z0-9._/:-]{1,40}$/.test(symbol)) return json("Invalid symbol", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json("Invalid user token", 401);

  const twelveKey = Deno.env.get("TWELVE_DATA_API_KEY");
  if (!twelveKey) return json("TWELVE_DATA_API_KEY is not configured", 500);

  const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 0 });
  const upstream = new WebSocket(
    "wss://ws.twelvedata.com/v1/quotes/price?apikey=" + encodeURIComponent(twelveKey),
  );

  let closed = false;
  const safeSend = (payload: unknown) => {
    if (!closed && socket.readyState === WebSocket.OPEN) {
      socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    }
  };

  upstream.onopen = () => {
    upstream.send(JSON.stringify({ action: "subscribe", params: { symbols: symbol } }));
    safeSend({ type: "stream_status", status: "connected", symbol });
  };
  upstream.onmessage = (event) => safeSend(event.data);
  upstream.onerror = () => safeSend({ type: "stream_status", status: "error" });
  upstream.onclose = () => {
    if (!closed) safeSend({ type: "stream_status", status: "upstream_closed" });
    if (!closed && socket.readyState === WebSocket.OPEN) socket.close(1011, "Market data stream closed");
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data));
      if (msg?.action === "heartbeat") upstream.send(JSON.stringify({ action: "heartbeat" }));
    } catch {}
  };
  socket.onclose = () => { closed = true; try { upstream.close(); } catch {} };
  socket.onerror = () => { closed = true; try { upstream.close(); } catch {} };

  return response;
});