import { cn } from '../lib/utils'

export type Mood = 'idle' | 'happy' | 'cheer' | 'sad' | 'thinking'

interface ChispaProps {
  mood?: Mood
  size?: number
  className?: string
  bounce?: boolean
}

/** Chispa: mascota original de la app, una chispita redonda con copete de fuego. */
export function Chispa({ mood = 'idle', size = 180, className, bounce = false }: ChispaProps) {
  const happyEyes = mood === 'happy' || mood === 'cheer'
  const armsUp = mood === 'cheer'

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={cn(bounce && 'animate-float', className)}
      role="img"
      aria-label="Chispa, una chispita amarilla"
    >
      <circle cx="110" cy="124" r="92" fill="#FFF3BF" opacity="0.55" />

      {/* copete de fuego */}
      <path
        d="M110 14 C120 36 138 42 136 64 C148 56 154 44 150 32 C172 50 172 80 150 96 L70 96 C48 80 50 50 74 34 C70 46 76 58 88 64 C84 44 100 36 110 14 Z"
        fill="#FF9F1C"
        stroke="#E07B00"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M110 44 C116 58 126 62 124 76 C132 72 134 64 134 58 C144 70 142 86 130 94 L90 94 C80 84 82 68 94 60 C94 70 98 74 104 76 C102 62 106 54 110 44 Z" fill="#FFD93D" />

      {/* pies */}
      <ellipse cx="86" cy="194" rx="17" ry="9" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />
      <ellipse cx="134" cy="194" rx="17" ry="9" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />

      {/* brazos */}
      <ellipse
        cx={armsUp ? 40 : 44}
        cy={armsUp ? 104 : 140}
        rx="11"
        ry="19"
        fill="#FFD93D"
        stroke="#E0A800"
        strokeWidth="4"
        transform={armsUp ? 'rotate(-40 40 104)' : 'rotate(24 44 140)'}
      />
      <ellipse
        cx={armsUp ? 180 : 176}
        cy={armsUp ? 104 : 140}
        rx="11"
        ry="19"
        fill="#FFD93D"
        stroke="#E0A800"
        strokeWidth="4"
        transform={armsUp ? 'rotate(40 180 104)' : 'rotate(-24 176 140)'}
      />

      {/* cuerpo */}
      <ellipse cx="110" cy="132" rx="66" ry="62" fill="#FFD93D" stroke="#E0A800" strokeWidth="4" />
      <ellipse cx="110" cy="154" rx="38" ry="28" fill="#FFF3BF" opacity="0.8" />

      {happyEyes ? (
        <>
          <path d="M80 120 Q90 108 100 120" stroke="#2D3142" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M120 120 Q130 108 140 120" stroke="#2D3142" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="90" cy={mood === 'thinking' ? 114 : 118} r="9" fill="#2D3142" />
          <circle cx="130" cy={mood === 'thinking' ? 114 : 118} r="9" fill="#2D3142" />
          <circle cx="93" cy={mood === 'thinking' ? 111 : 115} r="3" fill="#fff" />
          <circle cx="133" cy={mood === 'thinking' ? 111 : 115} r="3" fill="#fff" />
        </>
      )}

      {mood === 'cheer' ? (
        <path d="M94 136 Q110 162 126 136 Q110 144 94 136 Z" fill="#7C2D12" />
      ) : mood === 'sad' ? (
        <path d="M96 148 Q110 137 124 148" stroke="#2D3142" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M96 138 Q110 152 124 138" stroke="#2D3142" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}

      {mood === 'cheer' && (
        <>
          <path d="M22 60 L26 48 L30 60 L42 64 L30 68 L26 80 L22 68 L10 64 Z" fill="#FF9F1C" />
          <path d="M192 44 L195 35 L198 44 L207 47 L198 50 L195 59 L192 50 L183 47 Z" fill="#FF9F1C" />
        </>
      )}
    </svg>
  )
}
