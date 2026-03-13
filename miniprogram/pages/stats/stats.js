// pages/stats/stats.js
Page({
  data: {
    // 当前选中的周起始日期
    weekStartDate: '',
    weekEndDate: '',
    weekRangeText: '',
    isCurrentWeek: true,
    // 星期数据
    weekDays: [],
    // 热力图任务数据
    heatmapTasks: [],
    // 任务排行榜
    taskRankings: [],
    // 日历弹窗
    showCalendarModal: false,
    calendarYear: 2026,
    calendarMonth: 3,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: []
  },

  onLoad() {
    // 初始化当前周
    this.initCurrentWeek()
  },

  onShow() {
    // 刷新数据
    this.loadHeatmapData()
    this.loadTaskRankings()
  },

  // 初始化当前周
  initCurrentWeek() {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0是周日
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // 调整到周一
    
    const monday = new Date(now)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    this.setWeekData(monday, sunday)
  },

  // 设置周数据
  setWeekData(monday, sunday) {
    const weekStart = this.formatDate(monday)
    const weekEnd = this.formatDate(sunday)
    
    // 检查是否是当前周
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const isCurrentWeek = sunday >= today && monday <= today
    
    // 生成周范围文本 (格式: 03-09 - 03-15)
    const startMonth = monday.getMonth() + 1
    const startDay = monday.getDate()
    const endMonth = sunday.getMonth() + 1
    const endDay = sunday.getDate()
    
    const weekRangeText = `${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} - ${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    
    // 生成星期数据
    const weekDays = []
    const dayNames = ['一', '二', '三', '四', '五', '六', '日']
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const isToday = this.isSameDay(date, today)
      weekDays.push({
        name: dayNames[i],
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: this.formatDate(date),
        isToday
      })
    }
    
    this.setData({
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      weekRangeText,
      isCurrentWeek,
      weekDays,
      calendarYear: monday.getFullYear(),
      calendarMonth: monday.getMonth() + 1
    })
  },

  // 切换到上一周
  onPrevWeek() {
    const monday = new Date(this.data.weekStartDate)
    monday.setDate(monday.getDate() - 7)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    this.setWeekData(monday, sunday)
    this.loadHeatmapData()
  },

  // 切换到下一周
  onNextWeek() {
    if (this.data.isCurrentWeek) return
    
    const monday = new Date(this.data.weekStartDate)
    monday.setDate(monday.getDate() + 7)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    this.setWeekData(monday, sunday)
    this.loadHeatmapData()
  },

  // 加载热力图数据
  loadHeatmapData() {
    // 获取所有任务（从默认任务模板）
    const defaultTasks = wx.getStorageSync('adhd_tasks') || []
    
    if (defaultTasks.length === 0) {
      this.setData({ heatmapTasks: [] })
      return
    }
    
    const { weekDays } = this.data
    const heatmapTasks = defaultTasks.map(task => {
      const weekStatus = weekDays.map(day => {
        // 获取该日期的任务数据
        const dateKey = `tasks_${day.fullDate}`
        const dailyTasks = wx.getStorageSync(dateKey) || []
        const dailyTask = dailyTasks.find(t => t.id === task.id)
        
        // 判断是否是未来日期
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const checkDate = new Date(day.fullDate)
        const isFuture = checkDate > today
        
        return {
          completed: dailyTask ? dailyTask.completed : false,
          isFuture
        }
      })
      
      return {
        id: task.id,
        name: task.name,
        color: task.color,
        weekStatus
      }
    })
    
    this.setData({ heatmapTasks })
  },

  // 加载任务排行榜
  loadTaskRankings() {
    // 获取所有任务
    const defaultTasks = wx.getStorageSync('adhd_tasks') || []
    
    if (defaultTasks.length === 0) {
      this.setData({ taskRankings: [] })
      return
    }
    
    // 获取所有日期的打卡数据
    const taskStats = defaultTasks.map(task => {
      let total = 0
      let streak = 0
      let currentStreak = 0
      
      // 遍历最近30天的数据
      const today = new Date()
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = this.formatDate(date)
        const dateKey = `tasks_${dateStr}`
        const dailyTasks = wx.getStorageSync(dateKey) || []
        const dailyTask = dailyTasks.find(t => t.id === task.id)
        
        if (dailyTask && dailyTask.completed) {
          total++
          if (i === currentStreak) {
            currentStreak++
          }
        }
      }
      
      return {
        id: task.id,
        name: task.name,
        color: task.color,
        total,
        streak: currentStreak
      }
    })
    
    // 按总次数排序
    taskStats.sort((a, b) => b.total - a.total)
    
    // 计算百分比
    const maxTotal = Math.max(...taskStats.map(t => t.total), 1)
    const taskRankings = taskStats.map(task => ({
      ...task,
      percentage: (task.total / maxTotal) * 100
    }))
    
    this.setData({ taskRankings })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 判断是否是同一天
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  },

  // ========== 日历弹窗功能 ==========
  
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
    const { calendarYear, calendarMonth, weekStartDate } = this.data
    const days = []
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1)
    const lastDay = new Date(calendarYear, calendarMonth, 0)
    const prevLastDay = new Date(calendarYear, calendarMonth - 1, 0)

    const firstDayWeek = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const prevTotalDays = prevLastDay.getDate()

    // 获取今天的日期
    const now = new Date()
    const todayStr = this.formatDate(now)

    // 上个月的日期
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevTotalDays - i
      const date = new Date(calendarYear, calendarMonth - 2, day)
      days.push(this.createDayObject(date, false, todayStr, weekStartDate))
    }

    // 当前月的日期
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(calendarYear, calendarMonth - 1, i)
      days.push(this.createDayObject(date, true, todayStr, weekStartDate))
    }

    // 下个月的日期（补满42个格子，6行7列）
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      days.push(this.createDayObject(date, false, todayStr, weekStartDate))
    }

    this.setData({ calendarDays: days })
  },

  // 创建日期对象
  createDayObject(date, isCurrentMonth, todayStr, selectedDate) {
    const fullDate = this.formatDate(date)
    
    // 检查是否有数据
    const dateKey = `tasks_${fullDate}`
    const dailyTasks = wx.getStorageSync(dateKey) || []
    const hasData = dailyTasks.length > 0
    const completedCount = dailyTasks.filter(t => t.completed).length
    const totalCount = dailyTasks.length
    
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
    const { date } = e.currentTarget.dataset
    const selectedDate = new Date(date)
    
    // 计算该日期所在周的周一
    const dayOfWeek = selectedDate.getDay()
    const diff = selectedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    
    const monday = new Date(selectedDate)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    this.setWeekData(monday, sunday)
    this.setData({ showCalendarModal: false })
    this.loadHeatmapData()
  },

  // 选择今天
  onSelectToday() {
    this.initCurrentWeek()
    this.setData({ showCalendarModal: false })
    this.loadHeatmapData()
  }
})
