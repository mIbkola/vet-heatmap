"""
Print all real outbreaks with current threat level + disease category,
so we can decide the new level for each.
"""

import re
from pathlib import Path

DATA_FILE = Path('/home/z/my-project/src/lib/threat-data.ts')
content = DATA_FILE.read_text(encoding='utf-8')

# Match threat blocks with their id, disease, region, threatLevel, isRealData, lastUpdate, description
threat_pattern = re.compile(r"\{\s*id:\s*'([^']+)'(.*?)\n\s*\},", re.DOTALL)
matches = threat_pattern.findall(content)

def extract_field(block, field):
    m = re.search(rf"\b{field}:\s*'([^']*)'", block)
    return m.group(1) if m else None

def extract_bool(block, field):
    m = re.search(rf"\b{field}:\s*(true|false)", block)
    return m.group(1) == 'true' if m else False

# "Особо опасные" disease list (Category 1 per Приказ МСХ №62)
OSOBO_OPASNIE = {
    'Ящур', 'АЧС', 'Птичий грипп', 'Свиньи', 'Классическая чума свиней',
    'Нодулярный дерматит', 'Блютанг', 'Чума КРС', 'Заразный узелковый дерматит КРС',
    'Сибирская язва', 'Бешенство', 'Эмкар', 'Высокопатогенный грипп птиц',
    'Болезнь Ньюкасла'
}

# Diseases that indicate QUARANTINE in description (very serious)
QUARANTINE_KEYWORDS = ['карантин', 'неблагополучный пункт', 'уничтожение поголовья', 'убой', 'вспышка']

print('Real outbreaks requiring level review:')
print('=' * 130)
print(f'{"ID":4s} | {"Болезнь":35s} | {"Регион":25s} | {"Ур.":10s} | {"Особо оп.":10s} | {"Карантин":10s} | {"Дата":12s}')
print('-' * 130)

real_threats = []
for tid, block in matches:
    is_real = extract_bool(block, 'isRealData')
    if not is_real:
        continue
    disease = extract_field(block, 'disease') or ''
    region = extract_field(block, 'region') or ''
    level = extract_field(block, 'threatLevel') or ''
    last_update = extract_field(block, 'lastUpdate') or ''
    description = extract_field(block, 'description') or ''
    
    is_osobo = disease in OSOBO_OPASNIE
    has_quarantine = any(kw in description.lower() for kw in QUARANTINE_KEYWORDS)
    
    real_threats.append({
        'id': tid,
        'disease': disease,
        'region': region,
        'level': level,
        'last_update': last_update,
        'is_osobo': is_osobo,
        'has_quarantine': has_quarantine,
    })
    
    osobo_str = '✓' if is_osobo else '—'
    quar_str = '✓' if has_quarantine else '—'
    print(f'{tid:4s} | {disease[:35]:35s} | {region[:25]:25s} | {level:10s} | {osobo_str:10s} | {quar_str:10s} | {last_update:12s}')

print()
print('=' * 130)
print('SUGGESTED NEW LEVELS:')
print('=' * 130)
print('Rule: real outbreak + особо опасная + карантин → critical')
print('      real outbreak + особо опасная (без карантина) → high')
print('      real outbreak + другая болезнь → high (minimum)')
print()

for t in real_threats:
    current = t['level']
    if t['is_osobo'] and t['has_quarantine']:
        new_level = 'critical'
    elif t['is_osobo']:
        new_level = 'high'
    else:
        new_level = 'high'
    
    if current != new_level:
        arrow = f'{current} → {new_level}'
        print(f'  ID {t["id"]:4s} | {t["disease"][:35]:35s} | {arrow:25s} | особо.={t["is_osobo"]}, карантин={t["has_quarantine"]}')
    else:
        print(f'  ID {t["id"]:4s} | {t["disease"][:35]:35s} | {current:25s} | (без изменений)')
