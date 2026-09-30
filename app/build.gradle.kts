plugins {
    id("com.android.application")
}

android {
    namespace = "com.harvtrade.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.harvtrade.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.2.1"
    }

    buildTypes {
        debug { isMinifyEnabled = false }
        release { isMinifyEnabled = false }
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation("org.java-websocket:Java-WebSocket:1.5.7")
}
