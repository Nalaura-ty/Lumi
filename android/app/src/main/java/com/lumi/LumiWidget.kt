package com.lumi

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class LumiWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val prefs = context.getSharedPreferences("lumi_widget_prefs", Context.MODE_PRIVATE)
            val phase = prefs.getString("phase", "luteal") ?: "luteal"
            val phaseName = prefs.getString("phaseName", "Lutea") ?: "Lutea"
            val dayOfCycle = prefs.getInt("dayOfCycle", 1)
            val daysUntilPeriod = prefs.getInt("daysUntilPeriod", 0)

            val views = RemoteViews(context.packageName, R.layout.lumi_widget)

            // Phase icon (text emoji)
            val icon = when (phase) {
                "menstrual" -> "\uD83E\uDE78"  // drop of blood
                "follicular" -> "\uD83C\uDF31" // seedling
                "ovulation" -> "\u2B50"         // star
                else -> "\uD83C\uDF19"          // crescent moon
            }
            views.setTextViewText(R.id.widget_icon, icon)

            // Phase background
            val bgRes = when (phase) {
                "menstrual" -> R.drawable.widget_background_menstrual
                "follicular" -> R.drawable.widget_background_follicular
                "ovulation" -> R.drawable.widget_background_ovulation
                else -> R.drawable.widget_background_luteal
            }
            views.setInt(R.id.widget_container, "setBackgroundResource", bgRes)

            views.setTextViewText(R.id.widget_phase, "Fase $phaseName")
            views.setTextViewText(R.id.widget_day, "Dia $dayOfCycle")

            val countdownText = when {
                daysUntilPeriod < 0 -> "Menstruacao em curso"
                daysUntilPeriod == 0 -> "Menstruacao hoje"
                daysUntilPeriod == 1 -> "Menstruacao amanha"
                else -> "Proxima menstruacao em $daysUntilPeriod dias"
            }
            views.setTextViewText(R.id.widget_countdown, countdownText)

            // Tap opens the app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
