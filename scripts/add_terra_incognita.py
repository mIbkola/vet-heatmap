#!/usr/bin/env python3
"""
Добавляет 4 области (Донецк, Луганск, Запорожье, Херсон) в regions.geojson
и municipalities.geojson как "terra incognita" — отдельные фичи с
terra_incognita: true, не привязанные к РФ (без iso_code RU-*, без федерального округа).

Источник: GADM Ukraine (https://gadm.org/UKR.html) — открытые данные.
"""
import json

REGIONS_PATH = 'public/data/russia_regions.geojson'
MUNI_PATH = 'public/data/russia_municipalities.geojson'
UKR_PATH = '/tmp/gadm41_UKR_1.json'

# 4 области — с русскими названиями, без ISO-кода РФ
TERRA_INCOGNITA = {
    "Donets'k": {"name_ru": "Донецкая область", "shapeName": "Donetsk-TI"},
    "Luhans'k": {"name_ru": "Луганская область", "shapeName": "Luhansk-TI"},
    "Zaporizhia": {"name_ru": "Запорожская область", "shapeName": "Zaporizhia-TI"},
    "Kherson": {"name_ru": "Херсонская область", "shapeName": "Kherson-TI"},
}

# Загружаем Ukraine GADM
with open(UKR_PATH) as f:
    ukr = json.load(f)

# ═══ 1. Добавляем в regions.geojson ═══
with open(REGIONS_PATH) as f:
    regions = json.load(f)

# Проверяем — может уже есть
existing_names = {(f['properties'].get('shapeName') or '') for f in regions['features']}

added = 0
for f in ukr['features']:
    name1 = f['properties'].get('NAME_1', '')
    if name1 not in TERRA_INCOGNITA:
        continue
    info = TERRA_INCOGNITA[name1]
    if info['shapeName'] in existing_names:
        print(f"  SKIP (уже есть): {info['name_ru']}")
        continue

    new_feature = {
        "type": "Feature",
        "properties": {
            "shapeName": info['shapeName'],
            "shapeName_ru": info['name_ru'],
            "iso_a2": "TI",  # Terra Incognita
            "admin": "Terra Incognita",
            "name_ru": info['name_ru'],
            "iso_code": "TI-" + name1[:3].upper(),  # условный код
            "population_mln": 0,
            "pigs_per_km2": 0,
            "cattle_per_km2": 0,
            "poultry_per_km2": 0,
            "federal_district": "Terra Incognita",
            "terra_incognita": True,
        },
        "geometry": f['geometry'],
    }
    regions['features'].append(new_feature)
    added += 1
    print(f"  + {info['name_ru']} ({info['shapeName']})")

with open(REGIONS_PATH, 'w', encoding='utf-8') as f:
    json.dump(regions, f, ensure_ascii=False, indent=2)
print(f"\n✓ regions.geojson: +{added} фич (всего {len(regions['features'])})")

# ═══ 2. Добавляем в municipalities.geojson ═══
with open(MUNI_PATH) as f:
    muni = json.load(f)

# Скачиваем GADM level 2 для Украины чтобы получить районы этих 4 областей
import urllib.request, zipfile, io, os
if not os.path.exists('/tmp/gadm41_UKR_2.json'):
    print("\nСкачиваю GADM Ukraine level 2...")
    urllib.request.urlretrieve(
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_2.json.zip",
        "/tmp/gadm_ukr_2.zip"
    )
    with zipfile.ZipFile('/tmp/gadm_ukr_2.zip') as z:
        z.extractall('/tmp/')
    print("  ✓ скачано")

with open('/tmp/gadm41_UKR_2.json') as f:
    ukr2 = json.load(f)

existing_gids = {(f['properties'].get('GID_2') or '') for f in muni['features']}
added_muni = 0
for f in ukr2['features']:
    name1 = f['properties'].get('NAME_1', '')
    if name1 not in TERRA_INCOGNITA:
        continue
    info = TERRA_INCOGNITA[name1]
    gid2 = f['properties'].get('GID_2', '')
    if gid2 in existing_gids:
        continue

    new_feature = {
        "type": "Feature",
        "properties": {
            **f['properties'],
            "terra_incognita": True,
            "NAME_1_REGION_RU": info['name_ru'],
        },
        "geometry": f['geometry'],
    }
    muni['features'].append(new_feature)
    added_muni += 1

with open(MUNI_PATH, 'w', encoding='utf-8') as f:
    json.dump(muni, f, ensure_ascii=False, indent=2)
print(f"\n✓ municipalities.geojson: +{added_muni} фич (всего {len(muni['features'])})")

# Статистика
print("\n═══ Итог ═══")
print(f"Regions: {len(regions['features'])} (было 85, +{added} TI)")
print(f"Municipalities: {len(muni['features'])} (было 2445, +{added_muni} TI)")
