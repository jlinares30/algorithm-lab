import { useEffect } from 'react'
import { getAlgorithm } from './catalog/algorithms'
import { useHashRoute } from './navigation/useHashRoute'
import { AlgorithmPage } from './pages/AlgorithmPage'
import { BugHuntPage } from './pages/BugHuntPage'
import { ComparePage } from './pages/ComparePage'
import { HomePage } from './pages/HomePage'

export default function App() {
  const route = useHashRoute()
  const routeKey = route.page === 'algorithm' ? route.id : route.page

  useEffect(() => {
    const name = route.page === 'compare'
      ? 'Comparar complejidad'
      : route.page === 'bughunt' ? 'Encuentra el error' : getAlgorithm(routeKey)?.name
    document.title = name ? `${name} · Algorithm Lab` : 'Algorithm Lab'
    // Each page starts at the top, like a regular navigation.
    document.documentElement.scrollTop = 0
  }, [routeKey, route.page])

  if (route.page === 'algorithm') return <AlgorithmPage key={route.id} id={route.id} />
  if (route.page === 'bughunt') return <BugHuntPage />
  return route.page === 'compare' ? <ComparePage /> : <HomePage />
}
