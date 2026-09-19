/**
 * Cloud Phone 平台的型別補充。
 *
 * 官方另有維護完整版：
 *   npm i -D @cloudmosa-inc/cloudphone-types
 *   https://github.com/cloudmosa/cloudphone-types
 * 裝了官方套件後，這個檔案可以刪掉。
 */

interface Navigator {
  /** 詢問 client 是否支援某項能力，例如 'audio/mpeg'、'hardware.camera'。 */
  hasFeature?: (name: string) => boolean
  /** 系統音量控制（Cloud Phone 專屬）。 */
  volumeManager?: {
    requestUp: () => void
    requestDown: () => void
    requestShow?: () => void
  }
}

interface WindowEventMap {
  /** RSK 觸發。preventDefault() 可攔下預設的 history.back() / window.close()。 */
  back: Event
}

declare namespace React {
  interface HTMLAttributes<T> {
    /** 控制文字輸入是否進入全螢幕 IME。 */
    'x-puffin-entersfullscreen'?: 'true' | 'false'
    /** 讓影片內嵌播放而非全螢幕。 */
    'x-puffin-playsinline'?: 'true' | 'false'
  }
}
