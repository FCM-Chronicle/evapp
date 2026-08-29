package com.example.evapp

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.util.Log

class EVAccessibilityService : AccessibilityService() {
    companion object {
        const val TAG = "EV_Accessibility"
    }

    private var volumeUpPressed = false
    private var volumeDownPressed = false

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Handle screen reading / S-Pen hovering context here
    }

    override fun onInterrupt() {
        Log.d(TAG, "Service Interrupted")
    }

    override fun onKeyEvent(event: KeyEvent): Boolean {
        val action = event.action
        val keyCode = event.keyCode

        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            volumeUpPressed = (action == KeyEvent.ACTION_DOWN)
        }
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            volumeDownPressed = (action == KeyEvent.ACTION_DOWN)
        }

        // Check if both are held down
        if (volumeUpPressed && volumeDownPressed) {
            Log.d(TAG, "Volume Up and Down pressed simultaneously! Launching E.V.")
            launchEVApp()
            return true // Consume the event
        }

        return super.onKeyEvent(event)
    }
    
    private fun launchEVApp() {
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
    }
}
