import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_VIP_CONFIG } from '../../api/packages'
import { clearTrackListeners, onTrack } from '../../analytics/track'
import type { VipPackage, VipPopupConfig } from '../../types/vip'
import { VipPurchaseModal } from './VipPurchaseModal'

afterEach(() => {
  cleanup()
  clearTrackListeners()
  vi.useRealTimers()
})

function mockLoad(config: VipPopupConfig = DEFAULT_VIP_CONFIG, delayMs = 0) {
  return vi.fn(async () => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
    return structuredClone(config)
  })
}

async function findPackageButton(type: 'month' | 'year') {
  return screen.findByRole('button', {
    name: (_, el) => el?.getAttribute('data-package-type') === type,
  })
}

function getPackageButton(type: 'month' | 'year') {
  return screen.getByRole('button', {
    name: (_, el) => el?.getAttribute('data-package-type') === type,
  })
}

describe('VipPurchaseModal', () => {
  it('shows skeleton while loading and disables pay button', async () => {
    const loadConfig = mockLoad(DEFAULT_VIP_CONFIG, 80)
    render(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={loadConfig}
        onClose={vi.fn()}
        onPay={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('加载中')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '立即开通' })).toBeDisabled()

    await findPackageButton('year')
    expect(screen.queryByLabelText('加载中')).not.toBeInTheDocument()
  })

  it('defaults to year package with recommend save badge', async () => {
    const events: Array<{ event: string; payload: unknown }> = []
    onTrack((event, payload) => events.push({ event, payload }))

    render(
      <VipPurchaseModal
        open
        source="content"
        loadConfig={mockLoad()}
        onClose={vi.fn()}
        onPay={vi.fn()}
      />,
    )

    const year = await findPackageButton('year')
    expect(year).toHaveAttribute('aria-pressed', 'true')
    expect(within(year).getByText(/推荐 · 省180元/)).toBeInTheDocument()
    expect(within(year).getByText('298元')).toHaveClass('vip-pkg__origin')
    expect(within(year).getByText('平均9.8元/月')).toBeInTheDocument()

    const month = getPackageButton('month')
    expect(month).toHaveAttribute('aria-pressed', 'false')
    expect(within(month).queryByText(/推荐/)).not.toBeInTheDocument()

    await waitFor(() => {
      expect(events).toContainEqual({
        event: 'pop_vip_show',
        payload: { source: 'content' },
      })
    })
  })

  it('toggles package selection and tracks the event', async () => {
    const user = userEvent.setup()
    const events: Array<{ event: string; payload: unknown }> = []
    onTrack((event, payload) => events.push({ event, payload }))

    render(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={mockLoad()}
        onClose={vi.fn()}
        onPay={vi.fn()}
      />,
    )

    await findPackageButton('year')
    await user.click(getPackageButton('month'))

    expect(getPackageButton('month')).toHaveAttribute('aria-pressed', 'true')
    expect(getPackageButton('year')).toHaveAttribute('aria-pressed', 'false')
    expect(events).toContainEqual({
      event: 'pop_vip_toggle_package',
      payload: { packageType: 'month' },
    })
  })

  it('shows network error and retries', async () => {
    const user = userEvent.setup()
    const loadConfig = vi
      .fn()
      .mockRejectedValueOnce(new Error('network_error'))
      .mockResolvedValueOnce(structuredClone(DEFAULT_VIP_CONFIG))

    render(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={loadConfig}
        onClose={vi.fn()}
        onPay={vi.fn()}
      />,
    )

    expect(await screen.findByText('网络异常，请稍后重试')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重试' }))
    await findPackageButton('year')
    expect(loadConfig).toHaveBeenCalledTimes(2)
  })

  it('closes via close button and mask with correct track params', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const events: Array<{ event: string; payload: unknown }> = []
    onTrack((event, payload) => events.push({ event, payload }))

    const { rerender } = render(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={mockLoad()}
        onClose={onClose}
        onPay={vi.fn()}
      />,
    )
    await findPackageButton('year')
    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledWith('close_btn')
    expect(events).toContainEqual({
      event: 'pop_vip_close',
      payload: { reason: 'close_btn' },
    })

    onClose.mockClear()
    events.length = 0
    rerender(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={mockLoad()}
        onClose={onClose}
        onPay={vi.fn()}
      />,
    )
    await findPackageButton('year')
    await user.click(screen.getByLabelText('关闭弹窗'))
    expect(onClose).toHaveBeenCalledWith('mask')
    expect(events).toContainEqual({
      event: 'pop_vip_close',
      payload: { reason: 'mask' },
    })
  })

  it('handles pay success, cancel and fail', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onPaySuccess = vi.fn()
    const events: Array<{ event: string; payload: unknown }> = []
    onTrack((event, payload) => events.push({ event, payload }))

    const onPay = vi
      .fn<(pkg: VipPackage) => Promise<'success' | 'cancel' | 'fail'>>()
      .mockResolvedValueOnce('fail')
      .mockResolvedValueOnce('cancel')
      .mockResolvedValueOnce('success')

    render(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={mockLoad()}
        onClose={onClose}
        onPay={onPay}
        onPaySuccess={onPaySuccess}
      />,
    )

    await findPackageButton('year')
    const payBtn = screen.getByRole('button', { name: '立即开通' })

    await user.click(payBtn)
    expect(await screen.findByText('支付失败，请重新尝试')).toBeInTheDocument()
    expect(getPackageButton('year')).toBeInTheDocument()

    await user.click(payBtn)
    await waitFor(() => expect(onPay).toHaveBeenCalledTimes(2))
    expect(onClose).not.toHaveBeenCalled()
    expect(getPackageButton('year')).toBeInTheDocument()

    await user.click(payBtn)
    await waitFor(() => {
      expect(onPaySuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledWith('pay_success')
    })
    expect(events.filter((e) => e.event === 'pop_vip_click_pay')).toHaveLength(3)
    expect(events).toContainEqual({
      event: 'pop_vip_click_pay',
      payload: { packageType: 'year' },
    })
  })

  it('opens agreement links', async () => {
    const user = userEvent.setup()
    const onOpenAgreement = vi.fn()

    render(
      <VipPurchaseModal
        open
        source="member"
        loadConfig={mockLoad()}
        onClose={vi.fn()}
        onPay={vi.fn()}
        onOpenAgreement={onOpenAgreement}
      />,
    )

    await findPackageButton('year')
    await user.click(screen.getByRole('button', { name: '《会员服务协议》' }))
    await user.click(screen.getByRole('button', { name: '《自动续费协议》' }))

    expect(onOpenAgreement).toHaveBeenCalledWith('/agreement/member')
    expect(onOpenAgreement).toHaveBeenCalledWith('/agreement/auto-renew')
  })
})
