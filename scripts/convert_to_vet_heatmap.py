#!/usr/bin/env python3
"""
Convert our threat-data.ts (3,915 entries) → vet-heatmap outbreaks.json format.

Source: /home/z/my-project/upload/workspace/src/lib/threat-data.ts
Target: /tmp/vet-heatmap/public/data/outbreaks.json (replaces existing 570 entries)

Schema (per src/types/domain.ts):
{
  id, disease_key, disease, disease_group, region, region_geo, date,
  species, cases, deaths, status, source, source_url?, lat?, lon?, notes?
}
"""
import json
import re
import sys

SRC = '/home/z/my-project/upload/workspace/src/lib/threat-data.ts'
DST = '/tmp/vet-heatmap/public/data/outbreaks.json'

# ─── Region RU→EN (from vet-heatmap/src/data/regions.ts) ───
REGION_MAP = {
    "Москва": "Moskva", "Московская область": "Moskovskaya", "г. Москва": "Moskva",
    "г. Санкт-Петербург": "City of St. Petersburg", "Санкт-Петербург": "City of St. Petersburg",
    "Севастополь": "Sevastopol", "г. Севастополь": "Sevastopol",
    "Дагестан": "Dagestan", "Республика Дагестан": "Dagestan",
    "Чеченская Республика": "Chechnya", "Чечня": "Chechnya",
    "Кабардино-Балкарская Республика": "Kabardin-Balkar", "Кабардино-Балкария": "Kabardin-Balkar",
    "Ингушетия": "Ingush", "Республика Ингушетия": "Ingush",
    "Карачаево-Черкесская Республика": "Karachay-Cherkess", "Карачаево-Черкесия": "Karachay-Cherkess",
    "Татарстан": "Tatarstan", "Республика Татарстан": "Tatarstan",
    "Башкортостан": "Bashkortostan", "Республика Башкортостан": "Bashkortostan",
    "Республика Мордовия": "Mordovia", "Мордовия": "Mordovia",
    "Республика Саха (Якутия)": "Sakha (Yakutia)", "Якутия": "Sakha (Yakutia)",
    "Республика Бурятия": "Buryat", "Бурятия": "Buryat",
    "Республика Коми": "Komi", "Коми": "Komi",
    "Республика Марий Эл": "Mariy-El", "Марий Эл": "Mariy-El",
    "Республика Карелия": "Karelia", "Карелия": "Karelia",
    "Республика Хакасия": "Khakass", "Хакасия": "Khakass",
    "Республика Тыва": "Tuva", "Тыва": "Tuva", "Тува": "Tuva",
    "Алтай": "Gorno-Altay", "Республика Алтай": "Gorno-Altay",
    "Республика Адыгея": "Adygey", "Адыгея": "Adygey",
    "Республика Калмыкия": "Kalmyk", "Калмыкия": "Kalmyk",
    "Чувашская Республика": "Chuvash", "Чувашия": "Chuvash",
    "Удмуртская Республика": "Udmurt", "Удмуртия": "Udmurt",
    "Республика Северная Осетия-Алания": "North Ossetia",
    "Северная Осетия — Алания": "North Ossetia",
    "Северная Осетия-Алания": "North Ossetia",
    "Краснодарский край": "Krasnodar", "Ставропольский край": "Stavropol'",
    "Алтайский край": "Altay", "Красноярский край": "Krasnoyarsk",
    "Приморский край": "Primor'ye", "Хабаровский край": "Khabarovsk",
    "Забайкальский край": "Chita", "Пермский край": "Perm'",
    "Камчатский край": "Kamchatka",
    "Астраханская область": "Astrakhan'", "Ростовская область": "Rostov",
    "Челябинская область": "Chelyabinsk", "Новосибирская область": "Novosibirsk",
    "Ленинградская область": "Leningrad", "Саратовская область": "Saratov",
    "Владимирская область": "Vladimir", "Тверская область": "Tver'",
    "Самарская область": "Samara", "Волгоградская область": "Volgograd",
    "Орловская область": "Orel", "Калужская область": "Kaluga",
    "Ульяновская область": "Ul'yanovsk", "Архангельская область": "Arkhangel'sk",
    "Вологодская область": "Vologda", "Томская область": "Tomsk",
    "Амурская область": "Amur", "Белгородская область": "Belgorod",
    "Кировская область": "Kirov", "Пензенская область": "Penza",
    "Тамбовская область": "Tambov", "Нижегородская область": "Nizhegorod",
    "Мурманская область": "Murmansk", "Иркутская область": "Irkutsk",
    "Псковская область": "Pskov", "Новгородская область": "Novgorod",
    "Свердловская область": "Sverdlovsk", "Оренбургская область": "Orenburg",
    "Тюменская область": "Tyumen'", "Брянская область": "Bryansk",
    "Курская область": "Kursk", "Липецкая область": "Lipetsk",
    "Костромская область": "Kostroma", "Курганская область": "Kurgan",
    "Ивановская область": "Ivanovo", "Омская область": "Omsk",
    "Рязанская область": "Ryazan'", "Смоленская область": "Smolensk",
    "Тульская область": "Tula", "Ярославская область": "Yaroslavl'",
    "Воронежская область": "Voronezh", "Сахалинская область": "Sakhalin",
    "Кемеровская область": "Kemerovo", "Кемеровская область — Кузбасс": "Kemerovo",
    "Калининградская область": "Kaliningrad",
    "Чукотский автономный округ": "Chukchi Autonomous Okrug", "Чукотка": "Chukchi Autonomous Okrug",
    "Ненецкий автономный округ": "Nenets", "Ненецкий АО": "Nenets",
    "Ханты-Мансийский автономный округ — Югра": "Khanty-Mansiy",
    "Ханты-Мансийский АО": "Khanty-Mansiy", "Ханты-Мансийский АО — Югра": "Khanty-Mansiy",
    "Югра": "Khanty-Mansiy",
    "Ямало-Ненецкий автономный округ": "Yamal-Nenets", "Ямало-Ненецкий АО": "Yamal-Nenets",
    "Еврейская автономная область": "Yevrey", "Еврейская АО": "Yevrey",
    "Республика Крым": "Crimea", "Крым": "Crimea",
    # New regions (no shapeName in their GeoJSON yet)
    "Донецкая Народная Республика": "Donetsk", "ДНР": "Donetsk",
    "Луганская Народная Республика": "Luhansk", "ЛНР": "Luhansk",
    "Запорожская область": "Zaporizhzhia",
    "Херсонская область": "Kherson",
    "Магаданская область": "Magadan",
}

# ─── Disease RU → disease_key (canonical keys) ───
DISEASE_KEY_MAP = {
    # Canonical 21 keys from DiseaseKey type
    'АЧС': 'asf', 'Африканская чума свиней': 'asf',
    'Классическая чума свиней': 'csf',
    'Ящур': 'fmd',
    'Сибирская язва': 'anthrax',
    'Бешенство': 'rabies',
    'Птичий грипп': 'hpai', 'Высокопатогенный грипп птиц': 'hpai', 'Грипп птиц': 'hpai',
    'Болезнь Ньюкасла': 'newcastle',
    'Блютанг': 'bluetongue',
    'Бруцеллёз': 'brucellosis',
    'Туберкулёз КРС': 'btb', 'Туберкулез КРС': 'btb',
    'Чума мелких жвачных': 'ppr',
    'Нодулярный дерматит': 'lsd', 'Заразный узелковый дерматит КРС': 'lsd',
    'Лептоспироз': 'lepto',
    'Инфекционная анемия лошадей': 'eia', 'ИНАН': 'eia',
    'Лейкоз КРС': 'leukosis',
    'Варроатоз': 'varroosis',
    'Нозематоз': 'nosemosis',
    'Трихинеллёз': 'trichinellosis', 'Трихинеллез': 'trichinellosis',
    'Сальмонеллёз': 'avian_salmonellosis', 'Сальмонеллез': 'avian_salmonellosis',
    'Эмкар': 'other',  # No canonical key — use 'other' with note
    'Чума КРС': 'other',
    'Листериоз': 'other',
    'Пастереллёз': 'other',
    'ИРТ': 'other',
    'Вирусная диарея': 'other',
    'Парагрипп-3': 'other',
    'РРСС': 'other',
    'Рожа свиней': 'other',
    'Паратуберкулёз': 'other',
    'Эшерихиоз': 'other',
    'Хламидиоз': 'other',
    'Микоплазмоз': 'other',
    'Болезнь Марека': 'other',
    'Инфекционный бурсит': 'other',
    'Оспа овец и коз': 'other',
    'Энтеротоксемия': 'other',
    'Эхинококкоз': 'other',
    'Токсоплазмоз': 'other',
    'Пироплазмоз': 'other',
    'Анаплазмоз': 'other',
    'Тейлериоз': 'other',
    'Гиподерматоз': 'other',
    'Цистицеркозы': 'other',
    'Трихомоноз': 'other',
    'Туляремия': 'other',
    'Лихорадка Ку': 'other',
}

# Disease group classification
def disease_group(disease_name, animals):
    animals_lower = [a.lower() for a in animals]
    has_pig = any('свин' in a or 'кабан' in a for a in animals_lower)
    has_cattle = any('крс' in a or 'крупн' in a or 'мрс' in a or 'овц' in a or 'коз' in a or 'олен' in a or 'кор' in a for a in animals_lower)
    has_poultry = any('птиц' in a or 'кури' in a or 'гус' in a or 'ут' in a for a in animals_lower)
    has_horse = any('лош' in a or 'кон' in a for a in animals_lower)
    has_bee = any('пчёл' in a or 'пчел' in a for a in animals_lower)
    
    if has_bee: return 'Multi-species'
    if 'бешен' in disease_name.lower(): return 'Multi-species'
    if 'тулярем' in disease_name.lower(): return 'Wildlife'
    if has_poultry and (has_pig or has_cattle): return 'Multi-species'
    if has_poultry: return 'Avian'
    if has_pig: return 'Swine'
    if has_cattle: return 'Ruminant'
    if has_horse: return 'Equine/Wildlife'
    return 'Multi-species'

# Species normalization (Russian → their canonical English)
SPECIES_MAP = {
    'КРС': 'Cattle', 'МРС': 'Sheep/Goats', 'Свиньи': 'Swine (domestic)',
    'Дикие кабаны': 'Wild boar', 'Птица': 'Poultry', 'Птицы': 'Poultry',
    'Лошади': 'Horse', 'Собаки': 'Other', 'Кошки': 'Other',
    'Лисицы': 'Fox', 'Грызуны': 'Other', 'Зайцы': 'Other',
    'Пчёлы': 'Other', 'Олени': 'Other',
    'Все виды': 'Other', 'Медведи': 'Other',
}

def normalize_species(animals):
    """Convert our animals list to their SusceptibleSpecies format."""
    out = []
    for a in animals:
        out.append(SPECIES_MAP.get(a, 'Other'))
    # Dedupe, prefer non-Other
    seen = set()
    result = []
    for s in out:
        if s not in seen:
            seen.add(s)
            result.append(s)
    if not result: return ['Other']
    # If only 'Other', that's fine
    return result

def species_string(animals):
    """For free-form species field."""
    return ', '.join(animals)

# ─── Parse threat-data.ts ───
print("Reading threat-data.ts...")
with open(SRC, 'r') as f:
    content = f.read()

# Use regex to extract entry blocks
# Each entry starts with "{\n    id:" and ends with "  },"
# This is brittle but works for our generated file
entry_pattern = re.compile(
    r'\{\s*\n\s*id:\s*\'(\d+)\',\s*\n'
    r'\s*disease:\s*\'([^\']+)\',\s*\n'
    r'\s*diseaseShort:\s*\'([^\']+)\',\s*\n'
    r'\s*region:\s*\'([^\']+)\',\s*\n'
    r'\s*district:\s*\'([^\']+)\',\s*\n'
    r'\s*threatLevel:\s*\'(critical|high|medium|low)\',\s*\n'
    r'\s*lat:\s*([\d.-]+),\s*\n'
    r'\s*lng:\s*([\d.-]+),\s*\n'
    r'\s*radius:\s*(\d+),\s*\n'
    r'\s*description:\s*\'([^\']*(?:\\.[^\']*)*)\',\s*\n'
    r'\s*affectedAnimals:\s*\[([^\]]*)\],\s*\n'
    r'\s*season:\s*\'([^\']+)\',\s*\n'
    r'\s*lastUpdate:\s*\'([^\']+)\',\s*\n'
    r'\s*isRealData:\s*(true|false),\s*\n'
    r'(?:\s*outbreakStatus:\s*\'(active|monitoring|resolved)\',\s*\n)?'
, re.DOTALL)

matches = entry_pattern.findall(content)
print(f"Matched {len(matches)} entries via regex")

# For entries that didn't match, fall back to a simpler parser
all_ids_found = set(m[0] for m in matches)
all_ids = set(re.findall(r"id: '(\d+)'", content))
missing = all_ids - all_ids_found
print(f"Missing: {len(missing)} entries (will skip for now)")

outbreaks = []
next_id = 1

for m in matches:
    (eid, disease, disease_short, region, district, level,
     lat, lng, radius, desc, animals_str, season, last_update,
     is_real, outbreak_status) = m
    
    # Parse animals
    animals = re.findall(r"'([^']+)'", animals_str)
    
    # Determine disease_key
    dkey = DISEASE_KEY_MAP.get(disease, 'other')
    
    # Determine region_geo
    region_geo = REGION_MAP.get(region, '')
    if not region_geo:
        # Try fuzzy
        for ru, en in REGION_MAP.items():
            if region.startswith(ru) or ru.startswith(region):
                region_geo = en
                break
    
    # Determine status
    if is_real == 'true':
        status = 'Ongoing' if outbreak_status in ('', 'active', 'monitoring') else 'Resolved'
        source = 'curated'
    else:
        status = 'Resolved'
        source = 'curated'  # All our reference data is "curated" — derived from Приказ МСХ №62
    
    # Cases/deaths: we don't have these in our data, use 0
    cases = 0
    deaths = 0
    
    # Notes: include description and threatLevel
    notes_parts = []
    if is_real == 'true':
        notes_parts.append(f"[Реальная вспышка, уровень: {level}]")
        if outbreak_status:
            notes_parts.append(f"статус: {outbreak_status}")
    else:
        notes_parts.append(f"[Справочные данные, уровень: {level}]")
    notes_parts.append(f"Район: {district}. Сезон: {season}. Радиус зоны риска: {radius} км.")
    # Truncate description
    desc_clean = desc.replace("\\'", "'").replace("\\n", " ")
    if len(desc_clean) > 500:
        desc_clean = desc_clean[:497] + '...'
    notes_parts.append(desc_clean)
    notes = ' '.join(notes_parts)
    
    species_canonical = normalize_species(animals)
    group = disease_group(disease, animals)
    
    entry = {
        "id": next_id,
        "disease_key": dkey,
        "disease": disease,
        "disease_group": group,
        "region": region,
        "region_geo": region_geo,
        "date": last_update,
        "species": species_string(animals),
        "cases": cases,
        "deaths": deaths,
        "status": status,
        "source": source,
        "source_url": "https://fsvps.gov.ru",
        "lat": float(lat),
        "lon": float(lng),
        "notes": notes,
    }
    outbreaks.append(entry)
    next_id += 1

# Build dataset
dataset = {
    "updated": "2026-07-05",
    "sources": ["curated"],
    "total_outbreaks": len(outbreaks),
    "outbreaks": outbreaks,
}

with open(DST, 'w', encoding='utf-8') as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"\n✓ Written {len(outbreaks)} outbreaks to {DST}")

# Stats
print("\nBy disease_key:")
from collections import Counter
dk = Counter(o['disease_key'] for o in outbreaks)
for k, c in dk.most_common():
    print(f"  {k}: {c}")

print("\nBy status:")
st = Counter(o['status'] for o in outbreaks)
for k, c in st.most_common():
    print(f"  {k}: {c}")

print("\nBy disease_group:")
dg = Counter(o['disease_group'] for o in outbreaks)
for k, c in dg.most_common():
    print(f"  {k}: {c}")

print("\nRegion_geo coverage:")
matched = sum(1 for o in outbreaks if o['region_geo'])
print(f"  Matched: {matched}/{len(outbreaks)} ({100*matched/len(outbreaks):.1f}%)")
unmatched = Counter(o['region'] for o in outbreaks if not o['region_geo'])
print(f"  Top unmatched regions:")
for r, c in unmatched.most_common(10):
    print(f"    {r}: {c}")
