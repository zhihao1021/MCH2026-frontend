# MCH2026 — Cloud Phone Widget 前端

給 CloudMosa **Cloud Phone**（Puffin 遠端瀏覽器的功能機平台）用的 Web App 骨架。
React 19 + TypeScript + Vite + React Router + SCSS，目前只有介面層，沒有任何後端串接。

## 平台前提

| 項目 | 內容 |
| --- | --- |
| 解析度 | QVGA 240×320、QQVGA 128×160（另有 HVGA 360×480 觸控機） |
| 輸入 | 方向鍵、Enter、數字 0-9、`*`、`#` 以標準 KeyboardEvent 送達 |
| 左軟鍵 LSK | 對應 `Escape`，慣例放「選項 / 選單」 |
| 右軟鍵 RSK | **不送鍵盤事件**，預設等同 `history.back()`；沒有歷史時關閉 widget。要覆寫需攔截 window 的 `back` 事件 |
| 渲染 | 伺服器端 Chromium 渲染後以向量指令串流到手機，**無法離線運作** |
| 部署 | 自行以 HTTPS 託管，在開發者後台登記名稱、PNG 圖示與網址（不是打包成 zip） |

參考：[Cloud Phone 開發指南](https://www.cloudphone.tech/dev-guidelines)、
[Design Guide](https://developer.cloudfone.com/docs/guides/cloud-phone-design/)、
[架構說明](https://developer.cloudfone.com/docs/guides/architecture/)。

## 目錄結構

```
src/
├─ App.tsx              Provider 組裝（順序有意義，見檔內註解）
├─ routes.tsx           路由表（createHashRouter）
├─ hooks/
│  ├─ useKeypad.tsx     全域按鍵派送（LIFO 堆疊）+ RSK back 事件攔截
│  ├─ useSoftKeys.tsx   軟鍵堆疊，最上層畫面決定軟鍵列內容
│  └─ useListNav.ts     D-pad 垂直清單導覽（焦點、捲動、數字鍵跳號）
├─ components/
│  ├─ Page.tsx          Header / 可捲動內容 / 軟鍵列 的頁面外框
│  ├─ SoftKeyBar.tsx    底部三顆軟鍵提示
│  ├─ ListView.tsx      清單
│  ├─ OptionsMenu.tsx   LSK 叫出的選項選單（useOptionsMenu）
│  ├─ Toast.tsx         短訊息提示（取代 alert）
│  └─ Spinner.tsx       載入指示
├─ lib/
│  ├─ keys.ts           鍵名 → CloudKey 對應
│  ├─ device.ts         螢幕級距、navigator.hasFeature 偵測
│  └─ storage.ts        localStorage 薄封裝（失敗一律吞掉）
├─ styles/              SCSS partials，入口是 main.scss
│  ├─ _mixins.scss      qqvga / truncate / fixed-row
│  ├─ _tokens.scss      設計 token；QQVGA 以 media query 覆寫
│  ├─ _base.scss        reset 與基礎樣式
│  ├─ _layout.scss      App Shell 三段式版型
│  ├─ _list.scss / _menu.scss / _feedback.scss / _prose.scss
│  └─ main.scss         只有 App.tsx 會 import 這一支
└─ types/cloudphone.d.ts  平台型別補充
```

## 按鍵模型

所有按鍵都經過 `KeypadProvider` 統一派送，**後掛載的先拿到**（LIFO），
handler 回傳 `true` 代表已消化、停止往下傳。因此彈出選單不需要知道底下有誰：

```
彈出選單   ← 最後掛載，最先收到
清單導覽
軟鍵（LSK / Enter）  ← 最早註冊，最後才收到
```

軟鍵同理採堆疊，關閉彈窗後自動還原頁面原本的標籤。

## 新增一頁

```tsx
// src/pages/FooPage.tsx
export function FooPage() {
  const menu = useOptionsMenu('選項', [
    { id: 'x', label: '做某事', onSelect: doSomething },
  ])

  return (
    <Page
      title="Foo"
      softKeys={{
        left: { label: '選項', onPress: menu.open },
        center: { label: '確認' },
        right: { label: '返回' }, // 不給 onPress = 走系統預設的返回
      }}
    >
      …
      {menu.element}
    </Page>
  )
}
```

再到 `src/routes.tsx` 的 `createHashRouter` 陣列加一筆
`{ path: '/foo', element: <FooPage /> }`。頁面內用 React Router 的
`useNavigate` / `useParams` 就好，不需要額外包裝。

## 開發

```bash
npm install
npm run dev        # 已開 host:true，可用手機或模擬器連內網 IP
npm run build      # tsc -b && vite build
npm run lint
```

桌機測試時把視窗調成 240×320（Chrome DevTools 的 device emulation），
用 `Esc` 代替 LSK。RSK 沒有對應按鍵，可在 console 送
`window.dispatchEvent(new Event('back', { cancelable: true }))` 模擬。

## 幾個刻意的決定

- **hash router（`createHashRouter`）而非 browser router**：Cloud Phone widget
  只從後台登記的那一個網址進入，不需要 deep link；純靜態託管即可，不必設定 SPA rewrite。
  且 hash 一樣進歷史，RSK 的預設返回不必寫任何程式碼。
- **軟鍵用兩個 context**：Provider 的 `children` 是外層傳進來的同一份 element，
  只靠 Provider 自身 re-render 會被 React 跳過整個子樹，軟鍵列會永遠是空的。
- **不做旋轉動畫**：遠端渲染下每一幀都是網路往返（4G 下約 20 FPS 上限），
  動畫越簡單越省頻寬。
- **字級用 pt**：沿用官方 Design Guide 的單位，方便對照文件調整。
- **SCSS 只負責拆檔、巢狀與 mixin，顏色尺寸仍是 CSS custom properties**：
  螢幕級距與深色模式要在 runtime 由 media query 覆寫，SCSS 變數做不到。

若要換成官方維護的完整型別，安裝 `@cloudmosa-inc/cloudphone-types`
並刪掉 `src/types/cloudphone.d.ts`。
