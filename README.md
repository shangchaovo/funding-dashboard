# funding-dashboard · 资金费率套利看板（原型）

跨交易所加密货币**资金费率套利**看板的早期版本：把各所永续合约的 funding rate 拉到同一屏，方便找「一边高费率、一边低费率」或「现货 + 空永续收资金费」的机会。

> **这个仓库是原型。** 功能已并入统一加密终端，请使用线上站点，而不是克隆本仓库当产品用。

**线上（后继）：[crypto-funding-arbitrage.pages.dev/#/funding](https://crypto-funding-arbitrage.pages.dev/#/funding)**  
完整终端源码：[shangchaovo/crypto-funding-arbitrage](https://github.com/shangchaovo/crypto-funding-arbitrage)

Cross-exchange **crypto funding-rate arbitrage** dashboard prototype. The live product now lives in the unified terminal (spot–perp carry, cross-exchange spreads, 8h-normalized rates).

## 核心用处

- 把多家交易所的永续资金费率放到一张表里比较
- 为后来的「现货-永续套利 / 跨所套利 / 8h 等价折算 / 陈旧数据标记」打样

本仓库根目录的 `index.html` / `server.js` 已清空，**不能直接跑出产品界面**。要看正在维护的实现，请打开后继仓库。

## 后继产品里有什么

统一终端在资金费率之外，还包含：

| 板块 | 地址 |
| --- | --- |
| 资金费率套利 | https://crypto-funding-arbitrage.pages.dev/#/funding |
| Meme 异动 | https://crypto-funding-arbitrage.pages.dev/#/meme |
| 主力清算热图 | https://crypto-funding-arbitrage.pages.dev/#/liquidation |
| 期权 Wall | https://crypto-funding-arbitrage.pages.dev/#/options |

## 相关仓库

- [crypto-funding-arbitrage](https://github.com/shangchaovo/crypto-funding-arbitrage) — 当前维护的终端
- [crypto-options-analyzer](https://github.com/shangchaovo/crypto-options-analyzer) — 期权分析原型，同样已并入终端

## 免责声明

仅供学习与研究，不构成投资建议。
