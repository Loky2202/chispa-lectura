import { cn } from '../lib/utils'

export type Mood = 'idle' | 'happy' | 'cheer' | 'sad' | 'thinking'

interface PikachuProps {
  mood?: Mood
  size?: number
  className?: string
  bounce?: boolean
}

export function Pikachu({ mood = 'idle', size = 180, className, bounce = false }: PikachuProps) {
  const happyEyes = mood === 'happy' || mood === 'cheer'

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={cn(bounce && 'animate-float', className)}
      role="img"
      aria-label="Chispa, un ratoncito eléctrico amarillo"
    >
      <g>
        <path
          d="M150 150 L198 116 L178 112 L202 82 L180 86 L194 56 L152 96 L166 99 L146 124 Z"
          fill="#FFD93D"
          stroke="#E0A800"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>

      <ellipse cx="86" cy="200" rx="17" ry="9" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />
      <ellipse cx="130" cy="200" rx="17" ry="9" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />
      <ellipse cx="108" cy="166" rx="52" ry="42" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />

      <ellipse
        cx="60"
        cy="160"
        rx="13"
        ry="20"
        fill="#FFD93D"
        stroke="#E0A800"
        strokeWidth="4"
        transform="rotate(20 60 160)"
      />
      <ellipse
        cx="156"
        cy="160"
        rx="13"
        ry="20"
        fill="#FFD93D"
        stroke="#E0A800"
        strokeWidth="4"
        transform="rotate(-20 156 160)"
      />

      <g transform="rotate(-22 66 62)">
        <ellipse cx="66" cy="32" rx="13" ry="38" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />
        <path d="M53 12 Q66 -8 79 12 L79 24 Q66 8 53 24 Z" fill="#2D3142" />
      </g>
      <g transform="rotate(22 150 62)">
        <ellipse cx="150" cy="32" rx="13" ry="38" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />
        <path d="M137 12 Q150 -8 163 12 L163 24 Q150 8 137 24 Z" fill="#2D3142" />
      </g>

      <ellipse cx="108" cy="100" rx="60" ry="52" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />

      <circle cx="64" cy="116" r="12" fill="#FF6B6B" opacity="0.85" />
      <circle cx="152" cy="116" r="12" fill="#FF6B6B" opacity="0.85" />

      {happyEyes ? (
        <>
          <path
            d="M77 96 Q86 85 95 96"
            stroke="#2D3142"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M121 96 Q130 85 139 96"
            stroke="#2D3142"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : mood === 'thinking' ? (
        <>
          <circle cx="88" cy="90" r="7.5" fill="#2D3142" />
          <circle cx="132" cy="90" r="7.5" fill="#2D3142" />
          <circle cx="90.5" cy="87.5" r="2.6" fill="#fff" />
          <circle cx="134.5" cy="87.5" r="2.6" fill="#fff" />
        </>
      ) : (
        <>
          <circle cx="86" cy="94" r="7.5" fill="#2D3142" />
          <circle cx="130" cy="94" r="7.5" fill="#2D3142" />
          <circle cx="88.5" cy="91.5" r="2.6" fill="#fff" />
          <circle cx="132.5" cy="91.5" r="2.6" fill="#fff" />
        </>
      )}

      <path d="M104 104 Q108 100 112 104 Q108 107 104 104" fill="#2D3142" />

      {mood === 'cheer' ? (
        <path d="M92 112 Q108 138 124 112 Q108 122 92 112 Z" fill="#7C2D12" />
      ) : mood === 'sad' ? (
        <path
          d="M94 124 Q108 113 122 124"
          stroke="#2D3142"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M94 112 Q108 126 122 112"
          stroke="#2D3142"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {mood === 'cheer' && (
        <>
          <path d="M28 86 L34 74 L40 86 L34 82 Z" fill="#FFD93D" stroke="#E0A800" strokeWidth="2" />
          <path d="M180 60 L186 48 L192 60 L186 56 Z" fill="#FFD93D" stroke="#E0A800" strokeWidth="2" />
        </>
      )}
    </svg>
  )
}
