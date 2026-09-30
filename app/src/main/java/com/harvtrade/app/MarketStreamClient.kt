package com.harvtrade.app

import android.os.Handler
import android.os.Looper
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI
import java.net.URLEncoder

class MarketStreamClient(
    private val symbol: String,
    private val onPrice: (Long, Double) -> Unit,
    private val onStatus: (String) -> Unit
) {
    private var socket: WebSocketClient? = null
    private val main = Handler(Looper.getMainLooper())
    private var stopped = false
    private var reconnecting = false

    private val heartbeat = object : Runnable {
        override fun run() {
            val ws = socket
            if (!stopped && ws?.isOpen == true) {
                try {
                    ws.send("{\"action\":\"heartbeat\"}")
                } catch (_: Exception) {}
            }
            if (!stopped) main.postDelayed(this, 10_000L)
        }
    }

    fun connect() {
        stopped = false
        reconnecting = false
        createSocket()
        main.removeCallbacks(heartbeat)
        main.postDelayed(heartbeat, 10_000L)
    }

    private fun createSocket() {
        try { socket?.close() } catch (_: Exception) {}

        val uri = URI(
            "wss://eqvdtaxhtthoptmmaszq.supabase.co/functions/v1/market-stream" +
                "?symbol=" + URLEncoder.encode(symbol, "UTF-8")
        )

        socket = object : WebSocketClient(uri) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                reconnecting = false
                main.post { onStatus("LIVE • Twelve Data stream connected") }
            }

            override fun onMessage(message: String?) {
                if (message.isNullOrBlank()) return
                try {
                    val json = JSONObject(message)
                    when (json.optString("event")) {
                        "price" -> {
                            val price = json.optString("price").toDoubleOrNull()
                                ?: json.optDouble("price", Double.NaN)
                            val timestamp = json.optString("timestamp").toLongOrNull()
                                ?: json.optLong(
                                    "timestamp",
                                    System.currentTimeMillis() / 1000L
                                )
                            if (price.isFinite() && price > 0.0) {
                                main.post { onPrice(timestamp * 1000L, price) }
                            }
                        }
                        "subscribe-status" -> {
                            main.post {
                                onStatus(
                                    "LIVE • subscription " +
                                        json.optString("status", "received")
                                )
                            }
                        }
                    }
                } catch (_: Exception) {}
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                main.post {
                    onStatus("STREAM CLOSED • reconnecting")
                    scheduleReconnect()
                }
            }

            override fun onError(ex: Exception?) {
                main.post {
                    onStatus("STREAM ERROR • " + (ex?.message ?: "reconnecting"))
                }
            }
        }

        socket?.connect()
    }

    private fun scheduleReconnect() {
        if (stopped || reconnecting) return
        reconnecting = true
        main.postDelayed({
            if (!stopped) {
                reconnecting = false
                createSocket()
            }
        }, 3_000L)
    }

    fun close() {
        stopped = true
        reconnecting = false
        main.removeCallbacks(heartbeat)
        try { socket?.close() } catch (_: Exception) {}
        socket = null
    }
}
