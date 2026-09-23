# Configurar la base de datos de la encuesta y las reseñas (≈10 minutos)

La encuesta del museo guarda las respuestas en **Firebase Firestore** (gratis). Las reseñas del menú
«Reseñas de visitantes» se actualizan solas en tiempo real cada vez que alguien termina la encuesta.

> Hazlo en una ventana normal con **una sola cuenta de Google** abierta (o en incógnito) para evitar
> el error de "No se puede abrir el archivo".

## 1. Crear el proyecto
1. Entra a https://console.firebase.google.com → **Crear un proyecto**.
2. Nombre: `museo-videojuegos` (o el que quieras). Puedes **desactivar Google Analytics**. → Crear.

## 2. Crear la base de datos
1. Menú izquierdo: **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: la que aparezca por defecto (por ejemplo `nam5` o `southamerica-east1`).
3. Elige **Iniciar en modo de producción** → Crear.
4. Ve a la pestaña **Reglas**, borra todo y pega el contenido de `firestore.rules`.
5. En la línea `request.auth.token.email == "TU_CORREO@gmail.com"` pon **tu correo de Google**.
6. Pulsa **Publicar**.

## 3. Activar el inicio de sesión (solo para ti, para descargar los datos)
1. Menú izquierdo: **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso** → **Google** → Habilitar → elige tu correo de asistencia → Guardar.
3. Pestaña **Configuración → Dominios autorizados → Agregar dominio** → `joseortizz1807.github.io`.

## 4. Conectar el prototipo
1. Engranaje ⚙️ (arriba a la izquierda) → **Configuración del proyecto**.
2. Abajo, en **Tus apps**, pulsa el icono **`</>`** (Web). Apodo: `museo`. No marques Hosting. → Registrar.
3. Copia los valores del bloque `firebaseConfig` (apiKey, authDomain, projectId, …).
4. Pégalos en `js/firebase.js`, dentro de `FIREBASE_CONFIG`, entre las comillas.
   (Es normal que la apiKey sea visible: la seguridad la dan las reglas del paso 2.)

## 5. Subir y probar
```bash
git add .
git commit -m "Encuesta con base de datos y reseñas en tiempo real"
git push origin main
```
Espera 1–2 minutos, abre el museo con **Ctrl + Shift + R**, responde la encuesta marcando
«Autorizo que mi comentario se muestre…», pulsa **VER RESEÑAS** y verifica que tu comentario aparezca.
Abre el museo en otra pestaña con el panel de reseñas abierto: al enviar otra respuesta, se actualiza sola.

## 6. Descargar los datos para la tesis
Abre `https://joseortizz1807.github.io/prototipo-2/admin.html`, inicia sesión con tu correo y pulsa
**Descargar CSV**. Ese archivo es el que me pasas para escribir el Capítulo 4.

## Borrar una reseña inapropiada o una respuesta de prueba
En la consola de Firebase: **Firestore Database → Datos → resenas** (o `respuestas`) → selecciona el
documento → **⋮ → Eliminar documento**. Los comentarios con groserías comunes ya se filtran solos.
