import { describe, expect, it, vi } from 'vitest'
import { fetchVipPopupConfig, VIP_LOAD_TIMEOUT_MS } from './packages'

describe('fetchVipPopupConfig', () => {
  it('returns year as default package type', async () => {
    const config = await fetchVipPopupConfig({ delayMs: 0 })
    expect(config.defaultPackageType).toBe('year')
    expect(config.packages.some((p) => p.type === 'year' && p.recommend)).toBe(
      true,
    )
  })

  it('times out after VIP_LOAD_TIMEOUT_MS', async () => {
    vi.useFakeTimers()
    const promise = fetchVipPopupConfig({
      delayMs: VIP_LOAD_TIMEOUT_MS + 1000,
      timeoutMs: VIP_LOAD_TIMEOUT_MS,
    })
    const assertion = expect(promise).rejects.toThrow(/network_timeout/)
    await vi.advanceTimersByTimeAsync(VIP_LOAD_TIMEOUT_MS)
    await assertion
    vi.useRealTimers()
  })

  it('fails when fail option is set', async () => {
    await expect(
      fetchVipPopupConfig({ delayMs: 0, fail: true }),
    ).rejects.toThrow('network_error')
  })
})
