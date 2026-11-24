package me.vwave.remote

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.os.Build
import android.os.IBinder
import me.vwave.remote.module.R

/**
 * Keeps the process, and so the TV connection, alive while the app is in the background, and puts
 * volume and playback controls in its notification. WaveRemoteModule owns the connection and
 * decides when this runs; the service only shows [status] and forwards taps to the module.
 */
class RemoteService : Service() {
  /** What the notification shows; null when the module no longer wants the service. */
  internal data class Status(val title: String, val text: String, val ready: Boolean, val playing: Boolean, val muted: Boolean)

  companion object {
    const val VOLUME_DOWN = "me.vwave.remote.action.VOLUME_DOWN"
    const val PLAY_PAUSE = "me.vwave.remote.action.PLAY_PAUSE"
    const val VOLUME_UP = "me.vwave.remote.action.VOLUME_UP"
    const val MUTE = "me.vwave.remote.action.MUTE"
    /** The notification was swiped away, which Android allows for foreground services from 14. */
    const val DISMISSED = "me.vwave.remote.action.DISMISSED"
    private const val CHANNEL = "connection"
    private const val NOTIFICATION = 1
    private var instance: RemoteService? = null
    internal var status: Status? = null
      private set

    /** Shows [next], starting the service if needed. Returns false if Android refuses to start it now. */
    internal fun show(context: Context, next: Status): Boolean {
      val changed = next != status
      status = next
      val running = instance
      if (running != null) { if (changed) running.post(); return true }
      return try {
        val intent = Intent(context, RemoteService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
        true
      } catch (refused: IllegalStateException) {
        // ForegroundServiceStartNotAllowedException (an IllegalStateException): the app went to
        // the background before the TV connected, without a battery optimization exemption.
        android.util.Log.w("WaveRemote", "Background connection not started: ${refused.message}")
        status = null
        false
      }
    }

    /** Re-posts the notification, e.g. after notifications were allowed. */
    internal fun refresh() { instance?.post() }

    internal fun stop() {
      status = null
      instance?.let { it.stopForeground(STOP_FOREGROUND_REMOVE); it.stopSelf() }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL, "TV connection", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Keeps the TV connected in the background, with volume and playback controls"
          setShowBadge(false)
        })
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Android requires startForeground after startForegroundService, even when about to stop.
    val current = status
    val notification = build(current ?: Status(applicationInfo.loadLabel(packageManager).toString(), "", false, false, false))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
    } else {
      startForeground(NOTIFICATION, notification)
    }
    intent?.action?.let { WaveRemoteModule.notificationAction(it) }
    if (status == null) stop()
    return START_NOT_STICKY
  }

  /** Swiping the app away from recents closes it, background connection included. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    WaveRemoteModule.notificationAction(DISMISSED)
    stop()
  }

  override fun onDestroy() {
    if (instance === this) instance = null
    super.onDestroy()
  }

  private fun post() {
    val current = status ?: return
    getSystemService(NotificationManager::class.java).notify(NOTIFICATION, build(current))
  }

  private fun build(status: Status): Notification {
    val open = packageManager.getLaunchIntentForPackage(packageName)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL)
      else @Suppress("DEPRECATION") Notification.Builder(this).setPriority(Notification.PRIORITY_LOW) // Android 7 has no channels.
    builder
      .setSmallIcon(R.drawable.remote_notification)
      .setColor(0xFF2F6BFF.toInt())
      .setContentTitle(status.title)
      .setContentText(status.text)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(Notification.CATEGORY_SERVICE)
      // The controls are as harmless as the TV's own remote, so offer them on the lock screen.
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setDeleteIntent(action(DISMISSED))
    if (open != null) builder.setContentIntent(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    if (status.ready) {
      builder
        .addAction(button(R.drawable.remote_volume_down, "Volume down", VOLUME_DOWN))
        .addAction(if (status.playing) button(R.drawable.remote_pause, "Pause", PLAY_PAUSE)
          else button(R.drawable.remote_play, "Play", PLAY_PAUSE))
        .addAction(button(R.drawable.remote_volume_up, "Volume up", VOLUME_UP))
        .addAction(if (status.muted) button(R.drawable.remote_volume_off, "Unmute", MUTE)
          else button(R.drawable.remote_volume_mute, "Mute", MUTE))
        // Volume and play/pause stay visible when collapsed; mute joins them when expanded.
        .setStyle(Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2))
    }
    return builder.build()
  }

  private fun button(icon: Int, label: String, action: String) =
    Notification.Action.Builder(Icon.createWithResource(this, icon), label, action(action)).build()

  private fun action(action: String): PendingIntent = PendingIntent.getService(
    this, action.hashCode(), Intent(this, RemoteService::class.java).setAction(action), PendingIntent.FLAG_IMMUTABLE)
}
