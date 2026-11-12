import { useCallback, useState } from 'react'
import { VipPurchaseModal } from './components/VipPurchaseModal'
import type {
  PaymentResult,
  VipCloseReason,
  VipPackage,
  VipPopupSource,
} from './types/vip'
import './App.css'

type DemoPayMode = 'success' | 'cancel' | 'fail'

export default function App() {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<VipPopupSource>('member')
  const [isVip, setIsVip] = useState(false)
  const [forceFail, setForceFail] = useState(false)
  const [payMode, setPayMode] = useState<DemoPayMode>('success')
  const [lastClose, setLastClose] = useState<VipCloseReason | null>(null)
  const [lastPaid, setLastPaid] = useState<string | null>(null)

  const openModal = (nextSource: VipPopupSource) => {
    if (isVip) return
    setSource(nextSource)
    setOpen(true)
  }

  const handlePay = useCallback(
    async (pkg: VipPackage): Promise<PaymentResult> => {
      await wait(700)
      if (payMode === 'success') {
        setLastPaid(`${pkg.name} ¥${pkg.price}`)
        return 'success'
      }
      return payMode
    },
    [payMode],
  )

  return (
    <div className="app">
      <div className="app__glow" aria-hidden />
      <header className="app__hero">
        <p className="app__brand">Aura Member</p>
        <h1>会员购买弹窗改版演示</h1>
        <p className="app__lead">
          默认选中年卡、优惠标签、骨架屏 / 网络异常 / 支付回调与埋点，均按 PRD V1.0 实现。
        </p>
      </header>

      <section className="app__panel">
        <div className="app__status">
          <span>会员状态</span>
          <strong data-testid="vip-status">{isVip ? '已开通' : '未开通'}</strong>
        </div>

        <div className="app__actions">
          <button
            type="button"
            className="app__cta"
            disabled={isVip}
            onClick={() => openModal('member')}
          >
            开通会员
          </button>
          <button
            type="button"
            className="app__cta app__cta--ghost"
            disabled={isVip}
            onClick={() => openModal('content')}
          >
            看付费内容引导
          </button>
        </div>

        <div className="app__controls">
          <label>
            支付模拟
            <select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value as DemoPayMode)}
            >
              <option value="success">支付成功</option>
              <option value="cancel">支付取消</option>
              <option value="fail">支付失败</option>
            </select>
          </label>
          <label className="app__check">
            <input
              type="checkbox"
              checked={forceFail}
              onChange={(e) => setForceFail(e.target.checked)}
            />
            模拟加载失败
          </label>
          {isVip ? (
            <button
              type="button"
              className="app__reset"
              onClick={() => {
                setIsVip(false)
                setLastPaid(null)
              }}
            >
              重置为未开通
            </button>
          ) : null}
        </div>

        <dl className="app__meta">
          <div>
            <dt>最近关闭方式</dt>
            <dd data-testid="last-close">{lastClose ?? '—'}</dd>
          </div>
          <div>
            <dt>最近支付套餐</dt>
            <dd data-testid="last-paid">{lastPaid ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <VipPurchaseModal
        open={open}
        source={source}
        forceLoadFail={forceFail}
        onClose={(reason) => {
          setLastClose(reason)
          setOpen(false)
        }}
        onPay={handlePay}
        onPaySuccess={() => setIsVip(true)}
      />
    </div>
  )
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
