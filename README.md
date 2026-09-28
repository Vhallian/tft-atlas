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
- **Guardar y compartir**: todo se guarda en el navegador (localStorage). Exporta/importa JSON o comparte
  una comp con un enlace (la comp va comprimida dentro de la URL).

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (web estática, se puede subir a GitHub Pages, Netlify, etc.)
```

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
