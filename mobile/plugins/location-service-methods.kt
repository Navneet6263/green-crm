  // GreenCRM safety patch: user-started service, explicit bind cleanup and failure status.
  private fun maybeStartForegroundService() {
    val task = mTask ?: return
    val options: ReadableArguments = MapArguments(task.options)
    if (!shouldUseForegroundService(task.options)) {
      stopForegroundService()
      startLocationUpdates()
      return
    }
    if (!AppForegroundedSingleton.isForegrounded) {
      failGreenCrmService(IllegalStateException("Open GreenCRM and tap Start tracking again."))
      return
    }
    val serviceOptions = options.getArguments(FOREGROUND_SERVICE_KEY).toBundle()
    context.getSharedPreferences("greencrm_location_health", Context.MODE_PRIVATE).edit().remove("error").apply()
    if (mService != null) {
      try {
        mService?.startForeground(serviceOptions)
        startLocationUpdates()
      } catch (error: RuntimeException) {
        failGreenCrmService(error)
      }
      return
    }
    if (mServiceConnection != null) return
    val serviceIntent = Intent(context, LocationTaskService::class.java)
    serviceIntent.putExtra("appId", task.appScopeKey)
    serviceIntent.putExtra("taskName", task.name)
    serviceIntent.putExtra("killService", serviceOptions.getBoolean("killServiceOnDestroy", false))
    val connection = object : ServiceConnection {
      override fun onServiceConnected(name: ComponentName, service: IBinder) {
        // A delayed callback must not resurrect a stopped or signed-out route.
        if (mServiceConnection !== this || mTask == null) return
        try {
          val boundService = (service as? ServiceBinder)?.service
            ?: throw IllegalStateException("Location service could not bind.")
          mService = boundService
          boundService.setParentContext(context)
          boundService.startForeground(serviceOptions)
          startLocationUpdates()
        } catch (error: RuntimeException) {
          failGreenCrmService(error)
        }
      }
      override fun onServiceDisconnected(name: ComponentName) {
        if (mServiceConnection === this) failGreenCrmService(IllegalStateException("Location service disconnected. Start tracking again."))
      }
      override fun onNullBinding(name: ComponentName) {
        if (mServiceConnection === this) failGreenCrmService(IllegalStateException("Location service binding was rejected."))
      }
      override fun onBindingDied(name: ComponentName) {
        if (mServiceConnection === this) failGreenCrmService(IllegalStateException("Location service binding ended."))
      }
    }
    mServiceConnection = connection
    try {
      // Only called while the app is foreground. Promotion happens after binding.
      // Unlike startForegroundService, a rejected promotion does not arm Android's
      // uncatchable ForegroundServiceDidNotStartInTimeException deadline.
      context.startService(serviceIntent)
      if (!context.bindService(serviceIntent, connection, Context.BIND_AUTO_CREATE)) {
        throw IllegalStateException("Android refused the location service binding.")
      }
    } catch (error: RuntimeException) {
      failGreenCrmService(error)
    }
  }

  private fun failGreenCrmService(error: RuntimeException) {
    Log.e(TAG, "GreenCRM location service failed", error)
    // Contains only the native startup error, never employee data or GPS coordinates.
    context.getSharedPreferences("greencrm_location_health", Context.MODE_PRIVATE).edit()
      .putString("error", (error.javaClass.simpleName + ": " + (error.message ?: "Start rejected")).take(600)).apply()
    try { stopLocationUpdates() } catch (cleanup: RuntimeException) { Log.w(TAG, "Location cleanup failed", cleanup) }
    stopForegroundService()
  }

  private fun stopForegroundService() {
    val connection = mServiceConnection
    mServiceConnection = null
    val service = mService
    mService = null
    try { service?.stop() } catch (error: RuntimeException) { Log.w(TAG, "Service cleanup failed", error) }
    if (connection != null) {
      try { context.unbindService(connection) } catch (_: IllegalArgumentException) { }
    }
    try { context.stopService(Intent(context, LocationTaskService::class.java)) }
    catch (error: RuntimeException) { Log.w(TAG, "Service stop failed", error) }
  }

