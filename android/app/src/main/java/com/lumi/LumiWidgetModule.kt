package com.lumi

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LumiWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LumiWidget"

    @ReactMethod
    fun updateWidget(phase: String, phaseName: String, dayOfCycle: Int, daysUntilPeriod: Int) {
        val ctx = reactApplicationContext
        val prefs = ctx.getSharedPreferences("lumi_widget_prefs", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("phase", phase)
            putString("phaseName", phaseName)
            putInt("dayOfCycle", dayOfCycle)
            putInt("daysUntilPeriod", daysUntilPeriod)
            apply()
        }

        val manager = AppWidgetManager.getInstance(ctx)
        val ids = manager.getAppWidgetIds(ComponentName(ctx, LumiWidget::class.java))
        for (id in ids) {
            LumiWidget.updateAppWidget(ctx, manager, id)
        }
    }
}
