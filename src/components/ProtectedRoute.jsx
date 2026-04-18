import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Laptop } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Laptop className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
