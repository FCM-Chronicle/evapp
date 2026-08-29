package com.example.evapp

import android.content.Intent
import android.os.Bundle
import android.content.Context
import android.media.AudioManager
import android.view.KeyEvent
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val EVENT_CHANNEL = "com.example.evapp/notifications"
    private val METHOD_CHANNEL = "com.example.evapp/methods"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // EventChannel to send notifications TO Flutter
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENT_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    EVNotificationListenerService.listener = { id, pkg, title, text, album, artUrl ->
                        runOnUiThread {
                            val eventMap = mutableMapOf(
                                "id" to id,
                                "package" to pkg,
                                "title" to title,
                                "text" to text,
                                "album" to album
                            )
                            if (artUrl != null) {
                                eventMap["artUrl"] = artUrl
                            }
                            events?.success(eventMap)
                        }
                    }
                }

                override fun onCancel(arguments: Any?) {
                    EVNotificationListenerService.listener = null
                }
            }
        )

        // MethodChannel to receive commands FROM Flutter
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, METHOD_CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "executePendingIntent") {
                val id = call.argument<String>("id")
                if (id != null) {
                    val pendingIntent = EVNotificationListenerService.pendingIntents[id]
                    if (pendingIntent != null) {
                        try {
                            pendingIntent.send()
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("INTENT_ERROR", e.message, null)
                        }
                    } else {
                        result.error("NOT_FOUND", "PendingIntent not found for id $id", null)
                    }
                } else {
                    result.error("INVALID_ARG", "id is null", null)
                }
            } else if (call.method == "checkNotificationPermission") {
                val flat = android.provider.Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
                val enabled = flat != null && flat.contains(packageName)
                result.success(enabled)
            } else if (call.method == "requestNotificationPermission") {
                val intent = Intent(android.provider.Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
                result.success(true)
            } else if (call.method == "playPlaylist") {
                // ACTION_VIEW on the .m3u file was unreliable: many players just
                // launch and keep playing whatever was already playing instead of
                // actually parsing the playlist. Musicolet supports a search-style
                // "play from search" intent scoped to a playlist name, which forces
                // it to start that exact playlist regardless of current state.
                val playlistName = call.argument<String>("name")
                if (playlistName != null) {
                    val playIntent = Intent(android.provider.MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH)
                    playIntent.putExtra(android.app.SearchManager.QUERY, playlistName)
                    playIntent.putExtra(android.provider.MediaStore.EXTRA_MEDIA_FOCUS, android.provider.MediaStore.Audio.Playlists.ENTRY_CONTENT_TYPE)
                    playIntent.setPackage("in.krosbits.musicolet")
                    playIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try {
                        startActivity(playIntent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("INTENT_ERROR", e.message, null)
                    }
                } else {
                    result.error("INVALID_ARG", "playlist name is null", null)
                }
            } else if (call.method == "playM3uFile") {
                val m3uPath = call.argument<String>("path")
                if (m3uPath != null) {
                    val file = java.io.File(m3uPath)
                    if (file.exists()) {
                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            this,
                            "$packageName.provider",
                            file
                        )
                        val playIntent = Intent(Intent.ACTION_VIEW)
                        playIntent.setDataAndType(uri, "audio/x-mpegurl")
                        playIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        playIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        playIntent.setPackage("in.krosbits.musicolet")
                        
                        try {
                            startActivity(playIntent)
                            result.success(true)
                        } catch (e: Exception) {
                            playIntent.setPackage(null)
                            try {
                                startActivity(playIntent)
                                result.success(true)
                            } catch (e2: Exception) {
                                result.error("INTENT_ERROR", e2.message, null)
                            }
                        }
                    } else {
                        result.error("NOT_FOUND", "File not found: $m3uPath", null)
                    }
                } else {
                    result.error("INVALID_ARG", "M3U path is null", null)
                }
            } else if (call.method == "checkMusicActive") {
                val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                result.success(audioManager.isMusicActive)
            } else if (call.method == "playMusic" || call.method == "resumeMusic") {
                val playIntent = Intent(android.provider.MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH)
                playIntent.putExtra(android.app.SearchManager.QUERY, "")
                playIntent.setPackage("in.krosbits.musicolet")
                playIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try {
                    startActivity(playIntent)
                } catch (e: Exception) {
                    // Fallback to basic media button if Musicolet is not found or fails
                    val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY))
                    audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY))
                }
                result.success(true)
            } else if (call.method == "pauseMusic") {
                val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PAUSE))
                audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PAUSE))
                result.success(true)
            } else if (call.method == "getSharedImage") {
                result.success(sharedImagePath)
                sharedImagePath = null // Clear after reading
            } else {
                result.notImplemented()
            }
        }
    }

    private var sharedImagePath: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleSendIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleSendIntent(intent)
    }

    private fun handleSendIntent(intent: Intent?) {
        if (intent == null) return
        if (Intent.ACTION_SEND == intent.action && intent.type != null) {
            if (intent.type!!.startsWith("image/")) {
                val imageUri = intent.getParcelableExtra<android.net.Uri>(Intent.EXTRA_STREAM)
                if (imageUri != null) {
                    val cacheFile = copyUriToCache(imageUri)
                    if (cacheFile != null) {
                        sharedImagePath = cacheFile.absolutePath
                        sendSharedImageToFlutter()
                    }
                }
            }
        }
    }

    private fun copyUriToCache(uri: android.net.Uri): java.io.File? {
        return try {
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val tempFile = java.io.File(cacheDir, "shared_image_${System.currentTimeMillis()}.png")
            val outputStream = java.io.FileOutputStream(tempFile)
            val buffer = ByteArray(1024)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
            }
            outputStream.close()
            inputStream.close()
            tempFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun sendSharedImageToFlutter() {
        val path = sharedImagePath ?: return
        flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
            runOnUiThread {
                MethodChannel(messenger, METHOD_CHANNEL).invokeMethod("sharedImageReceived", mapOf("path" to path))
                sharedImagePath = null
            }
        }
    }
}