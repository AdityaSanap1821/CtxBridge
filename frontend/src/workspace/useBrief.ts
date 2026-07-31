import { useCallback, useEffect, useState } from 'react'

import { fetchBrief, saveBrief } from '../api/rest'

interface UseBrief {
  brief: string
  loading: boolean
  savedAt: number | null
  save: (text: string) => Promise<void>
}

// Owns the workspace brief. Loads on mount and on window focus (a cheap
// freshness pass, since brief edits aren't broadcast over WS - design spec §3.7).
export function useBrief(): UseBrief {
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(true)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const load = useCallback(() => {
    fetchBrief()
      .then((text) => setBrief(text))
      .catch(() => {
        // keep whatever we had; brief is non-critical to chat
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const save = useCallback(async (text: string) => {
    await saveBrief(text)
    setBrief(text)
    setSavedAt(Date.now())
  }, [])

  return { brief, loading, savedAt, save }
}
