// pages/index/index.js
// 首页 - 显示多巴胺格子、计算完成进度、提供操作按钮

// 音效实例
let completeSound = null
let bingoSound = null

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 任务列表
    tasks: [],
    // 当前格子布局大小（3、4、5、6）
    gridSize: 3,
    // 当前日期字符串
    currentDate: '',
    // 当前日期显示（年月日格式）
    currentDateDisplay: '',
    // 总体完成进度百分比
    progressPercent: 0,
    // 已完成任务数
    completedCount: 0,
    // 总任务数
    totalCount: 0,
    // 进度提示文案
    progressText: '完成一项继续加油 💪',
    // 是否显示庆祝弹窗
    showCelebration: false,
    // 是否显示 BINGO 弹窗
    showBingoModal: false,
    // BINGO 连线条数
    bingoLineCount: 0,
    // 各线条（行、列、对角线）的完成进度
    lineProgress: {
      rows: [],    // 每行的完成进度
      cols: [],    // 每列的完成进度
      diagonals: [] // 两条对角线的完成进度
    },
    // 已完成的连线记录（用于避免重复触发烟花）
    completedLines: [],
    // 彩纸烟花数据
    confettiPieces: [],
    // 当前活动彩带格子（用于显示格子点击彩带效果）
    activeConfettiCell: null,
    // 是否显示日历弹窗
    showCalendarModal: false,
    // 当前选中的任务ID
    selectedTaskId: null,
    // 拖拽相关
    draggingTaskId: null,
    draggingIndex: null,
    isDragging: false,
    // 日历相关数据
    calendarYear: 2026,
    calendarMonth: 3,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    selectedDate: '',
    selectedDateText: '',
    selectedDateIsToday: true,
    selectedDatePercent: 0,
    selectedDateCompleted: 0,
    selectedDateTasks: [],
    // 空格子数组（用于填充未满的格子）
    emptyCells: [],
    // 是否显示新增任务弹窗
    showAddTaskModal: false,
    // 新任务名称
    newTaskName: '',
    // 选中的颜色
    selectedColor: '#E8F4FD',
    // 可选颜色列表
    colorOptions: ['#E8F4FD', '#E8F8F0', '#FFF8E7', '#F0E8F8', '#FCE8F0', '#FFF0E8', '#E8F0F8', '#F0F8E8'],
    // 是否显示布局下拉菜单
    showLayoutDropdown: false,
    // 用户信息
    userInfo: null,
    isLoggedIn: false
  },

  /**
   * 生命周期函数--监听页面加载
   * 页面第一次加载时执行
   */
  onLoad() {
    // 更新日期显示
    this.updateDate()
    // 检查是否需要重置任务状态（新的一天）
    this.checkAndResetDailyTasks()
    // 先加载格子布局设置，再加载任务列表
    // 确保 gridSize 在计算进度前已经加载
    this.loadGridSize()
    this.loadTasks()
    // 初始化音效
    this.initSounds()
  },

  /**
   * 初始化音效
   */
  initSounds() {
    // 创建完成任务音效（使用可靠的 CDN 音效）
    completeSound = wx.createInnerAudioContext()
    // 使用 Google Fonts 的音效或备用音效
    completeSound.src = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
    completeSound.volume = 0.4

    // 创建BINGO音效
    bingoSound = wx.createInnerAudioContext()
    bingoSound.src = 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
    bingoSound.volume = 0.5

    // 监听错误事件，避免报错影响用户体验
    if (completeSound) {
      completeSound.onError((err) => {
        console.log('音效加载失败:', err)
      })
    }
    if (bingoSound) {
      bingoSound.onError((err) => {
        console.log('音效加载失败:', err)
      })
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 销毁音效实例，防止内存泄漏
    if (completeSound) {
      completeSound.destroy()
      completeSound = null
    }
    if (bingoSound) {
      bingoSound.destroy()
      bingoSound = null
    }
  },

  /**
   * 生命周期函数--监听页面显示
   * 每次打开页面或从其他页面返回时执行
   */
  onShow() {
    // 检查是否需要重置任务状态（新的一天）
    this.checkAndResetDailyTasks()
    // 重新加载布局设置（可能在任务页面修改了）
    this.loadGridSize()
    // 加载当前选中日期的任务（可能是今天或其他日期）
    this.loadTasksForCurrentDate()
    // 加载用户信息
    this.loadUserInfo()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('user_info')
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })
    } else {
      this.setData({
        userInfo: null,
        isLoggedIn: false
      })
    }
  },

  /**
   * 检查并重置每日任务状态
   * 如果上次访问日期不是今天，则将任务状态重置为未完成
   */
  checkAndResetDailyTasks() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    // 获取上次访问日期
    const lastVisitDate = wx.getStorageSync('last_visit_date')

    // 如果上次访问日期不是今天，说明是新的一天，需要重置任务状态
    if (lastVisitDate && lastVisitDate !== today) {
      console.log('新的一天，自动重置任务状态:', lastVisitDate, '->', today)
      this.resetAllTasksToDefault()
    }

    // 更新上次访问日期为今天
    wx.setStorageSync('last_visit_date', today)
  },

  /**
   * 重置所有任务为默认状态（未完成）
   */
  resetAllTasksToDefault() {
    // 获取默认任务模板
    let tasks = wx.getStorageSync('adhd_tasks') || []

    // 将所有任务的 completed 设为 false
    tasks = tasks.map(task => ({
      ...task,
      completed: false
    }))

    // 保存到默认任务模板
    wx.setStorageSync('adhd_tasks', tasks)

    // 保存到今天的任务存储中
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    const todayKey = `tasks_${today}`
    wx.setStorageSync(todayKey, tasks)

    console.log('任务状态已重置为默认状态')
  },

  /**
   * 获取当前选中日期的存储键
   */
  getCurrentDateKey() {
    const { selectedDate } = this.data
    if (selectedDate) {
      return `tasks_${selectedDate}`
    }
    // 默认为今天
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `tasks_${year}-${month}-${day}`
  },

  /**
   * 加载当前选中日期的任务
   */
  loadTasksForCurrentDate() {
    const dateKey = this.getCurrentDateKey()
    const dateStr = dateKey.replace('tasks_', '')

    // 检查是否有该日期的专属任务
    let tasks = wx.getStorageSync(dateKey)

    // 检查是否有选中的任务ID列表（用于判断用户是否主动设置过任务）
    const selectedTaskIds = wx.getStorageSync('selected_task_ids') || []

    // 只有当该日期没有任务数据时，才从默认模板复制
    // 注意：如果 tasks 是空数组且 selectedTaskIds 也是空数组，说明用户主动取消了所有任务
    // 此时不应该从默认模板复制
    if (!tasks) {
      // 如果没有该日期的任务存储，尝试从默认任务模板复制
      const defaultTasks = wx.getStorageSync('adhd_tasks') || []
      if (defaultTasks.length > 0) {
        // 复制默认任务作为该日期的初始任务
        tasks = defaultTasks.map(task => ({
          ...task,
          completed: false
        }))
        // 保存到该日期的存储中
        wx.setStorageSync(dateKey, tasks)
      } else {
        tasks = []
      }
    } else if (tasks.length === 0 && selectedTaskIds.length === 0) {
      // 用户主动取消了所有任务，保持空任务列表
      tasks = []
    } else if (tasks.length === 0) {
      // 任务为空但有选中的任务ID，可能是数据不一致，从默认模板复制
      const defaultTasks = wx.getStorageSync('adhd_tasks') || []
      if (defaultTasks.length > 0) {
        tasks = defaultTasks.map(task => ({
          ...task,
          completed: false
        }))
        wx.setStorageSync(dateKey, tasks)
      } else {
        tasks = []
      }
    }
    
    // 为每个任务添加对应的文字颜色
    tasks = tasks.map(task => {
      const textColor = this.getTextColor(task.color)
      return {
        ...task,
        textColor: textColor
      }
    })
    
    // 更新日期显示
    const [year, month, day] = dateStr.split('-')
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const date = new Date(dateStr)
    const weekDay = weekDays[date.getDay()]
    
    // 计算空格子数量
    const totalCells = this.data.gridSize * this.data.gridSize
    const taskCount = tasks.length
    const emptyCount = Math.max(0, totalCells - taskCount)
    const emptyCells = new Array(emptyCount).fill(0).map((_, i) => i)

    this.setData({
      tasks: tasks,
      emptyCells: emptyCells,
      currentDate: `${year}.${month}.${day} · ${weekDay}`,
      currentDateDisplay: `${year}年${month}月${day}日`
    }, () => {
      this.calculateProgress()
    })
  },

  /**
   * 更新日期显示
   * 格式：YYYY.MM.DD · 星期几
   */
  updateDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekDay = weekDays[now.getDay()]
    
    this.setData({
      currentDate: `${year}.${month}.${day} · ${weekDay}`,
      currentDateDisplay: `${year}年${month}月${day}日`
    })
  },

  /**
   * 根据背景色获取对应的文字颜色
   * 马卡龙色系配色方案
   * @param {string} bgColor - 背景色
   * @returns {string} 对应的文字颜色
   */
  getTextColor(bgColor) {
    const colorMap = {
      // 新马卡龙色系
      '#E8F4FD': '#4A90D9', // 淡蓝 -> 深蓝
      '#E8F8F0': '#52B788', // 淡绿 -> 深绿
      '#FFF8E7': '#E8A838', // 淡黄 -> 深黄/橙
      '#F0E8F8': '#9B6BC3', // 淡紫 -> 深紫
      '#FCE8F0': '#E85A8F', // 淡粉 -> 深粉
      '#FFF0E8': '#E8835A', // 淡橙 -> 深橙
      '#E8F0F8': '#5A8FE8', // 淡青 -> 深青
      '#F0F8E8': '#8FB85A', // 淡黄绿 -> 深黄绿
      // 旧颜色兼容
      '#E3F2FD': '#1976D2', // 旧蓝 -> 深蓝
      '#F3E5F5': '#7B1FA2', // 旧紫 -> 深紫
      '#FFF3E0': '#F57C00', // 旧橙 -> 深橙
      '#E8F5E9': '#388E3C', // 旧绿 -> 深绿
      '#FCE4EC': '#C2185B', // 旧粉 -> 深粉
      '#FFCCBC': '#D84315', // 旧深橙 -> 更深橙
      '#C5CAE9': '#303F9F', // 旧靛蓝 -> 深靛蓝
      '#B2DFDB': '#00796B'  // 旧青 -> 深青
    }
    return colorMap[bgColor] || '#666666'
  },

  /**
   * 从本地存储加载格子布局设置
   * 默认使用 5×5 布局
   */
  loadGridSize() {
    const gridSize = wx.getStorageSync('grid_size') || 3
    this.setData({ gridSize })
  },

  /**
   * 从本地存储加载任务列表
   */
  loadTasks() {
    let tasks = wx.getStorageSync('adhd_tasks') || []
    console.log('Raw tasks from storage:', tasks)

    // 如果任务列表为空，尝试恢复
    if (tasks.length === 0) {
      // 延迟执行恢复检查，避免页面加载时弹窗
      setTimeout(() => {
        this.checkAndRecoverTasks()
      }, 1000)
    }

    // 为每个任务添加对应的文字颜色，并清除彩带效果
    tasks = tasks.map(task => {
      const textColor = this.getTextColor(task.color)
      console.log(`Task "${task.name}": bg=${task.color}, text=${textColor}`)
      return {
        ...task,
        textColor: textColor
      }
    })
    console.log('Tasks with textColor:', tasks)

    // 计算空格子数量
    const totalCells = this.data.gridSize * this.data.gridSize
    const taskCount = tasks.length
    const emptyCount = Math.max(0, totalCells - taskCount)
    const emptyCells = new Array(emptyCount).fill(0).map((_, i) => i)

    // 使用 Promise 确保数据更新后再计算进度
    this.setData({ tasks, emptyCells }, () => {
      console.log('setData completed, tasks in data:', this.data.tasks)
      // setData 回调函数：数据已更新到页面
      // 此时再计算进度，确保 gridSize 和 tasks 都已准备好
      this.calculateProgress()
    })
  },

  /**
   * 检查并恢复任务
   */
  checkAndRecoverTasks() {
    // 检查是否有历史数据可以恢复
    const keys = wx.getStorageInfoSync().keys
    const hasHistoryData = keys.some(key => key.startsWith('daily_'))

    if (hasHistoryData) {
      this.recoverLostTasks()
    }
  },

  /**
   * 重置并加载今天的任务
   */
  resetAndLoadTodayTasks() {
    // 更新日期显示为今天
    this.updateDate()
    // 重置选中日期为今天
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    
    this.setData({
      selectedDate: today,
      selectedDateIsToday: true
    })
    // 加载今天的任务（包含当天完成状态）
    this.loadTodayTasks()
  },

  /**
   * 加载今天的任务，合并当天已保存的完成状态
   */
  loadTodayTasks() {
    // 获取今天的日期
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    
    // 加载任务模板
    let tasks = wx.getStorageSync('adhd_tasks') || []
    
    // 如果任务列表为空，尝试恢复
    if (tasks.length === 0) {
      setTimeout(() => {
        this.checkAndRecoverTasks()
      }, 1000)
    }
    
    // 获取今天已保存的完成数据
    const dailyData = wx.getStorageSync(`daily_${today}`) || { tasks: [] }
    const completedTaskNames = new Set(dailyData.tasks.map(t => t.name))
    
    // 为每个任务添加对应的文字颜色，恢复完成状态，并清除彩带效果
    tasks = tasks.map(task => {
      const textColor = this.getTextColor(task.color)
      return {
        ...task,
        textColor: textColor,
        completed: completedTaskNames.has(task.name) // 恢复完成状态
      }
    })
    
    // 更新任务列表
    this.setData({ tasks }, () => {
      this.calculateProgress()
    })
  },

  /**
   * 计算总体完成进度
   * 基于已完成任务数占总任务数的百分比
   * 同时检测多巴胺格子连线
   */
  calculateProgress() {
    const { tasks, gridSize } = this.data
    if (tasks.length === 0) return
    
    // 计算当前布局需要的总格子数
    const totalCells = gridSize * gridSize
    // 只取前 totalCells 个任务参与计算
    const actualTasks = tasks.slice(0, totalCells)
    
    // 计算已完成的任务数
    const completedCount = actualTasks.filter(task => task.completed).length
    
    // 计算进度百分比：已完成任务数 / 总任务数
    const percent = totalCells > 0 ? Math.round((completedCount / totalCells) * 100) : 0
    
    // 根据完成度设置提示文案
    let progressText = '完成一项继续加油 💪'
    if (percent === 100) {
      progressText = '恭喜完成！🎉'
    } else if (percent >= 75) {
      progressText = '即将完成，加油！💪'
    } else if (percent >= 50) {
      progressText = '已经完成一半了！✨'
    } else if (percent >= 25) {
      progressText = '不错的开始！🌟'
    }
    
    // 更新页面数据
    this.setData({
      progressPercent: percent,
      completedCount,
      totalCount: totalCells,
      progressText
    })

    // 检测多巴胺格子连线
    this.checkBingoLines(actualTasks, gridSize)

    // 如果完成度达到100%，显示庆祝动画
    if (percent >= 100 && actualTasks.length > 0) {
      this.showCelebration()
    }
  },

  /**
   * 检测多巴胺格子连线
   * 当完成横、竖、斜任意一条连线时触发烟花效果
   */
  checkBingoLines(tasks, size) {
    const { completedLines } = this.data
    const newCompletedLines = []
    let hasNewLine = false

    // 检测每一行
    for (let i = 0; i < size; i++) {
      let lineCompleted = true
      for (let j = 0; j < size; j++) {
        const index = i * size + j
        if (index >= tasks.length || !tasks[index].completed) {
          lineCompleted = false
          break
        }
      }
      if (lineCompleted) {
        const lineId = `row-${i}`
        newCompletedLines.push(lineId)
        if (!completedLines.includes(lineId)) {
          hasNewLine = true
        }
      }
    }

    // 检测每一列
    for (let j = 0; j < size; j++) {
      let lineCompleted = true
      for (let i = 0; i < size; i++) {
        const index = i * size + j
        if (index >= tasks.length || !tasks[index].completed) {
          lineCompleted = false
          break
        }
      }
      if (lineCompleted) {
        const lineId = `col-${j}`
        newCompletedLines.push(lineId)
        if (!completedLines.includes(lineId)) {
          hasNewLine = true
        }
      }
    }

    // 检测主对角线（左上到右下）
    let diag1Completed = true
    for (let i = 0; i < size; i++) {
      const index = i * size + i
      if (index >= tasks.length || !tasks[index].completed) {
        diag1Completed = false
        break
      }
    }
    if (diag1Completed) {
      const lineId = 'diag-1'
      newCompletedLines.push(lineId)
      if (!completedLines.includes(lineId)) {
        hasNewLine = true
      }
    }

    // 检测副对角线（右上到左下）
    let diag2Completed = true
    for (let i = 0; i < size; i++) {
      const index = i * size + (size - 1 - i)
      if (index >= tasks.length || !tasks[index].completed) {
        diag2Completed = false
        break
      }
    }
    if (diag2Completed) {
      const lineId = 'diag-2'
      newCompletedLines.push(lineId)
      if (!completedLines.includes(lineId)) {
        hasNewLine = true
      }
    }

    // 更新已完成的连线记录
    this.setData({ completedLines: newCompletedLines })

    // 如果有新的连线完成，显示 BINGO 弹窗
    if (hasNewLine) {
      // 计算当前完成的连线数量
      const currentLineCount = newCompletedLines.length
      this.showBingoModal(currentLineCount)
    }
  },

  /**
   * 显示 BINGO 弹窗
   * @param {Number} lineCount - 连线条数
   */
  showBingoModal(lineCount) {
    // 生成彩纸数据
    const confettiPieces = this.generateConfetti()

    // 播放BINGO音效
    this.playCompleteSound(true)

    this.setData({
      showBingoModal: true,
      bingoLineCount: lineCount,
      confettiPieces: confettiPieces
    })
  },

  /**
   * 隐藏 BINGO 弹窗
   */
  hideBingoModal() {
    this.setData({ 
      showBingoModal: false,
      confettiPieces: []
    })
  },

  /**
   * 生成彩纸烟花数据
   * @returns {Array} 彩纸数组
   */
  generateConfetti() {
    const shapes = ['circle', 'bar', 'square']
    const colors = ['gold', 'yellow', 'orange', 'light-gold', 'gray', 'white', 'rose']
    const pieces = []
    const count = 50 // 彩纸数量

    for (let i = 0; i < count; i++) {
      pieces.push({
        id: `confetti-${i}-${Date.now()}`,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100, // 0-100% 水平位置
        delay: Math.random() * 1.2, // 0-1.2s 延迟，错开飘落时间
        duration: 2.5 + Math.random() * 2, // 2.5-4.5s 持续时间
        rotation: Math.random() * 360 // 初始旋转角度
      })
    }

    return pieces
  },

  /**
   * 计算各线条（行、列、对角线）的完成进度
   * @param {Array} tasks - 任务列表
   * @param {Number} size - 布局大小（如4表示4×4）
   * @returns {Object} 包含rows、cols、diagonals的进度对象
   */
  calculateLineProgress(tasks, size) {
    const result = {
      rows: [],
      cols: [],
      diagonals: []
    }
    
    console.log('calculateLineProgress 调试:')
    console.log('size:', size)
    console.log('tasks.length:', tasks.length)
    
    // ========== 计算每行的完成度 ==========
    // 遍历每一行（i表示行号，从0开始）
    for (let i = 0; i < size; i++) {
      let completed = 0
      // 遍历该行中的每一列
      for (let j = 0; j < size; j++) {
        // 计算该位置在任务数组中的索引
        // 公式：行号 × 每行格子数 + 列号
        const index = i * size + j
        // 检查该位置的任务是否已完成
        const task = tasks[index]
        if (index < tasks.length && task && task.completed) {
          completed++
          console.log(`行${i}列${j}索引${index}: ${task.name} completed=${task.completed}`)
        }
      }
      // 保存该行的进度信息
      result.rows.push({
        index: i,           // 行号（从0开始）
        completed,          // 已完成格子数
        total: size,        // 该行总格子数
        percent: Math.round((completed / size) * 100)  // 完成百分比
      })
      console.log(`第${i}行: ${completed}/${size}=${Math.round((completed / size) * 100)}%`)
    }
    
    // ========== 计算每列的完成度 ==========
    // 遍历每一列（j表示列号，从0开始）
    for (let j = 0; j < size; j++) {
      let completed = 0
      // 遍历该列中的每一行
      for (let i = 0; i < size; i++) {
        // 计算该位置在任务数组中的索引
        const index = i * size + j
        if (index < tasks.length && tasks[index].completed) {
          completed++
        }
      }
      // 保存该列的进度信息
      result.cols.push({
        index: j,
        completed,
        total: size,
        percent: Math.round((completed / size) * 100)
      })
    }
    
    // ========== 计算主对角线的完成度（左上到右下）==========
    // 主对角线特点：行号 = 列号
    let diag1Completed = 0
    for (let i = 0; i < size; i++) {
      // 行号和列号都是i
      const index = i * size + i
      if (index < tasks.length && tasks[index].completed) {
        diag1Completed++
      }
    }
    result.diagonals.push({
      index: 0,  // 主对角线索引为0
      completed: diag1Completed,
      total: size,
      percent: Math.round((diag1Completed / size) * 100)
    })
    
    // ========== 计算副对角线的完成度（右上到左下）==========
    // 副对角线特点：行号 + 列号 = size - 1
    let diag2Completed = 0
    for (let i = 0; i < size; i++) {
      // 行号是i，列号是 size - 1 - i
      const index = i * size + (size - 1 - i)
      if (index < tasks.length && tasks[index].completed) {
        diag2Completed++
      }
    }
    result.diagonals.push({
      index: 1,  // 副对角线索引为1
      completed: diag2Completed,
      total: size,
      percent: Math.round((diag2Completed / size) * 100)
    })
    
    return result
  },

  /**
   * 播放完成音效和振动反馈
   * @param {boolean} isBingo - 是否是BINGO音效
   */
  playCompleteSound(isBingo = false) {
    // 使用微信内置的短振动反馈
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' })
    }

    // 播放音效
    if (isBingo && bingoSound) {
      bingoSound.stop()
      bingoSound.play()
    } else if (completeSound) {
      completeSound.stop()
      completeSound.play()
    }
  },

  /**
   * 点击格子切换任务完成状态
   * @param {Object} e - 事件对象，包含任务ID
   */
  toggleTask(e) {
    const id = e.currentTarget.dataset.id

    // 找到当前任务
    const currentTask = this.data.tasks.find(task => task.id === id)
    if (!currentTask) return

    // 如果任务已完成，点击后取消完成状态
    if (currentTask.completed) {
      this.cancelTaskComplete(id)
      return
    }

    // 未完成的任务，点击后直接标记为完成
    this.completeTask(id)
  },

  /**
   * 标记任务为完成
   */
  completeTask(id) {
    // 找到任务索引，用于计算位置
    const taskIndex = this.data.tasks.findIndex(task => task.id === id)
    if (taskIndex === -1) return

    // 生成格子彩纸数据
    const cellConfetti = this.generateCellConfetti()

    // 使用 selector query 获取格子的实际位置
    const query = wx.createSelectorQuery().in(this)
    query.select('.bingo-card').boundingClientRect()
    query.selectAll('.bingo-cell').boundingClientRect()
    query.exec((res) => {
      const cardRect = res[0]
      const cellRects = res[1]

      if (cardRect && cellRects && cellRects[taskIndex]) {
        const cellRect = cellRects[taskIndex]
        // 计算格子中心相对于 bingo-card 的位置（转换为 rpx）
        const sysInfo = wx.getSystemInfoSync()
        const rpxRatio = 750 / sysInfo.windowWidth

        // card 有 padding: 24rpx，需要减去 padding 得到相对于 card 内容区的位置
        const cardPadding = 24
        const centerX = (cellRect.left - cardRect.left) * rpxRatio + cellRect.width * rpxRatio / 2
        const centerY = (cellRect.top - cardRect.top) * rpxRatio + cellRect.height * rpxRatio / 2

        // 设置活动彩带格子
        this.setData({
          activeConfettiCell: {
            cellConfetti: cellConfetti,
            centerX: centerX,
            centerY: centerY
          }
        })
      }

      // 更新任务状态
      const tasks = this.data.tasks.map(task => {
        if (task.id === id) {
          return {
            ...task,
            completed: true,
            animating: true
          }
        }
        return task
      })

      // 清除选中状态
      this.setData({ selectedTaskId: null })

      // 播放完成音效
      this.playCompleteSound()

      // 保存到本地存储
      const dateKey = this.getCurrentDateKey()
      wx.setStorageSync(dateKey, tasks)
      wx.setStorageSync('adhd_tasks', tasks)

      // 更新页面数据
      this.setData({ tasks }, () => {
        this.calculateProgress()
        this.saveDailyProgress(tasks)
      })

      // 300毫秒后移除动画标记
      setTimeout(() => {
        const updatedTasks = this.data.tasks.map(task => {
          if (task.id === id) {
            return { ...task, animating: false }
          }
          return task
        })
        this.setData({ tasks: updatedTasks })
      }, 300)

      // 1000毫秒后移除彩纸效果
      setTimeout(() => {
        this.setData({ activeConfettiCell: null })
      }, 1000)
    })
  },

  /**
   * 取消任务完成状态
   */
  cancelTaskComplete(id) {
    // 更新任务状态
    const tasks = this.data.tasks.map(task => {
      if (task.id === id) {
        return {
          ...task,
          completed: false,
          animating: true
        }
      }
      return task
    })

    // 保存到本地存储
    const dateKey = this.getCurrentDateKey()
    wx.setStorageSync(dateKey, tasks)
    wx.setStorageSync('adhd_tasks', tasks)

    // 更新页面数据
    this.setData({ tasks }, () => {
      this.calculateProgress()
      this.saveDailyProgress(tasks)
    })

    // 300毫秒后移除动画标记
    setTimeout(() => {
      const updatedTasks = this.data.tasks.map(task => {
        if (task.id === id) {
          return { ...task, animating: false }
        }
        return task
      })
      this.setData({ tasks: updatedTasks })
    }, 300)
  },

  /**
   * 生成烟花小圆点数据（从中心向外炸开，由小变大）
   * @returns {Array} 烟花圆点数组
   */
  generateCellConfetti() {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan', 'gold', 'white']
    const pieces = []
    const count = 50 // 烟花粒子数量

    for (let i = 0; i < count; i++) {
      // 随机角度，360度均匀分布
      const angle = (Math.random() * 360)
      // 随机距离，从中心向外
      const distance = 60 + Math.random() * 180 // 60-240rpx 的飞行距离
      // 计算终点位置
      const endX = Math.cos(angle * Math.PI / 180) * distance
      const endY = Math.sin(angle * Math.PI / 180) * distance

      // 随机大小
      const startSize = 2 + Math.random() * 4 // 起始大小 2-6rpx
      const endSize = 6 + Math.random() * 10 // 结束大小 6-16rpx

      pieces.push({
        id: `firework-dot-${i}-${Date.now()}`,
        shape: 'circle',
        color: colors[Math.floor(Math.random() * colors.length)],
        endX: endX,
        endY: endY,
        startSize: startSize,
        endSize: endSize,
        delay: Math.random() * 0.02, // 0-0.02s 几乎无延迟
        duration: 0.2 + Math.random() * 0.15, // 0.2-0.35s 极速爆炸
      })
    }

    return pieces
  },

  /**
   * 随机排序任务
   * 使用Fisher-Yates洗牌算法
   */
  randomizeTasks() {
    const tasks = [...this.data.tasks]
    // Fisher-Yates洗牌算法
    for (let i = tasks.length - 1; i > 0; i--) {
      // 随机选择一个位置（0到i之间）
      const j = Math.floor(Math.random() * (i + 1));
      // 交换位置i和位置j的元素
      [tasks[i], tasks[j]] = [tasks[j], tasks[i]]
    }

    this.setData({ tasks })

    // 保存到当前日期的存储
    const dateKey = this.getCurrentDateKey()
    wx.setStorageSync(dateKey, tasks)
    // 同时更新默认任务模板
    wx.setStorageSync('adhd_tasks', tasks)

    wx.showToast({
      title: '已随机排序',
      icon: 'success'
    })
  },

  /**
   * 重置所有任务的完成状态
   */
  resetAll() {
    // 将所有任务的completed设为false
    const tasks = this.data.tasks.map(task => ({
      ...task,
      completed: false
    }))

    this.setData({ tasks, selectedTaskId: null })

    // 保存到当前日期的存储
    const dateKey = this.getCurrentDateKey()
    wx.setStorageSync(dateKey, tasks)
    // 同时更新默认任务模板
    wx.setStorageSync('adhd_tasks', tasks)

    this.calculateProgress()

    wx.showToast({
      title: '已重置',
      icon: 'success'
    })
  },

  /**
   * 显示庆祝弹窗
   * 当完成度达到100%时触发
   */
  showCelebration() {
    this.setData({ showCelebration: true })
    // 3秒后自动关闭
    setTimeout(() => {
      this.hideCelebration()
    }, 3000)
  },

  /**
   * 隐藏庆祝弹窗
   */
  hideCelebration() {
    this.setData({ showCelebration: false })
  },

  /**
   * 跳转到任务管理页面
   */
  goToTasks() {
    const { selectedDate } = this.data
    // 传递当前选中的日期给任务页面
    const dateParam = selectedDate ? `?date=${selectedDate}` : ''
    wx.navigateTo({
      url: `/pages/tasks/tasks${dateParam}`
    })
  },

  /**
   * 跳转到统计页面
   */
  goToStats() {
    wx.navigateTo({
      url: '/pages/stats/stats'
    })
  },

  /**
   * 选择格子布局大小
   */
  selectGridSize(e) {
    const size = parseInt(e.currentTarget.dataset.size)
    const { tasks, gridSize } = this.data

    // 如果选择的布局与当前相同，不做处理
    if (size === gridSize) {
      return
    }

    const maxTasks = size * size
    const currentTaskCount = tasks.length

    // 如果当前任务数量超过新布局的格子数，提示用户
    if (currentTaskCount > maxTasks) {
      wx.showModal({
        title: '提示',
        content: `当前有${currentTaskCount}个任务，${size}×${size}布局最多只能显示${maxTasks}个任务，超出部分将被隐藏，是否继续？`,
        success: (res) => {
          if (res.confirm) {
            this.applyGridSize(size)
          }
        }
      })
    } else {
      this.applyGridSize(size)
    }
  },

  /**
   * 应用格子布局大小
   */
  applyGridSize(size) {
    const { tasks } = this.data
    const totalCells = size * size
    const taskCount = tasks.length

    // 计算空格子数量
    const emptyCount = Math.max(0, totalCells - taskCount)
    const emptyCells = new Array(emptyCount).fill(0).map((_, i) => i)

    // 获取当前选中的任务ID
    let selectedTaskIds = wx.getStorageSync('selected_task_ids') || []
    const originalCount = selectedTaskIds.length
    
    // 如果选中的任务数量超过新布局的格子数，只保留前 totalCells 个
    if (selectedTaskIds.length > totalCells) {
      selectedTaskIds = selectedTaskIds.slice(0, totalCells)
      wx.setStorageSync('selected_task_ids', selectedTaskIds)
      console.log(`布局切换为 ${size}×${size}，选中任务从 ${originalCount} 个调整为 ${selectedTaskIds.length} 个`)
      
      // 同步更新当天显示的任务列表，只保留选中的任务
      const dateKey = this.getCurrentDateKey()
      const allTasks = wx.getStorageSync('adhd_tasks') || []
      const selectedTaskIdSet = new Set(selectedTaskIds.map(id => Number(id)))
      const selectedTasks = allTasks.filter(t => selectedTaskIdSet.has(Number(t.id)))
      
      // 为每个任务添加对应的文字颜色
      const tasksWithColor = selectedTasks.map(task => {
        const textColor = this.getTextColor(task.color)
        return {
          ...task,
          textColor: textColor
        }
      })
      
      // 保存到当天任务存储
      wx.setStorageSync(dateKey, tasksWithColor)
      console.log(`已更新当天任务存储，从 ${tasks.length} 个调整为 ${tasksWithColor.length} 个`)
      
      // 更新页面显示的任务
      this.setData({ tasks: tasksWithColor })
    }

    wx.setStorageSync('grid_size', size)
    this.setData({ gridSize: size, emptyCells: emptyCells })
    this.calculateProgress()
    wx.showToast({
      title: '切换成功',
      icon: 'success'
    })
  },

  // ========== 日历功能 ==========

  /**
   * 显示日历弹窗
   */
  showCalendar() {
    const now = new Date()
    this.setData({
      showCalendarModal: true,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1
    }, () => {
      this.generateCalendarDays()
      this.selectToday()
    })
  },

  /**
   * 隐藏日历弹窗
   */
  hideCalendar() {
    this.setData({ showCalendarModal: false })
  },

  /**
   * 阻止事件冒泡
   */
  preventHide() {
    // 什么都不做，只是阻止事件冒泡
  },

  /**
   * 生成日历天数
   */
  generateCalendarDays() {
    const { calendarYear, calendarMonth } = this.data
    const days = []
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1)
    const lastDay = new Date(calendarYear, calendarMonth, 0)
    const prevLastDay = new Date(calendarYear, calendarMonth - 1, 0)

    const firstDayWeek = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const prevTotalDays = prevLastDay.getDate()

    // 上个月的日期
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevTotalDays - i
      const date = new Date(calendarYear, calendarMonth - 2, day)
      days.push(this.createDayObject(date, false))
    }

    // 当前月的日期
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(calendarYear, calendarMonth - 1, i)
      days.push(this.createDayObject(date, true))
    }

    // 下个月的日期（补满42个格子，6行7列）
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      days.push(this.createDayObject(date, false))
    }

    this.setData({ calendarDays: days })
  },

  /**
   * 创建日期对象
   */
  createDayObject(date, isCurrentMonth) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const fullDate = `${year}-${month}-${day}`

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 从本地存储获取该日期的完成数据
    const dailyData = wx.getStorageSync(`daily_${fullDate}`) || { completed: 0, total: 0, tasks: [] }

    return {
      day: date.getDate(),
      fullDate: fullDate,
      isCurrentMonth: isCurrentMonth,
      isToday: fullDate === today,
      isSelected: false,
      hasData: dailyData.completed > 0,
      completed: dailyData.completed,
      total: dailyData.total
    }
  },

  /**
   * 开始拖拽任务
   */
  startDrag(e) {
    const { id, index } = e.currentTarget.dataset
    console.log('Start dragging task:', id, index)
    
    // 标记拖拽中的任务
    const tasks = this.data.tasks.map((task, i) => ({
      ...task,
      dragging: i === parseInt(index)
    }))
    
    this.setData({
      tasks,
      draggingTaskId: id,
      draggingIndex: parseInt(index),
      isDragging: true
    })
    
    // 显示拖拽提示
    wx.showToast({
      title: '长按拖拽排序',
      icon: 'none',
      duration: 1500
    })
  },

  /**
   * 拖拽移动中
   */
  onDragMove(e) {
    if (!this.data.isDragging) return
    
    // 阻止默认行为，防止页面滚动
    e.preventDefault()
    
    // 获取触摸位置
    const touch = e.touches[0]
    console.log('Dragging at:', touch.clientX, touch.clientY)
    
    // 计算当前触摸位置对应的格子索引
    const gridSize = this.data.gridSize
    const cellSize = 75 // 每个格子的大致尺寸（rpx）
    const containerLeft = 20 // 容器左边距
    const containerTop = 200 // 容器上边距
    
    // 转换为格子坐标
    const col = Math.floor((touch.clientX - containerLeft) / cellSize)
    const row = Math.floor((touch.clientY - containerTop) / cellSize)
    const targetIndex = row * gridSize + col
    
    // 确保索引在有效范围内
    if (targetIndex >= 0 && targetIndex < this.data.tasks.length && targetIndex !== this.data.draggingIndex) {
      // 实时交换位置
      const tasks = [...this.data.tasks]
      const draggedTask = tasks[this.data.draggingIndex]
      tasks.splice(this.data.draggingIndex, 1)
      tasks.splice(targetIndex, 0, draggedTask)
      
      this.setData({
        tasks,
        draggingIndex: targetIndex // 更新拖拽索引
      })
    }
  },

  /**
   * 拖拽结束
   */
  onDragEnd(e) {
    if (!this.data.isDragging) return
    
    // 清除拖拽状态
    const tasks = this.data.tasks.map(task => ({
      ...task,
      dragging: false
    }))
    
    this.setData({
      tasks,
      isDragging: false,
      draggingTaskId: null,
      draggingIndex: null
    })
    
    // 保存到本地存储
    wx.setStorageSync('adhd_tasks', tasks)
    
    wx.showToast({
      title: '位置已更新',
      icon: 'success',
      duration: 1000
    })
  },

  /**
   * 选择今天
   */
  selectToday() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    this.selectDateByFullDate(today, true)
  },

  /**
   * 选择日期
   */
  selectDate(e) {
    const fullDate = e.currentTarget.dataset.fulldate
    this.selectDateByFullDate(fullDate, false)
  },

  /**
   * 根据完整日期选择
   */
  selectDateByFullDate(fullDate, isToday) {
    const { calendarDays, gridSize } = this.data
    const totalCells = gridSize * gridSize

    // 更新选中状态
    const updatedDays = calendarDays.map(day => ({
      ...day,
      isSelected: day.fullDate === fullDate
    }))

    // 获取该日期的数据
    const storageKey = `daily_${fullDate}`
    const dailyData = wx.getStorageSync(storageKey) || { completed: 0, total: totalCells, tasks: [] }
    
    console.log('selectDateByFullDate:', {
      fullDate,
      storageKey,
      dailyData
    })

    // 格式化日期显示
    const date = new Date(fullDate)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[date.getDay()]

    this.setData({
      calendarDays: updatedDays,
      selectedDate: fullDate,
      selectedDateText: `${month}月${day}日 ${weekDay}`,
      selectedDateIsToday: isToday,
      selectedDatePercent: dailyData.total > 0 ? Math.round((dailyData.completed / dailyData.total) * 100) : 0,
      selectedDateCompleted: dailyData.completed,
      selectedDateTasks: dailyData.tasks || []
    })
  },

  /**
   * 上一个月
   */
  prevMonth() {
    const { calendarYear, calendarMonth } = this.data
    let year = calendarYear
    let month = calendarMonth - 1

    if (month < 1) {
      month = 12
      year--
    }

    this.setData({
      calendarYear: year,
      calendarMonth: month
    }, () => {
      this.generateCalendarDays()
    })
  },

  /**
   * 下一个月
   */
  nextMonth() {
    const { calendarYear, calendarMonth } = this.data
    let year = calendarYear
    let month = calendarMonth + 1

    if (month > 12) {
      month = 1
      year++
    }

    this.setData({
      calendarYear: year,
      calendarMonth: month
    }, () => {
      this.generateCalendarDays()
    })
  },

  /**
   * 返回今天
   */
  backToToday() {
    const now = new Date()
    this.setData({
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1
    }, () => {
      this.generateCalendarDays()
      this.selectToday()
    })
  },

  /**
   * 编辑选中日期 - 关闭日历弹窗并加载该日期的任务
   */
  goToEditToday() {
    const { selectedDate, selectedDateIsToday } = this.data

    // 关闭日历弹窗
    this.setData({ showCalendarModal: false })

    // 加载选中日期的任务（今天或其他日期都使用相同的加载逻辑）
    this.loadTasksForSelectedDate(selectedDate)
  },

  /**
   * 加载指定日期的任务
   * @param {string} date - 日期字符串 YYYY-MM-DD
   */
  loadTasksForSelectedDate(date) {
    const dateKey = `tasks_${date}`

    // 检查是否有该日期的专属任务
    let tasks = wx.getStorageSync(dateKey)

    // 检查是否有选中的任务ID列表（用于判断用户是否主动设置过任务）
    const selectedTaskIds = wx.getStorageSync('selected_task_ids') || []

    // 只有当该日期没有任务数据时，才从默认模板复制
    // 注意：如果 tasks 是空数组且 selectedTaskIds 也是空数组，说明用户主动取消了所有任务
    // 此时不应该从默认模板复制
    if (!tasks) {
      // 如果没有该日期的任务存储，尝试从默认任务模板复制
      const defaultTasks = wx.getStorageSync('adhd_tasks') || []
      if (defaultTasks.length > 0) {
        // 复制默认任务作为该日期的初始任务
        tasks = defaultTasks.map(task => ({
          ...task,
          completed: false
        }))
        // 保存到该日期的存储中
        wx.setStorageSync(dateKey, tasks)
      } else {
        tasks = []
      }
    } else if (tasks.length === 0 && selectedTaskIds.length === 0) {
      // 用户主动取消了所有任务，保持空任务列表
      tasks = []
    } else if (tasks.length === 0) {
      // 任务为空但有选中的任务ID，可能是数据不一致，从默认模板复制
      const defaultTasks = wx.getStorageSync('adhd_tasks') || []
      if (defaultTasks.length > 0) {
        tasks = defaultTasks.map(task => ({
          ...task,
          completed: false
        }))
        wx.setStorageSync(dateKey, tasks)
      } else {
        tasks = []
      }
    }

    // 为每个任务添加对应的文字颜色
    tasks = tasks.map(task => {
      const textColor = this.getTextColor(task.color)
      return {
        ...task,
        textColor: textColor
      }
    })

    // 解析日期字符串，生成显示格式
    const [year, month, day] = date.split('-')
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dateObj = new Date(date)
    const weekDay = weekDays[dateObj.getDay()]

    // 更新任务列表和日期显示
    this.setData({
      tasks: tasks,
      selectedDate: date,
      currentDate: `${year}.${month}.${day} · ${weekDay}`,
      currentDateDisplay: `${year}年${month}月${day}日`
    }, () => {
      this.calculateProgress()
    })

    wx.showToast({
      title: `已加载${month}月${day}日的任务`,
      icon: 'none'
    })
  },

  /**
   * 加载历史日期的任务数据（用于日历查看历史记录，只读模式）
   * @param {string} date - 日期字符串 YYYY-MM-DD
   */
  loadHistoryTasks(date) {
    // 从本地存储获取该日期的任务数据
    const dailyData = wx.getStorageSync(`daily_${date}`) || { tasks: [] }

    // 将历史任务转换为当前任务格式
    const historyTasks = dailyData.tasks.map((task, index) => ({
      id: `history_${date}_${index}`,
      name: task.name,
      completed: true, // 历史任务默认已完成
      color: '#FF9800', // 历史任务使用橙色标记
      textColor: 'white',
      isHistory: true,
      date: date
    }))

    // 解析日期字符串，生成显示格式
    const [year, month, day] = date.split('-')
    const dateDisplay = `${year}年${month}月${day}日`

    // 更新任务列表和日期显示
    this.setData({
      tasks: historyTasks,
      currentDate: date,
      currentDateDisplay: dateDisplay
    }, () => {
      this.calculateProgress()
    })

    wx.showToast({
      title: `已加载${date}的任务`,
      icon: 'none'
    })
  },

  /**
   * 保存今日完成数据
   * 在任务完成时调用
   * @param {Array} taskList - 任务列表，如果不传则使用当前数据
   */
  saveDailyProgress(taskList) {
    const { gridSize } = this.data
    const tasks = taskList || this.data.tasks
    const totalCells = gridSize * gridSize
    const actualTasks = tasks.slice(0, totalCells)

    const completedTasks = actualTasks.filter(t => t.completed)
    
    // 调试日志
    console.log('saveDailyProgress:', {
      gridSize,
      totalCells,
      tasksCount: tasks.length,
      actualTasksCount: actualTasks.length,
      completedTasksCount: completedTasks.length,
      completedTasks: completedTasks.map(t => t.name)
    })
    
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    const dailyData = {
      completed: completedTasks.length,
      total: totalCells,
      tasks: completedTasks.map(t => ({
        name: t.name,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      }))
    }

    wx.setStorageSync(`daily_${today}`, dailyData)
    
    console.log('保存到 storage:', `daily_${today}`, dailyData)
  },

  /**
   * 恢复丢失的任务
   * 尝试从历史每日数据中提取任务名称并恢复
   */
  recoverLostTasks() {
    wx.showModal({
      title: '恢复任务',
      content: '检测到任务列表为空，是否尝试从历史记录中恢复？',
      success: (res) => {
        if (res.confirm) {
          this.doRecoverTasks()
        }
      }
    })
  },

  /**
   * 执行任务恢复
   */
  doRecoverTasks() {
    const recoveredTasks = new Set()
    const taskColors = ['#E8F4FD', '#E8F8F0', '#FFF8E7', '#F0E8F8', '#FCE8F0', '#FFF0E8', '#E8F0F8', '#F0F8E8']
    
    // 获取所有本地存储的键
    const keys = wx.getStorageInfoSync().keys
    
    // 遍历所有 daily_ 开头的存储键
    keys.forEach(key => {
      if (key.startsWith('daily_')) {
        const dailyData = wx.getStorageSync(key) || { tasks: [] }
        if (dailyData.tasks && dailyData.tasks.length > 0) {
          dailyData.tasks.forEach(task => {
            if (task.name) {
              recoveredTasks.add(task.name)
            }
          })
        }
      }
    })
    
    // 如果有恢复的任务，创建任务列表
    if (recoveredTasks.size > 0) {
      const tasks = Array.from(recoveredTasks).map((name, index) => ({
        id: `recovered_${Date.now()}_${index}`,
        name: name,
        completed: false,
        color: taskColors[index % taskColors.length]
      }))

      // 保存恢复的任务
      wx.setStorageSync('adhd_tasks', tasks)

      // 加载恢复的任务
      this.loadTasks()

      wx.showToast({
        title: `成功恢复 ${tasks.length} 个任务`,
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '未找到历史任务数据',
        icon: 'none'
      })
    }
  },

  /**
   * 显示新增任务弹窗
   */
  showAddTaskModal() {
    this.setData({
      showAddTaskModal: true,
      newTaskName: '',
      selectedColor: '#E8F4FD'
    })
  },

  /**
   * 隐藏新增任务弹窗
   */
  hideAddTaskModal() {
    this.setData({
      showAddTaskModal: false,
      newTaskName: ''
    })
  },

  /**
   * 监听新任务输入
   */
  onNewTaskInput(e) {
    this.setData({
      newTaskName: e.detail.value
    })
  },

  /**
   * 选择颜色
   */
  selectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      selectedColor: color
    })
  },

  /**
   * 确认创建任务
   */
  confirmAddTask() {
    const { newTaskName, tasks, gridSize } = this.data

    if (!newTaskName || !newTaskName.trim()) {
      wx.showToast({
        title: '请输入任务名称',
        icon: 'none'
      })
      return
    }

    const taskName = newTaskName.trim()
    const totalCells = gridSize * gridSize

    // 检查是否已达到最大任务数
    if (tasks.length >= totalCells) {
      wx.showToast({
        title: '任务数量已达上限',
        icon: 'none'
      })
      return
    }

    // 随机选择一个颜色
    const colorOptions = ['#E8F4FD', '#E8F8F0', '#FFF8E7', '#F0E8F8', '#FCE8F0', '#FFF0E8', '#E8F0F8', '#F0F8E8']
    const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)]

    // 获取文字颜色
    const textColor = this.getTextColor(randomColor)

    // 创建新任务
    const newTask = {
      id: Date.now(),
      name: taskName,
      color: randomColor,
      textColor: textColor,
      completed: false,
      groupId: 'default',
      groupName: '默认分组'
    }

    // 添加到当前显示的任务列表
    const updatedTasks = [...tasks, newTask]

    // 关键：从 adhd_tasks 读取完整的任务列表（包含所有分组），然后添加新任务
    // 这样可以避免覆盖其他分组（如"我的日常"）中的任务
    const allTasks = wx.getStorageSync('adhd_tasks') || []
    const updatedAllTasks = [...allTasks, newTask]

    // 保存完整的任务列表到 adhd_tasks
    wx.setStorageSync('adhd_tasks', updatedAllTasks)

    // 同时保存到当前日期的任务存储中
    const dateKey = this.getCurrentDateKey()
    wx.setStorageSync(dateKey, updatedTasks)

    // 自动选中新创建的任务，确保在任务管理页面中显示为已选中
    const selectedTaskIds = wx.getStorageSync('selected_task_ids') || []
    const updatedSelectedIds = [...selectedTaskIds, newTask.id]
    wx.setStorageSync('selected_task_ids', updatedSelectedIds)

    // 计算新的空格子数量
    const emptyCount = Math.max(0, totalCells - updatedTasks.length)
    const emptyCells = new Array(emptyCount).fill(0).map((_, i) => i)

    // 更新页面数据
    this.setData({
      tasks: updatedTasks,
      emptyCells: emptyCells,
      showAddTaskModal: false,
      newTaskName: ''
    }, () => {
      this.calculateProgress()
    })

    wx.showToast({
      title: '创建成功',
      icon: 'success'
    })
  },

  /**
   * 阻止事件冒泡
   */
  preventHide() {
    // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
  },

  // ========== 布局下拉菜单功能 ==========

  /**
   * 显示布局下拉菜单
   */
  showLayoutDropdown() {
    this.setData({
      showLayoutDropdown: true
    })
  },

  /**
   * 隐藏布局下拉菜单
   */
  hideLayoutDropdown() {
    this.setData({
      showLayoutDropdown: false
    })
  },

  /**
   * 选择格子布局大小（从下拉菜单）
   */
  selectGridSize(e) {
    const size = parseInt(e.currentTarget.dataset.size)
    const { tasks, gridSize } = this.data

    // 如果选择的布局与当前相同，只关闭菜单
    if (size === gridSize) {
      this.setData({ showLayoutDropdown: false })
      return
    }

    const maxTasks = size * size
    const currentTaskCount = tasks.length

    // 如果当前任务数量超过新布局的格子数，提示用户
    if (currentTaskCount > maxTasks) {
      wx.showModal({
        title: '提示',
        content: `当前有${currentTaskCount}个任务，${size}×${size}布局最多只能显示${maxTasks}个任务，超出部分将被隐藏，是否继续？`,
        success: (res) => {
          if (res.confirm) {
            this.applyGridSize(size)
          }
          this.setData({ showLayoutDropdown: false })
        }
      })
    } else {
      this.applyGridSize(size)
      this.setData({ showLayoutDropdown: false })
    }
  },

  // ========== 登录功能 ==========

  /**
   * 跳转到登录页面
   */
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  /**
   * 显示更多菜单
   */
  showMoreMenu() {
    wx.showActionSheet({
      itemList: ['日历', '设置', '关于'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showCalendar()
            break
          case 1:
            wx.showToast({ title: '设置功能开发中', icon: 'none' })
            break
          case 2:
            wx.showToast({ title: '多巴胺格子 v1.0', icon: 'none' })
            break
        }
      }
    })
  }
})
