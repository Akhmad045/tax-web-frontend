import { useEffect, useRef } from 'react'

/**
 * useIdleTimer — timer idle manual (tanpa library tambahan).
 *
 * Memasang ulang `setTimeout` setiap kali ada aktivitas user
 * (mousemove, keydown, click, scroll, touchstart). Bila tidak ada
 * aktivitas selama `timeoutMs`, callback `onIdle` dipanggil sekali.
 *
 * Timer hanya berjalan saat `active` true (mis. saat user login).
 * Cleanup effect selalu menghapus timeout & listener, jadi tidak ada
 * timer ganda atau listener bocor (aman juga di StrictMode dev).
 */
const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

export default function useIdleTimer({ timeoutMs, onIdle, active = true }) {
  const timer = useRef(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!active) return undefined

    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        onIdleRef.current()
      }, timeoutMs)
    }

    reset()
    EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
      EVENTS.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [timeoutMs, active])
}
