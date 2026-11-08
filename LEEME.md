# Starly: listo para subir

Esta carpeta ya trae todo. La clave de Gemini **no** está en el código: se configura como
variable de entorno `GEMINI_API_KEY` en Netlify o Vercel. Sirve igual para **Vercel** o para **Netlify**.

```
starly-deploy/
├── public/                             La app (index.html, css, js)
├── api/generar-ruta.py                 IA en Python (la usa Vercel)
├── netlify/edge-functions/generar-ruta.js   IA para Netlify (Netlify no corre Python)
├── vercel.json                         Configuración de Vercel
└── netlify.toml                        Configuración de Netlify
```

## Importante

**No uses "arrastrar y soltar"** (Netlify Drop): así solo se sube la página y la IA no funciona.
Súbela de una de estas dos formas:

### Vercel (recomendado: la IA corre en Python)

1. Crea un repositorio **privado** en GitHub y sube el contenido de esta carpeta.
2. En https://vercel.com → **Add New → Project** → elige el repositorio → **Deploy**.
   No hay que cambiar ninguna opción.

### Netlify

1. Crea un repositorio **privado** en GitHub y sube el contenido de esta carpeta.
2. En https://app.netlify.com → **Add new site → Import an existing project** → elige el repositorio → **Deploy**.

## Seguridad

- La clave vive solo en la variable de entorno `GEMINI_API_KEY` del hosting
  (Netlify: **Site configuration → Environment variables**). Nunca la escribas en el código.
- Para cambiarla en Netlify: `netlify env:set GEMINI_API_KEY nueva-clave` y vuelve a desplegar.
- Cualquiera que use tu app gasta de tu cuota de Gemini.

## Liga de amigos (Supabase)

Para que funcione la pestaña **Amigos** de la Liga hay que correr una sola vez el archivo
`supabase/amigos.sql`: en Supabase → **SQL Editor** → **New query** → pega todo el archivo → **Run**.
Crea la tabla `friendships`, agrega columnas de XP a `profiles` y los permisos (cada estudiante
solo ve su perfil y el de sus amigos). Se puede volver a correr sin problema.
