import type { Comp, Placement } from '../types'
import type { Game } from './data'
import { newComp } from './store'
import { uid } from './util'

type U = [champ: string, row: number, col: number, stars?: 1 | 2 | 3, items?: string[], carry?: boolean]
const units = (list: U[]): Placement[] =>
  list.map(([champ, row, col, stars = 1, items = [], carry]) => ({ champ, row, col, stars, items, carry }))

/** Composición de ejemplo para enseñar todas las secciones. No es una recomendación de meta. */
export function seedComps(game: Game): Comp[] {
  const has = (api: string) => game.champ.has(api)
  if (!['DA_18_Ahri', 'DA_18_Sett', 'DA_Karma18'].every(has)) return []

  const AHRI = ['DA_SpearOfShojin', 'DA_JeweledGauntlet', 'DA_RabadonsDeathcap']
  const SETT = ['DA_WarmogsArmor', 'DA_TitansResolve', 'DA_SteadfastHeart']

  const c = newComp(game.set, {
    name: 'Ejemplo · Brote + Tejehechizos',
    tier: 'B',
    playstyle: 'Fast 8',
    difficulty: 'Media',
    tags: ['ejemplo', 'PH', 'Brote'],
    finalLevel: 8,
  })
  c.levels[4] = {
    stage: '2-1',
    note: 'Juega las unidades de Brote de coste 1–2 que encuentres. Guarda componentes de PH para Ahri.',
    units: units([
      ['DA_18_Yorick', 0, 3],
      ['DA_Karma18', 3, 3, 1, ['DA_BlueBuff']],
      ['DA_18_Yunara', 3, 4],
      ['DA_18_Veigar', 3, 2],
    ]),
  }
  c.levels[6] = {
    stage: '3-2',
    note: 'Brote (3) activo. Si tienes muchas parejas, estabiliza con dos tiradas.',
    units: units([
      ['DA_18_Yorick', 0, 3, 2],
      ['DA_18_Rammus', 0, 2],
      ['DA_Karma18', 3, 3, 2, ['DA_BlueBuff']],
      ['DA_18_Yunara', 3, 4, 2],
      ['DA_18_Veigar', 3, 2],
      ['DA_18_MasterYi_AD', 1, 4],
    ]),
  }
  c.levels[8] = {
    stage: '4-2',
    note: 'Tira oro en 4-2 buscando Ahri y Sett. Ashe o Lux (brote) si aparecen.',
    units: units([
      ['DA_18_Sett', 0, 3, 2, SETT],
      ['DA_18_Yorick', 0, 2, 2],
      ['DA_18_Rammus', 0, 4, 2],
      ['DA_18_MasterYi_AD', 1, 4, 2],
      ['DA_18_Ahri', 3, 3, 2, AHRI, true],
      ['DA_Karma18', 3, 2, 2, ['DA_BlueBuff']],
      ['DA_18_Yunara', 3, 4, 2],
      ['DA_18_Cassiopeia', 3, 1, 2],
    ]),
  }
  c.builds = [
    {
      champ: 'DA_18_Ahri',
      note: 'Carry principal. Prioriza maná (Lanza de Shojin / Mejora azul).',
      variants: [
        { id: uid(), label: 'Mejor en ranura', items: AHRI },
        { id: uid(), label: 'Sin arco ni lágrima', items: ['DA_JeweledGauntlet', 'DA_RabadonsDeathcap', 'DA_HextechGunblade'] },
      ],
    },
    {
      champ: 'DA_18_Sett',
      note: 'Tanque principal.',
      variants: [
        { id: uid(), label: 'Mejor en ranura', items: SETT },
        { id: uid(), label: 'Contra magia', items: ['DA_DragonsClaw', 'DA_WarmogsArmor', 'DA_GargoyleStoneplate'] },
      ],
    },
  ]
  c.itemPriority = ['DA_SpearOfShojin', 'DA_JeweledGauntlet', 'DA_WarmogsArmor']
  c.augments = [
    { api: 'DA_18_BlossomTraitAugment', note: 'Refuerza el rasgo principal.', priority: 'core' },
    { api: 'DA_JeweledLotus_I', note: 'Crítico para Ahri.', priority: 'good' },
    { api: 'DA_PandorasItemsI', note: 'Solo si no tienes componentes claros.', priority: 'situational' },
  ].filter((a) => game.augment.has(a.api)) as Comp['augments']
  c.substitutions = [
    { id: uid(), from: 'DA_18_Cassiopeia', to: 'DA_18_Ashe', note: 'Cuando encuentres Ashe en nivel 8–9.' },
  ]
  c.strategy = {
    summary:
      'Composición de EJEMPLO para ver cómo funciona el editor. Cámbiala o bórrala y crea las tuyas con el botón «Nueva».',
    early: 'Juega unidades fuertes de coste 1–2; prioriza Brote y Tejehechizos si salen solos.',
    mid: 'Nivel 6 en 3-2 y nivel 7 en 4-1. Mantén al menos 30 de oro.',
    late: 'Nivel 8 en 4-2 y tira buscando Ahri 2★. Sube a 9 si estás estable.',
    positioning: 'Ahri en la esquina de la retaguardia, Sett en el centro de la primera línea.',
    conditions: 'Buena con componentes de PH y Lágrima tempranos.',
    tips: 'Si el lobby está saturado de Brote, cambia a Tejehechizos con Alune.',
  }
  return [c]
}
