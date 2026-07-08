"""
Analyze threat-data.ts distribution by:
1. Threat level (critical / high / medium / low)
2. Region
3. Real outbreak vs reference data
4. Cross-tab: level × region
5. Cross-tab: level × real-vs-reference
6. Disease frequency (top 20)
"""

import re
from collections import Counter, defaultdict
from pathlib import Path

DATA_FILE = Path('/home/z/my-project/src/lib/threat-data.ts')

# Read file
content = DATA_FILE.read_text(encoding='utf-8')
print(f'File size: {len(content):,} chars, {content.count(chr(10)):,} lines\n')

# Split by threat object blocks. Each threat starts with "id: '" and ends with "},"
# Use a regex to extract threat blocks
threat_pattern = re.compile(r"\{\s*id:\s*'([^']+)'(.*?)\n\s*\},", re.DOTALL)
matches = threat_pattern.findall(content)
print(f'Total threat blocks parsed: {len(matches)}\n')

# Field extractors
def extract_field(block: str, field: str) -> str | None:
    """Extract a simple string field value like `field: 'value'`."""
    m = re.search(rf"\b{field}:\s*'([^']*)'", block)
    return m.group(1) if m else None

def extract_bool(block: str, field: str) -> bool:
    m = re.search(rf"\b{field}:\s*(true|false)", block)
    return m.group(1) == 'true' if m else False

# Parse all threats
threats = []
for tid, block in matches:
    threats.append({
        'id': tid,
        'disease': extract_field(block, 'disease'),
        'region': extract_field(block, 'region'),
        'threatLevel': extract_field(block, 'threatLevel'),
        'lastUpdate': extract_field(block, 'lastUpdate'),
        'isRealData': extract_bool(block, 'isRealData'),
    })

print('=' * 70)
print('1. РАСПРЕДЕЛЕНИЕ ПО УРОВНЮ УГРОЗЫ')
print('=' * 70)
level_counts = Counter(t['threatLevel'] for t in threats)
level_order = ['critical', 'high', 'medium', 'low']
total = len(threats)
for level in level_order:
    count = level_counts.get(level, 0)
    pct = count / total * 100 if total else 0
    bar = '█' * int(pct / 2) + '░' * (25 - int(pct / 2))
    print(f'  {level:10s}: {count:4d} ({pct:5.1f}%) | {bar}')
print(f'  {"ИТОГО":10s}: {total:4d}')

print()
print('=' * 70)
print('2. РАСПРЕДЕЛЕНИЕ ПО РЕГИОНАМ')
print('=' * 70)
region_counts = Counter(t['region'] for t in threats)
for region, count in region_counts.most_common():
    pct = count / total * 100
    print(f'  {region:35s}: {count:3d} ({pct:5.1f}%)')

print()
print('=' * 70)
print('3. РЕАЛЬНЫЕ ВСПЫШКИ vs СПРАВОЧНЫЕ ДАННЫЕ')
print('=' * 70)
real_counts = Counter('real' if t['isRealData'] else 'reference' for t in threats)
for kind, count in real_counts.most_common():
    pct = count / total * 100
    print(f'  {kind:12s}: {count:3d} ({pct:5.1f}%)')

print()
print('=' * 70)
print('4. УРОВЕНЬ УГРОЗЫ × РЕГИОН')
print('=' * 70)
# header
header_regions = [r for r, _ in region_counts.most_common()]
short_names = {
    'Ростовская область': 'Ростов',
    'Краснодарский край': 'Краснодар',
    'Республика Адыгея': 'Адыгея',
    'Республика Крым': 'Крым',
    'Севастополь': 'Севаст.',
}
print(f'  {"Уровень":12s} | ' + ' | '.join(f'{short_names.get(r, r[:8]):>8s}' for r in header_regions) + ' | ИТОГО')
print('  ' + '-' * (14 + 11 * len(header_regions) + 8))
level_region = defaultdict(lambda: defaultdict(int))
for t in threats:
    level_region[t['threatLevel']][t['region']] += 1
for level in level_order:
    row = level_region[level]
    cells = ' | '.join(f'{row.get(r, 0):>8d}' for r in header_regions)
    row_total = sum(row.get(r, 0) for r in header_regions)
    print(f'  {level:12s} | {cells} | {row_total:>5d}')

print()
print('=' * 70)
print('5. УРОВЕНЬ УГРОЗЫ × РЕАЛЬНАЯ vs СПРАВОЧНАЯ')
print('=' * 70)
level_real = defaultdict(lambda: defaultdict(int))
for t in threats:
    kind = 'real' if t['isRealData'] else 'reference'
    level_real[t['threatLevel']][kind] += 1
print(f'  {"Уровень":12s} | {"Реальные":>10s} | {"Справочные":>12s} | {"Доля реальных":>15s}')
print('  ' + '-' * 60)
for level in level_order:
    real_n = level_real[level]['real']
    ref_n = level_real[level]['reference']
    total_n = real_n + ref_n
    pct_real = real_n / total_n * 100 if total_n else 0
    print(f'  {level:12s} | {real_n:>10d} | {ref_n:>12d} | {pct_real:>14.1f}%')

print()
print('=' * 70)
print('6. ТОП-20 БОЛЕЗНЕЙ ПО ЧАСТОТЕ')
print('=' * 70)
disease_counts = Counter(t['disease'] for t in threats)
for i, (disease, count) in enumerate(disease_counts.most_common(20), 1):
    # count how many of these are real outbreaks
    real_n = sum(1 for t in threats if t['disease'] == disease and t['isRealData'])
    real_marker = f' [real: {real_n}]' if real_n > 0 else ''
    print(f'  {i:2d}. {disease:40s} : {count:3d}{real_marker}')

print()
print('=' * 70)
print('7. РЕАЛЬНЫЕ ВСПЫШКИ — ДЕТАЛИ')
print('=' * 70)
real_threats = [t for t in threats if t['isRealData']]
print(f'Всего реальных вспышек: {len(real_threats)}\n')
print(f'  {"ID":5s} | {"Болезнь":35s} | {"Регион":25s} | {"Уровень":10s} | {"Дата":12s}')
print('  ' + '-' * 100)
for t in sorted(real_threats, key=lambda x: x['lastUpdate'], reverse=True)[:25]:
    disease = (t['disease'] or '')[:35]
    region = (t['region'] or '')[:25]
    print(f'  {t["id"]:5s} | {disease:35s} | {region:25s} | {t["threatLevel"]:10s} | {t["lastUpdate"]:12s}')
if len(real_threats) > 25:
    print(f'  ... и ещё {len(real_threats) - 25} записей')
