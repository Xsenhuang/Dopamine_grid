const cloudSync = require('./utils/cloudSync.js')

App({
  onLaunch() {
    // 初始化云开发
    cloudSync.initCloud()

    // 获取或创建设备唯一标识
    const deviceId = this.getOrCreateDeviceId()
    console.log('当前设备ID:', deviceId)

    // 检查是否是新设备/新用户
    const isNewDevice = this.checkIsNewDevice(deviceId)

    if (isNewDevice) {
      // 新设备：初始化空数据
      console.log('新设备/用户，初始化空数据')
      this.initializeEmptyData(deviceId)
    } else {
      // 已有设备：恢复该设备的数据
      console.log('已有设备，恢复数据')
      this.restoreDeviceData(deviceId)
    }

    // 检查今日日期，如果是新的一天则重置完成状态
    this.checkAndResetDaily()

    // 设置定期备份
    this.setupPeriodicBackup()
  },

  /**
   * 获取或创建设备唯一标识
   */
  getOrCreateDeviceId() {
    let deviceId = wx.getStorageSync('device_id')
    if (!deviceId) {
      // 生成唯一设备ID
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      wx.setStorageSync('device_id', deviceId)
      console.log('生成新设备ID:', deviceId)
    }
    return deviceId
  },

  /**
   * 检查是否是新设备/新用户
   */
  checkIsNewDevice(deviceId) {
    // 检查该设备是否已有数据
    const deviceDataKey = `device_data_${deviceId}`
    const deviceData = wx.getStorageSync(deviceDataKey)
    return !deviceData
  },

  /**
   * 初始化空数据（新设备/新用户）
   */
  initializeEmptyData(deviceId) {
    // 标记该设备已初始化
    const deviceDataKey = `device_data_${deviceId}`
    wx.setStorageSync(deviceDataKey, {
      deviceId: deviceId,
      createdAt: Date.now(),
      initialized: true
    })

    // 初始化空任务列表
    const emptyTasks = []
    this.saveDataWithBackup('adhd_tasks', emptyTasks)

    // 初始化空分组
    const emptyGroups = []
    this.saveDataWithBackup('task_groups', emptyGroups)

    // 初始化空选中任务
    const emptySelected = []
    this.saveDataWithBackup('selected_task_ids', emptySelected)

    // 默认3x3布局
    wx.setStorageSync('grid_size', 3)

    // 设置首次访问标记
    wx.setStorageSync('is_first_visit', true)

    console.log('空数据初始化完成')
  },

  /**
   * 恢复设备数据
   */
  restoreDeviceData(deviceId) {
    // 从备份恢复数据
    this.restoreDataFromBackup()
  },

  checkAndResetDaily() {
    const today = new Date().toDateString()
    const lastVisit = wx.getStorageSync('last_visit_date')

    if (lastVisit !== today) {
      // 新的一天，重置完成状态
      const tasks = wx.getStorageSync('adhd_tasks') || []
      const resetTasks = tasks.map(task => ({
        ...task,
        completed: false
      }))
      this.saveDataWithBackup('adhd_tasks', resetTasks)
      wx.setStorageSync('last_visit_date', today)
    }
  },

  /**
   * 保存数据并同步到多个备份位置
   */
  saveDataWithBackup(key, data) {
    // 保存到主存储
    wx.setStorageSync(key, data)
    // 保存到备份
    wx.setStorageSync(`${key}_backup`, data)
    // 保存到历史记录（带时间戳）
    const historyKey = `${key}_history`
    let history = wx.getStorageSync(historyKey) || { versions: [] }
    if (!history.versions) history.versions = []

    // 只保留最近30个版本
    if (history.versions.length >= 30) {
      history.versions.shift()
    }

    history.versions.push({
      data: data,
      timestamp: Date.now(),
      date: new Date().toISOString()
    })
    wx.setStorageSync(historyKey, history)

    console.log(`数据已保存: ${key}, 历史版本数: ${history.versions.length}`)
  },

  /**
   * 设置定期备份
   */
  setupPeriodicBackup() {
    // 每次启动时执行一次完整备份
    this.performFullBackup()

    // 设置每小时检查一次是否需要备份
    setInterval(() => {
      this.performFullBackup()
    }, 60 * 60 * 1000)
  },

  /**
   * 执行完整备份
   */
  performFullBackup() {
    console.log('执行完整数据备份...')

    const keysToBackup = [
      'adhd_tasks',
      'task_groups',
      'selected_task_ids',
      'grid_size'
    ]

    keysToBackup.forEach(key => {
      const data = wx.getStorageSync(key)
      if (data !== undefined && data !== null) {
        wx.setStorageSync(`${key}_backup`, data)
        console.log(`已备份: ${key}`)
      }
    })

    wx.setStorageSync('last_backup_time', Date.now())
    console.log('完整备份完成')
  },

  /**
   * 从备份恢复数据
   */
  restoreDataFromBackup() {
    console.log('开始从备份恢复数据...')

    const dataKeys = [
      { key: 'adhd_tasks', name: '任务数据' },
      { key: 'task_groups', name: '分组数据' },
      { key: 'selected_task_ids', name: '选中任务ID' },
      { key: 'grid_size', name: '格子大小', defaultValue: 3 }
    ]

    dataKeys.forEach(({ key, name, defaultValue }) => {
      const mainData = wx.getStorageSync(key)

      if (!mainData || (Array.isArray(mainData) && mainData.length === 0)) {
        console.log(`${name}主存储为空，尝试从备份恢复...`)

        const backup = wx.getStorageSync(`${key}_backup`)
        if (backup !== undefined && backup !== null) {
          wx.setStorageSync(key, backup)
          console.log(`${name}已从备份恢复`)
          return
        }

        const history = wx.getStorageSync(`${key}_history`)
        if (history && history.versions && history.versions.length > 0) {
          const latestVersion = history.versions[history.versions.length - 1]
          if (latestVersion && latestVersion.data) {
            wx.setStorageSync(key, latestVersion.data)
            console.log(`${name}已从历史记录恢复`)
            return
          }
        }

        // 使用默认值
        if (defaultValue !== undefined) {
          wx.setStorageSync(key, defaultValue)
          console.log(`${name}使用默认值:`, defaultValue)
        }
      }
    })

    console.log('数据恢复完成')
  },

  /**
   * 从云端恢复数据
   */
  async restoreFromCloud() {
    try {
      const restored = await cloudSync.checkAndRestoreFromCloud()
      if (restored) {
        console.log('已从云端成功恢复数据')
      }
    } catch (e) {
      console.error('从云端恢复数据失败:', e)
    }
  },

  /**
   * 同步数据到云端
   */
  async syncToCloud() {
    try {
      const success = await cloudSync.syncToCloud()
      return success
    } catch (e) {
      console.error('同步到云端失败:', e)
      return false
    }
  },

  /**
   * 设置自动云端同步
   */
  setupCloudSync() {
    cloudSync.setupAutoCloudSync(5 * 60 * 1000)
  },

  globalData: {
    userInfo: null
  }
})
