import { BinarySearchLab } from '../visualizers/binary-search/BinarySearchLab'

export function HomePage() {
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
          Un laboratorio interactivo para aprender algoritmos: escribe tu lógica
          en Python y explora cómo funciona, paso a paso.
        </p>
        <BinarySearchLab />
      </div>
    </main>
  )
}
