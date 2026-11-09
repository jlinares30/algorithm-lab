import { useEffect } from 'react'
import { getAlgorithm } from './catalog/algorithms'
import { useHashRoute } from './navigation/useHashRoute'
import { AlgorithmPage } from './pages/AlgorithmPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  const route = useHashRoute()
  const routeKey = route.page === 'algorithm' ? route.id : 'home'

  useEffect(() => {
    const name = routeKey === 'home' ? undefined : getAlgorithm(routeKey)?.name
    document.title = name ? `${name} · Algorithm Lab` : 'Algorithm Lab'
    // Each page starts at the top, like a regular navigation.
    document.documentElement.scrollTop = 0
  }, [routeKey])

  return route.page === 'algorithm' ? <AlgorithmPage key={route.id} id={route.id} /> : <HomePage />
}
