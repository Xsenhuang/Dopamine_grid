// pages/login/login.js
// 登录页面 - 手机号注册登录 + 微信快捷登录

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 是否已登录
    isLoggedIn: false,
    // 用户信息
    userInfo: null,
    // 是否是注册模式
    isRegister: false,
    // 手机号
    phoneNumber: '',
    // 验证码
    verifyCode: '',
    // 倒计时
    countdown: 0,
    // 是否可以提交
    canSubmit: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 云开发在 app.js 中已初始化，这里不需要重复初始化
    // 如果需要使用云能力，确保 wx.cloud 可用
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    }
    
    // 检查是否已登录
    this.checkLoginStatus()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.checkLoginStatus()
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('user_info')
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      })
    } else {
      this.setData({
        isLoggedIn: false,
        phoneNumber: '',
        verifyCode: '',
        isRegister: false
      })
    }
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    const phoneNumber = e.detail.value
    this.setData({
      phoneNumber: phoneNumber
    })
    this.checkCanSubmit()
  },

  /**
   * 验证码输入
   */
  onCodeInput(e) {
    const verifyCode = e.detail.value
    this.setData({
      verifyCode: verifyCode
    })
    this.checkCanSubmit()
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { phoneNumber, verifyCode } = this.data
    const canSubmit = phoneNumber.length === 11 && verifyCode.length === 6
    this.setData({ canSubmit })
  },

  /**
   * 发送验证码 - 调用云函数
   */
  onSendCode() {
    const { phoneNumber, countdown } = this.data

    // 检查倒计时
    if (countdown > 0) return

    // 验证手机号格式
    if (!this.validatePhone(phoneNumber)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '发送中...' })

    // 调用云函数发送验证码
    wx.cloud.callFunction({
      name: 'sendSMS',
      data: {
        phoneNumber: phoneNumber
      }
    }).then(res => {
      wx.hideLoading()
      console.log('发送结果:', res)
      
      const result = res.result
      if (result.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        
        // 开发环境显示验证码
        if (result.code) {
          console.log('验证码:', result.code)
          wx.showModal({
            title: '开发模式',
            content: `验证码: ${result.code}`,
            showCancel: false
          })
        }
        
        // 开始倒计时
        this.startCountdown()
      } else {
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('调用失败:', err)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    })
  },

  /**
   * 验证手机号格式
   */
  validatePhone(phone) {
    const reg = /^1[3-9]\d{9}$/
    return reg.test(phone)
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    let countdown = 60
    this.setData({ countdown })

    this.countdownTimer = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        clearInterval(this.countdownTimer)
      }
      this.setData({ countdown })
    }, 1000)
  },

  /**
   * 切换登录/注册模式
   */
  onSwitchMode() {
    this.setData({
      isRegister: !this.data.isRegister,
      phoneNumber: '',
      verifyCode: '',
      canSubmit: false
    })
  },

  /**
   * 提交登录/注册 - 调用云函数验证
   */
  onSubmit() {
    const { phoneNumber, verifyCode, isRegister } = this.data

    // 验证手机号
    if (!this.validatePhone(phoneNumber)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    // 验证验证码长度
    if (verifyCode.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '验证中...' })

    // 调用云函数验证验证码
    wx.cloud.callFunction({
      name: 'verifyCode',
      data: {
        phoneNumber: phoneNumber,
        code: verifyCode
      }
    }).then(res => {
      wx.hideLoading()
      console.log('验证结果:', res)
      
      const result = res.result
      if (result.success) {
        // 验证成功，处理登录/注册
        this.handleLoginOrRegister(phoneNumber)
      } else {
        wx.showToast({
          title: result.message || '验证失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('验证失败:', err)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    })
  },

  /**
   * 处理登录或注册
   */
  handleLoginOrRegister(phoneNumber) {
    const { isRegister } = this.data
    
    // 检查是否已注册
    const registeredUsers = wx.getStorageSync('registered_users') || {}

    if (isRegister) {
      // 注册模式
      if (registeredUsers[phoneNumber]) {
        wx.showToast({
          title: '该手机号已注册',
          icon: 'none'
        })
        return
      }

      // 保存注册用户
      registeredUsers[phoneNumber] = {
        phoneNumber: phoneNumber,
        registerTime: new Date().toISOString()
      }
      wx.setStorageSync('registered_users', registeredUsers)

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      })

      // 自动登录
      this.completeLogin(registeredUsers[phoneNumber])
    } else {
      // 登录模式
      if (!registeredUsers[phoneNumber]) {
        wx.showModal({
          title: '提示',
          content: '该手机号未注册，是否立即注册？',
          success: (res) => {
            if (res.confirm) {
              this.setData({ isRegister: true })
            }
          }
        })
        return
      }

      // 登录成功
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      this.completeLogin(registeredUsers[phoneNumber])
    }
  },

  /**
   * 微信快捷登录
   */
  onWechatLogin() {
    const canIUse = wx.canIUse('getUserProfile')

    if (!canIUse) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，请升级后再试',
        showCancel: false
      })
      return
    }

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = {
          ...res.userInfo,
          phoneNumber: '微信用户',
          loginType: 'wechat'
        }

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        this.completeLogin(userInfo)
      },
      fail: (err) => {
        console.error('获取用户信息失败', err)
        wx.showToast({
          title: '登录取消',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 完成登录
   */
  completeLogin(userInfo) {
    wx.setStorageSync('user_info', userInfo)
    this.setData({
      isLoggedIn: true,
      userInfo: userInfo,
      phoneNumber: '',
      verifyCode: '',
      countdown: 0
    })

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('user_info')
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            phoneNumber: '',
            verifyCode: '',
            isRegister: false
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 页面卸载
   */
  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
  }
})
