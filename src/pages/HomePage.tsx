export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:py-24">
      <div className="mx-auto max-w-3xl">
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
        <section aria-labelledby="lab-status" className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <h2 id="lab-status" className="text-xl font-medium">Tu laboratorio empieza aquí</h2>
          <p className="mt-3 leading-relaxed text-slate-400">
            La base está lista. Los algoritmos y sus visualizadores se incorporarán
            conforme avances en tu aprendizaje.
          </p>
          <span className="mt-6 inline-block rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
            Etapa 1 · Preparación
          </span>
        </section>
      </div>
    </main>
  )
}
