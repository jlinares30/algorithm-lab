# Algorithm Lab

Laboratorio web interactivo para aprender, experimentar y visualizar algoritmos.
La interfaz usa React + TypeScript + Vite y Tailwind CSS. La lógica de los
algoritmos se escribirá manualmente en Python como parte del aprendizaje.

## Requisitos

- Node.js 22.12+ (o 24 LTS), con npm o pnpm.
- Python 3.10+ con `venv` y pip.

## Instalación

Desde la raíz del repositorio:

```bash
# Con npm:
npm ci

# O alternativamente con pnpm:
pnpm install

# Entorno virtual de Python:
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

Las pruebas comprueban la página inicial, la validación de entradas, el protocolo
de eventos y la reproducción (avanzar, retroceder, pausar, velocidad y reinicio),
los saltos temporales, el cambio de vista y las herramientas de entrada. Las pruebas
GSAP comprueban fases, reconstrucción de escenas, Strict Mode, limpieza y límites
del número de tweens con 256 elementos.
Las pruebas de interfaz utilizan eventos grabados; pytest verifica la implementación
Python real con sus pruebas existentes.

## Visualización de Binary Search

1. Introduce hasta 256 enteros seguros en orden ascendente y un objetivo entero.
   Se admiten negativos, repetidos y una lista vacía. La interfaz valida el orden,
   sin ordenar ni cambiar la entrada.
2. Pulsa **Ejecutar búsqueda**. Un Web Worker carga Pyodide **0.27.7** desde
   `https://cdn.jsdelivr.net/pyodide/v0.27.7/full/` y ejecuta el archivo original
   `python/algorithms/searching/binary_search.py`, incluido por Vite como texto.
   Se necesita conexión para descargar el runtime y sus recursos WebAssembly.
   Puedes cancelar la carga y reintentar si falla.
3. Elige **Barras** o **Celdas** y recorre los eventos con **Avanzar**, **Retroceder**
   o **Reproducir**. Puedes pausar, cambiar la velocidad y reiniciar sin volver a
   ejecutar Python. **Avanzar** reproduce la secuencia de un solo evento.
   **Pausar** detiene tanto la animación como el avance; **Reproducir** reanuda
   desde la misma fase y continúa automáticamente por el historial.
4. Usa el deslizador de la **Línea de tiempo**, sus flechas de teclado o los botones
   de evento para saltar a cualquier paso. Un salto pausa la reproducción. El estado
   se deriva siempre de ese evento, incluso al retroceder o cambiar de vista.
   **Retroceder** y los saltos muestran inmediatamente la escena final elegida,
   sin reproducir todos los eventos intermedios.
5. Genera listas aleatorias ordenadas de distintos tamaños y selecciona un objetivo
   de la lista o al azar. También puedes escribir un objetivo ausente. Estas herramientas
   preparan la entrada; pulsa **Ejecutar búsqueda** para aplicar los nuevos datos.

Las barras representan valores respecto a cero y admiten negativos, ceros y repetidos.
Una línea discontinua señala el objetivo. La **vista general SVG** mantiene todo el
arreglo visible; su marco indica el área mostrada en detalle. El **zoom automático**
enfoca el rango activo y, cuando es grande, una ventana alrededor del próximo `mid`.
La cantidad de columnas legibles se adapta al ancho de pantalla. Puedes desactivar
el zoom para ver todo el arreglo también en detalle. Con muchos elementos, sus valores
se ocultan visualmente en esa escala pero conservan sus etiquetas accesibles.

Cada evento tiene una secuencia GSAP normalizada: destacar `mid` y mostrar la
comparación (0–40%), descartar la mitad rayada como un grupo (40–70%), enfocar el
rango resultante (70–100%). Los indicadores señalan los límites del evento actual;
el marco y el zoom muestran el resultado de su decisión. `found` enfoca la coincidencia
y `not_found` representa un rango vacío. La vista de celdas mantiene el mismo significado.

El reloj de `usePlayback` es la única fuente de tiempo: envía progreso a una timeline
GSAP **pausada**, sin estado React por fotograma. Cambiar velocidad conserva el progreso
consumido y terminar la búsqueda espera a que finalice la última secuencia. Las animaciones
no disparan nuevos pasos ni ejecutan lógica de búsqueda. El rango siguiente procede del
siguiente evento Python; cada escena se reconstruye independientemente de la anterior.

`useGSAP` de `@gsap/react` gestiona el contexto y su reversión al cambiar de escena o
desmontar; `gsap.matchMedia` adapta cambios de `prefers-reduced-motion` en ejecución.
Con movimiento reducido, la escena final se presenta inmediatamente y se conservan
los controles de reproducción. Se animan el centro, los indicadores y contenedores
compartidos: el número de tweens no crece con el número de elementos.

Los controles son nativos, utilizables por teclado, con etiquetas y estados accesibles;
el significado no depende solo del color. El paso 0 representa la entrada original.
Cada evento describe `left`, `mid` y `right` **antes** de aplicar su decisión.
Los índices empiezan en 0. Los límites fuera de la lista se muestran en la explicación,
sin inventar una celda para ellos. `not_found` conserva `mid=None` como `null`.
El contador de comparaciones cuenta elementos centrales evaluados (eventos con
`mid`), no cada operador de comparación interno de Python.

La integración convierte la tupla `(índice, pasos)` a JSON y captura los `print`
del ejemplo del archivo en un búfer separado. No modifica ni replica el algoritmo.
Cada ejecución usa un worker aislado que se libera al terminar, cancelar o salir
de la página. Editar el formulario no altera una reproducción ya cargada; hay que
ejecutar de nuevo para aplicar los nuevos datos.

## Modo Inmersivo 3D (WebGL / Three.js)

Pulsa **⛶ Modo Inmersivo 3D** en la cabecera del visualizador para acceder a la experiencia espacial:

1. **Entorno 3D Acelerado**: Escena volumétrica con sombras suaves, luces direccionales y niebla adaptativa que escala dinámicamente con el tamaño de la lista.
2. **Representación Dual según Escala**:
   - Arreglos pequeños y medianos ($\le 64$ elementos): barras tridimensionales individuales con grabado directo en el frontal de la geometría (`createFaceLabelTexture`) y badges superiores con punteros activos.
   - Arreglos masivos (hasta 256 elementos): aceleración por hardware mediante instanciado GPU (`InstancedMesh`) con buffers tipados (`Float32Array`) continuos, logrando 60/120 fps fluidos sin parpadeos de transición.
3. **Balizas Tridimensionales Nativas**: Indicadores **Left** (azul cielo), **Mid** (ámbar) y **Right** (violeta) generados como sprites WebGL billboard de alta densidad de píxeles (`badgeTexture.ts`) en estilo *dark glassmorphism*, con agujas cónicas y anillos luminosos sobre el suelo que planean suavemente a lo largo del arreglo.
4. **Cámara Orbital y Seguimiento**:
   - Arrastra con el botón izquierdo para orbitar libremente, botón derecho para desplazar y rueda para hacer zoom.
   - `CameraRig` enfoca y encuadra adaptativamente el centro del rango activo `[left, right]` durante la búsqueda.
   - Botón **⊙ Restablecer cámara** para recuperar la perspectiva óptima en cualquier momento.
5. **HUD Superior e Inferior Flotante**:
   - Tarjeta didáctica con explicaciones semánticas del paso actual y evaluación de condiciones.
   - Tira interactiva de inspección rápida y panel flotante al hacer clic sobre cualquier barra 3D.
   - Controles completos de reproducción y barra deslizante continua (`EventTimeline`).
   - Atajos de teclado: `Espacio` (reproducir/pausar), `←` / `→` (paso anterior/siguiente) y `Escape` (volver a 2D).

## Modo predicción

Con una ejecución cargada, la casilla «Modo predicción» convierte la reproducción en
preguntas: antes de revelar cada paso, el laboratorio pregunta qué hará el algoritmo.
Al responder se muestra el paso, si la predicción fue correcta y el total de aciertos.
La respuesta correcta sale siempre del paso grabado por Python, no de lógica en la
interfaz. Mientras está activo se ocultan la línea de tiempo y el modo 3D, que
mostrarían los pasos por adelantado.

## Comparar complejidad

La página `#/comparar` ejecuta cada algoritmo disponible con listas de 100 a 1000
elementos y cuenta las comparaciones que registra su código Python (los pasos que
no son `not_found`). El gráfico muestra dos casos: objetivo ausente (un valor mayor
que todos) y objetivo presente (media de varias búsquedas al azar), en escala lineal
o logarítmica, con los mismos datos en una tabla.

## Estructura

```text
src/
  App.tsx               # Enrutado por hash entre catálogo y laboratorios
  App.test.tsx          # Pruebas del catálogo y la navegación
  catalog/
    algorithms.ts       # Metadatos de cada algoritmo (categoría, complejidad, estado)
    labs.ts             # Laboratorio interactivo de cada algoritmo disponible (carga diferida)
  navigation/
    useHashRoute.ts     # Rutas `#/` y `#/algoritmo/<id>` sin dependencias
  pages/
    HomePage.tsx        # Catálogo agrupado por categoría
    AlgorithmPage.tsx   # Página de un algoritmo: complejidad y laboratorio
  components/           # Tarjetas, controles, línea de tiempo, vista del array y herramientas de entrada
  animations/           # Geometría de cámara, timeline GSAP y adaptador React
  playback/             # usePlayback y contrato del reloj de animación, independientes de GSAP y WebGL
  input/                # Validación compartida de listas y objetivos
  prediction/           # Modo predicción: preguntas y puntuación antes de revelar cada paso
  execution/
    python.worker.ts    # Worker Pyodide que ejecuta el archivo Python de cada algoritmo
    pythonWorker.ts     # Protocolo y cliente del worker
    binarySearch.ts     # Eventos y decodificador de binary_search
    linearSearch.ts     # Contrato (índice, steps) y decodificador de linear_search
    measure.ts          # Medición de comparaciones por tamaño de lista
  visualizers/
    linear-search/
      LinearSearchLab.tsx        # Laboratorio: entrada, ejecución y reproducción
      LinearSearchVisualizer.tsx # Escenario 2D con el puntero i
      model.ts                   # Proyecciones inmutables de los pasos
    binary-search/
      BinarySearchLab.tsx        # Laboratorio principal con modos de entrada y pestañas
      BinarySearchVisualizer.tsx # Escenario visual 2D
      model.ts                   # Proyecciones inmutables de eventos y rangos
      3d/
        BinarySearch3DView.tsx   # Vista inmersiva a pantalla completa y HUD flotante
        BinarySearch3DScene.tsx  # Canvas R3F, iluminación, niebla y suelo activo
        ArrayBlock3D.tsx         # Bloques 3D individuales con grabado frontal
        ArrayInstanced3D.tsx     # InstancedMesh para arrays grandes con buffers GPU
        CameraRig.tsx            # Control orbital OrbitControls y seguimiento de cámara
        badgeTexture.ts          # Generador de texturas Canvas HD para balizas y sprites
        animation3d.ts           # Cálculo espacial de objetivos 3D y smoothstep
        webgl.ts                 # Detección segura de soporte WebGL
  index.css             # Tailwind y estilos base
python/
  algorithms/           # Lógica Python escrita por el estudiante
  tests/                # Pruebas Python
pyproject.toml          # Configuración de pytest
requirements-dev.txt    # Dependencias Python de desarrollo
vite.config.ts          # React, Tailwind y Vitest
AGENTS.md               # Reglas de colaboración y arquitectura
```

## Evolución prevista

Binary Search ya ejecuta Python en el navegador mediante Pyodide y un Web Worker.
Los próximos algoritmos se incorporarán conforme se desarrollen manualmente.

La portada muestra un catálogo con todos los algoritmos; los que aún no tienen
laboratorio aparecen como «Próximamente». Para habilitar uno nuevo:

1. Escribir su implementación en `python/algorithms/<categoría>/` con sus pruebas en `python/tests`.
2. Crear su laboratorio en `src/visualizers/<id>/`.
3. Registrarlo en `src/catalog/labs.ts` y cambiar su `status` a `'available'` en `src/catalog/algorithms.ts`.

Cada laboratorio se carga solo al abrirlo, así la portada no descarga Three.js ni GSAP.

Los componentes visuales reciben datos y callbacks mediante props. El estado del
algoritmo y la lógica de reproducción son independientes de GSAP.
Las vistas de arrays, la línea de tiempo y las herramientas de entrada se mantienen
compartidas para reutilizarlas con otros algoritmos. Las animaciones de esta etapa se
limitan a comparación, descarte y zoom de Binary Search.

No hay backend, autenticación ni base de datos.
