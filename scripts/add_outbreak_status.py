#!/usr/bin/env python3
"""
Добавляет явное поле outbreakStatus к каждой реальной вспышке (isRealData: true).
Логика авто-расчёта синхронизирована с getOutbreakStatus() в threat-data.ts:
  - <30 дней  → active
  - 30-60 дней → monitoring
  - >60 дней → resolved

Также делает несколько семантических переопределений для демонстрации:
  - Если в description есть "снят", "ликвидир", "погашен" → resolved
  - Если есть "наблюдение", "мониторинг" → monitoring
"""

import re
from datetime import date

TODAY = date(2026, 6, 17)
ACTIVE_DAYS = 30
MONITORING_DAYS = 60

FILE = '/home/z/my-project/src/lib/threat-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

def derive_status(last_update_str: str, description: str) -> str:
    """Возвращает статус по дате + ключевым словам в описании."""
    desc_lower = description.lower()
    # Семантические override
    if any(k in desc_lower for k in ['карантин снят', 'ликвидир', 'погашен', 'очаг устранён']):
        return 'resolved'
    if any(k in desc_lower for k in ['наблюдение', 'мониторинг', 'под контролем']):
        return 'monitoring'

    # Авто-расчёт по давности
    try:
        last = date.fromisoformat(last_update_str)
    except ValueError:
        return 'active'
    diff = (TODAY - last).days
    if diff <= ACTIVE_DAYS:
        return 'active'
    if diff <= MONITORING_DAYS:
        return 'monitoring'
    return 'resolved'

# Pattern: находим блок threat-объекта и заменяем "isRealData: true," на "isRealData: true,\n    outbreakStatus: '<status>',"
# Используем regex с группами: id, disease, region, threatLevel, lastUpdate, description (первые ~200 символов)
pattern = re.compile(
    r"(\{\s*id:\s*'(\d+)'.*?disease:\s*'([^']+)'.*?region:\s*'([^']+)'.*?"
    r"threatLevel:\s*'(\w+)'.*?"
    r"description:\s*'([^']+)',.*?"
    r"lastUpdate:\s*'(\d{4}-\d{2}-\d{2})',\s*\n"
    r"(\s*)isRealData:\s*(true|false),)",
    re.DOTALL
)

count_real = 0
count_already = 0
count_reference = 0

def replace_match(m):
    global count_real, count_already, count_reference
    full_match = m.group(1)
    threat_id = m.group(2)
    disease = m.group(3)
    region = m.group(4)
    level = m.group(5)
    description = m.group(6)
    last_update = m.group(7)
    indent = m.group(8)
    is_real = m.group(9)

    if is_real == 'false':
        count_reference += 1
        return full_match  # не трогаем reference

    # Проверим, не стоит ли уже outbreakStatus
    if 'outbreakStatus' in full_match:
        count_already += 1
        return full_match

    status = derive_status(last_update, description)
    count_real += 1
    print(f"  id={threat_id:>3} | {disease[:25]:<25} | {region[:25]:<25} | {level:<10} | {last_update} | {status}")
    return full_match.replace(
        f"isRealData: true,",
        f"isRealData: true,\n{indent}outbreakStatus: '{status}',"
    )

print("Adding outbreakStatus to real outbreaks:")
print("-" * 110)
new_content = pattern.sub(replace_match, content)

print("-" * 110)
print(f"Real outbreaks updated:    {count_real}")
print(f"Already had outbreakStatus: {count_already}")
print(f"Reference (skipped):        {count_reference}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"\n✓ File written: {FILE}")
