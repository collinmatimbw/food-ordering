import { useEffect, useState } from 'react'
import CustomerPage from './pages/CustomerPage'
import OfficePage from './pages/OfficePage'

type Route = 'order' | 'office'

function currentRoute(): Route {
  return window.location.hash.includes('office') ? 'office' : 'order'
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute())

  useEffect(() => {
    const onHash = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="min-h-screen">
      {route === 'office' ? (
        typeof window !== 'undefined' && window.location.hash.includes('/office')
          ? <OfficePage />
          : <CustomerPage />
      ) : <CustomerPage />}
    </div>
  )
}
