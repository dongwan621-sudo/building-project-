# 香港金融与贸易概览 PPT

根据参考图生成的演示文稿：**顶部 KPI 卡片 + 下方左右并排双图**。

## 文件

- `香港金融贸易概览.pptx` — 成品 PPT
- `generate_ppt.py` — 生成脚本
- `assets/gfci_chart.png` — 左图：GFCI 评分对比
- `assets/trade_chart.png` — 右图：商品贸易总额走势
- `assets/reference_layout.png` — 布局参考图

## 重新生成

```bash
pip install python-pptx matplotlib
python3 generate_ppt.py
```

## 布局说明

两个图表已缩小并放在同一水平线上：左侧 GFCI，右侧贸易走势。
