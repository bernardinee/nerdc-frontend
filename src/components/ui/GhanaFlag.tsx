interface GhanaFlagProps {
  className?: string
  width?: number
  height?: number
}

export function GhanaFlag({ className, width = 30, height = 20 }: GhanaFlagProps) {
  const sw = width
  const sh = height
  const stripeH = sh / 3
  // Five-pointed star coordinates centered in middle stripe
  const cx = sw / 2
  const cy = sh / 2
  const r = stripeH * 0.55
  const starPoints = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const ir = r * 0.4
    const ox = cx + r * Math.cos(angle)
    const oy = cy + r * Math.sin(angle)
    const ix = cx + ir * Math.cos(angle + (2 * Math.PI) / 10)
    const iy = cy + ir * Math.sin(angle + (2 * Math.PI) / 10)
    return `${ox},${oy} ${ix},${iy}`
  }).join(' ')

  return (
    <svg
      width={sw}
      height={sh}
      viewBox={`0 0 ${sw} ${sh}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 2, display: 'inline-block', flexShrink: 0 }}
    >
      {/* Red stripe */}
      <rect x="0" y="0" width={sw} height={stripeH} fill="#CF0921" />
      {/* Gold stripe */}
      <rect x="0" y={stripeH} width={sw} height={stripeH} fill="#FCD116" />
      {/* Green stripe */}
      <rect x="0" y={stripeH * 2} width={sw} height={stripeH} fill="#006B3F" />
      {/* Black star */}
      <polygon points={starPoints} fill="#000000" />
    </svg>
  )
}
