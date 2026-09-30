const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "GET required" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const u = new URL(req.url);
    const symbol = u.searchParams.get("symbol") || "EUR/USD";
    const interval = u.searchParams.get("interval") || "1min";
    const outputsize = Math.min(
      Math.max(Number(u.searchParams.get("outputsize") || "120"), 1),
      240
    );
    if (!/^[A-Za-z0-9._/:-]{1,40}$/.test(symbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "TWELVE_DATA_API_KEY is not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const q = new URL("https://api.twelvedata.com/time_series");
    q.searchParams.set("symbol", symbol);
    q.searchParams.set("interval", interval);
    q.searchParams.set("outputsize", String(outputsize));
    q.searchParams.set("apikey", key);

    const r = await fetch(q);
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("market-data error", e);
    return new Response(JSON.stringify({ error: "Market data upstream failed" }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
