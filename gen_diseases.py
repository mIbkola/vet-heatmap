import json

with open('/home/z/my-project/upload/all_protocols.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('"', '\\"')

lines = []
lines.append("// Auto-generated from Приказ Минсельхоза РФ №62 + протоколы лечения")
lines.append("")
lines.append("export type DiseaseCategory = 'Особо опасная' | 'Инфекционная' | 'Инвазионная';")
lines.append("export type PathogenType = 'вирусная' | 'бактериальная' | 'паразитарная' | 'грибковая' | 'прионная' | 'смешанная' | 'не указана';")
lines.append("")
lines.append("export interface Drug {")
lines.append("  name: string;")
lines.append("  inn: string;")
lines.append("  dosage: string;")
lines.append("  course: string;")
lines.append("  route: string;")
lines.append("  frequency: string;")
lines.append("}")
lines.append("")
lines.append("export interface Disease {")
lines.append("  id: number;")
lines.append("  name: string;")
lines.append("  category: DiseaseCategory;")
lines.append("  pathogenType: PathogenType;")
lines.append("  animalTypes: string[];")
lines.append("  specificTherapy: Drug[];")
lines.append("  symptomaticTherapy: Drug[];")
lines.append("}")
lines.append("")
lines.append("export const diseases: Disease[] = [")

for p in data:
    pt_raw = p.get('pathogen_type', '')
    pt = 'не указана'
    if 'вирусн' in pt_raw.lower():
        pt = 'вирусная'
    elif 'бактериальн' in pt_raw.lower():
        pt = 'бактериальная'
    elif 'паразитарн' in pt_raw.lower() or 'инвазионн' in pt_raw.lower():
        pt = 'паразитарная'
    elif 'грибков' in pt_raw.lower():
        pt = 'грибковая'
    elif 'прионн' in pt_raw.lower():
        pt = 'прионная'
    elif 'смешанн' in pt_raw.lower():
        pt = 'смешанная'

    at_raw = p.get('animal_types', '')
    at_list = [a.strip() for a in at_raw.replace(' и ', ',').split(',') if a.strip()]
    at_ts = ", ".join(["'" + esc(a) + "'" for a in at_list])

    spec_drugs = []
    for d in p.get('specific_therapy', []):
        spec_drugs.append(
            "{ name: '" + esc(d.get('Препарат', '')) +
            "', inn: '" + esc(d.get('МНН', '')) +
            "', dosage: '" + esc(d.get('Дозировка', '')) +
            "', course: '" + esc(d.get('Курс', '')) +
            "', route: '" + esc(d.get('Путь введения', '')) +
            "', frequency: '" + esc(d.get('Кратность', '')) +
            "' },"
        )

    symp_drugs = []
    for d in p.get('symptomatic_therapy', []):
        symp_drugs.append(
            "{ name: '" + esc(d.get('Препарат', '')) +
            "', inn: '" + esc(d.get('МНН', '')) +
            "', dosage: '" + esc(d.get('Дозировка', '')) +
            "', course: '" + esc(d.get('Курс', '')) +
            "', route: '" + esc(d.get('Путь введения', '')) +
            "', frequency: '" + esc(d.get('Кратность', '')) +
            "' },"
        )

    code_raw = p.get('code', '0')
    code_num = '0'
    if 'пункт' in code_raw:
        code_num = code_raw.split('пункт')[-1].strip()

    lines.append("  {")
    lines.append("    id: " + code_num + ",")
    lines.append("    name: '" + esc(p['disease']) + "',")
    lines.append("    category: '" + esc(p['category']) + "',")
    lines.append("    pathogenType: '" + pt + "',")
    lines.append("    animalTypes: [" + at_ts + "],")
    lines.append("    specificTherapy: [")
    for sd in spec_drugs:
        lines.append("      " + sd)
    lines.append("    ],")
    lines.append("    symptomaticTherapy: [")
    for sd in symp_drugs:
        lines.append("      " + sd)
    lines.append("    ],")
    lines.append("  },")

lines.append("];")

lines.append("")
lines.append("export const categoryConfig: Record<DiseaseCategory, { label: string; color: string; bgColor: string; icon: string }> = {")
lines.append("  'Особо опасная': { label: 'Особо опасная', color: 'text-red-700', bgColor: 'bg-red-100', icon: '🔴' },")
lines.append("  'Инфекционная': { label: 'Инфекционная', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: '🟠' },")
lines.append("  'Инвазионная': { label: 'Инвазионная', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: '🟣' },")
lines.append("};")
lines.append("")
lines.append("export const pathogenConfig: Record<PathogenType, { label: string; icon: string }> = {")
lines.append("  'вирусная': { label: 'Вирусная', icon: '🦠' },")
lines.append("  'бактериальная': { label: 'Бактериальная', icon: '🔬' },")
lines.append("  'паразитарная': { label: 'Паразитарная', icon: '🐛' },")
lines.append("  'грибковая': { label: 'Грибковая', icon: '🍄' },")
lines.append("  'прионная': { label: 'Прионная', icon: '🧬' },")
lines.append("  'смешанная': { label: 'Смешанная', icon: '🔄' },")
lines.append("  'не указана': { label: 'Не указана', icon: '❓' },")
lines.append("};")
lines.append("")
lines.append("export const animalIcons: Record<string, string> = {")
lines.append("  'КРС': '🐄',")
lines.append("  'МРС': '🐑',")
lines.append("  'Свиньи': '🐷',")
lines.append("  'Лошади': '🐴',")
lines.append("  'Птица': '🐔',")
lines.append("  'Пчёлы': '🐝',")
lines.append("  'Рыбы': '🐟',")
lines.append("  'Норки': '🦦',")
lines.append("  'Кролики': '🐰',")
lines.append("  'Пушные звери': '🦊',")
lines.append("  'Северные олени': '🦌',")
lines.append("  'Верблюды': '🐫',")
lines.append("  'Плотоядные': '🐕',")
lines.append("  'Козы': '🐐',")
lines.append("};")

with open('/home/z/my-project/src/lib/diseases-data.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Generated diseases-data.ts with {len(data)} diseases")
