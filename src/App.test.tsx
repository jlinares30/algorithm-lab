import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('Página inicial', () => {
  it('presenta el nombre y el propósito del laboratorio', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Algorithm Lab')
    expect(screen.getByText(/Un laboratorio interactivo para aprender algoritmos/).textContent)
      .toContain('Python')
  })

  it('identifica la etapa inicial sin ofrecer visualizadores todavía', () => {
    render(<App />)

    const status = screen.getByRole('region', { name: 'Tu laboratorio empieza aquí' })
    expect(status.textContent).toContain('Etapa 1 · Preparación')
    expect(status.textContent).toContain('se incorporarán')
  })
})
