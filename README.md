# funding-dashboard

跨所资金费率套利看板的初版。当时只想解决一件事：各家交易所的永续 funding rate 口径不一样、刷新时间也不一样，想横着比得自己拉表。这个仓库就是那张表。

后来功能都并进了统一的加密终端，这个目录里的 `index.html` / `server.js` 已经清空，**克隆下来跑不起来**。要看现在还在维护的版本：

**线上：[crypto-funding-arbitrage.pages.dev/#/funding](https://crypto-funding-arbitrage.pages.dev/#/funding)**  
源码：[shangchaovo/crypto-funding-arbitrage](https://github.com/shangchaovo/crypto-funding-arbitrage)

## 当时在做什么

把多家交易所的永续资金费率拉到同一屏，方便找两类机会：

1. **现货 + 空永续**：现货能买到、永续费率又够高，做多现货、做空永续，靠资金费吃饭（价格涨跌尽量对冲掉）。
2. **跨所费率差**：同一个币，一边费率低就做多、一边费率高就做空，吃中间那截。

初版还没有 8 小时折算、过期标记、现货可买筛选这些。这些是后来在终端里补上的。终端现在大约覆盖 Gate / MEXC / Bitget / OKX / Hyperliquid / dYdX 全量合约（三千个上下）；Binance / Bybit 在部分地区会 451/403，默认跳过。

## 现在终端里还有什么

资金费率只是其中一块。同一页还可以切到：

| 板块 | 地址 |
| --- | --- |
| 资金费率套利 | https://crypto-funding-arbitrage.pages.dev/#/funding |
| Meme 异动 | https://crypto-funding-arbitrage.pages.dev/#/meme |
| 主力清算热图 | https://crypto-funding-arbitrage.pages.dev/#/liquidation |
| 期权 Wall | https://crypto-funding-arbitrage.pages.dev/#/options |

期权那块最早也是单独一个仓库：[crypto-options-analyzer](https://github.com/shangchaovo/crypto-options-analyzer)。

数据都来自公开接口，看看盘用，别当交易建议。
