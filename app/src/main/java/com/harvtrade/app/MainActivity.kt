package com.harvtrade.app
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
class MainActivity:android.app.Activity(){
 private val engine=ForecastEngine();private val handler=Handler(Looper.getMainLooper());private val points=mutableListOf<MarketPoint>()
 private lateinit var chart:MarketChartView;private lateinit var forecastText:TextView;private lateinit var confidenceText:TextView;private lateinit var countdownText:TextView;private lateinit var analysisText:TextView;private lateinit var statusText:TextView
 private var horizon=10;private var forecast=engine.generate(emptyList(),horizon);private var cycleRemaining=10;private val basePrice=100.0
 private val tick=object:Runnable{override fun run(){val p=engine.nextPrice(points.ifEmpty{listOf(MarketPoint(System.currentTimeMillis(),basePrice))});points+=MarketPoint(System.currentTimeMillis(),p);if(points.size>80)points.removeAt(0);forecast=engine.generate(points,horizon);if(cycleRemaining<=0)cycleRemaining=horizon else cycleRemaining--;updateUi();handler.postDelayed(this,1000)}}
 override fun onCreate(s:Bundle?){super.onCreate(s);window.statusBarColor=Color.rgb(8,11,16);window.navigationBarColor=Color.rgb(8,11,16);repeat(45){i->points+=MarketPoint(System.currentTimeMillis()-(45-i)*1000L,basePrice*(1+kotlin.random.Random.nextDouble(-.012,.012)))};buildUi();handler.post(tick)}
 override fun onDestroy(){handler.removeCallbacksAndMessages(null);super.onDestroy()}
 private fun tv(t:String,size:Float,color:Int=Color.LTGRAY)=TextView(this).apply{text=t;textSize=size;setTextColor(color);setPadding(16,8,16,8)}
 private fun buildUi(){val root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setBackgroundColor(Color.rgb(8,11,16));setPadding(12,18,12,12)};setContentView(ScrollView(this).apply{addView(root)})
  root.addView(tv("HARVTRADE",25f,Color.WHITE));statusText=tv("RESEARCH MODE • simulated market feed • no broker connection",12f,0xFF65D9A3.toInt());root.addView(statusText)
  val row=LinearLayout(this).apply{gravity=Gravity.CENTER;orientation=LinearLayout.HORIZONTAL};listOf(2,5,10,15).forEach{h->val b=Button(this).apply{text="${h}s";setOnClickListener{horizon=h;cycleRemaining=h;updateUi()}};row.addView(b,LinearLayout.LayoutParams(0,-2,1f))};root.addView(row)
  chart=MarketChartView(this).apply{setBackgroundColor(Color.rgb(11,16,23))};root.addView(chart,LinearLayout.LayoutParams(-1,420))
  forecastText=tv("Forecast: —",30f,Color.WHITE);root.addView(forecastText);confidenceText=tv("Confidence: —",18f);root.addView(confidenceText);countdownText=tv("Countdown: —",18f,0xFFFFD166.toInt());root.addView(countdownText)
  root.addView(tv("ANALYSIS",15f,0xFF8D9AAA.toInt()));analysisText=tv("",15f);root.addView(analysisText)
  root.addView(Button(this).apply{text="VERIFY PREDICTION / RECORD OUTCOME";setOnClickListener{recordVerification()}});root.addView(tv("Important: this APK does not place real-money trades. Use it to verify data, forecasts and outcomes first. A broker connection is intentionally disabled in V1.",12f,0xFFFFB4B4.toInt()))
 }
 private fun updateUi(){val dc=if(forecast.direction=="UP")0xFF65D9A3.toInt()else if(forecast.direction=="DOWN")0xFFFF6B7A.toInt()else Color.LTGRAY;forecastText.text="${forecast.direction} • ${forecast.upProbability.roundToInt()}% UP";forecastText.setTextColor(dc);confidenceText.text="Confidence ${forecast.confidence.roundToInt()}% • Agreement ${forecast.agreement.roundToInt()}% • Data ${forecast.dataQuality.roundToInt()}%";countdownText.text="${horizon}s horizon • cycle: ${cycleRemaining.coerceAtLeast(0)}s";val price=points.lastOrNull()?.price?:0.0;analysisText.text="Price: ${"%.5f".format(Locale.US,price)}\nMomentum: ${"%.4f".format(Locale.US,forecast.momentum)}%\nVolatility: ${"%.4f".format(Locale.US,forecast.volatility)}%\nExpected move: ${"%.4f".format(Locale.US,forecast.expectedMovePct)}%\nSignal state: ${forecast.signal}\nUpdated: ${SimpleDateFormat("HH:mm:ss",Locale.US).format(Date())}";chart.setData(points,forecast)}
 private fun recordVerification(){val price=points.lastOrNull()?.price?:return;statusText.text="VERIFIED LOCALLY • forecast recorded at ${"%.5f".format(Locale.US,price)} • no trade placed"}
}