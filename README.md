# Funding Dashboard · 跨所资金费率看板初版

同一个币的永续合约，一家按小时结算，另一家可能每 8 小时结算。直接挑数字最大的一家，很容易把结算频率当成收益差。打开 [统一终端的资金费率页](https://crypto-funding-arbitrage.pages.dev/#/funding)，选一个币，在费率矩阵中横向比较 **8 小时等价费率**，再核对两边的更新时间和来源状态。

**不要从这个仓库启动应用。** 默认分支保留了初版目录，但 `index.html`、`server.js` 和 `js/` 内的业务文件都是零字节占位。资金费率的展示、筛选和本地运行入口已整合到 [crypto-funding-arbitrage](https://github.com/shangchaovo/crypto-funding-arbitrage)。

## 两种比较方式

| 想查什么 | 在后继终端怎样读 |
| --- | --- |
| 有现货报价的币，正资金费率有多高？ | 切到「现货-永续」，默认筛出正费率且同所能匹配现货报价的项目。对照基差、24 小时成交量与每 8 小时估算资金费，再判断观察价值。 |
| 同一币种在哪两家交易所费率差最大？ | 切到「跨所套利」，对照低费率端和高费率端。面板按低费率端做多、高费率端做空来计算费差，两条腿的报价时间都会影响结果。 |

后继实现把不同结算周期折成 8 小时，超过 15 分钟的费率会标记陈旧。数据源包括 Gate、MEXC、Bitget、OKX、Hyperliquid 和 dYdX，实际覆盖随上游响应变化。公开报价与线性年化便于比较，实际资金费、成交价、手续费与滑点会改变盈亏。[费率与陈旧判定源码](https://github.com/shangchaovo/crypto-funding-arbitrage/blob/main/js/arbitrage.js)

## 从这里继续

要在本地运行资金费率页，请在**后继仓**根目录运行 `node server.js`，再打开 `http://localhost:8765/#/funding`。[统一终端运行说明](https://github.com/shangchaovo/crypto-funding-arbitrage#readme)

同一终端还可查看 [Meme 异动](https://crypto-funding-arbitrage.pages.dev/#/meme)、[清算密集区估算](https://crypto-funding-arbitrage.pages.dev/#/liquidation) 和 [期权 Wall](https://crypto-funding-arbitrage.pages.dev/#/options)。期权另有可在本机独立运行的 [crypto-options-analyzer](https://github.com/shangchaovo/crypto-options-analyzer)。
