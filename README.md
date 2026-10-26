# Algorithm Lab

Laboratorio web interactivo para aprender, experimentar y visualizar algoritmos.
La interfaz usa React + TypeScript + Vite y Tailwind CSS. La lógica de los
algoritmos se escribirá manualmente en Python como parte del aprendizaje.

## Requisitos

- Node.js 22.12+ (o 24 LTS) y npm.
- Python 3.10+ con `venv` y pip.

## Instalación

Desde la raíz del repositorio:

```bash
npm ci
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

En Windows, activar Python con `.venv\Scripts\Activate.ps1` en PowerShell.

## Frontend

```bash
npm run dev
```

Vite indica la dirección local. Para acceder desde un contenedor, usar
`npm run dev -- --host 0.0.0.0`. No se necesita un servidor Python.

```bash
npm run build     # TypeScript y compilación de producción en dist/
npm run preview   # Servir localmente la compilación
npm run lint      # Análisis estático con Oxlint, incluido por Vite
```

## Pruebas

```bash
npm test          # Vitest: ejecución única
npm run test:watch
python -m pytest  # Con .venv activado
```

Las pruebas iniciales comprueban la página de inicio y que pytest puede importar
el paquete Python local. Todavía no prueban algoritmos porque no se ha implementado ninguno.

## Estructura

```text
src/
  App.tsx               # Composición de la aplicación
  App.test.tsx          # Pruebas de la página inicial
  pages/HomePage.tsx    # Página de inicio
  components/           # Futuros componentes compartidos
  visualizers/          # Futuros visualizadores
  index.css             # Tailwind y estilos base
python/
  algorithms/           # Lógica Python escrita por el estudiante
  tests/                # Pruebas Python
pyproject.toml          # Configuración de pytest
requirements-dev.txt    # Dependencias Python de desarrollo
vite.config.ts          # React, Tailwind y Vitest
AGENTS.md               # Reglas de colaboración y aprendizaje
```

## Evolución prevista

Pyodide y Web Workers se integrarán en una fase posterior. Por ahora Python se
prueba localmente con pytest y no se ejecuta en el navegador.

Los visualizadores recibirán estado y callbacks de reproducción mediante props.
El estado del algoritmo y la lógica de reproducción serán independientes de la
biblioteca de animación. GSAP podrá añadirse más adelante como detalle visual;
no está instalado ni se han creado animaciones o abstracciones anticipadas.

No hay backend, autenticación, base de datos ni implementaciones de algoritmos.
