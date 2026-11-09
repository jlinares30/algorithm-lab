import type { AlgorithmInfo } from '../catalog/algorithms'
import { algorithmHref } from '../navigation/useHashRoute'

export function AlgorithmCard({ algorithm }: { algorithm: AlgorithmInfo }) {
  const available = algorithm.status === 'available'

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{algorithm.name}</h3>
        {available ? (
          <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
            Disponible
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-[11px] text-slate-400">
            Próximamente
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{algorithm.summary}</p>
      <dl className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
        <div className="rounded bg-slate-950/70 px-2 py-1 text-slate-300">
          <dt className="inline text-slate-500">Promedio </dt>
          <dd className="inline">{algorithm.complexity.average}</dd>
        </div>
        <div className="rounded bg-slate-950/70 px-2 py-1 text-slate-300">
          <dt className="inline text-slate-500">Espacio </dt>
          <dd className="inline">{algorithm.complexity.space}</dd>
        </div>
        {algorithm.requirement && (
          <div className="rounded bg-amber-400/10 px-2 py-1 text-amber-200">
            <dt className="sr-only">Requisito</dt>
            <dd>{algorithm.requirement}</dd>
          </div>
        )}
      </dl>
      <p className="mt-auto pt-4 text-sm font-medium">
        {available ? (
          <span className="text-emerald-400 group-hover:text-emerald-300">Abrir laboratorio →</span>
        ) : (
          <span className="font-mono text-[11px] font-normal text-slate-500">{algorithm.pythonFile}</span>
        )}
      </p>
    </>
  )

  if (!available) {
    return (
      <article
        aria-label={`${algorithm.name} (próximamente)`}
        className="flex h-full flex-col rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-5 opacity-80"
      >
        {body}
      </article>
    )
  }

  return (
    <a
      href={algorithmHref(algorithm.id)}
      aria-label={`Abrir ${algorithm.name}`}
      className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-emerald-400/60 hover:bg-slate-900/80"
    >
      {body}
    </a>
  )
}
