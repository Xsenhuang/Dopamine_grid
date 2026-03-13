// 云函数：发送短信验证码
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 阿里云短信SDK（需要在云函数中安装）
// const SMSClient = require('@alicloud/sms-sdk')

// 模拟发送（开发测试用）
async function mockSendSMS(phoneNumber, code) {
  console.log(`向 ${phoneNumber} 发送验证码: ${code}`)
  return {
    success: true,
    message: '模拟发送成功',
    code: code
  }
}

// 真实阿里云短信发送（需要配置AccessKey）
async function realSendSMS(phoneNumber, code) {
  const SMSClient = require('@alicloud/sms-sdk')
  
  const accessKeyId = '你的阿里云AccessKey ID'
  const secretAccessKey = '你的阿里云AccessKey Secret'
  
  const smsClient = new SMSClient({
    accessKeyId,
    secretAccessKey
  })
  
  try {
    const result = await smsClient.sendSMS({
      PhoneNumbers: phoneNumber,
      SignName: '多巴胺格子', // 你的短信签名
      TemplateCode: 'SMS_xxxxxx', // 你的模板CODE
      TemplateParam: JSON.stringify({ code: code })
    })
    
    return {
      success: true,
      message: '发送成功',
      result: result
    }
  } catch (error) {
    console.error('发送失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

exports.main = async (event, context) => {
  const { phoneNumber } = event
  
  // 验证手机号格式
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phoneNumber)) {
    return {
      success: false,
      message: '手机号格式错误'
    }
  }
  
  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // 获取数据库引用
  const db = cloud.database()
  
  try {
    // 检查发送频率（同一手机号1分钟内只能发一次）
    const lastSend = await db.collection('verify_codes')
      .where({
        phoneNumber: phoneNumber
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
    
    if (lastSend.data.length > 0) {
      const lastTime = lastSend.data[0].createTime
      const now = Date.now()
      if (now - lastTime < 60000) {
        return {
          success: false,
          message: '发送过于频繁，请稍后再试'
        }
      }
    }
    
    // 发送短信（开发阶段使用模拟，生产环境使用真实发送）
    // const sendResult = await realSendSMS(phoneNumber, code)
    const sendResult = await mockSendSMS(phoneNumber, code)
    
    if (sendResult.success) {
      // 保存验证码到数据库（5分钟有效）
      await db.collection('verify_codes').add({
        data: {
          phoneNumber: phoneNumber,
          code: code,
          createTime: Date.now(),
          expireTime: Date.now() + 5 * 60 * 1000, // 5分钟后过期
          used: false
        }
      })
      
      return {
        success: true,
        message: '验证码已发送',
        // 开发环境返回验证码，生产环境不要返回
        code: code
      }
    } else {
      return {
        success: false,
        message: sendResult.message
      }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      message: '服务器错误'
    }
  }
}
