// 云函数：初始化数据库
// 用于自动创建 user_data 集合

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 尝试创建集合
    await db.createCollection('user_data')
    console.log('集合创建成功')
    return {
      success: true,
      message: '集合创建成功'
    }
  } catch (e) {
    // 集合已存在或其他错误
    if (e.errCode === -502003) {
      console.log('集合已存在')
      return {
        success: true,
        message: '集合已存在'
      }
    }
    console.error('创建集合失败:', e)
    return {
      success: false,
      message: e.message
    }
  }
}
