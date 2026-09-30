package com.harvtrade.app
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sin
import kotlin.random.Random
data class MarketPoint(val time:Long,val price:Double)
data class Forecast(val direction:String,val upProbability:Double,val confidence:Double,val expectedMovePct:Double,val agreement:Double,val dataQuality:Double,val momentum:Double,val volatility:Double,val signal:String)
class ForecastEngine {
 fun generate(points:List<MarketPoint>,horizonSeconds:Int):Forecast {
  if(points.size<12)return Forecast("NO SIGNAL",50.0,0.0,0.0,0.0,0.0,0.0,0.0,"Insufficient data")
  val r=points.takeLast(12);val p0=r.first().price;val pN=r.last().price
  val momentum=((pN-p0)/p0)*100.0;val mean=r.map{it.price}.average()
  val variance=r.map{(it.price-mean)*(it.price-mean)}.average()
  val volatility=kotlin.math.sqrt(variance)/mean*100.0
  val fast=r.takeLast(5).map{it.price}.average();val slow=r.map{it.price}.average()
  val trend=((fast-slow)/slow)*10000.0;val raw=momentum*18.0+trend*0.42+sin(points.size/7.0)*0.08
  val scaled=50.0+raw.coerceIn(-18.0,18.0);val hf=1.0/kotlin.math.sqrt(horizonSeconds.toDouble())
  val up=(50.0+(scaled-50.0)*hf).coerceIn(1.0,99.0);val direction=if(up>=50)"UP" else "DOWN"
  val agreement=(50.0+abs(trend)*1.7).coerceIn(0.0,99.0);val quality=(85.0-volatility*2).coerceIn(15.0,98.0)
  val confidence=(abs(up-50)*1.7+agreement*.25+quality*.2).coerceIn(0.0,99.0)
  val expected=((up-50)/50)*(0.012*kotlin.math.sqrt(horizonSeconds.toDouble()))
  val signal=when{quality<35||agreement<38->"NO SIGNAL — weak evidence";confidence>=72->"Actionable research signal";confidence>=55->"Watch / low conviction";else->"NO SIGNAL — insufficient edge"}
  return Forecast(direction,up,confidence,expected,agreement,quality,momentum,volatility,signal)
 }
 fun nextPrice(points:List<MarketPoint>):Double{val last=points.lastOrNull()?.price?:100.0;return max(.0001,last*(1+(Random.nextDouble()-.49)*.035+sin(points.size/5.0)*.018))}
}