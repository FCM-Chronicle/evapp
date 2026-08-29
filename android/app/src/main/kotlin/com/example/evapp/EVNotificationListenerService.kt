package com.example.evapp

import android.app.Notification
import android.app.PendingIntent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

import android.graphics.Bitmap
import android.util.Base64
import java.io.ByteArrayOutputStream

class EVNotificationListenerService : NotificationListenerService() {
    companion object {
        const val TAG = "EV_Notification"
        val pendingIntents = mutableMapOf<String, PendingIntent>()
        var listener: ((String, String, String, String, String, String?) -> Unit)? = null
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        val notification = sbn.notification
        val extras = notification.extras

        var title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        var text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        var album = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        
        val id = sbn.key // Unique key for the notification
        val pendingIntent = notification.contentIntent
        if (pendingIntent != null) {
            pendingIntents[id] = pendingIntent
        }

        var artUrl: String? = null

        val token = extras.getParcelable<android.media.session.MediaSession.Token>(Notification.EXTRA_MEDIA_SESSION)
        if (token != null) {
            try {
                val mediaController = android.media.session.MediaController(this, token)
                val metadata = mediaController.metadata
                if (metadata != null) {
                    title = metadata.getString(android.media.MediaMetadata.METADATA_KEY_TITLE) ?: title
                    text = metadata.getString(android.media.MediaMetadata.METADATA_KEY_ARTIST) ?: text
                    album = metadata.getString(android.media.MediaMetadata.METADATA_KEY_ALBUM) ?: album
                    
                    var picture = metadata.getBitmap(android.media.MediaMetadata.METADATA_KEY_ALBUM_ART)
                    if (picture == null) {
                        picture = metadata.getBitmap(android.media.MediaMetadata.METADATA_KEY_ART)
                    }
                    if (picture != null) {
                        val maxDim = 200
                        val ratio = Math.min(maxDim.toFloat() / picture.width, maxDim.toFloat() / picture.height)
                        val newWidth = Math.round(picture.width * ratio)
                        val newHeight = Math.round(picture.height * ratio)
                        val resized = Bitmap.createScaledBitmap(picture, newWidth, newHeight, true)
                        
                        val stream = ByteArrayOutputStream()
                        resized.compress(Bitmap.CompressFormat.JPEG, 60, stream)
                        val bytes = stream.toByteArray()
                        artUrl = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to read media session metadata", e)
            }
        }

        if (artUrl == null && packageName == "in.krosbits.musicolet") {
            try {
                var picture = extras.getParcelable<Bitmap>(Notification.EXTRA_PICTURE)
                if (picture == null) {
                    val largeIcon = extras.get(Notification.EXTRA_LARGE_ICON)
                    if (largeIcon is Bitmap) {
                        picture = largeIcon
                    }
                }
                if (picture != null) {
                    val maxDim = 200
                    val ratio = Math.min(maxDim.toFloat() / picture.width, maxDim.toFloat() / picture.height)
                    val newWidth = Math.round(picture.width * ratio)
                    val newHeight = Math.round(picture.height * ratio)
                    val resized = Bitmap.createScaledBitmap(picture, newWidth, newHeight, true)
                    
                    val stream = ByteArrayOutputStream()
                    resized.compress(Bitmap.CompressFormat.JPEG, 60, stream)
                    val bytes = stream.toByteArray()
                    artUrl = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to encode album art", e)
            }
        }

        Log.d(TAG, "Notification Received: [$packageName] $title - $text - $album")

        // Send to Flutter if active
        listener?.invoke(id, packageName, title, text, album, artUrl)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        pendingIntents.remove(sbn.key)
    }
}
