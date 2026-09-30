package com.harvtrade.app

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.widget.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

class MainActivity : Activity() {
    private val engine = ForecastEngine()
    private val handler = Handler(Looper.getMainLooper())
    private val points = mutableListOf<MarketPoint>()

    private lateinit var chart: MarketChartView
    private lateinit var forecastText: TextView
    private lateinit var confidenceText: TextView
    private lateinit var countdownText: TextView
    private lateinit var analysisText: TextView
    private lateinit var statusText: TextView

    private var horizon = 10
    private var forecast = engine.generate(emptyList(), horizon)
    private var cycleRemaining = horizon
    private var lastLivePrice = Double.NaN
    private var stream: MarketStreamClient? = null
    private var liveStartedAt = 0L

    private val countdown = object : Runnable {
        override fun run() {
            if (liveStartedAt > 0L) {
                val elapsed = (System.currentTimeMillis() - liveStartedAt) / 1000L
                cycleRemaining = horizon - (elapsed % horizon).toInt()
                updateUi()
            }
            handler.postDelayed(this, 250L)
        }
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.statusBarColor = Color.rgb(8, 11, 16)
        window.navigationBarColor = Color.rgb(8, 11, 16)
        buildUi()
        handler.post(countdown)
        connectLive()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        stream?.close()
        super.onDestroy()
    }

    private fun tv(text: String, size: Float, color: Int = Color.LTGRAY) =
        TextView(this).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            setPadding(16, 8, 16, 8)
        }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(8, 11, 16))
            setPadding(12, 18, 12, 12)
        }
        setContentView(ScrollView(this).apply { addView(root) })

        root.addView(tv("HARVTRADE", 25f, Color.WHITE))
        statusText = tv("CONNECTING • secure market-data gateway", 12f, 0xFFFFD166.toInt())
        root.addView(statusText)

        val row = LinearLayout(this).apply {
            gravity = Gravity.CENTER
            orientation = LinearLayout.HORIZONTAL
        }
        listOf(2, 5, 10, 15).forEach { h ->
            val button = Button(this).apply {
                text = h.toString() + "s"
                setOnClickListener {
                    horizon = h
                    cycleRemaining = h
                    liveStartedAt = System.currentTimeMillis()
                    updateUi()
                }
            }
            row.addView(button, LinearLayout.LayoutParams(0, -2, 1f))
        }
        root.addView(row)

        chart = MarketChartView(this).apply {
            setBackgroundColor(Color.rgb(11, 16, 23))
        }
        root.addView(chart, LinearLayout.LayoutParams(-1, 420))

        forecastText = tv("Forecast: WAITING FOR LIVE DATA", 24f, Color.WHITE)
        root.addView(forecastText)

        confidenceText = tv("Confidence: —", 18f)
        root.addView(confidenceText)

        countdownText = tv("Countdown: waiting", 18f, 0xFFFFD166.toInt())
        root.addView(countdownText)

        root.addView(tv("ANALYSIS", 15f, 0xFF8D9AAA.toInt()))
        analysisText = tv("", 15f)
        root.addView(analysisText)

        root.addView(Button(this).apply {
            text = "VERIFY PREDICTION / RECORD OUTCOME"
            setOnClickListener { recordVerification() }
        })

        root.addView(
            tv(
                "Research mode: live market data only. This APK never places real-money trades.",
                12f,
                0xFFFFB4B4.toInt()
            )
        )
    }

    private fun connectLive() {
        statusText.text = "AUTHENTICATING • private market stream"
        SupabaseSession.ensureAnonymousSession(this) { token, error ->
            runOnUiThread {
                if (token == null) {
                    statusText.text = "AUTH ERROR • " + (error ?: "unknown")
                    forecastText.text = "Forecast: NO LIVE DATA"
                    analysisText.text =
                        "Supabase anonymous sign-in did not return a session."
                    return@runOnUiThread
                }

                statusText.text = "CONNECTING • Twelve Data live stream"
                stream?.close()
                stream = MarketStreamClient(
                    token = token,
                    symbol = "EUR/USD",
                    onPrice = { time, price -> onLivePrice(time, price) },
                    onStatus = { status -> statusText.text = status }
                )
                stream?.connect()
            }
        }
    }

    private fun onLivePrice(time: Long, price: Double) {
        if (!price.isFinite()) return

        lastLivePrice = price
        points += MarketPoint(time, price)
        if (points.size > 240) points.removeAt(0)

        if (liveStartedAt == 0L) {
            liveStartedAt = System.currentTimeMillis()
        }

        forecast = engine.generate(points, horizon)
        updateUi()
    }

    private fun updateUi() {
        val directionColor = when (forecast.direction) {
            "UP" -> 0xFF65D9A3.toInt()
            "DOWN" -> 0xFFFF6B7A.toInt()
            else -> Color.LTGRAY
        }

        forecastText.text =
            if (points.size < 12) {
                "Forecast: COLLECTING LIVE TICKS (" + points.size + "/12)"
            } else {
                forecast.direction + " • " +
                    forecast.upProbability.roundToInt() + "% UP"
            }
        forecastText.setTextColor(directionColor)

        confidenceText.text =
            "Confidence " + forecast.confidence.roundToInt() +
                "% • Agreement " + forecast.agreement.roundToInt() +
                "% • Data " + forecast.dataQuality.roundToInt() + "%"

        countdownText.text =
            horizon.toString() + "s horizon • next cycle: " +
                cycleRemaining.coerceAtLeast(0) + "s"

        val price = if (lastLivePrice.isFinite()) lastLivePrice else 0.0
        val time = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())

        analysisText.text =
            "Symbol: EUR/USD\n" +
            "Live price: " + "%.5f".format(Locale.US, price) + "\n" +
            "Momentum: " + "%.4f".format(Locale.US, forecast.momentum) + "%\n" +
            "Volatility: " + "%.4f".format(Locale.US, forecast.volatility) + "%\n" +
            "Expected move: " + "%.4f".format(Locale.US, forecast.expectedMovePct) + "%\n" +
            "Signal state: " + forecast.signal + "\n" +
            "Live ticks: " + points.size + "\n" +
            "Updated: " + time

        chart.setData(points, forecast)
    }

    private fun recordVerification() {
        if (!lastLivePrice.isFinite()) return

        statusText.text =
            "VERIFIED LOCALLY • " +
                "%.5f".format(Locale.US, lastLivePrice) +
                " • no trade placed"
    }
}
