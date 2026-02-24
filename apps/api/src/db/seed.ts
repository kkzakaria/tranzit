import { db } from './index'
import { regimesDouaniers } from './schema'

const regimes = [
  { code: '40', libelle: 'Mise à la consommation',                        description: 'Importation définitive' },
  { code: '10', libelle: 'Exportation définitive',                        description: null },
  { code: '21', libelle: 'Réexportation',                                 description: null },
  { code: '51', libelle: 'Admission temporaire — perfectionnement actif', description: null },
  { code: '53', libelle: 'Admission temporaire simple',                   description: null },
  { code: '61', libelle: 'Réimportation',                                 description: null },
  { code: '71', libelle: 'Entrepôt douanier',                             description: null },
  { code: '78', libelle: 'Zone franche',                                  description: null },
]

await db.insert(regimesDouaniers).values(regimes).onConflictDoNothing()
console.log('Seed régimes douaniers OK')
process.exit(0)
