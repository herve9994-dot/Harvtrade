# Supabase integration

Harvtrade keeps provider credentials server-side. The intended production path is:

market data provider -> Supabase Edge Function -> Android app -> forecast engine -> forecast_events.

Configure TWELVE_DATA_API_KEY as a Supabase Edge Function secret. Do not place provider keys, Supabase secret keys, or service-role keys in the APK.
