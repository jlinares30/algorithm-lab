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

  it('ofrece el primer visualizador con entradas para Python', () => {
    render(<App />)

    const lab = screen.getByRole('region', { name: 'Binary Search' })
    expect(lab.textContent).toContain('Pyodide')
    expect(screen.getByLabelText('Lista ordenada')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Ejecutar búsqueda' })).toBeDefined()
  })
})
