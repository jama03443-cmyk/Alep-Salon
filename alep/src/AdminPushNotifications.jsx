import { useEffect, useState } from 'react'
import { Bell, BellOff, LoaderCircle } from 'lucide-react'
import { supabase } from './supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY

function decodeApplicationServerKey(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0))
}

export default function AdminPushNotifications({ language, userId }) {
  const isGerman = language === 'DE'
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  useEffect(() => {
    if (!supported || !supabase || !userId) return undefined

    let mounted = true
    void navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription()
        if (!subscription) return false
        const { data, error } = await supabase
          .from('admin_push_subscriptions')
          .select('endpoint')
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle()
        return !error && Boolean(data)
      })
      .then((enabled) => { if (mounted) setIsEnabled(enabled) })
      .catch(() => { if (mounted) setIsEnabled(false) })

    return () => { mounted = false }
  }, [supported, userId])

  const enableNotifications = async () => {
    setMessage('')
    if (!supported) {
      setMessage(isGerman ? 'Dieser Browser unterstützt keine Push-Benachrichtigungen.' : 'Ce navigateur ne prend pas en charge les notifications Push.')
      return
    }
    if (!VAPID_PUBLIC_KEY) {
      setMessage(isGerman ? 'Der Push-Schlüssel ist noch nicht in Vercel eingerichtet.' : 'La clé Push publique n’est pas encore configurée dans Vercel.')
      return
    }
    if (!supabase || !userId) {
      setMessage(isGerman ? 'Melde dich erneut im Admin-Bereich an.' : 'Reconnectez-vous à l’espace Admin.')
      return
    }

    setIsSaving(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage(isGerman ? 'Erlaube Benachrichtigungen in den Browser-Einstellungen.' : 'Autorisez les notifications dans les réglages du navigateur.')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(VAPID_PUBLIC_KEY),
        })
      const json = subscription.toJSON()
      const { error } = await supabase.from('admin_push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        subscription: json,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      if (error) throw error

      setIsEnabled(true)
      setMessage(isGerman ? 'Benachrichtigungen sind auf diesem Telefon aktiviert.' : 'Les notifications sont activées sur ce téléphone.')
    } catch (error) {
      console.error('Admin push subscription failed:', error)
      setMessage(isGerman
        ? 'Aktivierung fehlgeschlagen. Prüfe, ob die Supabase-Push-Migration ausgeführt wurde.'
        : 'Activation impossible. Vérifiez que la migration Push a été exécutée dans Supabase.')
    } finally {
      setIsSaving(false)
    }
  }

  const disableNotifications = async () => {
    setMessage('')
    if (!supabase || !userId) return
    setIsSaving(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await supabase.from('admin_push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      }
      setIsEnabled(false)
      setMessage(isGerman ? 'Benachrichtigungen sind auf diesem Telefon deaktiviert.' : 'Les notifications sont désactivées sur ce téléphone.')
    } catch {
      setMessage(isGerman ? 'Die Benachrichtigungen konnten nicht deaktiviert werden.' : 'Impossible de désactiver les notifications.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-amber-200"><Bell size={19} /></span>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{isGerman ? 'Neue Buchungen als Push-Nachricht' : 'Recevoir les nouvelles réservations sur ce téléphone'}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">{isGerman ? 'Du wirst benachrichtigt, auch wenn die Admin-App geschlossen ist.' : 'Le téléphone sera averti même si l’application Admin est fermée.'}</p>
          {message && <p role="status" className="mt-2 text-xs leading-5 text-amber-100">{message}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void (isEnabled ? disableNotifications() : enableNotifications())}
        disabled={isSaving}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-amber-200/50 px-4 text-[10px] font-bold uppercase tracking-wider text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-wait disabled:opacity-60"
      >
        {isSaving ? <LoaderCircle size={15} className="animate-spin" /> : isEnabled ? <BellOff size={15} /> : <Bell size={15} />}
        {isSaving ? (isGerman ? 'Wird gespeichert…' : 'Enregistrement…') : isEnabled ? (isGerman ? 'Deaktivieren' : 'Désactiver') : (isGerman ? 'Aktivieren' : 'Activer les notifications')}
      </button>
    </div>
  )
}
