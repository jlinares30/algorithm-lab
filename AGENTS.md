# Colaboración en Algorithm Lab

## Aprendizaje

- La lógica de los algoritmos la desarrolla manualmente el usuario como parte de su aprendizaje.
- No implementar algoritmos educativos (búsqueda, ordenamiento u otros) sin solicitud explícita.
- Ayudar a diseñar pruebas, revisar implementaciones, explicar errores y ofrecer pistas.
- No dar soluciones completas a ejercicios algorítmicos salvo petición explícita.

## Arquitectura y alcance

- Mantener los algoritmos en `python/algorithms` y sus pruebas en `python/tests`.
- Mantener Python independiente de React; la interfaz vive en `src`.
- Usar `src/components` para componentes compartidos y `src/visualizers` para futuros visualizadores.
- Mantener estado del algoritmo y controles de reproducción separados del renderizado y de cualquier biblioteca de animación. Los futuros visualizadores recibirán estado y callbacks mediante props; GSAP, si se solicita, será un detalle de presentación.
- No instalar GSAP ni implementar animaciones complejas en esta etapa.
- No integrar Pyodide ni Web Workers todavía.
- Evitar sobreingeniería y dependencias innecesarias. No configurar backend, autenticación ni bases de datos.

## Validación

- Instalar frontend con `npm ci` y Python en `.venv` con `python -m pip install -r requirements-dev.txt` después de activar el entorno.
- Ejecutar `npm run build`, `npm run lint`, `npm test` y `python -m pytest` antes de dar un cambio por terminado.
- Añadir pruebas de comportamiento cuando corresponda. No introducir implementaciones de algoritmos como parte de las pruebas.
- No versionar `.venv`, `node_modules`, archivos de caché ni `dist`.
