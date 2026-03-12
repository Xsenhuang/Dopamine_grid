// pages/tasks/tasks.js
// 任务管理页面 - 用于添加、编辑、删除任务，以及设置格子布局

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 任务列表数组
    tasks: [],
    // 默认分组任务
    defaultTasks: [],
    // 分组后的任务
    groupedTasks: [],
    // 新任务输入框的内容
    newTaskName: '',
    // 当前选中的任务颜色（马卡龙色系）
    selectedColor: '#E8F4FD',
    // 可选的任务颜色列表 - 马卡龙色系
    colors: ['#E8F4FD', '#E8F8F0', '#FFF8E7', '#F0E8F8', '#FCE8F0', '#FFF0E8', '#E8F0F8', '#F0F8E8'],
    // 当前格子布局大小
    gridSize: 5,
    // 可选的格子布局选项
    gridOptions: [3, 4, 5, 6],
    // 已选中的任务ID列表
    selectedTaskIds: [],

    // 默认分组是否全选
    defaultGroupAllSelected: false,
    // 各分组全选状态
    groupAllSelected: {},
    // 分组选项（用于picker）
    groupOptions: [{ id: 'default', name: '默认分组' }],
    // 当前选中的分组索引
    selectedGroupIndex: 0,
    // 当前选中的分组ID
    currentGroupId: 'default',
    // 保存的分组列表
    savedGroups: [],
    // 当前编辑的日期
    currentDate: '',

    // 任务灵感弹窗显示状态
    showInspiration: false,
    // 任务灵感数据
    inspirationTasks: {
      personalCare: [
        { name: '刷牙', selected: false },
        { name: '洗脸', selected: false },
        { name: '洗澡', selected: false },
        { name: '洗头', selected: false },
        { name: '涂护肤品', selected: false },
        { name: '梳头发', selected: false },
        { name: '涂防晒', selected: false },
        { name: '修剪指甲', selected: false },
        { name: '喝一杯水', selected: false }
      ],
      housework: [
        { name: '倒垃圾', selected: false },
        { name: '洗碗', selected: false },
        { name: '扫地', selected: false },
        { name: '拖地', selected: false },
        { name: '收拾床铺', selected: false },
        { name: '整理桌面', selected: false },
        { name: '整理衣柜', selected: false },
        { name: '整理书架', selected: false },
        { name: '整理包包', selected: false },
        { name: '浇花', selected: false }
      ],
      lifeMaintenance: [
        { name: '上厕所', selected: false },
        { name: '控制少刷信息流', selected: false },
        { name: '深呼吸 30 秒', selected: false },
        { name: '伸展身体', selected: false },
        { name: '久坐不超1h', selected: false },
        { name: '吃点水果', selected: false },
        { name: '喝一杯酸奶', selected: false },
        { name: '收拾鞋子', selected: false },
        { name: '准备明天衣服', selected: false },
        { name: '规划今天任务', selected: false }
      ],
      workStudy: [
        { name: '打开电脑', selected: false },
        { name: '写一段论文', selected: false },
        { name: '画一张图', selected: false },
        { name: '回一封邮件', selected: false },
        { name: '看一页资料', selected: false },
        { name: '整理文件', selected: false },
        { name: '做5分钟笔记', selected: false },
        { name: '规划明天日程', selected: false },
        { name: '整理收藏夹', selected: false },
        { name: '列出待办事项', selected: false }
      ],
      hobbyRelax: [
        { name: '听一首歌', selected: false },
        { name: '画一小幅速写', selected: false },
        { name: '写一句日记', selected: false },
        { name: '摆弄植物', selected: false },
        { name: '做一小段手工', selected: false },
        { name: '看一页书', selected: false },
        { name: '做 5 分钟冥想', selected: false },
        { name: '拉伸肩颈', selected: false },
        { name: '喝一杯茶', selected: false },
        { name: '听一集播客', selected: false }
      ]
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取传入的日期参数
    const date = options?.date || ''
    this.setData({ currentDate: date })

    // 先尝试恢复分组数据（防止缓存被清理）
    this.restoreGroupsFromBackup()
    this.loadTasks()
    this.loadGridSize()
    this.loadSelectedTasks()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadTasks()
    this.loadSelectedTasks()
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 从本地存储加载任务列表
   */
  loadTasks() {
    const tasks = wx.getStorageSync('adhd_tasks') || []
    const groups = wx.getStorageSync('task_groups') || []
    this.setData({ tasks, savedGroups: groups })
    this.computeGroupedTasks()
    // 同步分组历史记录到持久化存储
    this.syncGroupHistory()
  },

  /**
   * 同步分组历史记录到持久化存储
   * 防止缓存被清理导致分组丢失
   */
  syncGroupHistory() {
    const groups = wx.getStorageSync('task_groups') || []
    // 同时保存到另一个备份键，增加数据安全性
    wx.setStorageSync('task_groups_backup', groups)
    // 保存分组历史记录（包含创建时间等元数据）
    let groupHistory = wx.getStorageSync('task_groups_history') || {}
    groups.forEach(group => {
      if (!groupHistory[group.groupId]) {
        groupHistory[group.groupId] = {
          ...group,
          createdAt: group.createdAt || Date.now(),
          lastUsedAt: Date.now()
        }
      } else {
        groupHistory[group.groupId].lastUsedAt = Date.now()
        groupHistory[group.groupId].groupName = group.groupName
      }
    })
    wx.setStorageSync('task_groups_history', groupHistory)
  },

  /**
   * 恢复分组数据（从备份或历史记录）
   */
  restoreGroupsFromBackup() {
    let groups = wx.getStorageSync('task_groups') || []
    // 如果主存储为空，尝试从备份恢复
    if (groups.length === 0) {
      const backup = wx.getStorageSync('task_groups_backup') || []
      if (backup.length > 0) {
        groups = backup
        wx.setStorageSync('task_groups', groups)
        console.log('分组已从备份恢复')
      }
    }
    // 如果备份也为空，尝试从历史记录恢复
    if (groups.length === 0) {
      const history = wx.getStorageSync('task_groups_history') || {}
      const historyGroups = Object.values(history)
      if (historyGroups.length > 0) {
        groups = historyGroups.map(h => ({
          groupId: h.groupId,
          groupName: h.groupName
        }))
        wx.setStorageSync('task_groups', groups)
        console.log('分组已从历史记录恢复')
      }
    }
    return groups
  },

  /**
   * 从本地存储加载格子布局设置
   */
  loadGridSize() {
    const gridSize = wx.getStorageSync('grid_size') || 5
    this.setData({ gridSize })
  },

  /**
   * 从本地存储加载已选中的任务
   */
  loadSelectedTasks() {
    const selectedTaskIds = wx.getStorageSync('selected_task_ids') || []
    this.setData({ selectedTaskIds })
  },

  /**
   * 计算分组任务
   */
  computeGroupedTasks() {
    const { tasks, selectedTaskIds, savedGroups } = this.data
    const defaultTasks = tasks.filter(t => !t.groupId || t.groupId === 'default')

    // 按分组ID分组
    const groupMap = {}
    tasks.forEach(task => {
      if (task.groupId && task.groupId !== 'default') {
        if (!groupMap[task.groupId]) {
          groupMap[task.groupId] = {
            groupId: task.groupId,
            groupName: task.groupName || '未命名分组',
            tasks: []
          }
        }
        groupMap[task.groupId].tasks.push(task)
      }
    })

    // 添加空分组（从savedGroups中读取但没有任务的分组）
    savedGroups.forEach(savedGroup => {
      if (!groupMap[savedGroup.groupId]) {
        groupMap[savedGroup.groupId] = {
          groupId: savedGroup.groupId,
          groupName: savedGroup.groupName || '未命名分组',
          tasks: []
        }
      }
    })

    const groupedTasks = Object.values(groupMap)

    // 计算默认分组全选状态
    const defaultGroupAllSelected = defaultTasks.length > 0 && defaultTasks.every(t => selectedTaskIds.includes(t.id))

    // 计算各分组全选状态
    const groupAllSelected = {}
    groupedTasks.forEach(group => {
      groupAllSelected[group.groupId] = group.tasks.length > 0 && group.tasks.every(t => selectedTaskIds.includes(t.id))
    })

    // 更新分组选项
    const groupOptions = [{ id: 'default', name: '默认分组' }]
    groupedTasks.forEach(group => {
      groupOptions.push({ id: group.groupId, name: group.groupName })
    })

    this.setData({ defaultTasks, groupedTasks, defaultGroupAllSelected, groupAllSelected, groupOptions })
  },

  /**
   * 监听新任务输入框的输入事件
   */
  onInputChange(e) {
    this.setData({
      newTaskName: e.detail.value
    })
  },

  /**
   * 监听分组内任务输入框的输入事件
   */
  onGroupInputChange(e) {
    const groupId = e.currentTarget.dataset.groupId
    const value = e.detail.value
    const { newTaskNames = {} } = this.data
    newTaskNames[groupId] = value
    this.setData({ newTaskNames })
  },

  /**
   * 保存任务到存储（支持按日期存储）
   * @param {Array} tasks - 任务列表
   */
  saveTasks(tasks) {
    const { currentDate } = this.data

    // 如果有指定日期，保存到该日期的存储中
    if (currentDate) {
      const dateKey = `tasks_${currentDate}`
      wx.setStorageSync(dateKey, tasks)
    }

    // 同时更新默认任务模板
    wx.setStorageSync('adhd_tasks', tasks)
  },

  /**
   * 添加任务到指定分组
   */
  addTaskToGroup(e) {
    const groupId = e.currentTarget.dataset.groupId
    const groupName = e.currentTarget.dataset.groupName
    const { newTaskNames = {}, tasks, colors } = this.data
    const taskName = newTaskNames[groupId]

    if (!taskName || !taskName.trim()) {
      wx.showToast({
        title: '请输入任务名称',
        icon: 'none'
      })
      return
    }

    // 随机选择一个颜色
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newTask = {
      id: Date.now(),
      name: taskName.trim(),
      color: randomColor,
      completed: false,
      groupId: groupId,
      groupName: groupName
    }

    const updatedTasks = [...tasks, newTask]
    newTaskNames[groupId] = ''
    this.setData({
      tasks: updatedTasks,
      newTaskNames
    })

    this.saveTasks(updatedTasks)
    this.computeGroupedTasks()

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })
  },

  /**
   * 添加新任务
   */
  addTask() {
    const { newTaskName, tasks, currentGroupId, groupedTasks, colors } = this.data

    if (!newTaskName.trim()) {
      wx.showToast({
        title: '请输入任务名称',
        icon: 'none'
      })
      return
    }

    // 获取分组名称
    let groupName = '默认分组'
    if (currentGroupId !== 'default') {
      const group = groupedTasks.find(g => g.groupId === currentGroupId)
      if (group) {
        groupName = group.groupName
      }
    }

    // 随机选择一个颜色
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newTask = {
      id: Date.now(),
      name: newTaskName.trim(),
      color: randomColor,
      completed: false,
      groupId: currentGroupId,
      groupName: groupName
    }

    const updatedTasks = [...tasks, newTask]
    this.setData({
      tasks: updatedTasks,
      newTaskName: ''
    })

    this.saveTasks(updatedTasks)
    this.computeGroupedTasks()

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })
  },

  /**
   * 选择格子布局大小
   */
  selectGridSize(e) {
    const size = parseInt(e.currentTarget.dataset.size)
    const { tasks, selectedTaskIds } = this.data
    const maxTasks = size * size
    
    // 如果选中的任务数量超过新布局的格子数，提示用户
    if (selectedTaskIds.length > maxTasks) {
      wx.showModal({
        title: '提示',
        content: `当前已选中${selectedTaskIds.length}个任务，${size}×${size}布局最多只能使用${maxTasks}个任务，是否继续？`,
        success: (res) => {
          if (res.confirm) {
            // 只保留前maxTasks个选中的任务
            const trimmedSelectedIds = selectedTaskIds.slice(0, maxTasks)
            wx.setStorageSync('selected_task_ids', trimmedSelectedIds)
            wx.setStorageSync('grid_size', size)
            this.setData({ 
              gridSize: size,
              selectedTaskIds: trimmedSelectedIds
            })
            this.updateGroupSelectAllStatus(trimmedSelectedIds, tasks)
            wx.showToast({
              title: '切换成功',
              icon: 'success'
            })
          }
        }
      })
    } else {
      wx.setStorageSync('grid_size', size)
      this.setData({ gridSize: size })
      wx.showToast({
        title: '切换成功',
        icon: 'success'
      })
    }
  },

  /**
   * 切换任务选中状态
   */
  toggleTaskSelection(e) {
    const id = parseInt(e.currentTarget.dataset.id)
    const { selectedTaskIds, gridSize, tasks } = this.data
    const maxSelect = gridSize * gridSize

    let newSelectedIds
    const index = selectedTaskIds.indexOf(id)
    if (index > -1) {
      // 取消选中
      newSelectedIds = selectedTaskIds.filter(taskId => taskId !== id)
    } else {
      // 选中，检查是否超过最大数量
      if (selectedTaskIds.length >= maxSelect) {
        wx.showToast({
          title: `最多选择${maxSelect}个任务`,
          icon: 'none'
        })
        return
      }
      newSelectedIds = [...selectedTaskIds, id]
    }

    this.setData({ selectedTaskIds: newSelectedIds })
    wx.setStorageSync('selected_task_ids', newSelectedIds)

    // 更新全选状态
    this.updateGroupSelectAllStatus(newSelectedIds, tasks)
  },

  /**
   * 更新分组全选状态
   */
  updateGroupSelectAllStatus(selectedTaskIds, tasks) {
    const defaultTasks = tasks.filter(t => !t.groupId || t.groupId === 'default')
    const defaultGroupAllSelected = defaultTasks.length > 0 && defaultTasks.every(t => selectedTaskIds.includes(t.id))

    const groupMap = {}
    tasks.forEach(task => {
      if (task.groupId && task.groupId !== 'default') {
        if (!groupMap[task.groupId]) {
          groupMap[task.groupId] = { tasks: [] }
        }
        groupMap[task.groupId].tasks.push(task)
      }
    })

    const groupAllSelected = {}
    Object.keys(groupMap).forEach(groupId => {
      const groupTasks = groupMap[groupId].tasks
      groupAllSelected[groupId] = groupTasks.length > 0 && groupTasks.every(t => selectedTaskIds.includes(t.id))
    })

    this.setData({ defaultGroupAllSelected, groupAllSelected })
  },

  /**
   * 全选
   */
  selectAll() {
    const { tasks, gridSize, selectedTaskIds } = this.data
    const maxSelect = gridSize * gridSize
    
    if (selectedTaskIds.length === tasks.length && tasks.length > 0) {
      // 如果已经全选，则取消全选
      this.setData({ selectedTaskIds: [] })
      wx.setStorageSync('selected_task_ids', [])
    } else {
      // 全选，但不超过最大数量
      const allIds = tasks.slice(0, maxSelect).map(t => t.id)
      this.setData({ selectedTaskIds: allIds })
      wx.setStorageSync('selected_task_ids', allIds)
    }
  },

  /**
   * 全取消
   */
  cancelAll() {
    this.setData({ selectedTaskIds: [] })
    wx.setStorageSync('selected_task_ids', [])
  },

  /**
   * 随机选择
   */
  randomSelect() {
    const { tasks, gridSize } = this.data
    const maxSelect = gridSize * gridSize
    
    if (tasks.length === 0) {
      wx.showToast({
        title: '没有任务可选择',
        icon: 'none'
      })
      return
    }
    
    // 随机打乱任务顺序
    const shuffled = [...tasks].sort(() => Math.random() - 0.5)
    const randomIds = shuffled.slice(0, Math.min(maxSelect, tasks.length)).map(t => t.id)
    
    this.setData({ selectedTaskIds: randomIds })
    wx.setStorageSync('selected_task_ids', randomIds)
    
    wx.showToast({
      title: '已随机选择',
      icon: 'success'
    })
  },

  /**
   * 应用选择
   */
  applySelection() {
    const { selectedTaskIds, tasks, currentDate } = this.data

    // 获取选中的任务
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id))

    // 如果有指定日期，保存到该日期的存储中
    if (currentDate) {
      const dateKey = `tasks_${currentDate}`
      // 获取该日期现有的任务，保留完成状态
      const existingTasks = wx.getStorageSync(dateKey) || []
      const existingCompletedMap = new Map()
      existingTasks.forEach(t => {
        existingCompletedMap.set(t.id, t.completed)
      })

      // 更新任务列表，保留完成状态
      const updatedTasks = selectedTasks.map(t => ({
        ...t,
        completed: existingCompletedMap.get(t.id) || false
      }))

      wx.setStorageSync(dateKey, updatedTasks)
      console.log(`已保存 ${selectedTasks.length} 个任务到 ${currentDate}`)
    }

    // 同时更新默认任务模板
    wx.setStorageSync('adhd_tasks', selectedTasks)

    wx.showToast({
      title: '应用成功',
      icon: 'success'
    })
    setTimeout(() => {
      wx.navigateBack()
    }, 500)
  },

  /**
   * 选择/取消分组内所有任务
   */
  selectAllInGroup(e) {
    const groupId = e.currentTarget.dataset.group
    const { tasks, selectedTaskIds, gridSize, defaultGroupAllSelected, groupAllSelected } = this.data
    const maxSelect = gridSize * gridSize

    // 获取该分组的所有任务
    const groupTasks = tasks.filter(t => (!t.groupId && groupId === 'default') || t.groupId === groupId)
    const groupTaskIds = groupTasks.map(t => t.id)

    // 判断当前分组是否已全选
    const isAllSelected = groupId === 'default' ? defaultGroupAllSelected : groupAllSelected[groupId]

    let newSelectedIds
    if (isAllSelected) {
      // 取消全选：从已选ID中移除该分组的任务ID
      newSelectedIds = selectedTaskIds.filter(id => !groupTaskIds.includes(id))
    } else {
      // 全选：合并已选ID和分组任务ID
      newSelectedIds = [...new Set([...selectedTaskIds, ...groupTaskIds])]

      // 限制最大数量
      if (newSelectedIds.length > maxSelect) {
        wx.showToast({
          title: `最多选择${maxSelect}个任务`,
          icon: 'none'
        })
        return
      }
    }

    this.setData({ selectedTaskIds: newSelectedIds })
    wx.setStorageSync('selected_task_ids', newSelectedIds)

    // 更新全选状态
    this.updateGroupSelectAllStatus(newSelectedIds, tasks)
  },

  /**
   * 创建新分组
   */
  createNewGroup() {
    wx.showModal({
      title: '新建分组',
      content: '',
      editable: true,
      placeholderText: '请输入分组名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const groupId = 'group_' + Date.now()
          const groupName = res.content.trim()
          const createdAt = Date.now()

          // 保存分组信息到存储
          const groups = wx.getStorageSync('task_groups') || []
          groups.push({ groupId, groupName, createdAt })
          wx.setStorageSync('task_groups', groups)

          // 同时保存到备份
          wx.setStorageSync('task_groups_backup', groups)

          // 保存到历史记录（永久保存）
          let groupHistory = wx.getStorageSync('task_groups_history') || {}
          groupHistory[groupId] = {
            groupId,
            groupName,
            createdAt,
            lastUsedAt: createdAt
          }
          wx.setStorageSync('task_groups_history', groupHistory)

          // 更新页面数据中的分组列表
          this.setData({ savedGroups: groups })

          // 刷新分组列表
          this.computeGroupedTasks()

          // 自动切换到新分组
          const { groupOptions } = this.data
          const newIndex = groupOptions.findIndex(g => g.id === groupId)
          if (newIndex !== -1) {
            this.setData({
              selectedGroupIndex: newIndex,
              currentGroupId: groupId
            })
          }

          wx.showToast({
            title: '创建成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 编辑分组
   */
  editGroup(e) {
    const groupId = e.currentTarget.dataset.groupId
    const oldGroupName = e.currentTarget.dataset.groupName

    wx.showModal({
      title: '编辑分组',
      content: oldGroupName,
      editable: true,
      placeholderText: '请输入分组名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const newGroupName = res.content.trim()

          // 更新分组信息
          const groups = wx.getStorageSync('task_groups') || []
          const groupIndex = groups.findIndex(g => g.groupId === groupId)
          if (groupIndex !== -1) {
            groups[groupIndex].groupName = newGroupName
            wx.setStorageSync('task_groups', groups)
            // 同步更新备份
            wx.setStorageSync('task_groups_backup', groups)
          }

          // 更新历史记录
          let groupHistory = wx.getStorageSync('task_groups_history') || {}
          if (groupHistory[groupId]) {
            groupHistory[groupId].groupName = newGroupName
            groupHistory[groupId].lastUsedAt = Date.now()
            wx.setStorageSync('task_groups_history', groupHistory)
          }

          // 更新该分组下所有任务的groupName
          const { tasks } = this.data
          const updatedTasks = tasks.map(task => {
            if (task.groupId === groupId) {
              return { ...task, groupName: newGroupName }
            }
            return task
          })

          this.setData({ tasks: updatedTasks })
          this.saveTasks(updatedTasks)

          // 刷新分组列表
          this.computeGroupedTasks()

          wx.showToast({
            title: '修改成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 删除分组
   */
  deleteGroup(e) {
    const groupId = e.currentTarget.dataset.groupId

    wx.showModal({
      title: '确认删除',
      content: '删除分组后，该分组下的任务将被移动到默认分组，是否继续？',
      confirmColor: '#EF5350',
      success: (res) => {
        if (res.confirm) {
          // 从分组列表中删除
          const groups = wx.getStorageSync('task_groups') || []
          const updatedGroups = groups.filter(g => g.groupId !== groupId)
          wx.setStorageSync('task_groups', updatedGroups)
          // 同步更新备份
          wx.setStorageSync('task_groups_backup', updatedGroups)

          // 用户主动删除的分组，从历史记录中彻底删除
          let groupHistory = wx.getStorageSync('task_groups_history') || {}
          if (groupHistory[groupId]) {
            delete groupHistory[groupId]
            wx.setStorageSync('task_groups_history', groupHistory)
          }

          // 将该分组下的任务移动到默认分组
          const { tasks } = this.data
          const updatedTasks = tasks.map(task => {
            if (task.groupId === groupId) {
              return { ...task, groupId: 'default', groupName: '默认分组' }
            }
            return task
          })

          this.setData({ 
            tasks: updatedTasks,
            savedGroups: updatedGroups
          })
          this.saveTasks(updatedTasks)

          // 刷新分组列表
          this.computeGroupedTasks()

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 显示任务灵感弹窗
   */
  showInspirationModal() {
    this.setData({ showInspiration: true })
  },

  /**
   * 关闭任务灵感弹窗
   */
  closeInspirationModal() {
    this.setData({ showInspiration: false })
  },

  /**
   * 阻止事件冒泡
   */
  preventBubble() {
    // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
  },

  /**
   * 切换任务灵感标签选中状态
   */
  toggleInspirationTag(e) {
    const { category, index } = e.currentTarget.dataset
    const { inspirationTasks } = this.data
    
    // 切换选中状态
    inspirationTasks[category][index].selected = !inspirationTasks[category][index].selected
    
    this.setData({ inspirationTasks })
  },

  /**
   * 确认添加选中的灵感任务
   */
  confirmInspirationSelection() {
    const { inspirationTasks, tasks, colors } = this.data
    
    // 收集所有选中的任务
    const selectedTasks = []
    Object.keys(inspirationTasks).forEach(category => {
      inspirationTasks[category].forEach(item => {
        if (item.selected) {
          selectedTasks.push(item.name)
        }
      })
    })
    
    if (selectedTasks.length === 0) {
      wx.showToast({
        title: '请先选择任务',
        icon: 'none'
      })
      return
    }
    
    // 添加选中的任务到默认分组
    const newTasks = [...tasks]
    selectedTasks.forEach(taskName => {
      // 检查是否已存在同名任务
      const exists = newTasks.some(t => t.name === taskName && (!t.groupId || t.groupId === 'default'))
      if (!exists) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        newTasks.push({
          id: Date.now() + Math.random(),
          name: taskName,
          color: randomColor,
          completed: false,
          groupId: 'default',
          groupName: '默认分组'
        })
      }
    })
    
    // 保存任务
    this.setData({ tasks: newTasks })
    this.saveTasks(newTasks)
    this.computeGroupedTasks()
    
    // 重置选中状态
    this.resetInspirationSelection()
    
    // 关闭弹窗
    this.setData({ showInspiration: false })
    
    wx.showToast({
      title: `已添加 ${selectedTasks.length} 个任务`,
      icon: 'success'
    })
  },

  /**
   * 重置任务灵感选中状态
   */
  resetInspirationSelection() {
    const { inspirationTasks } = this.data
    Object.keys(inspirationTasks).forEach(category => {
      inspirationTasks[category].forEach(item => {
        item.selected = false
      })
    })
    this.setData({ inspirationTasks })
  }
})
