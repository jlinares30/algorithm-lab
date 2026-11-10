import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { categories, getAlgorithm } from '../catalog/algorithms'
import type { AlgorithmInfo } from '../catalog/algorithms'
import { labs } from '../catalog/labs'
import { homeHref } from '../navigation/useHashRoute'

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <a
            href={homeHref}
            className="text-sm text-slate-400 hover:text-slate-100"
          >
            ← Todos los algoritmos
          </a>
          <h1 className="text-sm font-semibold tracking-tight text-emerald-400">Algorithm Lab</h1>
        </header>
        {children}
      </div>
    </main>
  )
}

function ComplexityStrip({ algorithm }: { algorithm: AlgorithmInfo }) {
  const category = categories.find((item) => item.id === algorithm.category)
  const rows: [string, string][] = [
    ['Mejor caso', algorithm.complexity.best],
    ['Promedio', algorithm.complexity.average],
    ['Peor caso', algorithm.complexity.worst],
    ['Espacio', algorithm.complexity.space],
  ]
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      {category && <span>{category.label}</span>}
      {algorithm.requirement && <span className="text-amber-200/80">{algorithm.requirement}</span>}
      <dl aria-label="Complejidad" className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="inline">{label} </dt>
            <dd className="inline text-slate-300">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function AlgorithmPage({ id }: { id: string }) {
  const algorithm = getAlgorithm(id)

  if (!algorithm) {
    return (
      <Shell>
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-semibold">Algoritmo no encontrado</h2>
          <p className="mt-3 text-slate-400">
            No existe un laboratorio con el identificador <code className="font-mono">{id}</code>.
          </p>
          <a href={homeHref} className="control control-primary mt-6 inline-block">
            Ver el catálogo
          </a>
        </section>
      </Shell>
    )
  }

  const Lab = algorithm.status === 'available' ? labs[algorithm.id] : undefined

  return (
    <Shell>
      <ComplexityStrip algorithm={algorithm} />
      {Lab ? (
        <Suspense
          fallback={
            <p role="status" className="mt-12 text-sm text-slate-400">
              Cargando laboratorio…
            </p>
          }
        >
          <Lab />
        </Suspense>
      ) : (
        <section
          aria-labelledby="planned-title"
          className="mt-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8"
        >
          <h2 id="planned-title" className="text-2xl font-semibold">{algorithm.name}</h2>
          <p className="mt-3 max-w-2xl text-slate-300">{algorithm.summary}</p>
          <p className="mt-6 text-sm text-slate-400">
            Este laboratorio está en preparación. Su implementación en Python irá en{' '}
            <code className="font-mono text-slate-200">{algorithm.pythonFile}</code>.
          </p>
        </section>
      )}
    </Shell>
  )
}
