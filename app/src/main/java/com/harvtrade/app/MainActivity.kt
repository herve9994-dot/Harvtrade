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
        loadHistoryThenConnect()
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
        statusText = tv("STARTING • preparing market data", 12f, 0xFFFFD166.toInt())
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
                    forecast = engine.generate(points, horizon)
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

        forecastText = tv("Forecast: LOADING MARKET DATA", 24f, Color.WHITE)
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

    private fun loadHistoryThenConnect() {
        statusText.text = "LOADING • historical EUR/USD data"
        MarketDataClient.fetchHistory("EUR/USD", 120) { history, error ->
            runOnUiThread {
                if (history.isNotEmpty()) {
                    points.clear()
                    points.addAll(history.takeLast(240))
                    lastLivePrice = points.last().price
                    forecast = engine.generate(points, horizon)
                    updateUi()
                    statusText.text = "HISTORY READY • connecting live ticks"
                } else {
                    statusText.text =
                        "DATA WARNING • " + (error ?: "no historical data")
                }
                connectLive()
            }
        }
    }

    private fun connectLive() {
        statusText.text = "CONNECTING • live EUR/USD stream"
        stream?.close()
        stream = MarketStreamClient(
            symbol = "EUR/USD",
            onPrice = { time, price -> onLivePrice(time, price) },
            onStatus = { status -> runOnUiThread { statusText.text = status } }
        )
        stream?.connect()
    }

    private fun onLivePrice(time: Long, price: Double) {
        if (!price.isFinite() || price <= 0.0) return

        lastLivePrice = price
        if (points.isEmpty() || points.last().price != price || points.last().time != time) {
            points += MarketPoint(time, price)
        }
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
                "Forecast: COLLECTING DATA (" + points.size + "/12)"
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
            "Market samples: " + points.size + "\n" +
            "Updated: " + time

        chart.setData(points, forecast)
    }

    private fun recordVerification() {
        if (!lastLivePrice.isFinite()) {
            statusText.text = "VERIFY • waiting for a live price"
            return
        }

        statusText.text =
            "VERIFIED LOCALLY • " +
                "%.5f".format(Locale.US, lastLivePrice) +
                " • no trade placed"
    }
}
