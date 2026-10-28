import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-booking-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })

  const configuredSecret = Deno.env.get('BOOKING_PUSH_SECRET')
  if (!configuredSecret || request.headers.get('x-booking-push-secret') !== configuredSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
    console.error('Push function configuration is incomplete.')
    return Response.json({ error: 'Push service is not configured' }, { status: 500, headers: corsHeaders })
  }

  try {
    const payload = await request.json()
    if (payload?.type !== 'INSERT' || payload?.schema !== 'public' || payload?.table !== 'reservations' || !payload?.record?.id) {
      return Response.json({ error: 'Unexpected webhook payload' }, { status: 400, headers: corsHeaders })
    }

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@alepsalon.ch',
      vapidPublicKey,
      vapidPrivateKey,
    )

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: subscriptions, error } = await adminClient
      .from('admin_push_subscriptions')
      .select('endpoint, subscription')
    if (error) throw error
    if (!subscriptions?.length) return Response.json({ sent: 0 }, { headers: corsHeaders })

    const reservation = payload.record
    const time = String(reservation.appointment_time || '').slice(0, 5)
    const body = [reservation.client_name, reservation.service_name, `${reservation.appointment_date || ''} ${time}`.trim()]
      .filter(Boolean)
      .join(' · ')
    const notification = JSON.stringify({
      title: 'Nouvelle réservation · Alep Salon',
      body,
      url: '/admin-portal',
      tag: `reservation-${reservation.id}`,
    })

    const results = await Promise.allSettled(subscriptions.map(async ({ endpoint, subscription }) => {
      try {
        await webpush.sendNotification(subscription, notification, { TTL: 60 * 60 * 24 })
      } catch (pushError) {
        if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
          await adminClient.from('admin_push_subscriptions').delete().eq('endpoint', endpoint)
          return
        }
        throw pushError
      }
    }))

    const failed = results.filter((result) => result.status === 'rejected')
    if (failed.length) console.error(`${failed.length} admin push notification(s) failed.`)
    return Response.json({ sent: results.length - failed.length, failed: failed.length }, { headers: corsHeaders })
  } catch (error) {
    console.error('Could not send admin booking push:', error)
    return Response.json({ error: 'Notification delivery failed' }, { status: 500, headers: corsHeaders })
  }
})
