const cloudSync = require('./utils/cloudSync.js')

App({
  onLaunch() {
    // 初始化云开发
    cloudSync.initCloud()

    // 初始化本地存储
    // 优先从备份恢复数据，防止缓存被清理后数据丢失
    this.restoreDataFromBackup()

    // 尝试从云端恢复数据（如果本地为空）
    this.restoreFromCloud()

    const tasks = wx.getStorageSync('adhd_tasks')
    // 只有在没有任何数据源（主存储、备份、历史记录）都为空时，才初始化默认任务
    if (!tasks || tasks.length === 0) {
      // 再次检查备份和历史记录
      const backup = wx.getStorageSync('adhd_tasks_backup')
      const history = wx.getStorageSync('adhd_tasks_history')

      if (backup && backup.length > 0) {
        // 从备份恢复
        wx.setStorageSync('adhd_tasks', backup)
        console.log('任务数据已从备份恢复')
      } else if (history && history.length > 0) {
        // 从历史记录恢复
        wx.setStorageSync('adhd_tasks', history)
        console.log('任务数据已从历史记录恢复')
      } else {
        // 首次使用，初始化空任务列表
        const defaultTasks = []
        this.saveDataWithBackup('adhd_tasks', defaultTasks)
        // 首次使用默认 3x3 布局
        wx.setStorageSync('grid_size', 3)
      }
    }

    // 检查今日日期，如果是新的一天则重置完成状态
    this.checkAndResetDaily()

    // 设置定期备份
    this.setupPeriodicBackup()
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
   * @param {string} key - 数据键名
   * @param {*} data - 要保存的数据
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
    }, 60 * 60 * 1000) // 1小时
  },

  /**
   * 执行完整备份
   */
  performFullBackup() {
    console.log('执行完整数据备份...')

    // 备份所有核心数据
    const keysToBackup = [
      'adhd_tasks',
      'task_groups',
      'selected_task_ids',
      'grid_size'
    ]

    keysToBackup.forEach(key => {
      const data = wx.getStorageSync(key)
      if (data !== undefined && data !== null) {
        // 保存到备份
        wx.setStorageSync(`${key}_backup`, data)
        console.log(`已备份: ${key}`)
      }
    })

    // 保存备份时间戳
    wx.setStorageSync('last_backup_time', Date.now())
    console.log('完整备份完成')
  },

  /**
   * 从备份恢复数据
   * 在应用启动时调用，确保数据不会丢失
   */
  restoreDataFromBackup() {
    console.log('开始从备份恢复数据...')

    // 定义需要恢复的数据键
    const dataKeys = [
      { key: 'adhd_tasks', name: '任务数据' },
      { key: 'task_groups', name: '分组数据' },
      { key: 'selected_task_ids', name: '选中任务ID' },
      { key: 'grid_size', name: '格子大小' }
    ]

    dataKeys.forEach(({ key, name }) => {
      const mainData = wx.getStorageSync(key)

      // 如果主数据为空，尝试从备份恢复
      if (!mainData || (Array.isArray(mainData) && mainData.length === 0)) {
        console.log(`${name}主存储为空，尝试从备份恢复...`)

        // 尝试从备份恢复
        const backup = wx.getStorageSync(`${key}_backup`)
        if (backup && (!Array.isArray(backup) || backup.length > 0)) {
          wx.setStorageSync(key, backup)
          console.log(`${name}已从备份恢复`)
          return
        }

        // 尝试从历史记录恢复（取最新版本）
        const history = wx.getStorageSync(`${key}_history`)
        if (history && history.versions && history.versions.length > 0) {
          const latestVersion = history.versions[history.versions.length - 1]
          if (latestVersion && latestVersion.data) {
            wx.setStorageSync(key, latestVersion.data)
            console.log(`${name}已从历史记录恢复`)
            return
          }
        }

        console.log(`${name}无法从任何备份恢复`)
      }
    })

    // 检查是否需要恢复用户数据（2026-03-13 丢失的数据）
    this.checkAndRestoreUserData()

    console.log('数据恢复完成')
  },

  /**
   * 检查并恢复用户数据
   * 用于恢复特定日期丢失的用户自定义数据
   */
  checkAndRestoreUserData() {
    // 获取当前任务和分组
    let tasks = wx.getStorageSync('adhd_tasks') || []
    let groups = wx.getStorageSync('task_groups') || []

    // 检查默认分组是否为空（没有默认分组的任务）
    const defaultTasks = tasks.filter(t => !t.groupId || t.groupId === 'default')
    const hasDefaultTasks = defaultTasks.length > 0

    // 如果默认分组为空，恢复默认的25个任务
    if (!hasDefaultTasks) {
      console.log('默认分组为空，恢复默认任务...')

      const defaultTasksList = [
        { id: 1, name: '日语', color: '#E3F2FD', darkColor: '#1976D2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 2, name: '法语', color: '#F3E5F5', darkColor: '#7B1FA2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 3, name: '无氧', color: '#FFF3E0', darkColor: '#F57C00', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 4, name: '有氧', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 5, name: '健身环', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 6, name: '跳舞', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 7, name: '拳击', color: '#E3F2FD', darkColor: '#1976D2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 8, name: '拉伸', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 9, name: '看书', color: '#FFF3E0', darkColor: '#F57C00', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 10, name: '听播客', color: '#F3E5F5', darkColor: '#7B1FA2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 11, name: '看剧', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 12, name: '看电影', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 13, name: '打游戏', color: '#E3F2FD', darkColor: '#1976D2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 14, name: '洗头', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 15, name: '吃补剂', color: '#FFF3E0', darkColor: '#F57C00', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 16, name: '倒垃圾', color: '#F3E5F5', darkColor: '#7B1FA2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 17, name: '捡垃圾', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 18, name: '洗碗', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 19, name: '拖地', color: '#E3F2FD', darkColor: '#1976D2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 20, name: '收衣服', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 21, name: '好睡眠', color: '#FFF3E0', darkColor: '#F57C00', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 22, name: '写手帐', color: '#F3E5F5', darkColor: '#7B1FA2', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 23, name: '写公众号', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 24, name: '断舍离', color: '#FCE4EC', darkColor: '#C2185B', completed: false, groupId: 'default', groupName: '默认分组' },
        { id: 25, name: '采购食材', color: '#E3F2FD', darkColor: '#1976D2', completed: false, groupId: 'default', groupName: '默认分组' },
      ]

      // 合并任务（保留已有的非默认分组任务）
      const nonDefaultTasks = tasks.filter(t => t.groupId && t.groupId !== 'default')
      tasks = [...defaultTasksList, ...nonDefaultTasks]

      // 使用新的保存方法保存数据（自动备份）
      this.saveDataWithBackup('adhd_tasks', tasks)

      console.log('默认任务已恢复：25个任务')
    }

    // 检查是否包含"我的日常"分组
    const hasMyDailyGroup = groups.some(g => g.groupName === '我的日常')
    const hasMyDailyTasks = tasks.some(t => t.groupName === '我的日常')

    // 如果没有"我的日常"分组或任务，则恢复用户数据
    if (!hasMyDailyGroup && !hasMyDailyTasks) {
      console.log('检测到"我的日常"分组丢失，正在恢复...')

      // 创建"我的日常"分组
      const myDailyGroupId = 'group_mydaily_restored'
      const myDailyGroup = {
        groupId: myDailyGroupId,
        groupName: '我的日常',
        createdAt: Date.now()
      }
      groups.push(myDailyGroup)

      // 创建"我的日常"分组下的任务
      const myDailyTasks = [
        { id: Date.now() + 1, name: '起床打卡', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: myDailyGroupId, groupName: '我的日常' },
        { id: Date.now() + 2, name: 'CT扫码', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: myDailyGroupId, groupName: '我的日常' },
        { id: Date.now() + 3, name: '喝水', color: '#FFF3E0', darkColor: '#F57C00', completed: false, groupId: myDailyGroupId, groupName: '我的日常' },
        { id: Date.now() + 4, name: '扫码', color: '#E8F5E9', darkColor: '#2E7D32', completed: false, groupId: myDailyGroupId, groupName: '我的日常' }
      ]

      // 合并任务
      tasks = [...tasks, ...myDailyTasks]

      // 使用新的保存方法保存数据（自动备份）
      this.saveDataWithBackup('task_groups', groups)
      this.saveDataWithBackup('adhd_tasks', tasks)

      // 保存到分组历史记录
      let groupHistory = wx.getStorageSync('task_groups_history') || {}
      groupHistory[myDailyGroupId] = {
        ...myDailyGroup,
        lastUsedAt: Date.now()
      }
      wx.setStorageSync('task_groups_history', groupHistory)

      console.log('用户数据已恢复：我的日常分组和任务')
    }
  },

  /**
   * 从云端恢复数据
   * 在本地数据为空时尝试从云端恢复
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
   * 可以手动调用或在特定时机自动调用
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
    // 每5分钟自动同步一次
    cloudSync.setupAutoCloudSync(5 * 60 * 1000)
  },

  globalData: {
    userInfo: null
  }
})
