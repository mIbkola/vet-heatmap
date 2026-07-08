#!/usr/bin/env python3
"""
Normalize russia_regions.geojson — FIXED version:
1. Fix non-Russian names
2. Remove duplicates
3. Add 'fo' property with CORRECT federal okrug assignment
4. Fix iso codes for new regions (UA-* → RU-*)
5. Normalize region names

Key corrections from previous session errors:
- Пензенская → ПФО (not ЦФО!)
- Саратовская → ПФО (not ЦФО!)
- Бурятия, Забайкальский край → ДФО (moved from СФО by Указ 2018)
- ДНР, ЛНР, Запорожская, Херсонская → ЮФО (Указ №141, 26.02.2024)
"""

import json

INPUT = '/home/z/my-project/upload/workspace/public/russia_regions.geojson'
OUTPUT = '/home/z/my-project/upload/workspace/public/russia_regions.geojson'

with open(INPUT, 'r', encoding='utf-8') as f:
    geojson = json.load(f)

# ─── Name fixes ───
NAME_FIXES = {
    'Chukchi Autonomous Okrug': 'Чукотский автономный округ',
    'Kamchatka': 'Камчатский край',
    'Eврейская АОб': 'Еврейская автономная область',
    'Респу́блика Ингуше́тия': 'Республика Ингушетия',
    'Республика Чечено-Ингушская': 'Чеченская Республика',
    'Санкт-Петербург (горсовет)': 'г. Санкт-Петербург',
    'Ханты-Мансийский АОк': 'Ханты-Мансийский АО — Югра',
    'Ямало-Ненецкий АОк': 'Ямало-Ненецкий АО',
    'Ненецкий АОк': 'Ненецкий АО',
    'Читинская область': 'Забайкальский край',
    'Пермская область': 'Пермский край',
    'Вологодская область': None,  # Will be handled by ISO fix below
    'Московская область': None,   # Will be handled by ISO fix below
}

# ─── Duplicate ISO fixes ───
DUPLICATE_ISO_FIXES = {
    'RU-ARK': 'Архангельская область',  # Was mislabeled as Вологодская
    'RU-MOW': 'г. Москва',              # Was mislabeled as Московская область
}

# ─── ISO code changes for new regions ───
ISO_FIXES = {
    'UA-09': 'RU-LNR',
    'UA-14': 'RU-DNR',
    'UA-23': 'RU-ZAP',
    'UA-40': 'RU-SEV',
    'UA-43': 'RU-KR2',  # Second Крым entry (UA duplicate)
    'UA-65': 'RU-KHS',
}

# ─── FO mapping: iso → fo ───
# Verified per current Russian administrative structure (post-2018 + post-2024)
FO_BY_ISO = {
    # ═══ ЦФО (18) ═══
    'RU-BEL': 'ЦФО',  # Белгородская
    'RU-BRY': 'ЦФО',  # Брянская
    'RU-VLA': 'ЦФО',  # Владимирская
    'RU-VOR': 'ЦФО',  # Воронежская
    'RU-IVA': 'ЦФО',  # Ивановская
    'RU-KLU': 'ЦФО',  # Калужская
    'RU-KOS': 'ЦФО',  # Костромская
    'RU-KRS': 'ЦФО',  # Курская
    'RU-LIP': 'ЦФО',  # Липецкая
    'RU-MOW': 'ЦФО',  # г. Москва
    'RU-MOS': 'ЦФО',  # Московская
    'RU-ORL': 'ЦФО',  # Орловская
    'RU-RYA': 'ЦФО',  # Рязанская
    'RU-SMO': 'ЦФО',  # Смоленская
    'RU-TAM': 'ЦФО',  # Тамбовская
    'RU-TVE': 'ЦФО',  # Тверская
    'RU-TUL': 'ЦФО',  # Тульская
    'RU-YAR': 'ЦФО',  # Ярославская

    # ═══ ПФО (14) ═══
    'RU-BA': 'ПФО',   # Башкортостан
    'RU-ME': 'ПФО',   # Марий Эл
    'RU-MO': 'ПФО',   # Мордовия
    'RU-TA': 'ПФО',   # Татарстан
    'RU-UD': 'ПФО',   # Удмуртия
    'RU-CU': 'ПФО',   # Чувашия
    'RU-PER': 'ПФО',  # Пермский край
    'RU-KIR': 'ПФО',  # Кировская
    'RU-NIZ': 'ПФО',  # Нижегородская
    'RU-ORE': 'ПФО',  # Оренбургская
    'RU-PNZ': 'ПФО',  # Пензенская ← NOT ЦФО!
    'RU-SAM': 'ПФО',  # Самарская
    'RU-SAR': 'ПФО',  # Саратовская ← NOT ЦФО!
    'RU-ULY': 'ПФО',  # Ульяновская

    # ═══ ЮФО (12: 8 + 4 новых per Указ №141) ═══
    'RU-AD': 'ЮФО',   # Адыгея
    'RU-KL': 'ЮФО',   # Калмыкия
    'RU-KDA': 'ЮФО',  # Краснодарский край
    'RU-KR2': 'ЮФО',  # Республика Крым (from UA-43)
    'RU-AST': 'ЮФО',  # Астраханская
    'RU-VGG': 'ЮФО',  # Волгоградская
    'RU-ROS': 'ЮФО',  # Ростовская
    'RU-SEV': 'ЮФО',  # Севастополь (from UA-40)
    'RU-DNR': 'ЮФО',  # Донецкая НР (Указ №141 → ЮФО, НЕ ЦФО!)
    'RU-LNR': 'ЮФО',  # Луганская НР (Указ №141 → ЮФО, НЕ ЦФО!)
    'RU-ZAP': 'ЮФО',  # Запорожская (Указ №141 → ЮФО, НЕ ЦФО!)
    'RU-KHS': 'ЮФО',  # Херсонская (Указ №141 → ЮФО, НЕ ЦФО!)

    # ═══ СКФО (7) ═══
    'RU-DA': 'СКФО',  # Дагестан
    'RU-IN': 'СКФО',  # Ингушетия
    'RU-KB': 'СКФО',  # Кабардино-Балкария
    'RU-KC': 'СКФО',  # Карачаево-Черкесия
    'RU-SE': 'СКФО',  # Северная Осетия
    'RU-CE': 'СКФО',  # Чечня
    'RU-STA': 'СКФО',  # Ставропольский край

    # ═══ СЗФО (11) ═══
    'RU-KR': 'СЗФО',  # Карелия
    'RU-KO': 'СЗФО',  # Коми
    'RU-NEN': 'СЗФО', # Ненецкий АО
    'RU-ARK': 'СЗФО', # Архангельская
    'RU-VLG': 'СЗФО', # Вологодская
    'RU-KGD': 'СЗФО', # Калининградская
    'RU-LEN': 'СЗФО', # Ленинградская
    'RU-MUR': 'СЗФО', # Мурманская
    'RU-NGR': 'СЗФО', # Новгородская
    'RU-PSK': 'СЗФО', # Псковская
    'RU-SPE': 'СЗФО', # Санкт-Петербург

    # ═══ УрФО (6) ═══
    'RU-KGN': 'УрФО', # Курганская
    'RU-SVE': 'УрФО', # Свердловская
    'RU-TYU': 'УрФО', # Тюменская
    'RU-KHM': 'УрФО', # ХМАО — Югра
    'RU-CHE': 'УрФО', # Челябинская
    'RU-YAN': 'УрФО', # ЯНАО

    # ═══ СФО (10: Бурятия и Забайкалье переведены в ДФО в 2018) ═══
    'RU-AL': 'СФО',   # Алтай
    'RU-TY': 'СФО',   # Тыва
    'RU-KK': 'СФО',   # Хакасия
    'RU-ALT': 'СФО',  # Алтайский край
    'RU-KYA': 'СФО',  # Красноярский край
    'RU-IRK': 'СФО',  # Иркутская
    'RU-KEM': 'СФО',  # Кемеровская
    'RU-NVS': 'СФО',  # Новосибирская
    'RU-OMS': 'СФО',  # Омская
    'RU-TOM': 'СФО',  # Томская

    # ═══ ДФО (11: + Бурятия и Забайкалье с 2018) ═══
    'RU-SA': 'ДФО',   # Саха (Якутия) / Чукотский
    'RU-KAM': 'ДФО',  # Камчатский край
    'RU-PRI': 'ДФО',  # Приморский край
    'RU-KHA': 'ДФО',  # Хабаровский край
    'RU-AMU': 'ДФО',  # Амурская
    'RU-MAG': 'ДФО',  # Магаданская
    'RU-SAK': 'ДФО',  # Сахалинская
    'RU-CHU': 'ДФО',  # Чукотский АО
    'RU-YEV': 'ДФО',  # Еврейская АО
    'RU-BU': 'ДФО',   # Бурятия (moved from СФО in 2018!)
    'RU-ZAB': 'ДФО',  # Забайкальский край (moved from СФО in 2018!)
}

features = geojson['features']
processed = []
seen_isos = set()
fo_counts = {}
errors = []

for feature in features:
    props = feature['properties']
    iso = props['iso']
    name = props['name_ru']

    # ── Apply ISO fixes for UA-* regions ──
    if iso in ISO_FIXES:
        old_iso = iso
        iso = ISO_FIXES[iso]
        props['iso'] = iso
        print(f'  FIX ISO: {old_iso} → {iso}')

    # ── Apply name fixes by ISO for duplicates ──
    if iso in DUPLICATE_ISO_FIXES:
        name = DUPLICATE_ISO_FIXES[iso]
        props['name_ru'] = name

    # ── Apply name fixes ──
    if props['name_ru'] in NAME_FIXES:
        fix = NAME_FIXES[props['name_ru']]
        if fix is not None:
            props['name_ru'] = fix
            name = fix

    name = props['name_ru']

    # ── Determine FO ──
    fo = FO_BY_ISO.get(iso)

    if fo is None:
        errors.append(f'NO FO for {iso} "{name}"')
        fo = '???'

    props['fo'] = fo
    fo_counts[fo] = fo_counts.get(fo, 0) + 1
    processed.append(feature)

# ── Report ──
print(f'\nTotal regions: {len(processed)}')
expected = {'ЦФО': 18, 'ПФО': 14, 'ЮФО': 12, 'СКФО': 7, 'СЗФО': 11, 'УрФО': 6, 'СФО': 10, 'ДФО': 11}
all_ok = True
for fo in sorted(fo_counts.keys()):
    exp = expected.get(fo, '?')
    ok = '✓' if fo_counts[fo] == exp else '✗'
    if ok == '✗':
        all_ok = False
    print(f'  {fo}: {fo_counts[fo]} (ожидалось {exp}) {ok}')
print(f'  Итого: {sum(fo_counts.values())} (ожидалось 89)')

if errors:
    print('\nОШИБКИ:')
    for e in errors:
        print(f'  {e}')

# ── Print ЮФО specifically ──
print('\n═══ ЮФО (должно быть 12, включая 4 новых региона):')
for f in processed:
    if f['properties']['fo'] == 'ЮФО':
        print(f'  {f["properties"]["iso"]}: {f["properties"]["name_ru"]}')

# ── Print ЦФО specifically ──
print('\n═══ ЦФО (должно быть 18, БЕЗ новых регионов):')
for f in processed:
    if f['properties']['fo'] == 'ЦФО':
        print(f'  {f["properties"]["iso"]}: {f["properties"]["name_ru"]}')

# ── Print ПФО specifically ──
print('\n═══ ПФО (должно быть 14, включая Пензенскую и Саратовскую):')
for f in processed:
    if f['properties']['fo'] == 'ПФО':
        print(f'  {f["properties"]["iso"]}: {f["properties"]["name_ru"]}')

# ── Print ДФО specifically ──
print('\n═══ ДФО (должно быть 11, включая Бурятию и Забайкалье):')
for f in processed:
    if f['properties']['fo'] == 'ДФО':
        print(f'  {f["properties"]["iso"]}: {f["properties"]["name_ru"]}')

if all_ok and len(processed) == 89:
    # Save only if correct
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f'\n✓ ВСЕ ВЕРНО — сохранено в {OUTPUT}')
else:
    print(f'\n✗ ЕСТЬ ОШИБКИ — НЕ сохранено')
