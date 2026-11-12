/** 套餐类型：月卡 / 年卡 */
export type PackageType = 'month' | 'year'

/** 弹窗唤起来源 */
export type VipPopupSource = 'content' | 'member'

/** 关闭方式 */
export type VipCloseReason = 'close_btn' | 'mask' | 'pay_success'

/** 后端可配置的套餐信息（前端仅展示，价格以服务端校验为准） */
export interface VipPackage {
  id: string
  type: PackageType
  name: string
  /** 现价（元） */
  price: number
  /** 原价（元），有则划线展示 */
  originalPrice?: number
  /** 优惠节省金额（元），年卡推荐标签用 */
  saveAmount?: number
  /** 平均每月价格文案，如「平均9.9元/月」 */
  avgPerMonthText?: string
  /** 是否展示推荐标签 */
  recommend?: boolean
  recommendLabel?: string
}

/** 弹窗文案与协议配置（支持后台下发，无需发版） */
export interface VipPopupConfig {
  title: string
  payButtonText: string
  memberAgreementUrl: string
  autoRenewAgreementUrl: string
  packages: VipPackage[]
  /** 默认选中套餐类型 */
  defaultPackageType: PackageType
}

export type PaymentResult = 'success' | 'cancel' | 'fail'

export interface TrackPayload {
  pop_vip_show: { source: VipPopupSource }
  pop_vip_toggle_package: { packageType: PackageType }
  pop_vip_click_pay: { packageType: PackageType }
  pop_vip_close: { reason: VipCloseReason }
}
