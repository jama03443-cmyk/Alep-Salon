import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Gift, History, LogIn, LogOut, Minus, Plus, Scissors, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isSupabaseConfigured, supabase } from '../supabaseClient'

function formatMemberSince(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-CH', { month: 'long', year: 'numeric' }).format(new Date(date))
}

function swissWhatsApp(value) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 9 ? `+41${digits}` : null
}

export default function LoyaltyScreen() {
  const { session, isLoading, refreshAuth } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [whatsappInput, setWhatsappInput] = useState('')
  const [profile, setProfile] = useState(null)
  const [card, setCard] = useState(null)
  const [pointEvents, setPointEvents] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 4600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!session || !supabase) return undefined
    let mounted = true

    const loadLoyaltyData = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, whatsapp')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!mounted) return
      if (profileError || !profileData) {
        setErrorMessage('Votre profil ne peut pas être chargé pour le moment.')
        return
      }
      setProfile(profileData)
      setFirstName(profileData.first_name ?? '')
      setLastName(profileData.last_name ?? '')
      setWhatsappInput((profileData.whatsapp ?? '').replace(/^\+41/, ''))

      const { data, error } = await supabase
        .from('loyalty_cards')
        .select('id, member_code, points, downloaded_at, updated_at')
        .eq('profile_id', session.user.id)
        .maybeSingle()
      if (!mounted) return
      if (error) {
        setErrorMessage('Votre carte de fidélité ne peut pas être chargée pour le moment.')
        return
      }
      setCard(data)
      if (!data) return

      const { data: events, error: eventsError } = await supabase
        .from('loyalty_point_events')
        .select('id, point_delta, created_at')
        .eq('loyalty_card_id', data.id)
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (eventsError) setErrorMessage('Votre carte est disponible, mais son historique ne peut pas être chargé.')
      else setPointEvents(events ?? [])
    }

    void loadLoyaltyData()
    return () => { mounted = false }
  }, [session])

  const handleGoogleLogin = async () => {
    setErrorMessage('')
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('La connexion au programme de fidélité est indisponible.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/fidelite`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) {
        setErrorMessage(error.message)
      }
    } catch {
      setErrorMessage('La connexion est temporairement indisponible. Réessayez dans un instant.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProfileCompletion = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    const whatsapp = swissWhatsApp(whatsappInput)
    if (!firstName.trim() || !lastName.trim() || !whatsapp) {
      setErrorMessage('Complétez votre prénom, votre nom et un WhatsApp suisse valide.')
      return
    }
    setIsSubmitting(true)
    const { data, error } = await supabase.rpc('complete_loyalty_profile', {
      profile_first_name: firstName.trim(),
      profile_last_name: lastName.trim(),
      profile_whatsapp: whatsapp,
    })
    setIsSubmitting(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setProfile(data)
    setToast({ title: 'Carte activée', text: 'Votre QR code personnel est prêt.' })
  }

  const copyCode = async () => {
    if (!card) return
    await navigator.clipboard?.writeText(card.member_code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    await refreshAuth(null)
    setCard(null)
    setPointEvents([])
    setProfile(null)
  }

  if (isLoading) return <LoadingScreen />

  return <main className="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-10">
    {toast && <SuccessToast title={toast.title} text={toast.text} />}
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <Link to="/" className="flex items-center gap-3 transition-colors hover:text-amber-200"><span className="flex h-9 w-9 items-center justify-center border border-zinc-600"><Scissors size={17} /></span><span className="font-display text-sm font-black uppercase tracking-[0.2em]">Alep Salon</span></Link>
        {session && <button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-amber-200"><LogOut size={14} /> Déconnexion</button>}
      </header>
      {session ? <>{profile && (!profile.first_name || !profile.last_name || !profile.whatsapp) ? <ProfileCompletion firstName={firstName} lastName={lastName} whatsappInput={whatsappInput} setFirstName={setFirstName} setLastName={setLastName} setWhatsappInput={setWhatsappInput} onSubmit={handleProfileCompletion} isSubmitting={isSubmitting} errorMessage={errorMessage} /> : <LoyaltyCard card={card} events={pointEvents} copied={copied} onCopy={copyCode} />}</> : <section className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200"><Sparkles size={14} /> Programme fidélité</p><h1 className="mt-5 font-display text-6xl font-bold uppercase leading-[0.86] tracking-tight sm:text-7xl">Chaque visite<br />compte.</h1><p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">Connectez-vous avec Google. Lors de votre première visite, nous vous demanderons uniquement votre prénom, votre nom et votre WhatsApp.</p><div className="mt-8 grid grid-cols-3 gap-3 text-center"><Benefit label="Google sécurisé" /><Benefit label="QR personnel" /><Benefit label="Points cumulés" /></div></div>
        <section className="border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"><div className="space-y-5"><div><p className="font-display text-3xl font-bold uppercase tracking-tight">Votre carte digitale.</p><p className="mt-2 text-sm leading-6 text-zinc-500">Connectez-vous avec Google. Lors de votre première visite uniquement, vous compléterez votre prénom, votre nom et votre WhatsApp.</p></div>{errorMessage && <InlineError>{errorMessage}</InlineError>}<button type="button" onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-3 border border-zinc-600 bg-white px-5 py-4 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 font-black text-blue-600">G</span>{isSubmitting ? 'Redirection vers Google…' : 'Continuer avec Google'}<LogIn size={16} /></button><p className="flex items-center justify-center gap-2 text-center text-[10px] leading-4 text-zinc-600"><ShieldCheck size={13} /> Connexion sécurisée par Google et Supabase.</p></div>
        </section>
      </section>}
    </div>
  </main>
}

function ProfileCompletion({ firstName, lastName, whatsappInput, setFirstName, setLastName, setWhatsappInput, onSubmit, isSubmitting, errorMessage }) { return <section className="mx-auto mt-14 max-w-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200"><UserRound size={14} /> Première connexion</p><h1 className="mt-4 font-display text-4xl font-bold uppercase leading-none tracking-tight">Finalisez votre carte.</h1><p className="mt-3 text-sm leading-6 text-zinc-500">Votre compte Google est connecté. Ces informations permettent à l’équipe Alep de vous identifier et de vous joindre si nécessaire.</p><form className="mt-7 space-y-5" onSubmit={onSubmit}><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Prénom</span><input required value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" className="loyalty-input" placeholder="Votre prénom" /></label><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Nom</span><input required value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" className="loyalty-input" placeholder="Votre nom" /></label><WhatsAppField value={whatsappInput} onChange={setWhatsappInput} />{errorMessage && <InlineError>{errorMessage}</InlineError>}<button type="submit" className="button-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Activation…' : 'Activer ma carte'}</button></form></section> }
function WhatsAppField({ value, onChange }) { return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Numéro WhatsApp suisse</span><span className="flex h-12 border border-zinc-700 bg-zinc-950 focus-within:border-amber-200"><span className="flex items-center border-r border-zinc-700 px-4 font-mono text-sm text-amber-200">+41</span><input inputMode="tel" autoComplete="tel-national" value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9\s]/g, '').slice(0, 12))} required className="min-w-0 flex-1 bg-transparent px-4 text-sm text-zinc-100 outline-none" placeholder="79 123 45 67" /></span><span className="mt-2 block text-[10px] leading-4 text-zinc-600">Exemple : +41 79 123 45 67</span></label> }
function LoyaltyCard({ card, events, copied, onCopy }) { if (!card) return <LoadingScreen />; const qrValue = `ALEP-LOYALTY:${card.member_code}`; return <section className="mx-auto mt-12 max-w-3xl"><p className="text-center text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">Votre carte fidélité</p><h1 className="mt-4 text-center font-display text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl">Bienvenue dans le club.</h1><div className="mt-9 overflow-hidden border border-amber-200/30 bg-[radial-gradient(circle_at_90%_0%,rgba(253,230,138,0.17),transparent_35%),linear-gradient(135deg,#18181b,#09090b)] p-6 sm:p-10"><div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-baseline gap-3"><span className="font-display text-8xl font-bold leading-none text-amber-200">{card.points}</span><span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">points collectés</span></div><p className="mt-5 text-sm text-zinc-400">Présentez ce code QR à votre barbier à chaque visite.</p><p className="mt-2 text-xs text-zinc-600">Membre depuis {formatMemberSince(card.downloaded_at)}</p></div><div className="shrink-0 bg-zinc-50 p-3"><QRCodeSVG value={qrValue} size={168} level="M" includeMargin /></div></div><div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><span className="break-all font-mono text-xs text-zinc-500">{card.member_code}</span><button type="button" onClick={onCopy} className="inline-flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:text-amber-200"><Copy size={14} />{copied ? 'Code copié' : 'Copier le code'}</button></div></div><div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500"><Gift size={15} className="text-amber-200" /> Vos points sont crédités par l’équipe après chaque visite.</div><HistoryList events={events} /></section> }
function HistoryList({ events }) { return <section className="mt-10 border border-zinc-800 bg-zinc-900/35"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6"><h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-tight"><History size={19} className="text-amber-200" /> Historique des points</h2><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{events.length} opération{events.length === 1 ? '' : 's'}</span></div>{events.length === 0 ? <p className="px-5 py-10 text-center text-sm text-zinc-500">Aucun point n’a encore été collecté. Présentez votre QR code lors de votre prochaine visite.</p> : <ul className="divide-y divide-zinc-800">{events.map((event) => <PointEvent key={event.id} event={event} />)}</ul>}</section> }
function PointEvent({ event }) { const isCredit = event.point_delta > 0; const date = new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.created_at)); return <li className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"><span className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-200/10 text-amber-200'}`}>{isCredit ? <Plus size={15} /> : <Minus size={15} />}</span><span><strong className="block text-sm text-zinc-200">{isCredit ? 'Visite validée' : 'Points utilisés'}</strong><span className="mt-0.5 block text-xs text-zinc-500">{date}</span></span></span><strong className={isCredit ? 'text-emerald-400' : 'text-amber-200'}>{isCredit ? '+' : ''}{event.point_delta} point{Math.abs(event.point_delta) === 1 ? '' : 's'}</strong></li> }
function SuccessToast({ title, text }) { return <aside role="status" className="loyalty-toast fixed inset-x-4 top-5 z-[100] mx-auto max-w-md border border-emerald-400/50 bg-zinc-900 px-4 py-4 shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-[25rem]"><div className="flex gap-3"><CheckCircle2 size={21} className="mt-0.5 shrink-0 text-emerald-400" /><div><strong className="block text-sm text-zinc-100">{title}</strong><p className="mt-1 text-xs leading-5 text-zinc-400">{text}</p></div></div></aside> }
function InlineError({ children }) { return <p role="alert" className="border-l-2 border-amber-200 bg-amber-200/5 px-3 py-2 text-xs leading-5 text-amber-100">{children}</p> }
function Benefit({ label }) { return <div className="flex min-h-16 items-center justify-center border border-zinc-800 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p></div> }
function LoadingScreen() { return <main className="flex min-h-[50vh] items-center justify-center bg-zinc-950 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Chargement de votre carte…</main> }
