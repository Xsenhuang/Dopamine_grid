App({
  onLaunch() {
    // 初始化本地存储
    const tasks = wx.getStorageSync('adhd_tasks')
    if (!tasks) {
      // 默认任务列表
      const defaultTasks = [
        { id: 1, name: '日语', color: '#E3F2FD', completed: false },
        { id: 2, name: '法语', color: '#F3E5F5', completed: false },
        { id: 3, name: '无氧', color: '#FFF3E0', completed: false },
        { id: 4, name: '有氧', color: '#E8F5E9', completed: false },
        { id: 5, name: '健身环', color: '#FCE4EC', completed: false },
        { id: 6, name: '跳舞', color: '#FCE4EC', completed: false },
        { id: 7, name: '拳击', color: '#E3F2FD', completed: false },
        { id: 8, name: '拉伸', color: '#E8F5E9', completed: false },
        { id: 9, name: '看书', color: '#FFF3E0', completed: false },
        { id: 10, name: '听播客', color: '#F3E5F5', completed: false },
        { id: 11, name: '看剧', color: '#FCE4EC', completed: false },
        { id: 12, name: '看电影', color: '#FCE4EC', completed: false },
        { id: 13, name: '打游戏', color: '#E3F2FD', completed: false },
        { id: 14, name: '洗头', color: '#E8F5E9', completed: false },
        { id: 15, name: '吃补剂', color: '#FFF3E0', completed: false },
        { id: 16, name: '倒垃圾', color: '#F3E5F5', completed: false },
        { id: 17, name: '捡垃圾', color: '#FCE4EC', completed: false },
        { id: 18, name: '洗碗', color: '#FCE4EC', completed: false },
        { id: 19, name: '拖地', color: '#E3F2FD', completed: false },
        { id: 20, name: '收衣服', color: '#E8F5E9', completed: false },
        { id: 21, name: '好睡眠', color: '#FFF3E0', completed: false },
        { id: 22, name: '写手帐', color: '#F3E5F5', completed: false },
        { id: 23, name: '写公众号', color: '#FCE4EC', completed: false },
        { id: 24, name: '断舍离', color: '#FCE4EC', completed: false },
        { id: 25, name: '采购食材', color: '#E3F2FD', completed: false },
      ]
      wx.setStorageSync('adhd_tasks', defaultTasks)
    }
    
    // 检查今日日期，如果是新的一天则重置完成状态
    this.checkAndResetDaily()
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
      wx.setStorageSync('adhd_tasks', resetTasks)
      wx.setStorageSync('last_visit_date', today)
    }
  },

  globalData: {
    userInfo: null
  }
})
