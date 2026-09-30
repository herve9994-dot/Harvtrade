package com.harvtrade.app

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object MarketDataClient {
    private const val BASE_URL =
        "https://eqvdtaxhtthoptmmaszq.supabase.co/functions/v1/market-data"

    fun fetchHistory(
        symbol: String,
        outputSize: Int,
        callback: (List<MarketPoint>, String?) -> Unit
    ) {
        Thread {
            try {
                val url = BASE_URL +
                    "?symbol=" + URLEncoder.encode(symbol, "UTF-8") +
                    "&interval=1min&outputsize=" + outputSize

                val conn = URL(url).openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 10_000
                conn.readTimeout = 15_000

                val code = conn.responseCode
                val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    .bufferedReader().use { it.readText() }

                val json = JSONObject(body)
                if (code !in 200..299 || json.optString("status") == "error") {
                    callback(emptyList(), json.optString("message", "Market data request failed"))
                    return@Thread
                }

                val values = json.optJSONArray("values")
                    ?: run {
                        callback(emptyList(), "No historical values returned")
                        return@Thread
                    }

                val points = mutableListOf<MarketPoint>()
                for (i in values.length() - 1 downTo 0) {
                    val item = values.optJSONObject(i) ?: continue
                    val price = item.optString("close").toDoubleOrNull() ?: continue
                    if (!price.isFinite() || price <= 0.0) continue

                    val epoch = parseTimestamp(item.optString("datetime"))
                    points += MarketPoint(epoch, price)
                }

                callback(points, if (points.isEmpty()) "No valid historical prices" else null)
            } catch (e: Exception) {
                callback(emptyList(), e.message ?: "Market data network error")
            }
        }.start()
    }

    private fun parseTimestamp(value: String): Long {
        return try {
            val fmt = java.text.SimpleDateFormat(
                "yyyy-MM-dd HH:mm:ss",
                java.util.Locale.US
            )
            fmt.timeZone = java.util.TimeZone.getTimeZone("UTC")
            fmt.parse(value)?.time ?: System.currentTimeMillis()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }
}
