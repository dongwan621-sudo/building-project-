# 会员购买弹窗改版（PRD V1.0）

基于产品 PRD 实现的 H5 / WebView 会员购买弹窗组件与演示页。本次只改购买弹窗交互与展示，不改动支付通道、订单与权益发放底层逻辑（演示中支付通过 `onPay` 回调注入）。

## 功能对照

| PRD 项 | 实现 |
| --- | --- |
| 默认选中年卡 | `defaultPackageType: 'year'` |
| 推荐标签「推荐 · 省XX元」 | 年卡红色标签，金额可配置 |
| 原价划线 / 现价 / 月均价 | 年卡展示；月卡仅现价 |
| 选中态边框高亮 + 底部勾选 | CSS + SVG |
| 加载骨架屏 / 3s 超时 / 网络异常重试 | `fetchVipPopupConfig` |
| × / 蒙层关闭，无二次确认 | `close_btn` / `mask` |
| 支付成功 / 取消 / 失败 | `onPay` 返回值驱动 |
| 埋点 | `pop_vip_show` / `toggle` / `click_pay` / `close` |
| 文案价格可配置 | 服务端下发 `VipPopupConfig` |

## 本地运行

```bash
npm install
npm run dev
npm test
npm run build
```

演示页可切换支付成功/取消/失败，以及模拟加载失败。

## 接入说明

```tsx
import { VipPurchaseModal } from './components/VipPurchaseModal'

<VipPurchaseModal
  open={open}
  source="member" // 或 content
  onClose={(reason) => setOpen(false)}
  onPay={async (pkg) => {
    // 调用原有支付；返回 'success' | 'cancel' | 'fail'
    return await pay(pkg.id)
  }}
  onPaySuccess={() => refreshMemberStatus()}
/>
```

价格与套餐仅前端展示，下单须服务端二次校验。
