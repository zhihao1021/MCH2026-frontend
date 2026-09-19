/**
 * 載入指示。Cloud Phone 為遠端渲染，動畫越簡單越省頻寬，
 * 這裡刻意只用三個點的 opacity 變化，不做旋轉。
 */
export function Spinner({ label = '載入中' }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dot" />
      <span className="spinner__dot" />
      <span className="spinner__dot" />
      <span>{label}</span>
    </div>
  )
}
