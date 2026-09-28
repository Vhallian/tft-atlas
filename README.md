# TFT Atlas

Constructor de composiciones de **Teamfight Tactics** (Set 18 · Enchanted Wilds) con datos reales del juego.

## Qué incluye

- **Arena hexagonal 4×7**: arrastra campeones, muévelos o intercámbialos, doble clic para estrellas, clic derecho para quitar.
- **Rasgos en vivo**: umbrales bronce/plata/oro/prismático, emblemas incluidos, cuántas unidades faltan.
- **Plan por nivel (3–10)**: un tablero por nivel con contador de unidades (X/nivel), etapa objetivo, notas,
  probabilidades de tienda y valor del tablero. Marca cuál es la composición final.
- **Objetos**: builds por carry con variantes (mejor en ranura + alternativas), prioridad de slam y
  componentes necesarios calculados automáticamente.
- **Aumentos**: buscador de los 400+ aumentos (plata/oro/prismático) con sugerencias relacionadas con tu comp,
  prioridad (clave/bueno/situacional) y notas.
- **Estrategia**: early/mid/late, posicionamiento, condiciones, consejos y sustituciones de unidades.
- **Guía**: vista de lectura para consultar en partida, imprimir o compartir.
- **Cuentas y nube (opcional, con Supabase)**: cada usuario inicia sesión y sus comps se guardan solas en la base
  de datos. Cada comp puede ser **privada** o **pública**; las públicas aparecen en **Comunidad** para todos,
  con **me gusta**, orden por *Populares* o *Recientes* y paginación.
- **Sin cuenta**: todo funciona igual guardando en el navegador. Exporta/importa JSON o comparte
  una comp con un enlace.

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (web estática, se puede subir a GitHub Pages, Netlify, etc.)
```

## Base de datos y cuentas (Supabase)

Sin configurar nada, la web funciona solo en local. Para activar cuentas y la comunidad:

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. **SQL Editor** → pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Crea la tabla `comps` con seguridad por filas: cualquiera lee las públicas, solo el dueño edita o borra.
3. **Authentication → URL Configuration**:
   - *Site URL*: la dirección de Vercel (p. ej. `https://tft-atlas.vercel.app`)
   - *Redirect URLs*: esa misma dirección y `http://localhost:5173`
4. **Project Settings → API**: copia la *Project URL* y la *publishable key* (o *anon key*).
5. En Vercel → **Settings → Environment Variables** añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - opcional `VITE_SUPABASE_OAUTH=discord,google` si activas esos proveedores en *Authentication → Providers*.

   Después haz **Redeploy** (las variables se leen al compilar).
6. En local, copia `.env.example` a `.env.local` con los mismos valores.

### Actualizar la base de datos

Cuando cambie `supabase/schema.sql`, vuelve a pegarlo entero en el SQL Editor y pulsa **Run**.
Es seguro ejecutarlo varias veces: no borra datos.

### Iniciar sesión con Discord

1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2** → copia *Client ID* y *Client Secret* (Reset Secret) y añade como *Redirect*:
   `https://<tu-proyecto>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Sign In / Providers → Discord**: actívalo y pega ID y Secret.
4. Vercel → variable `VITE_SUPABASE_OAUTH=discord` → **Redeploy**.

### Moderación

Como dueño del proyecto puedes ocultar o borrar cualquier comp desde Supabase → **Table Editor → comps**
(cambia `is_public` a `false` o borra la fila).

### Vista previa al compartir

Las etiquetas Open Graph de `index.html` y la imagen `public/og.png` apuntan a `https://tft-atlas-phi.vercel.app`.
Si cambias de dominio, actualiza esas URLs.

> El servidor de correo gratuito de Supabase envía pocos emails por hora. Para muchos registros, desactiva
> *Confirm email* (Authentication → Providers → Email), usa Discord/Google o configura tu propio SMTP.

## Actualizar datos del juego

Los datos salen de [CommunityDragon](https://communitydragon.org) (español) y se guardan en `public/data/set.json`.
Tras un parche o un set nuevo:

```bash
npm run data                 # set más reciente
npm run data -- --set=18     # un set concreto
npm run data -- --lang=en_us # otro idioma
```

Las probabilidades de tienda, tamaños de bolsa y ritmo de niveles están en `src/lib/constants.ts`.

TFT Atlas no está afiliado a Riot Games.
