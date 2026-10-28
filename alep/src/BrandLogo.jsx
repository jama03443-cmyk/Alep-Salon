import { Scissors } from 'lucide-react'

export default function BrandLogo({ style = 'classic', className = '' }) {
  if (style === 'wordmark') {
    return <span className={`flex flex-col items-center font-display leading-none ${className}`} aria-label="Alep Salon">
      <span className="text-2xl font-black tracking-[0.16em] text-white">ALEP</span>
      <span className="mt-1 border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.3em]" style={{ borderColor: 'var(--site-button-color, #d9ad3b)', color: 'var(--site-button-color, #d9ad3b)' }}>SALON</span>
    </span>
  }

  if (style === 'monogram') {
    return <span className={`flex items-center gap-2.5 ${className}`} aria-label="Alep Salon">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: 'var(--site-button-color, #d9ad3b)', color: 'var(--site-button-color, #d9ad3b)' }}><Scissors size={18} strokeWidth={1.8} /></span>
      <span className="flex flex-col font-display text-sm font-black uppercase leading-[0.9] tracking-[0.15em] text-white">Alep<span className="mt-1 text-[9px] font-semibold tracking-[0.26em]" style={{ color: 'var(--site-button-color, #d9ad3b)' }}>Salon</span></span>
    </span>
  }

  return <img src="/alep-salon-logo.png" alt="Alep Salon" className={`h-14 w-auto max-w-[190px] object-contain ${className}`} />
}
