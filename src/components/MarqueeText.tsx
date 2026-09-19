import { useEffect, useRef, useState, type CSSProperties } from 'react'

type Props = {
  text: string
  className?: string
}

const PX_PER_SECOND = 40
const MIN_DURATION_S = 4

/**
 * 取代原本的省略號截斷：文字放不下容器時改用跑馬燈來回捲動，
 * 放得下時完全靜止、不套用任何動畫（量測後才決定，不是每一列都在跑）。
 */
export function MarqueeText({ text, className }: Props) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (container === null || textEl === null) return

    const measure = () => {
      const overflow = textEl.scrollWidth - container.clientWidth
      setDistance(overflow > 1 ? overflow : 0)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [text])

  const isScrolling = distance > 0
  const style = isScrolling
    ? ({
        '--marquee-distance': `-${distance}px`,
        animationDuration: `${Math.max(MIN_DURATION_S, (distance / PX_PER_SECOND) * 2 + 3)}s`,
      } as CSSProperties)
    : undefined

  return (
    <span ref={containerRef} className={className !== undefined ? `marquee ${className}` : 'marquee'}>
      <span
        ref={textRef}
        className={isScrolling ? 'marquee__text is-scrolling' : 'marquee__text'}
        style={style}
      >
        {text}
      </span>
    </span>
  )
}
