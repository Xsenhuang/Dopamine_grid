// utils/cloudSync.js
// 云端数据同步工具 - 用于将数据备份到微信云开发

const CLOUD_COLLECTION = 'user_data'

/**
 * 检查是否可以使用云开发
 */
function isCloudAvailable() {
  return wx.cloud && wx.cloud.inited
}

/**
 * 初始化云开发
 */
function initCloud() {
  if (!wx.cloud) {
    console.log('微信云开发不可用')
    return false
  }

  try {
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    })
    console.log('云开发初始化成功')
    return true
  } catch (e) {
    console.error('云开发初始化失败:', e)
    return false
  }
}

/**
 * 获取用户唯一标识
 */
function getUserId() {
  // 优先使用微信用户的 openid
  const userInfo = wx.getStorageSync('user_info')
  if (userInfo && userInfo.openid) {
    return userInfo.openid
  }

  // 如果没有登录，使用设备标识
  let deviceId = wx.getStorageSync('device_id')
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    wx.setStorageSync('device_id', deviceId)
  }
  return deviceId
}

/**
 * 从云端同步数据到本地
 * @returns {Promise<boolean>} 是否成功同步
 */
async function syncFromCloud() {
  if (!isCloudAvailable()) {
    console.log('云开发不可用，跳过云端同步')
    return false
  }

  try {
    const userId = getUserId()
    const db = wx.cloud.database()

    const { data } = await db.collection(CLOUD_COLLECTION)
      .where({ userId })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get()

    if (data && data.length > 0) {
      const cloudData = data[0]

      // 将云端数据恢复到本地存储
      if (cloudData.tasks) {
        wx.setStorageSync('adhd_tasks', cloudData.tasks)
        wx.setStorageSync('adhd_tasks_backup', cloudData.tasks)
      }

      if (cloudData.groups) {
        wx.setStorageSync('task_groups', cloudData.groups)
        wx.setStorageSync('task_groups_backup', cloudData.groups)
      }

      if (cloudData.selectedTaskIds) {
        wx.setStorageSync('selected_task_ids', cloudData.selectedTaskIds)
        wx.setStorageSync('selected_task_ids_backup', cloudData.selectedTaskIds)
      }

      if (cloudData.gridSize) {
        wx.setStorageSync('grid_size', cloudData.gridSize)
      }

      console.log('数据已从云端同步到本地')
      return true
    }

    console.log('云端没有数据')
    return false
  } catch (e) {
    console.error('从云端同步数据失败:', e)
    return false
  }
}

/**
 * 将本地数据同步到云端
 * @returns {Promise<boolean>} 是否成功同步
 */
async function syncToCloud() {
  if (!isCloudAvailable()) {
    console.log('云开发不可用，跳过云端备份')
    return false
  }

  try {
    const userId = getUserId()
    const db = wx.cloud.database()

    // 获取本地数据
    const tasks = wx.getStorageSync('adhd_tasks') || []
    const groups = wx.getStorageSync('task_groups') || []
    const selectedTaskIds = wx.getStorageSync('selected_task_ids') || []
    const gridSize = wx.getStorageSync('grid_size') || 5

    // 准备要保存的数据
    const dataToSave = {
      userId,
      tasks,
      groups,
      selectedTaskIds,
      gridSize,
      updateTime: db.serverDate(),
      deviceInfo: {
        model: wx.getSystemInfoSync().model,
        system: wx.getSystemInfoSync().system,
        version: wx.getSystemInfoSync().version
      }
    }

    // 检查是否已有记录
    const { data: existingData } = await db.collection(CLOUD_COLLECTION)
      .where({ userId })
      .limit(1)
      .get()

    if (existingData && existingData.length > 0) {
      // 更新现有记录
      await db.collection(CLOUD_COLLECTION)
        .doc(existingData[0]._id)
        .update({
          data: dataToSave
        })
    } else {
      // 创建新记录
      await db.collection(CLOUD_COLLECTION)
        .add({
          data: dataToSave
        })
    }

    console.log('数据已同步到云端')

    // 保存最后同步时间
    wx.setStorageSync('last_cloud_sync', Date.now())

    return true
  } catch (e) {
    console.error('同步数据到云端失败:', e)
    return false
  }
}

/**
 * 检查是否需要从云端恢复数据
 * 在应用启动时调用
 */
async function checkAndRestoreFromCloud() {
  // 检查本地是否有数据
  const localTasks = wx.getStorageSync('adhd_tasks')
  const localGroups = wx.getStorageSync('task_groups')

  // 如果本地数据为空，尝试从云端恢复
  if ((!localTasks || localTasks.length === 0) &&
      (!localGroups || localGroups.length === 0)) {
    console.log('本地数据为空，尝试从云端恢复...')
    const success = await syncFromCloud()
    if (success) {
      console.log('已从云端恢复数据')
    } else {
      console.log('云端没有数据可恢复')
    }
    return success
  }

  return false
}

/**
 * 设置自动云端同步
 * @param {number} interval - 同步间隔（毫秒），默认5分钟
 */
function setupAutoCloudSync(interval = 5 * 60 * 1000) {
  // 立即同步一次
  syncToCloud()

  // 定期同步
  setInterval(() => {
    syncToCloud()
  }, interval)

  console.log(`已设置自动云端同步，间隔: ${interval / 1000}秒`)
}

/**
 * 手动触发云端同步
 */
async function manualSync() {
  const success = await syncToCloud()
  if (success) {
    wx.showToast({
      title: '同步成功',
      icon: 'success'
    })
  } else {
    wx.showToast({
      title: '同步失败',
      icon: 'none'
    })
  }
  return success
}

module.exports = {
  initCloud,
  syncFromCloud,
  syncToCloud,
  checkAndRestoreFromCloud,
  setupAutoCloudSync,
  manualSync,
  isCloudAvailable
}
