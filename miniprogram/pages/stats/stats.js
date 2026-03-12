// pages/stats/stats.js
Page({
  data: {
    // 当前选中的日期
    selectedDate: '',
    currentDateText: '',
    isToday: true,
    // 统计数据
    todayStats: {
      total: 0,
      completed: 0,
      pending: 0,
      percentage: 0
    },
    colorStats: [],
    streakDays: 0,
    dailyQuote: '',
    // 日历弹窗
    showCalendarModal: false,
    calendarYear: 2026,
    calendarMonth: 3,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: []
  },

  onLoad() {
    // 初始化选中今天
    this.initDate()
    this.loadQuote()
  },

  onShow() {
    // 刷新当前日期的数据
    this.loadStats()
    this.loadStreak()
  },

  // 初始化日期
  initDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    
    this.setData({
      selectedDate: today,
      currentDateText: '今天',
      isToday: true,
      calendarYear: year,
      calendarMonth: now.getMonth() + 1
    })
    
    this.loadStats()
    this.loadStreak()
  },

  loadStats() {
    const { selectedDate, isToday } = this.data
    
    let tasks
    if (isToday) {
      // 今天使用当前任务列表
      tasks = wx.getStorageSync('adhd_tasks') || []
    } else {
      // 历史日期使用存储的每日数据
      const dailyData = wx.getStorageSync(`daily_${selectedDate}`) || { tasks: [] }
      tasks = dailyData.tasks || []
    }
    
    const completed = tasks.filter(t => t.completed).length
    const total = tasks.length
    const pending = total - completed
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    this.setData({
      todayStats: {
        total,
        completed,
        pending,
        percentage
      }
    })

    this.calculateColorStats(tasks)
  },

  calculateColorStats(tasks) {
    const colorMap = {
      '#E3F2FD': '学习类',
      '#F3E5F5': '休闲类',
      '#FFF3E0': '健康类',
      '#E8F5E9': '生活类',
      '#FCE4EC': '娱乐类',
      '#E8F4FD': '学习类',
      '#E8F8F0': '健康类',
      '#FFF8E7': '生活类',
      '#F0E8F8': '休闲类',
      '#FCE8F0': '娱乐类',
      '#FFF0E8': '其他',
      '#E8F0F8': '学习类',
      '#F0F8E8': '健康类'
    }

    const colorCount = {}
    tasks.forEach(task => {
      if (!colorCount[task.color]) {
        colorCount[task.color] = {
          color: task.color,
          name: colorMap[task.color] || '其他',
          count: 0,
          taskNames: []
        }
      }
      colorCount[task.color].count++
      colorCount[task.color].taskNames.push(task.name)
    })

    const colorStats = Object.values(colorCount).map(item => ({
      ...item,
      percentage: tasks.length > 0 ? Math.round((item.count / tasks.length) * 100) : 0,
      taskNamesText: item.taskNames.join(' · ')
    }))

    this.setData({ colorStats })
  },

  loadStreak() {
    // 从本地存储读取连续完成天数
    const streakData = wx.getStorageSync('streak_data') || {
      currentStreak: 0,
      lastCompletedDate: null
    }

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    // 检查今天是否已完成所有任务
    const tasks = wx.getStorageSync('adhd_tasks') || []
    const allCompleted = tasks.length > 0 && tasks.every(t => t.completed)

    let currentStreak = streakData.currentStreak || 0

    if (allCompleted) {
      if (streakData.lastCompletedDate === yesterday) {
        // 昨天完成了，今天也完成了，连续天数+1
        currentStreak++
      } else if (streakData.lastCompletedDate !== today) {
        // 之前没完成，从今天开始
        currentStreak = 1
      }

      // 更新存储
      wx.setStorageSync('streak_data', {
        currentStreak,
        lastCompletedDate: today
      })
    }

    this.setData({ streakDays: currentStreak })
  },

  loadQuote() {
    const quotes = [
      '每一个小步骤都是向前的进步 🌟',
      'ADHD不是你的缺陷，是你的超能力 ✨',
      '完成比完美更重要！🎯',
      '今天也是充满活力的一天！🌈',
      '相信自己，你可以做到！💪',
      '小成就累积成大成功 📈',
      '保持节奏，不要给自己太大压力 🧘',
      '你已经做得很好了！🌟',
      '每一天都是新的开始 🌅',
      '为自己的每一点进步喝彩 🎉'
    ]

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    this.setData({ dailyQuote: randomQuote })
  },

  // ========== 日期切换功能 ==========
  
  // 切换到前一天
  onPrevDate() {
    const { selectedDate } = this.data
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    this.changeDate(date)
  },

  // 切换到后一天
  onNextDate() {
    const { selectedDate, isToday } = this.data
    if (isToday) return // 今天之后不能切换
    
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    this.changeDate(date)
  },

  // 改变日期
  changeDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // 检查是否是今天
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isToday = dateStr === todayStr
    
    // 格式化日期显示
    let dateText
    if (isToday) {
      dateText = '今天'
    } else if (dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}`) {
      dateText = '昨天'
    } else {
      dateText = `${month}月${day}日`
    }
    
    this.setData({
      selectedDate: dateStr,
      currentDateText: dateText,
      isToday,
      calendarYear: year,
      calendarMonth: date.getMonth() + 1
    })
    
    this.loadStats()
    this.loadStreak()
  },

  // 打开日历选择器
  onSelectDate() {
    this.setData({ showCalendarModal: true })
    this.generateCalendarDays()
  },

  // 关闭日历选择器
  onCloseCalendar() {
    this.setData({ showCalendarModal: false })
  },

  // 阻止事件冒泡
  onCalendarContentTap() {
    // 什么都不做，只是阻止冒泡
  },

  // 生成日历天数
  generateCalendarDays() {
    const { calendarYear, calendarMonth, selectedDate } = this.data
    const days = []
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1)
    const lastDay = new Date(calendarYear, calendarMonth, 0)
    const prevLastDay = new Date(calendarYear, calendarMonth - 1, 0)

    const firstDayWeek = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const prevTotalDays = prevLastDay.getDate()

    // 获取今天的日期
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 上个月的日期
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevTotalDays - i
      const date = new Date(calendarYear, calendarMonth - 2, day)
      days.push(this.createDayObject(date, false, todayStr, selectedDate))
    }

    // 当前月的日期
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(calendarYear, calendarMonth - 1, i)
      days.push(this.createDayObject(date, true, todayStr, selectedDate))
    }

    // 下个月的日期（补满42个格子，6行7列）
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      days.push(this.createDayObject(date, false, todayStr, selectedDate))
    }

    this.setData({ calendarDays: days })
  },

  // 创建日期对象
  createDayObject(date, isCurrentMonth, todayStr, selectedDate) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const fullDate = `${year}-${month}-${day}`
    
    // 检查是否有数据
    const dailyData = wx.getStorageSync(`daily_${fullDate}`)
    const hasData = dailyData && dailyData.tasks && dailyData.tasks.length > 0
    const completedCount = hasData ? dailyData.tasks.filter(t => t.completed).length : 0
    const totalCount = hasData ? dailyData.tasks.length : 0
    
    // 根据完成度设置颜色
    let dotColor = '#E0E0E0'
    if (hasData) {
      const percentage = totalCount > 0 ? completedCount / totalCount : 0
      if (percentage === 1) dotColor = '#4CAF50'
      else if (percentage >= 0.6) dotColor = '#8BC34A'
      else if (percentage >= 0.3) dotColor = '#FFC107'
      else dotColor = '#FF9800'
    }

    return {
      day: date.getDate(),
      fullDate,
      isCurrentMonth,
      isToday: fullDate === todayStr,
      isSelected: fullDate === selectedDate,
      hasData,
      dotColor,
      completedCount,
      totalCount
    }
  },

  // 切换到上个月
  onPrevMonth() {
    const { calendarYear, calendarMonth } = this.data
    let year = calendarYear
    let month = calendarMonth - 1
    if (month < 1) {
      month = 12
      year--
    }
    this.setData({ calendarYear: year, calendarMonth: month }, () => {
      this.generateCalendarDays()
    })
  },

  // 切换到下个月
  onNextMonth() {
    const { calendarYear, calendarMonth } = this.data
    let year = calendarYear
    let month = calendarMonth + 1
    if (month > 12) {
      month = 1
      year++
    }
    this.setData({ calendarYear: year, calendarMonth: month }, () => {
      this.generateCalendarDays()
    })
  },

  // 选择日期
  onDaySelect(e) {
    const { date, istoday } = e.currentTarget.dataset
    const dateObj = new Date(date)
    this.changeDate(dateObj)
    this.setData({ showCalendarModal: false })
  },

  // 选择今天
  onSelectToday() {
    const today = new Date()
    this.changeDate(today)
    this.setData({ showCalendarModal: false })
  }
})
