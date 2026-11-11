# Variantes con error

Versiones de los algoritmos de búsqueda con un fallo puesto a propósito, para el
modo «Encuentra el error» de la interfaz. Las escribe el estudiante a mano, igual
que los algoritmos correctos.

## Formato

Un archivo por variante, con este nombre:

```text
<algoritmo>__<nombre_del_error>.py
```

Por ejemplo: `binary_search__mid_sin_dividir.py`, `linear_search__salta_el_ultimo.py`.

Cada archivo debe:

1. Empezar con una línea de comentario que explique el fallo en una frase. La
   interfaz la muestra solo después de que el visitante responda:

   ```python
   # Error: <qué está mal y qué consecuencia tiene>
   ```

2. Definir una función con el mismo nombre y los mismos parámetros que el
   algoritmo original (`binary_search(numbers, target)`, `linear_search(numbers, target)`).

3. Devolver lo mismo que el original, `(índice, steps)`, con el mismo formato de
   pasos. El resultado o los pasos pueden ser incorrectos: de eso se trata.

4. No importar nada del paquete `algorithms`: en el navegador cada archivo se
   ejecuta por separado.

## Qué tipo de errores sirven

Los más útiles son los que se ven en la animación con alguna entrada concreta:
un límite que no se mueve, un elemento que nunca se revisa, un rango que se
descarta del lado equivocado. Si un fallo puede dejar el algoritmo en un bucle
sin fin o lanzar una excepción, la interfaz corta la ejecución y muestra los
pasos registrados hasta ese momento (como máximo 300). Para recuperarlos, la lista
de pasos debe estar en una variable local llamada `steps`.

Con los mismos datos, la interfaz ejecuta también el algoritmo correcto y compara
los pasos de ambos: el primer paso distinto es la respuesta del reto. Un archivo
nuevo aparece como reto sin tocar el código de la interfaz.

Estas variantes no entran en las pruebas de `python/tests`, que comprueban
solo los algoritmos correctos.
