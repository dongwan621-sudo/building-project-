import type { VipPackage } from '../../types/vip'
import { formatYuan } from './format'

interface PackageCardProps {
  pkg: VipPackage
  selected: boolean
  onSelect: (pkg: VipPackage) => void
}

export function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  const saveLabel =
    pkg.recommend && pkg.saveAmount != null
      ? `${pkg.recommendLabel ?? '推荐'} · 省${formatYuan(pkg.saveAmount)}元`
      : null

  return (
    <button
      type="button"
      className={`vip-pkg${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      data-package-type={pkg.type}
      onClick={() => onSelect(pkg)}
    >
      {saveLabel ? <span className="vip-pkg__badge">{saveLabel}</span> : null}

      <span className="vip-pkg__name">{pkg.name}</span>

      <span className="vip-pkg__price-row">
        <span className="vip-pkg__price">
          <em>{formatYuan(pkg.price)}</em>
          <small>元</small>
        </span>
        {pkg.originalPrice != null ? (
          <span className="vip-pkg__origin">
            {formatYuan(pkg.originalPrice)}元
          </span>
        ) : null}
      </span>

      {pkg.avgPerMonthText ? (
        <span className="vip-pkg__avg">{pkg.avgPerMonthText}</span>
      ) : (
        <span className="vip-pkg__avg vip-pkg__avg--placeholder" aria-hidden>
          &nbsp;
        </span>
      )}

      <span className="vip-pkg__check" aria-hidden>
        {selected ? (
          <svg viewBox="0 0 20 20" width="16" height="16">
            <circle cx="10" cy="10" r="10" fill="currentColor" />
            <path
              d="M5.5 10.2l3 3.1 6-6.2"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </button>
  )
}
