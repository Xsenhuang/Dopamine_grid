// pages/index/index.js
// 首页 - 显示Bingo格子、计算完成进度、提供操作按钮

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 任务列表
    tasks: [],
    // 当前格子布局大小（3、4、5、6）
    gridSize: 5,
    // 当前日期字符串
    currentDate: '',
    // 总体完成进度百分比
    progressPercent: 0,
    // 进度提示文案
    progressText: '完成一项继续加油 💪',
    // 是否显示庆祝弹窗
    showCelebration: false,
    // 各线条（行、列、对角线）的完成进度
    lineProgress: {
      rows: [],    // 每行的完成进度
      cols: [],    // 每列的完成进度
      diagonals: [] // 两条对角线的完成进度
    }
  },

  /**
   * 生命周期函数--监听页面加载
   * 页面第一次加载时执行
   */
  onLoad() {
    // 更新日期显示
    this.updateDate()
    // 先加载格子布局设置，再加载任务列表
    // 确保 gridSize 在计算进度前已经加载
    this.loadGridSize()
    this.loadTasks()
  },

  /**
   * 生命周期函数--监听页面显示
   * 每次打开页面或从其他页面返回时执行
   */
  onShow() {
    // 重新加载布局设置（可能在任务页面修改了）
    this.loadGridSize()
    // 重新加载任务列表
    this.loadTasks()
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
      currentDate: `${year}.${month}.${day} · ${weekDay}`
    })
  },

  /**
   * 从本地存储加载格子布局设置
   * 默认使用 5×5 布局
   */
  loadGridSize() {
    const gridSize = wx.getStorageSync('grid_size') || 5
    this.setData({ gridSize })
  },

  /**
   * 从本地存储加载任务列表
   */
  loadTasks() {
    const tasks = wx.getStorageSync('adhd_tasks') || []
    // 使用 Promise 确保数据更新后再计算进度
    this.setData({ tasks }, () => {
      // setData 回调函数：数据已更新到页面
      // 此时再计算进度，确保 gridSize 和 tasks 都已准备好
      this.calculateProgress()
    })
  },

  /**
   * 计算总体完成进度
   * 基于已完成任务数占总任务数的百分比
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
      progressText = '不错的开始！�'
    }
    
    // 更新页面数据
    this.setData({
      progressPercent: percent,
      progressText
    })

    // 如果完成度达到100%，显示庆祝动画
    if (percent >= 100 && actualTasks.length > 0) {
      this.showCelebration()
    }
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
   * 点击格子切换任务完成状态
   * @param {Object} e - 事件对象，包含任务ID
   */
  toggleTask(e) {
    const id = e.currentTarget.dataset.id
    // 遍历任务列表，找到对应任务并切换完成状态
    const tasks = this.data.tasks.map(task => {
      if (task.id === id) {
        // 切换completed状态，并添加动画标记
        return { ...task, completed: !task.completed, animating: true }
      }
      return task
    })
    
    // 保存到本地存储
    wx.setStorageSync('adhd_tasks', tasks)
    
    // 更新页面数据，使用回调确保数据更新后再计算进度
    this.setData({ tasks }, () => {
      // 数据更新完成后重新计算进度
      this.calculateProgress()
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
   * 随机排序任务
   * 使用Fisher-Yates洗牌算法
   */
  randomizeTasks() {
    wx.showModal({
      title: '随机排序',
      content: '确定要重新随机排列任务吗？',
      success: (res) => {
        if (res.confirm) {
          const tasks = [...this.data.tasks]
          // Fisher-Yates洗牌算法
          for (let i = tasks.length - 1; i > 0; i--) {
            // 随机选择一个位置（0到i之间）
            const j = Math.floor(Math.random() * (i + 1));
            // 交换位置i和位置j的元素
            [tasks[i], tasks[j]] = [tasks[j], tasks[i]]
          }
          
          this.setData({ tasks })
          wx.setStorageSync('adhd_tasks', tasks)
          
          wx.showToast({
            title: '已随机排序',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 重置所有任务的完成状态
   */
  resetAll() {
    wx.showModal({
      title: '重置进度',
      content: '确定要重置今日所有完成状态吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          // 将所有任务的completed设为false
          const tasks = this.data.tasks.map(task => ({
            ...task,
            completed: false
          }))
          
          this.setData({ tasks })
          wx.setStorageSync('adhd_tasks', tasks)
          this.calculateProgress()
          
          wx.showToast({
            title: '已重置',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 显示奖励弹窗
   * 展示完成情况和鼓励信息
   */
  showReward() {
    const { lineProgress, gridSize } = this.data
    // 统计已完成任务数
    const completedCount = this.data.tasks.filter(t => t.completed).length
    
    // 统计已完成的线条数量
    let completedLines = 0
    lineProgress.rows.forEach(row => {
      if (row.percent === 100) completedLines++
    })
    lineProgress.cols.forEach(col => {
      if (col.percent === 100) completedLines++
    })
    lineProgress.diagonals.forEach(diag => {
      if (diag.percent === 100) completedLines++
    })
    
    // 鼓励文案列表
    const messages = [
      '继续加油！每一个小步骤都是进步 🌟',
      '你正在变得更好！保持这个节奏 💪',
      'ADHD不是你的缺陷，是你的超能力 ✨',
      '完成比完美更重要！🎯',
      '今天也是充满活力的一天！🌈'
    ]
    
    // 根据完成情况选择文案
    let message = completedCount === 0 
      ? '开始你的第一个任务吧！🚀'
      : messages[Math.floor(Math.random() * messages.length)]
    
    // 显示完成的线条数量
    if (completedLines > 0) {
      message += `\n\n已完成 ${completedLines} 条线！`
    }
    
    wx.showModal({
      title: `已完成 ${completedCount}/${gridSize * gridSize} 项`,
      content: message,
      showCancel: false
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
    wx.navigateTo({
      url: '/pages/tasks/tasks'
    })
  }
})
