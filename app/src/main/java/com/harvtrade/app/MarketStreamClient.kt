package com.harvtrade.app

import android.os.Handler
import android.os.Looper
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI
import java.net.URLEncoder

class MarketStreamClient(
    private val token: String,
    private val symbol: String,
    private val onPrice: (Long, Double) -> Unit,
    private val onStatus: (String) -> Unit
) {
    private var socket: WebSocketClient? = null
    private val main = Handler(Looper.getMainLooper())

    fun connect() {
        close()
        val uri = URI(
            "wss://eqvdtaxhtthoptmmaszq.supabase.co/functions/v1/market-stream" +
                "?token=" + URLEncoder.encode(token, "UTF-8") +
                "&symbol=" + URLEncoder.encode(symbol, "UTF-8")
        )
        socket = object : WebSocketClient(uri) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                main.post { onStatus("LIVE • Twelve Data stream connected") }
            }
            override fun onMessage(message: String?) {
                if (message.isNullOrBlank()) return
                try {
                    val json = JSONObject(message)
                    if (json.optString("event") == "price") {
                        val price = json.optDouble("price", Double.NaN)
                        val timestamp = json.optLong("timestamp", System.currentTimeMillis() / 1000L) * 1000L
                        if (price.isFinite()) main.post { onPrice(timestamp, price) }
                    } else if (json.optString("type") == "stream_status") {
                        main.post { onStatus(json.optString("status", "stream status")) }
                    }
                } catch (_: Exception) {}
            }
            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                main.post { onStatus("STREAM CLOSED • " + (reason ?: "closed")) }
            }
            override fun onError(ex: Exception?) {
                main.post { onStatus("STREAM ERROR • " + (ex?.message ?: "unknown")) }
            }
        }
        socket?.connect()
    }

    fun close() {
        try { socket?.close() } catch (_: Exception) {}
        socket = null
    }
}