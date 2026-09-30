const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(message: string, status = 200) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if ((req.headers.get("upgrade") || "").toLowerCase() !== "websocket") {
    return json("WebSocket upgrade required", 426);
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") || "EUR/USD";
  if (!/^[A-Za-z0-9._/:-]{1,40}$/.test(symbol)) {
    return json("Invalid symbol", 400);
  }

  const twelveKey = Deno.env.get("TWELVE_DATA_API_KEY");
  if (!twelveKey) return json("TWELVE_DATA_API_KEY is not configured", 500);

  const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 0 });

  let resolveClosed!: () => void;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  // Keep the worker alive while the WebSocket is open.
  // @ts-ignore EdgeRuntime is provided by Supabase Edge Runtime.
  EdgeRuntime.waitUntil(closed);

  const upstream = new WebSocket(
    "wss://ws.twelvedata.com/v1/quotes/price?apikey=" +
      encodeURIComponent(twelveKey),
  );

  let closedState = false;

  const safeSend = (payload: unknown) => {
    if (!closedState && socket.readyState === WebSocket.OPEN) {
      socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    }
  };

  upstream.onopen = () => {
    upstream.send(JSON.stringify({
      action: "subscribe",
      params: { symbols: symbol },
    }));
    safeSend({ type: "stream_status", status: "connected", symbol });
  };

  upstream.onmessage = (event) => safeSend(event.data);

  upstream.onerror = (event) => {
    console.error("Twelve Data websocket error", event);
    safeSend({ type: "stream_status", status: "error" });
  };

  upstream.onclose = () => {
    if (!closedState) {
      safeSend({ type: "stream_status", status: "upstream_closed" });
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, "Market data stream closed");
      }
    }
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data));
      if (msg?.action === "heartbeat") {
        upstream.send(JSON.stringify({ action: "heartbeat" }));
      }
    } catch {}
  };

  socket.onclose = () => {
    closedState = true;
    resolveClosed();
    try { upstream.close(); } catch {}
  };

  socket.onerror = () => {
    closedState = true;
    resolveClosed();
    try { upstream.close(); } catch {}
  };

  return response;
});
