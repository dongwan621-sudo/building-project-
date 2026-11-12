/** 价格展示：去掉多余小数位（118 → 118，9.8 → 9.8） */
export function formatYuan(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/\.?0+$/, '')
}
