import { Link } from 'react-router-dom'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
}

/** StudioShip wordmark with inline SVG rocket glyph */
export function Logo({ size = 'md', linkTo = '/' }: LogoProps) {
  const sizes = {
    sm: { text: 'text-base', icon: 16 },
    md: { text: 'text-xl', icon: 20 },
    lg: { text: 'text-3xl', icon: 28 },
  }
  const s = sizes[size]

  const mark = (
    <span className="flex items-center gap-1.5 select-none" aria-label="StudioShip home">
      {/* Rocket / arrow-up glyph — pure SVG, no external images */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* rocket body */}
        <path
          d="M10 2C10 2 14 4 14 9C14 12 12.5 13.5 12 14H8C7.5 13.5 6 12 6 9C6 4 10 2 10 2Z"
          fill="var(--accent)"
        />
        {/* nose cone */}
        <path d="M10 2L12 6H8L10 2Z" fill="var(--accent)" opacity="0.7" />
        {/* left fin */}
        <path d="M6 11L4 14L7 13L6 11Z" fill="var(--accent)" opacity="0.6" />
        {/* right fin */}
        <path d="M14 11L16 14L13 13L14 11Z" fill="var(--accent)" opacity="0.6" />
        {/* exhaust */}
        <path d="M9 14L8.5 17L10 15.5L11.5 17L11 14H9Z" fill="var(--warning)" opacity="0.8" />
      </svg>
      <span
        className={`${s.text} font-bold tracking-tight display`}
        style={{ color: 'var(--text)' }}
      >
        Studio<span style={{ color: 'var(--accent)' }}>Ship</span>
      </span>
    </span>
  )

  if (!linkTo) return mark

  return (
    <Link to={linkTo} className="no-underline focus-visible:ring-2 rounded-sm">
      {mark}
    </Link>
  )
}
