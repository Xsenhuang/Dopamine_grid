// pages/tasks/tasks.js
// 任务管理页面 - 用于添加、编辑、删除任务，以及设置格子布局

Page({
  /**
   * 页面的初始数据
   * data 对象中定义了页面需要使用的所有数据
   */
  data: {
    // 任务列表数组，存储所有任务
    tasks: [],
    // 新任务输入框的内容
    newTaskName: '',
    // 当前选中的任务颜色（用于新任务）
    selectedColor: '#E3F2FD',
    // 可选的任务颜色列表
    colors: ['#E3F2FD', '#F3E5F5', '#FFF3E0', '#E8F5E9', '#FCE4EC'],
    // 是否显示编辑弹窗
    showEditModal: false,
    // 当前正在编辑的任务ID
    editingId: null,
    // 编辑弹窗中的任务名称
    editName: '',
    // 编辑弹窗中选中的颜色
    editColor: '',
    // 当前格子布局大小（3、4、5、6）
    gridSize: 5,
    // 可选的格子布局选项
    gridOptions: [3, 4, 5, 6]
  },

  /**
   * 生命周期函数--监听页面加载
   * 页面第一次加载时执行
   */
  onLoad() {
    // 加载已保存的任务列表
    this.loadTasks()
    // 加载已保存的格子布局设置
    this.loadGridSize()
  },

  /**
   * 生命周期函数--监听页面显示
   * 每次打开页面或从其他页面返回时执行
   */
  onShow() {
    // 重新加载任务列表（可能从其他页面返回时有更新）
    this.loadTasks()
  },

  /**
   * 从本地存储加载任务列表
   * 使用 wx.getStorageSync 同步读取数据
   */
  loadTasks() {
    // 从本地存储获取任务数据，如果没有则返回空数组
    const tasks = wx.getStorageSync('adhd_tasks') || []
    // 更新页面数据
    this.setData({ tasks })
  },

  /**
   * 从本地存储加载格子布局设置
   * 默认使用 5×5 布局
   */
  loadGridSize() {
    // 从本地存储获取布局大小，如果没有则默认使用 5
    const gridSize = wx.getStorageSync('grid_size') || 5
    this.setData({ gridSize })
  },

  /**
   * 监听新任务输入框的输入事件
   * @param {Object} e - 事件对象，包含输入的内容
   */
  onInputChange(e) {
    // 更新新任务名称到 data
    this.setData({
      newTaskName: e.detail.value
    })
  },

  /**
   * 选择任务颜色
   * @param {Object} e - 事件对象，包含点击的颜色
   */
  selectColor(e) {
    // 获取点击的颜色值
    this.setData({
      selectedColor: e.currentTarget.dataset.color
    })
  },

  /**
   * 添加新任务
   * 验证输入内容并保存到本地存储
   */
  addTask() {
    // 获取当前数据
    const { newTaskName, selectedColor, tasks, gridSize } = this.data
    // 计算当前布局能容纳的最大任务数
    const maxTasks = gridSize * gridSize
    
    // 验证：任务名称不能为空
    if (!newTaskName.trim()) {
      wx.showToast({
        title: '请输入任务名称',
        icon: 'none'
      })
      return
    }

    // 验证：不能超过最大任务数
    if (tasks.length >= maxTasks) {
      wx.showToast({
        title: `最多只能有${maxTasks}个任务`,
        icon: 'none'
      })
      return
    }

    // 创建新任务对象
    const newTask = {
      id: Date.now(),           // 使用当前时间戳作为唯一ID
      name: newTaskName.trim(), // 任务名称（去除首尾空格）
      color: selectedColor,     // 任务背景颜色
      completed: false          // 初始状态为未完成
    }

    // 将新任务添加到任务列表
    const updatedTasks = [...tasks, newTask]
    // 更新页面数据并清空输入框
    this.setData({
      tasks: updatedTasks,
      newTaskName: ''
    })
    
    // 保存到本地存储
    wx.setStorageSync('adhd_tasks', updatedTasks)
    
    // 显示添加成功提示
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })
  },

  /**
   * 选择格子布局大小
   * @param {Object} e - 事件对象，包含选择的布局大小
   */
  selectGridSize(e) {
    // 获取选择的布局大小（3、4、5、6）
    const size = parseInt(e.currentTarget.dataset.size)
    const { tasks } = this.data
    // 计算新布局能容纳的最大任务数
    const maxTasks = size * size
    
    // 如果当前任务数超过新布局的容量
    if (tasks.length > maxTasks) {
      // 显示确认对话框
      wx.showModal({
        title: '提示',
        content: `当前有${tasks.length}个任务，切换为${size}×${size}布局将只保留前${maxTasks}个任务，是否继续？`,
        success: (res) => {
          // 用户点击确认
          if (res.confirm) {
            // 裁剪任务列表，只保留前 maxTasks 个
            const trimmedTasks = tasks.slice(0, maxTasks)
            // 保存裁剪后的任务列表
            wx.setStorageSync('adhd_tasks', trimmedTasks)
            // 保存新的布局设置
            wx.setStorageSync('grid_size', size)
            // 更新页面数据
            this.setData({ 
              gridSize: size,
              tasks: trimmedTasks
            })
            wx.showToast({
              title: '切换成功',
              icon: 'success'
            })
          }
        }
      })
    } else {
      // 当前任务数未超过新布局容量，直接切换
      wx.setStorageSync('grid_size', size)
      this.setData({ gridSize: size })
      wx.showToast({
        title: '切换成功',
        icon: 'success'
      })
    }
  },

  /**
   * 切换任务的完成状态
   * @param {Object} e - 事件对象，包含任务ID
   */
  toggleComplete(e) {
    const id = e.currentTarget.dataset.id
    // 遍历任务列表，找到对应任务并切换完成状态
    const tasks = this.data.tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: !task.completed }
      }
      return task
    })
    
    this.setData({ tasks })
    wx.setStorageSync('adhd_tasks', tasks)
  },

  /**
   * 开始编辑任务
   * @param {Object} e - 事件对象，包含任务ID和名称
   */
  startEdit(e) {
    const { id, name } = e.currentTarget.dataset
    // 找到要编辑的任务
    const task = this.data.tasks.find(t => t.id === id)
    
    // 显示编辑弹窗并填充数据
    this.setData({
      showEditModal: true,
      editingId: id,
      editName: name,
      editColor: task.color
    })
  },

  /**
   * 监听编辑弹窗输入框的输入事件
   * @param {Object} e - 事件对象
   */
  onEditInputChange(e) {
    this.setData({
      editName: e.detail.value
    })
  },

  /**
   * 选择编辑任务的颜色
   * @param {Object} e - 事件对象
   */
  selectEditColor(e) {
    this.setData({
      editColor: e.currentTarget.dataset.color
    })
  },

  /**
   * 保存编辑后的任务
   */
  saveEdit() {
    const { editingId, editName, editColor, tasks } = this.data
    
    // 验证：任务名称不能为空
    if (!editName.trim()) {
      wx.showToast({
        title: '任务名称不能为空',
        icon: 'none'
      })
      return
    }

    // 更新任务列表中对应任务的信息
    const updatedTasks = tasks.map(task => {
      if (task.id === editingId) {
        return { ...task, name: editName.trim(), color: editColor }
      }
      return task
    })

    // 关闭编辑弹窗并更新数据
    this.setData({
      tasks: updatedTasks,
      showEditModal: false,
      editingId: null,
      editName: '',
      editColor: ''
    })
    
    wx.setStorageSync('adhd_tasks', updatedTasks)
    
    wx.showToast({
      title: '修改成功',
      icon: 'success'
    })
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    this.setData({
      showEditModal: false,
      editingId: null,
      editName: '',
      editColor: ''
    })
  },

  /**
   * 阻止事件冒泡（用于编辑弹窗）
   * 防止点击弹窗内容时关闭弹窗
   */
  preventBubble() {},

  /**
   * 删除任务
   * @param {Object} e - 事件对象，包含任务ID
   */
  deleteTask(e) {
    const id = e.currentTarget.dataset.id
    
    // 显示确认对话框
    wx.showModal({
      title: '删除任务',
      content: '确定要删除这个任务吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          // 过滤掉要删除的任务
          const updatedTasks = this.data.tasks.filter(task => task.id !== id)
          
          this.setData({ tasks: updatedTasks })
          wx.setStorageSync('adhd_tasks', updatedTasks)
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  }
})
