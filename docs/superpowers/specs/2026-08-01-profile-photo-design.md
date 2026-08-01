# COMAR-FIT — Foto de perfil

## Objetivo

Permitir que cada usuario elija una foto de perfil desde su dispositivo y verla en Perfil, Dashboard y Duelo, manteniendo las iniciales como respaldo.

## Alcance

- Selección de una imagen desde la pantalla Perfil.
- Validación de tipo y tamaño máximo de 2 MB.
- Normalización en el cliente a una imagen WebP cuadrada y optimizada antes de subirla.
- Vista previa, indicador de carga y mensajes de éxito o error.
- Almacenamiento en Firebase Storage bajo `profilePhotos/{uid}/avatar.webp`.
- Persistencia de la URL en `users/{uid}.avatarUrl` y `publicProfiles/{uid}.avatarUrl`.
- Visualización en Perfil, Dashboard y Duelo.
- Inicial del nombre cuando la imagen no existe o no se puede cargar.
- Reglas de Storage que permitan lectura a usuarios autenticados y escritura solo al propietario de la ruta, exclusivamente para imágenes WebP de tamaño limitado.

## Fuera de alcance

- Galería de fotos anteriores.
- Filtros, marcos o editor avanzado.
- Fotos visibles para usuarios ajenos al duelo.
- Moderación automática de contenido.

## Arquitectura

`src/firebase/storage.js` concentrará la subida y obtención de URL. Una utilidad independiente procesará la imagen mediante Canvas para hacer recorte central cuadrado, reducirla a un máximo de 512×512 y convertirla a WebP. La pantalla Perfil coordinará selección, previsualización y guardado. Un componente reutilizable `Avatar` mostrará imagen o inicial y se consumirá desde Perfil, Dashboard y Duelo.

La actualización de Firestore será posterior a una subida exitosa. Si falla la actualización de los perfiles, la interfaz mostrará error y conservará la foto anterior. Las escrituras existentes de `avatarUrl` ya están admitidas por las reglas de Firestore.

## Seguridad

Las reglas de Storage usarán autenticación y el UID de la ruta para aislar escrituras. Solo se aceptará `image/webp` y un tamaño máximo de 1 MB después de la compresión. La lectura requerirá sesión iniciada, suficiente para que ambos participantes puedan ver sus avatares.

## Experiencia de usuario

El avatar de Perfil será interactivo y tendrá la acción “Cambiar foto”. Al seleccionar un archivo válido aparecerá una vista previa y la carga comenzará al confirmar. Durante la operación se deshabilitará la acción. El resultado se reflejará inmediatamente y después se propagará a las demás pantallas mediante los perfiles existentes.

## Pruebas

- Unidad: validación del archivo, recorte/compresión y manejo de errores.
- Componentes: respaldo por inicial, imagen válida y error de carga.
- Perfil: selección, progreso, éxito y error.
- Reglas: propietario permitido; usuario distinto, archivo no WebP y archivo excesivo rechazados.
- Integración: build de producción y verificación manual en Vercel.

## Despliegue

Se añadirá `storage.rules` y la configuración correspondiente en `firebase.json`. Después de pasar pruebas y build, se desplegarán las reglas de Storage a `comar-fit`, se publicará `main` en GitHub y se verificará el despliegue de producción de Vercel.
