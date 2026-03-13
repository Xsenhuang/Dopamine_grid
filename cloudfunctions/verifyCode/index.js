// 云函数：验证短信验证码
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { phoneNumber, code } = event
  
  if (!phoneNumber || !code) {
    return {
      success: false,
      message: '参数错误'
    }
  }
  
  const db = cloud.database()
  
  try {
    // 查询该手机号最新的验证码
    const result = await db.collection('verify_codes')
      .where({
        phoneNumber: phoneNumber,
        used: false
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        message: '验证码不存在或已过期'
      }
    }
    
    const verifyData = result.data[0]
    
    // 检查是否过期
    if (Date.now() > verifyData.expireTime) {
      return {
        success: false,
        message: '验证码已过期'
      }
    }
    
    // 验证验证码
    if (verifyData.code !== code) {
      return {
        success: false,
        message: '验证码错误'
      }
    }
    
    // 标记验证码已使用
    await db.collection('verify_codes').doc(verifyData._id).update({
      data: {
        used: true
      }
    })
    
    return {
      success: true,
      message: '验证成功',
      phoneNumber: phoneNumber
    }
  } catch (error) {
    console.error('验证失败:', error)
    return {
      success: false,
      message: '服务器错误'
    }
  }
}
