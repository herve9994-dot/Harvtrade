package com.harvtrade.app

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt

data class MarketPoint(val time: Long, val price: Double)

data class Forecast(
    val direction: String,
    val upProbability: Double,
    val confidence: Double,
    val expectedMovePct: Double,
    val agreement: Double,
    val dataQuality: Double,
    val momentum: Double,
    val volatility: Double,
    val signal: String
)

class ForecastEngine {
    fun generate(points: List<MarketPoint>, horizonSeconds: Int): Forecast {
        if (points.size < 12) {
            return Forecast(
                "NO SIGNAL", 50.0, 0.0, 0.0, 0.0, 0.0,
                0.0, 0.0, "Insufficient data"
            )
        }

        val recent = points.takeLast(60)
        val prices = recent.map { it.price }.filter { it.isFinite() && it > 0.0 }
        if (prices.size < 12) {
            return Forecast(
                "NO SIGNAL", 50.0, 0.0, 0.0, 0.0, 0.0,
                0.0, 0.0, "Insufficient valid data"
            )
        }

        val last = prices.last()
        val shortBase = prices[prices.size - 6]
        val mediumBase = prices[prices.size - 13]
        val shortMomentum = ((last - shortBase) / shortBase) * 100.0
        val mediumMomentum = ((last - mediumBase) / mediumBase) * 100.0

        val fastWindow = prices.takeLast(8).average()
        val slowWindow = prices.takeLast(24.coerceAtMost(prices.size)).average()
        val trend = ((fastWindow - slowWindow) / slowWindow) * 100.0

        val returns = prices.zipWithNext { a, b -> ((b - a) / a) * 100.0 }
        val meanReturn = returns.takeLast(30).average()
        val variance = returns.takeLast(30)
            .map { (it - meanReturn) * (it - meanReturn) }
            .average()
        val volatility = sqrt(max(variance, 0.0))

        val directionVotes = listOf(
            shortMomentum,
            mediumMomentum,
            trend,
            meanReturn
        ).map { when {
            it > 0.0 -> 1
            it < 0.0 -> -1
            else -> 0
        }}

        val positive = directionVotes.count { it > 0 }
        val negative = directionVotes.count { it < 0 }
        val agreement = (max(positive, negative).toDouble() / directionVotes.size) * 100.0

        val weightedSignal =
            shortMomentum * 0.40 +
            mediumMomentum * 0.25 +
            trend * 0.25 +
            meanReturn * 0.10

        val horizonFactor = 1.0 / sqrt(horizonSeconds.toDouble())
        val rawEdge = (weightedSignal * 220.0 * horizonFactor)
            .coerceIn(-45.0, 45.0)
        val upProbability = (50.0 + rawEdge).coerceIn(1.0, 99.0)

        val sampleQuality = (prices.size / 60.0 * 100.0).coerceIn(0.0, 100.0)
        val volatilityQuality = when {
            volatility <= 0.02 -> 35.0
            volatility <= 0.08 -> 100.0
            volatility <= 0.20 -> 75.0
            volatility <= 0.50 -> 45.0
            else -> 25.0
        }
        val dataQuality = (sampleQuality * 0.65 + volatilityQuality * 0.35)
            .coerceIn(0.0, 100.0)

        val evidenceStrength = abs(upProbability - 50.0) * 2.0
        val confidence = (
            evidenceStrength * 0.45 +
            agreement * 0.30 +
            dataQuality * 0.25
        ).coerceIn(0.0, 99.0)

        val direction = when {
            upProbability >= 55.0 -> "UP"
            upProbability <= 45.0 -> "DOWN"
            else -> "NO SIGNAL"
        }

        val expectedMove = ((upProbability - 50.0) / 50.0) *
            volatility.coerceAtLeast(0.005) *
            sqrt(horizonSeconds.toDouble())

        val signal = when {
            direction == "NO SIGNAL" -> "NO SIGNAL — mixed evidence"
            confidence >= 72.0 && agreement >= 75.0 ->
                "Research signal — strong agreement"
            confidence >= 55.0 ->
                "Watch — moderate evidence"
            else ->
                "NO SIGNAL — weak evidence"
        }

        return Forecast(
            direction,
            upProbability,
            confidence,
            expectedMove,
            agreement,
            dataQuality,
            (shortMomentum * 0.6 + mediumMomentum * 0.4),
            volatility,
            signal
        )
    }
}
