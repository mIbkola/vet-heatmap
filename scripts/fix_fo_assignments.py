#!/usr/bin/env python3
"""
Fix FO assignments in already-normalized GeoJSON.
Only changes the 'fo' field — names and ISOs are already correct.
"""
import json

PATH = '/home/z/my-project/upload/workspace/public/russia_regions.geojson'

with open(PATH, 'r', encoding='utf-8') as f:
    geojson = json.load(f)

# Corrections needed:
FO_FIXES = {
    'RU-PNZ': 'ПФО',   # was ЦФО — WRONG, Пензенская область is ПФО
    'RU-BU':  'ДФО',   # was СФО — moved to ДФО in 2018
    'RU-ZAB': 'ДФО',   # was СФО — moved to ДФО in 2018
}

# Also fix: RU-SA name is wrong — it should be Республика Саха (Якутия), not Чукотский АОк
NAME_FIXES = {
    'RU-SA': 'Республика Саха (Якутия)',
}

for feature in geojson['features']:
    iso = feature['properties']['iso']
    if iso in FO_FIXES:
        old_fo = feature['properties']['fo']
        feature['properties']['fo'] = FO_FIXES[iso]
        print(f'  FIX FO: {iso} {feature["properties"]["name_ru"]} : {old_fo} → {FO_FIXES[iso]}')
    if iso in NAME_FIXES:
        old_name = feature['properties']['name_ru']
        feature['properties']['name_ru'] = NAME_FIXES[iso]
        print(f'  FIX NAME: {iso} {old_name} → {NAME_FIXES[iso]}')

# Count by FO
fo_counts = {}
for feature in geojson['features']:
    fo = feature['properties']['fo']
    fo_counts[fo] = fo_counts.get(fo, 0) + 1

expected = {'ЦФО': 18, 'ПФО': 14, 'ЮФО': 12, 'СКФО': 7, 'СЗФО': 11, 'УрФО': 6, 'СФО': 10, 'ДФО': 11}
total = 0
all_ok = True
print(f'\nРаспределение по ФО:')
for fo in sorted(expected.keys()):
    got = fo_counts.get(fo, 0)
    exp = expected[fo]
    ok = '✓' if got == exp else '✗'
    if got != exp:
        all_ok = False
    print(f'  {fo}: {got} (ожидалось {exp}) {ok}')
    total += got
print(f'  Итого: {total}')

if all_ok and total == 89:
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f'\n✓ ВСЕ ВЕРНО — сохранено')
else:
    print(f'\n✗ ЕСТЬ РАСХОЖДЕНИЯ')
    # Print details for wrong FOs
    for fo, exp in expected.items():
        got = fo_counts.get(fo, 0)
        if got != exp:
            print(f'\n{fo} (получено {got}, ожидалось {exp}):')
            for feature in geojson['features']:
                if feature['properties']['fo'] == fo:
                    print(f'  {feature["properties"]["iso"]}: {feature["properties"]["name_ru"]}')
