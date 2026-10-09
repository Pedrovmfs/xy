// Ícones embutidos como SVG (nada carregado de fora). Traço fino, herdam a cor do texto.
import type { ReactNode } from 'react'

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconeHoje = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </Svg>
)

export const IconeSemana = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
)

export const IconePensamentos = () => (
  <Svg>
    <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z" />
  </Svg>
)

export const IconeAreas = () => (
  <Svg>
    <rect x="4" y="4" width="7" height="7" rx="1.8" />
    <rect x="13" y="4" width="7" height="7" rx="1.8" />
    <rect x="4" y="13" width="7" height="7" rx="1.8" />
    <rect x="13" y="13" width="7" height="7" rx="1.8" />
  </Svg>
)

export const IconeAjustes = () => (
  <Svg>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
)

export const IconeVoltar = () => (
  <Svg>
    <path d="m15 5-7 7 7 7" />
  </Svg>
)
