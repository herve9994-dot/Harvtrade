plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.harvtrade.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.harvtrade.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0"
    }

    buildTypes {
        debug { isMinifyEnabled = false }
        release { isMinifyEnabled = false }
    }
}

dependencies {
    implementation("org.java-websocket:Java-WebSocket:1.5.7")
}
