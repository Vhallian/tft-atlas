// Descarga los datos de TFT desde CommunityDragon y genera public/data/set.json
// Uso: npm run data            (set más reciente, español)
//      npm run data -- --set=18 --lang=es_es --file=ruta/local.json
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const LANG = args.lang ?? 'es_es'
const CDN = 'https://raw.communitydragon.org/latest'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/set.json')

const img = (p) => (p && p.endsWith('.tex') ? `${CDN}/game/${p.toLowerCase().replace(/\.tex$/, '.png')}` : null)

async function load() {
  if (args.file) return JSON.parse(await readFile(args.file, 'utf8'))
  const url = `${CDN}/cdragon/tft/${LANG}.json`
  console.log('Descargando', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ---------- limpieza de descripciones ----------
const SCALE_ICONS = {
  scaleAP: 'PH', scaleAD: 'DA', scaleArmor: 'Armadura', scaleMR: 'RM', scaleHealth: 'Vida',
  scaleAS: 'VA', scaleMana: 'Maná', scaleCrit: 'Crítico', scaleDA: 'Amp', scaleDR: 'Durabilidad',
  set14AmpIcon: 'Amp', scaleSV: 'Omnivamp',
}
const TAG_CLASS = {
  magicdamage: 'd-magic', physicaldamage: 'd-phys', truedamage: 'd-true', tftbonus: 'd-bonus',
  tftkeyword: 'd-key', scalelevel: 'd-bonus', spellactive: 'd-key', rules: 'd-rules', tftitemrules: 'd-rules',
  shield: 'd-shield', status: 'd-key', healing: 'd-heal', scalehealth: 'd-heal', tftradiantitembonus: 'd-bonus',
}

function fmtNum(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '?'
  const r = Math.round(n * 100) / 100
  return String(r)
}

/** Sustituye @Var@, @Var*100@ usando un diccionario (case-insensitive) */
function subVars(text, vars) {
  const lower = {}
  for (const [k, v] of Object.entries(vars ?? {})) lower[k.toLowerCase()] = v
  return text.replace(/@([A-Za-z0-9_.{}]+)(\*(\d+(?:\.\d+)?))?@/g, (_, name, __, mult) => {
    let v = lower[name.toLowerCase()]
    if (Array.isArray(v)) v = v.map((x) => (mult ? x * Number(mult) : x)).map(fmtNum).join(' / ')
    else if (typeof v === 'number') v = fmtNum(mult ? v * Number(mult) : v)
    else v = '?'
    return v
  }).replace(/@[^@\s]{1,80}@/g, '?')
}

/** Convierte el marcado del cliente en HTML muy restringido (solo span y br) */
function cleanDesc(text) {
  if (!text) return ''
  let t = text
    .replace(/%i:([A-Za-z0-9]+)%/g, (_, k) => (SCALE_ICONS[k] ? `[${SCALE_ICONS[k]}]` : ''))
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(ShowIf|ShowIfNot)[^>]*>/gi, '')
  // etiquetas -> spans / nada
  t = t.replace(/<(\/?)([A-Za-z0-9]+)[^>]*>/g, (_, close, tag) => {
    const cls = TAG_CLASS[tag.toLowerCase()]
    if (tag.toLowerCase() === 'row') return close ? '' : '\n'
    if (!cls) return ''
    return close ? '</span>' : `<span class="${cls}">`
  })
  // escapar cualquier cosa rara y rehacer spans permitidos
  t = t
    .replace(/&(?!amp;|lt;|gt;)/g, '&amp;')
    .replace(/<(?!\/?span)/g, '&lt;')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return t.replace(/\n/g, '<br>')
}

function traitDesc(t) {
  let desc = t.desc ?? ''
  const effects = t.effects ?? []
  let i = 0
  desc = desc.replace(/<row>([\s\S]*?)<\/row>/gi, (_, inner) => {
    const e = effects[Math.min(i, effects.length - 1)] ?? {}
    i++
    return '<row>' + subVars(inner, { ...e.variables, MinUnits: e.minUnits, MaxUnits: e.maxUnits }) + '</row>'
  })
  const e0 = effects[0] ?? {}
  desc = subVars(desc, { ...e0.variables, MinUnits: e0.minUnits })
  return cleanDesc(desc)
}

function augmentTier(icon, name) {
  const f = (icon ?? '').toLowerCase().split('/').pop() ?? ''
  if (/(iii|t3|3)\.tex$/.test(f)) return 3
  if (/([-_]ii|t2|2)\.tex$/.test(f)) return 2
  if (/([-_]i|t1|1)\.tex$/.test(f)) return 1
  const m = (name ?? '').match(/ (I{1,3})\+*$/)
  return m ? m[1].length : 0
}

// ---------- main ----------
const raw = await load()
const byApi = Object.fromEntries(raw.items.map((i) => [i.apiName, i]))

const mains = raw.setData.filter((s) => /^TFTSet\d+$/.test(s.mutator))
const setNum = args.set ? Number(args.set) : Math.max(...mains.map((s) => s.number))
const set = mains.find((s) => s.number === setNum)
if (!set) throw new Error('Set no encontrado: ' + setNum)
console.log(`Set ${set.number} (${set.mutator}) — ${set.champions.length} unidades`)

// Rasgos
const traits = set.traits.map((t) => ({
  api: t.apiName,
  name: t.name,
  icon: img(t.icon),
  desc: traitDesc(t),
  effects: (t.effects ?? [])
    .filter((e) => e.minUnits != null)
    .map((e) => ({ min: e.minUnits, max: e.maxUnits, style: e.style })),
}))
// Quitar efectos duplicados (algunos rasgos repiten entradas)
for (const t of traits) {
  const seen = new Set()
  t.effects = t.effects.filter((e) => (seen.has(e.min) ? false : seen.add(e.min)))
}
const traitNames = new Set(traits.map((t) => t.name))

// Campeones
const champions = set.champions
  .filter((c) => c.traits?.length && c.cost >= 1 && c.cost <= 5 && traitNamesOk(c))
  .map((c) => {
    const vars = Object.fromEntries((c.ability?.variables ?? []).map((v) => [v.name, v.value?.slice(1, 4)]))
    return {
      api: c.apiName,
      name: c.name,
      cost: c.cost,
      traits: c.traits,
      role: c.role ?? null,
      icon: img(c.squareIcon) ?? img(c.tileIcon),
      splash: img(c.icon),
      stats: {
        hp: c.stats.hp, ad: c.stats.damage, as: round(c.stats.attackSpeed), armor: c.stats.armor,
        mr: c.stats.magicResist, mana: c.stats.mana, initialMana: c.stats.initialMana,
        range: c.stats.range, crit: round(c.stats.critChance), critMult: round(c.stats.critMultiplier),
      },
      ability: {
        name: c.ability?.name ?? '',
        icon: img(c.ability?.icon),
        desc: cleanDesc(subVars(c.ability?.desc ?? '', vars)),
      },
    }
  })
  .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'es'))

function traitNamesOk(c) {
  return c.traits.every((t) => traitNames.has(t))
}
function round(n) {
  return Math.round(n * 100) / 100
}

// Objetos: el set usa su propio prefijo (p. ej. DA_) pero las descripciones
// suelen estar en la versión genérica (TFT_Item_*), así que buscamos por nombre.
const withDesc = new Map()
for (const i of raw.items) {
  if (!i.desc || !i.name) continue
  const prev = withDesc.get(i.name)
  if (!prev || (/^TFT_Item_/.test(i.apiName) && !/^TFT_Item_/.test(prev.apiName))) withDesc.set(i.name, i)
}
function describe(i) {
  const src = i.desc ? i : withDesc.get(i.name)
  if (!src) return { desc: '', effects: {} }
  return { desc: cleanDesc(subVars(src.desc, src.effects)), effects: src.effects ?? {} }
}
const STAT_LABEL = {
  AD: 'DA', AP: 'PH', AS: 'VA', Armor: 'Armadura', MagicResist: 'RM', Health: 'Vida', Mana: 'Maná',
  CritChance: 'Crít.', Omnivamp: 'Omnivamp', BonusDamage: 'Amp',
}
function statsOf(effects) {
  const out = []
  for (const [k, v] of Object.entries(effects)) {
    if (!STAT_LABEL[k] || typeof v !== 'number' || v === 0) continue
    let val = v
    if (k === 'AD' && v < 1) val = Math.round(v * 100)
    if (k === 'BonusDamage' && v < 1) val = Math.round(v * 100)
    const pct = ['AD', 'AS', 'CritChance', 'Omnivamp', 'BonusDamage'].includes(k)
    out.push(`${pct ? '+' + round(val) + '%' : '+' + round(val)} ${STAT_LABEL[k]}`)
  }
  return out
}

const setItems = set.items.map((a) => byApi[a]).filter(Boolean)
const items = []
const seenNames = new Set()
function pushItem(i, category, extra = {}) {
  const key = category + '|' + i.name
  if (seenNames.has(key)) return
  seenNames.add(key)
  const { desc, effects } = describe(i)
  items.push({
    api: i.apiName,
    name: i.name,
    icon: img(i.icon),
    category,
    from: i.composition?.length === 2 ? i.composition : [],
    desc,
    stats: statsOf(effects),
    ...extra,
  })
}

const prefix = (() => {
  // prefijo de componentes que usa el set (DA_Component_ o TFT_Item_)
  return setItems.some((i) => i.apiName.startsWith('DA_Component_')) ? 'DA_Component_' : 'TFT_Item_'
})()
const components = setItems.filter((i) => i.tags?.includes('component') && i.apiName.startsWith(prefix))
const componentSet = new Set(components.map((c) => c.apiName))
components.forEach((i) => pushItem(i, 'component'))

const traitByLower = new Map(traits.map((t) => [t.name.toLowerCase(), t.name]))
function emblemTrait(name) {
  const m = name.match(/^Emblema (?:de la |del |de los |de las |de )?(.+)$/i)
  if (!m) return null
  return traitByLower.get(m[1].toLowerCase()) ?? null
}

const completedNames = new Set(
  setItems
    .filter((i) => i.composition?.length === 2 && i.composition.every((c) => componentSet.has(c)))
    .map((i) => i.name),
)
for (const i of setItems) {
  if (componentSet.has(i.apiName) || !i.name || i.isAugment) continue
  const isCombo = i.composition?.length === 2 && i.composition.every((c) => componentSet.has(c))
  if (/emblem/i.test(i.apiName) && /^Emblema/i.test(i.name)) {
    const trait = emblemTrait(i.name)
    if (trait) pushItem(i, 'emblem', { trait })
    else console.warn('  Emblema sin rasgo:', i.name)
  } else if (isCombo) pushItem(i, 'completed')
  else if (/radiant/i.test(i.apiName) && completedNames.has(i.name.replace(/ radiante$/i, '')))
    pushItem(i, 'radiant')
  else if (/artifact/i.test(i.apiName) || /^TFT\d*_Item_Ornn/.test(i.apiName)) pushItem(i, 'artifact')
}
// Objetos de apoyo (si el set los incluye)
for (const i of setItems) {
  if (/support/i.test(i.apiName) && i.name && !i.isAugment && !/yunque/i.test(i.name)) pushItem(i, 'support')
}

// Aumentos
const augments = []
const augSeen = new Set()
for (const api of set.augments) {
  const a = byApi[api]
  if (!a?.name || augSeen.has(a.name)) continue
  augSeen.add(a.name)
  augments.push({
    api: a.apiName,
    name: a.name,
    icon: img(a.icon),
    tier: augmentTier(a.icon, a.name),
    desc: cleanDesc(subVars(a.desc ?? '', a.effects)),
    traits: (a.associatedTraits ?? []).filter((t) => traitNames.has(t)),
  })
}
augments.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, 'es'))

const SET_NAMES = { 13: 'En la Arcana', 14: 'Cyber City', 15: 'K.O. Coliseum', 17: 'Set 17', 18: 'Enchanted Wilds' }
const meta = JSON.parse(await (await fetch(`${CDN}/content-metadata.json`).catch(() => null))?.text?.() ?? '{}')
const out = {
  set: set.number,
  setName: SET_NAMES[set.number] ?? set.name,
  lang: LANG,
  version: meta.version ?? null,
  generatedAt: new Date().toISOString(),
  traits,
  champions,
  items,
  augments,
}
await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(out))
const count = (c) => items.filter((i) => i.category === c).length
console.log(
  `OK → ${OUT}\n  ${champions.length} campeones, ${traits.length} rasgos, ${augments.length} aumentos\n` +
    `  objetos: ${count('component')} componentes, ${count('completed')} completos, ${count('emblem')} emblemas, ` +
    `${count('artifact')} artefactos, ${count('radiant')} radiantes, ${count('support')} apoyo`,
)
