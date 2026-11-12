import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { fetchVipPopupConfig } from '../../api/packages'
import { track } from '../../analytics/track'
import type {
  PackageType,
  PaymentResult,
  VipCloseReason,
  VipPackage,
  VipPopupConfig,
  VipPopupSource,
} from '../../types/vip'
import { PackageCard } from './PackageCard'
import './VipPurchaseModal.css'

export interface VipPurchaseModalProps {
  open: boolean
  source: VipPopupSource
  onClose: (reason: VipCloseReason) => void
  /** 宿主实现支付；返回 success / cancel / fail */
  onPay: (pkg: VipPackage) => Promise<PaymentResult>
  /** 支付成功后刷新会员状态 */
  onPaySuccess?: (pkg: VipPackage) => void
  /** 协议跳转；默认 window.open */
  onOpenAgreement?: (url: string) => void
  /** 注入配置请求，便于测试 */
  loadConfig?: typeof fetchVipPopupConfig
  /** 演示：强制首次加载失败 */
  forceLoadFail?: boolean
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export function VipPurchaseModal({
  open,
  source,
  onClose,
  onPay,
  onPaySuccess,
  onOpenAgreement,
  loadConfig = fetchVipPopupConfig,
  forceLoadFail = false,
}: VipPurchaseModalProps) {
  const titleId = useId()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [config, setConfig] = useState<VipPopupConfig | null>(null)
  const [selectedType, setSelectedType] = useState<PackageType | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const shownRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const selectedPkg =
    config?.packages.find((p) => p.type === selectedType) ?? null

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setPaying(false)
    setPayError(null)
    setToast(null)
    setLoadState('loading')
    setConfig(null)
    setSelectedType(null)

    try {
      const data = await loadConfig({
        signal: ctrl.signal,
        fail: forceLoadFail,
      })
      if (ctrl.signal.aborted) return
      setConfig(data)
      setSelectedType(data.defaultPackageType)
      setLoadState('ready')
    } catch {
      if (ctrl.signal.aborted) return
      setLoadState('error')
    }
  }, [forceLoadFail, loadConfig])

  useEffect(() => {
    if (!open) {
      shownRef.current = false
      abortRef.current?.abort()
      return
    }
    void load()
    return () => abortRef.current?.abort()
  }, [open, load])

  useEffect(() => {
    if (open && loadState === 'ready' && !shownRef.current) {
      shownRef.current = true
      track('pop_vip_show', { source })
    }
  }, [open, loadState, source])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const close = (reason: VipCloseReason) => {
    track('pop_vip_close', { reason })
    onClose(reason)
  }

  const handleSelect = (pkg: VipPackage) => {
    if (selectedType === pkg.type) return
    setSelectedType(pkg.type)
    setPayError(null)
    track('pop_vip_toggle_package', { packageType: pkg.type })
  }

  const handlePay = async () => {
    if (!selectedPkg || paying || loadState !== 'ready') return
    track('pop_vip_click_pay', { packageType: selectedPkg.type })
    setPaying(true)
    setPayError(null)
    try {
      const result = await onPay(selectedPkg)
      if (result === 'success') {
        setToast('开通成功')
        onPaySuccess?.(selectedPkg)
        // 稍候关闭，让 toast 可见
        setTimeout(() => close('pay_success'), 400)
      } else if (result === 'fail') {
        setPayError('支付失败，请重新尝试')
      }
      // cancel：停留在当前套餐选择弹窗
    } finally {
      setPaying(false)
    }
  }

  const openAgreement = (url: string) => {
    if (onOpenAgreement) {
      onOpenAgreement(url)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!open) return null

  const canPay = loadState === 'ready' && !!selectedPkg && !paying

  return (
    <div className="vip-modal-root" role="presentation">
      <button
        type="button"
        className="vip-modal__mask"
        aria-label="关闭弹窗"
        onClick={() => close('mask')}
      />

      <div
        className="vip-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="vip-modal__header">
          <h2 id={titleId} className="vip-modal__title">
            {config?.title ?? '解锁全部会员权益'}
          </h2>
          <button
            type="button"
            className="vip-modal__close"
            aria-label="关闭"
            onClick={() => close('close_btn')}
          >
            ×
          </button>
        </header>

        <div className="vip-modal__body">
          {loadState === 'loading' || loadState === 'idle' ? (
            <PackageSkeleton />
          ) : null}

          {loadState === 'error' ? (
            <div className="vip-modal__error" role="alert">
              <p>网络异常，请稍后重试</p>
              <button type="button" className="vip-modal__retry" onClick={() => void load()}>
                重试
              </button>
            </div>
          ) : null}

          {loadState === 'ready' && config ? (
            <div className="vip-modal__packages" role="listbox" aria-label="会员套餐">
              {config.packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedType === pkg.type}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : null}

          {payError ? (
            <p className="vip-modal__pay-error" role="alert">
              {payError}
            </p>
          ) : null}
        </div>

        <footer className="vip-modal__footer">
          <button
            type="button"
            className="vip-modal__pay"
            disabled={!canPay}
            onClick={() => void handlePay()}
          >
            {paying ? '支付中…' : (config?.payButtonText ?? '立即开通')}
          </button>
          <p className="vip-modal__agreements">
            开通即同意
            <button
              type="button"
              className="vip-modal__link"
              disabled={!config}
              onClick={() => config && openAgreement(config.memberAgreementUrl)}
            >
              《会员服务协议》
            </button>
            、
            <button
              type="button"
              className="vip-modal__link"
              disabled={!config}
              onClick={() =>
                config && openAgreement(config.autoRenewAgreementUrl)
              }
            >
              《自动续费协议》
            </button>
          </p>
        </footer>
      </div>

      {toast ? (
        <div className="vip-modal__toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

function PackageSkeleton() {
  return (
    <div className="vip-modal__packages vip-modal__packages--skeleton" aria-busy="true" aria-label="加载中">
      <div className="vip-skel" />
      <div className="vip-skel" />
    </div>
  )
}
