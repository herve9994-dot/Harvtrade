const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const u = new URL(req.url);
    const symbol = u.searchParams.get("symbol") || "EUR/USD";
    const interval = u.searchParams.get("interval") || "1min";
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
    q.searchParams.set("outputsize", "120");
    q.searchParams.set("apikey", key);

    const r = await fetch(q);
    return new Response(await r.text(), {
      status: r.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
