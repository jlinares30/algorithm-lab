import { algorithms, algorithmsIn, categories } from '../catalog/algorithms'
import { AlgorithmCard } from '../components/AlgorithmCard'
import { compareHref } from '../navigation/useHashRoute'

export function HomePage() {
  const availableCount = algorithms.filter((algorithm) => algorithm.status === 'available').length
  const plannedCount = algorithms.length - availableCount

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 font-mono text-sm tracking-widest text-emerald-400">
          APRENDER · EXPERIMENTAR · VISUALIZAR
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          Algorithm Lab
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          Laboratorio interactivo para explorar algoritmos: ejecuta lógica real en Python
          directamente en tu navegador y visualiza cada decisión paso a paso en 2D y 3D.
        </p>
        <p className="mt-4 font-mono text-xs text-slate-400">
          {availableCount} {availableCount === 1 ? 'disponible' : 'disponibles'} · {plannedCount} en preparación
        </p>
        <p className="mt-6">
          <a href={compareHref} className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
            Comparar complejidad →
          </a>
        </p>

        {categories.map((category) => {
          const items = algorithmsIn(category.id)
          if (items.length === 0) return null
          return (
            <section
              key={category.id}
              aria-labelledby={`category-${category.id}`}
              className="mt-14"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
                <h2 id={`category-${category.id}`} className="text-2xl font-semibold">
                  {category.label}
                </h2>
                <p className="text-sm text-slate-400">{category.description}</p>
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((algorithm) => (
                  <li key={algorithm.id}>
                    <AlgorithmCard algorithm={algorithm} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}
