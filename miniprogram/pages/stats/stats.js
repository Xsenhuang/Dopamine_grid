// pages/stats/stats.js
Page({
  data: {
    todayStats: {
      total: 0,
      completed: 0,
      pending: 0,
      percentage: 0
    },
    colorStats: [],
    streakDays: 0,
    dailyQuote: ''
  },

  onLoad() {
    this.loadStats()
    this.loadStreak()
    this.loadQuote()
  },

  onShow() {
    this.loadStats()
    this.loadStreak()
  },

  loadStats() {
    const tasks = wx.getStorageSync('adhd_tasks') || []
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
      '#FCE4EC': '娱乐类'
    }

    const colorCount = {}
    tasks.forEach(task => {
      if (!colorCount[task.color]) {
        colorCount[task.color] = {
          color: task.color,
          name: colorMap[task.color] || '其他',
          count: 0
        }
      }
      colorCount[task.color].count++
    })

    const colorStats = Object.values(colorCount).map(item => ({
      ...item,
      percentage: tasks.length > 0 ? Math.round((item.count / tasks.length) * 100) : 0
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
  }
})
