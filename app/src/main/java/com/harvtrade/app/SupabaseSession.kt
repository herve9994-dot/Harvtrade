package com.harvtrade.app

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object SupabaseSession {
    private const val SUPABASE_URL = "https://eqvdtaxhtthoptmmaszq.supabase.co"
    private const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wCWYXyQILzQx3gp4jaZtaQ_T01-Y4b5"
    private const val PREFS = "harvtrade_session"
    private const val ACCESS_TOKEN = "access_token"

    fun getAccessToken(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(ACCESS_TOKEN, null)

    fun clear(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()

    fun ensureAnonymousSession(context: Context, callback: (String?, String?) -> Unit) {
        val existing = getAccessToken(context)
        if (!existing.isNullOrBlank()) {
            callback(existing, null)
            return
        }
        Thread {
            try {
                val conn = URL("$SUPABASE_URL/auth/v1/signup").openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("apikey", SUPABASE_PUBLISHABLE_KEY)
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 15000
                conn.outputStream.use { it.write("{}".toByteArray()) }

                val body = (if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream)
                    .bufferedReader().use { it.readText() }
                if (conn.responseCode !in 200..299) {
                    callback(null, JSONObject(body).optString("msg", "Anonymous sign-in failed"))
                    return@Thread
                }

                val token = JSONObject(body).optString("access_token")
                if (token.isBlank()) {
                    callback(null, "Supabase did not return an access token. Enable Anonymous Sign-Ins.")
                    return@Thread
                }
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(ACCESS_TOKEN, token).apply()
                callback(token, null)
            } catch (e: Exception) {
                callback(null, e.message ?: "Network error")
            }
        }.start()
    }
}