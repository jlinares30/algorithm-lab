# Colaboración en Algorithm Lab

## Aprendizaje

- La lógica de los algoritmos la desarrolla manualmente el usuario como parte de su aprendizaje.
- No implementar algoritmos educativos (búsqueda, ordenamiento u otros) sin solicitud explícita.
- Ayudar a diseñar pruebas, revisar implementaciones, explicar errores y ofrecer pistas.
- No dar soluciones completas a ejercicios algorítmicos salvo petición explícita.

## Arquitectura y alcance

- Mantener los algoritmos en `python/algorithms` y sus pruebas en `python/tests`.
- Mantener Python desacoplado de React: la ejecución en el navegador se realiza mediante Pyodide dentro de un Web Worker dedicado (`src/execution/pyodideWorker.ts`), transmitiendo eventos inmutables a la interfaz.
- La interfaz de usuario reside en `src`, usando `src/components` para componentes compartidos y `src/visualizers` para los visualizadores de cada algoritmo.
- Separación de responsabilidades: el estado del algoritmo, el historial de eventos y los controles de reproducción (`usePlayback`, `src/playback/`) son independientes del renderizado y de las bibliotecas de animación o 3D.
- Modo 2D: renderizado reactivo con animaciones declarativas mediante GSAP (`@gsap/react`) y adaptación a movimiento reducido (`prefers-reduced-motion`).
- Modo 3D Inmersivo: renderizado WebGL acelerado mediante Three.js y React Three Fiber (`@react-three/fiber`, `@react-three/drei`) en `src/visualizers/.../3d/`:
  - Barras 3D individuales (`ArrayBlock3D`) para arreglos pequeños/medianos ($\le 64$ elementos) con grabado frontal.
  - Instanciado GPU (`ArrayInstanced3D` con `InstancedMesh`) y buffers tipados persistentes (`Float32Array`) para arreglos grandes (hasta 256 elementos) a 60/120 fps sin tirones ni recargas.
  - Balizas e indicadores nativos WebGL (`THREE.Sprite` + `CanvasTexture`) en `badgeTexture.ts`, garantizando legibilidad y evitando problemas de profundidad u oclusión del DOM.
  - Cámara orbital interactiva (`CameraRig` con `OrbitControls`) y seguimiento adaptativo del foco del algoritmo.
- Evitar sobreingeniería y dependencias innecesarias. No configurar backend, autenticación ni bases de datos.

## Validación

- Instalar frontend con `npm ci` (o `pnpm install`) y Python en `.venv` con `python -m pip install -r requirements-dev.txt` después de activar el entorno.
- Ejecutar `npm run build`, `npm run lint`, `npm test` y `python -m pytest` antes de dar un cambio por terminado.
- Añadir pruebas de comportamiento cuando corresponda. No introducir implementaciones de algoritmos como parte de las pruebas.
- No versionar `.venv`, `node_modules`, archivos de caché ni `dist`.
