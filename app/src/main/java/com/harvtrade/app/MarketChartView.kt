package com.harvtrade.app
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import kotlin.math.max
class MarketChartView(context:Context):View(context){
 private val line=Paint(Paint.ANTI_ALIAS_FLAG).apply{strokeWidth=4f;style=Paint.Style.STROKE}
 private val grid=Paint(Paint.ANTI_ALIAS_FLAG).apply{strokeWidth=1f;style=Paint.Style.STROKE}
 private var values:List<Double> = emptyList();private var forecast:Forecast?=null
 fun setData(points:List<MarketPoint>,f:Forecast?){values=points.map{it.price};forecast=f;invalidate()}
 override fun onDraw(c:Canvas){val w=width.toFloat();val h=height.toFloat();grid.color=0x223A4555
  for(i in 1..4)c.drawLine(0f,h*i/5f,w,h*i/5f,grid);if(values.size<2)return
  val lo=values.minOrNull()?:0.0;val hi=values.maxOrNull()?:1.0;val span=max(hi-lo,.000001);val p=Path()
  values.forEachIndexed{i,v->val x=i*w/(values.size-1).toFloat();val y=h-((v-lo)/span).toFloat()*(h*.82f)-h*.09f;if(i==0)p.moveTo(x,y)else p.lineTo(x,y)}
  line.color=0xFF65D9A3.toInt();c.drawPath(p,line);forecast?.let{line.color=if(it.direction=="UP")0xFF65D9A3.toInt()else 0xFFFF6B7A.toInt();val ly=h-((values.last()-lo)/span).toFloat()*(h*.82f)-h*.09f;val projected=values.last()*(1+it.expectedMovePct/100);val fy=h-((projected-lo)/span).toFloat()*(h*.82f)-h*.09f;val fp=Path();fp.moveTo(w-2,ly);fp.lineTo(w,fy);c.drawPath(fp,line)}
 }
}