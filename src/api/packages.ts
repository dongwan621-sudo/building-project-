import type { VipPopupConfig } from '../types/vip'

/** 弹窗加载超时（PRD：3s） */
export const VIP_LOAD_TIMEOUT_MS = 3000

/** 默认配置兜底（实际以服务端下发为准） */
export const DEFAULT_VIP_CONFIG: VipPopupConfig = {
  title: '解锁全部会员权益',
  payButtonText: '立即开通',
  memberAgreementUrl: '/agreement/member',
  autoRenewAgreementUrl: '/agreement/auto-renew',
  defaultPackageType: 'year',
  packages: [
    {
      id: 'pkg_year',
      type: 'year',
      name: '年卡',
      price: 118,
      originalPrice: 298,
      saveAmount: 180,
      avgPerMonthText: '平均9.8元/月',
      recommend: true,
      recommendLabel: '推荐',
    },
    {
      id: 'pkg_month',
      type: 'month',
      name: '月卡',
      price: 25,
      recommend: false,
    },
  ],
}

export interface FetchVipConfigOptions {
  /** 模拟网络延迟 ms */
  delayMs?: number
  /** 强制失败，便于演示/测试异常态 */
  fail?: boolean
  /** 超时时间，默认 3000ms */
  timeoutMs?: number
  signal?: AbortSignal
}

/**
 * 拉取会员购买弹窗配置。
 * 前端仅做展示；下单时服务端会二次校验价格与套餐。
 */
export async function fetchVipPopupConfig(
  options: FetchVipConfigOptions = {},
): Promise<VipPopupConfig> {
  const {
    delayMs = 600,
    fail = false,
    timeoutMs = VIP_LOAD_TIMEOUT_MS,
    signal,
  } = options

  const timeoutCtrl = new AbortController()
  const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs)

  const onOuterAbort = () => timeoutCtrl.abort()
  signal?.addEventListener('abort', onOuterAbort)

  try {
    await delay(delayMs, timeoutCtrl.signal)
    if (fail) {
      throw new Error('network_error')
    }
    // 实际项目中替换为真实 HTTP 请求；此处返回可配置 mock
    return structuredClone(DEFAULT_VIP_CONFIG)
  } catch (err) {
    if (timeoutCtrl.signal.aborted) {
      throw new Error('network_timeout')
    }
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
