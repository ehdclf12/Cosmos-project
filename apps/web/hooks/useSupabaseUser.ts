'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSupabaseUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        supabase.auth.signInAnonymously().then(({ data }) => {
          setUserId(data.user?.id ?? null)
        })
      }
    })
  }, [])

  return { userId, supabase }
}
