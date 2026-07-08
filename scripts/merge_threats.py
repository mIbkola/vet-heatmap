#!/usr/bin/env python3
"""Merge our 3915 threats with existing 570 outbreaks."""
import json

SRC = 'upload/workspace/public/data/threats.json'  # наш источник
EXISTING = 'public/data/outbreaks.json'
DST = 'public/data/outbreaks.json'

REGION_MAP = {
    "Москва": "Moskva", "Московская область": "Moskovskaya", "г. Москва": "Moskva",
    "г. Санкт-Петербург": "City of St. Petersburg", "Санкт-Петербург": "City of St. Petersburg",
    "Севастополь": "Sevastopol", "г. Севастополь": "Sevastopol",
    "Дагестан": "Dagestan", "Республика Дагестан": "Dagestan",
    "Чеченская Республика": "Chechnya", "Чечня": "Chechnya",
    "Кабардино-Балкарская Республика": "Kabardin-Balkar",
    "Ингушетия": "Ingush", "Республика Ингушетия": "Ingush",
    "Карачаево-Черкесская Республика": "Karachay-Cherkess",
    "Татарстан": "Tatarstan", "Республика Татарстан": "Tatarstan",
    "Башкортостан": "Bashkortostan", "Республика Башкортостан": "Bashkortostan",
    "Республика Мордовия": "Mordovia", "Мордовия": "Mordovia",
    "Республика Саха (Якутия)": "Sakha (Yakutia)", "Якутия": "Sakha (Yakutia)",
    "Республика Бурятия": "Buryat", "Бурятия": "Buryat",
    "Республика Коми": "Komi", "Коми": "Komi",
    "Республика Марий Эл": "Mariy-El", "Марий Эл": "Mariy-El",
    "Республика Карелия": "Karelia", "Карелия": "Karelia",
    "Республика Хакасия": "Khakass", "Хакасия": "Khakass",
    "Республика Тыва": "Tuva", "Тыва": "Tuva",
    "Алтай": "Gorno-Altay", "Республика Алтай": "Gorno-Altay",
    "Адыгея": "Adygey", "Республика Адыгея": "Adygey",
    "Калмыкия": "Kalmyk", "Республика Калмыкия": "Kalmyk",
    "Чувашская Республика": "Chuvash", "Чувашия": "Chuvash",
    "Удмуртская Республика": "Udmurt", "Удмуртия": "Udmurt",
    "Северная Осетия — Алания": "North Ossetia", "Северная Осетия-Алания": "North Ossetia",
    "Республика Северная Осетия-Алания": "North Ossetia",
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
    "Чукотский автономный округ": "Chukchi Autonomous Okrug",
    "Ненецкий автономный округ": "Nenets", "Ненецкий АО": "Nenets",
    "Ханты-Мансийский автономный округ — Югра": "Khanty-Mansiy",
    "Ханты-Мансийский АО": "Khanty-Mansiy", "Ханты-Мансийский АО — Югра": "Khanty-Mansiy",
    "Югра": "Khanty-Mansiy",
    "Ямало-Ненецкий автономный округ": "Yamal-Nenets", "Ямало-Ненецкий АО": "Yamal-Nenets",
    "Еврейская автономная область": "Yevrey", "Еврейская АО": "Yevrey",
    "Республика Крым": "Crimea", "Крым": "Crimea",
    "Донецкая Народная Республика": "", "Луганская Народная Республика": "",
    "Запорожская область": "", "Херсонская область": "",
    "Магаданская область": "Magadan",
}

DISEASE_KEY = {
    'АЧС': 'asf', 'Африканская чума свиней': 'asf',
    'Классическая чума свиней': 'csf', 'Ящур': 'fmd',
    'Сибирская язва': 'anthrax', 'Бешенство': 'rabies',
    'Птичий грипп': 'hpai', 'Высокопатогенный грипп птиц': 'hpai', 'Грипп птиц': 'hpai',
    'Болезнь Ньюкасла': 'newcastle', 'Блютанг': 'bluetongue',
    'Бруцеллёз': 'brucellosis', 'Туберкулёз КРС': 'btb', 'Туберкулез КРС': 'btb',
    'Чума мелких жвачных': 'ppr',
    'Нодулярный дерматит': 'lsd', 'Заразный узелковый дерматит КРС': 'lsd',
    'Лептоспироз': 'lepto', 'Инфекционная анемия лошадей': 'eia', 'ИНАН': 'eia',
    'Лейкоз КРС': 'leukosis', 'Варроатоз': 'varroosis', 'Нозематоз': 'nosemosis',
    'Трихинеллёз': 'trichinellosis', 'Трихинеллез': 'trichinellosis',
    'Сальмонеллёз': 'avian_salmonellosis', 'Сальмонеллез': 'avian_salmonellosis',
}

def get_group(d, animals):
    al = [a.lower() for a in animals] if animals else []
    has_pig = any('свин' in a or 'кабан' in a for a in al)
    has_cattle = any(k in a for a in al for k in ['крс','мрс','овц','коз','олен','кор'])
    has_poultry = any(k in a for a in al for k in ['птиц','кури','гус','ут'])
    has_horse = any('лош' in a or 'кон' in a for a in al)
    has_bee = any('пчёл' in a or 'пчел' in a for a in al)
    if has_bee: return 'Multi-species'
    if 'бешен' in d.lower(): return 'Multi-species'
    if 'тулярем' in d.lower(): return 'Wildlife'
    if has_poultry and (has_pig or has_cattle): return 'Multi-species'
    if has_poultry: return 'Avian'
    if has_pig: return 'Swine'
    if has_cattle: return 'Ruminant'
    if has_horse: return 'Equine/Wildlife'
    return 'Multi-species'

def get_species(animals):
    if not animals: return 'Other'
    a = animals[0].lower()
    if 'крс' in a: return 'Cattle'
    if 'мрс' in a or 'овц' in a or 'коз' in a: return 'Sheep/Goats'
    if 'свин' in a: return 'Swine (domestic)'
    if 'кабан' in a: return 'Wild boar'
    if 'птиц' in a: return 'Poultry'
    if 'лош' in a: return 'Horse'
    if 'лисиц' in a: return 'Fox'
    return 'Other'

def get_status(t):
    if not t.get('isRealData'): return 'Resolved'
    s = t.get('outbreakStatus')
    if s in ('active','monitoring'): return 'Ongoing'
    return 'Resolved'

print("Reading existing outbreaks.json...")
with open(EXISTING) as f:
    existing = json.load(f)
print(f"  Existing: {existing['total_outbreaks']} outbreaks")

print("Reading our threats.json...")
with open(SRC) as f:
    our = json.load(f)
print(f"  Our threats: {len(our)}")

new_outbreaks = []
next_id = max(o['id'] for o in existing['outbreaks']) + 1

for t in our:
    disease = t['disease']
    region_ru = t['region']
    animals = t.get('affectedAnimals', [])
    dkey = DISEASE_KEY.get(disease, 'other')
    region_geo = REGION_MAP.get(region_ru, '')
    if not region_geo:
        for ru, en in REGION_MAP.items():
            if region_ru.startswith(ru) or ru.startswith(region_ru):
                region_geo = en
                break
    status = get_status(t)
    species_str = ', '.join(animals) if animals else 'Other'
    notes_parts = []
    if t.get('isRealData'):
        notes_parts.append(f"[Реальная вспышка, {t.get('outbreakStatus', 'unknown')}]")
    else:
        notes_parts.append("[Справочные данные]")
    if t.get('district'): notes_parts.append(f"Район: {t['district']}")
    if t.get('season'): notes_parts.append(f"Сезон: {t['season']}")
    if t.get('description'):
        desc = t['description'][:400]
        if len(t['description']) > 400: desc += '...'
        notes_parts.append(desc)
    
    outbreak = {
        "id": next_id,
        "disease_key": dkey,
        "disease": disease,
        "disease_group": get_group(disease, animals),
        "region": region_ru,
        "region_geo": region_geo,
        "date": t['lastUpdate'],
        "species": species_str,
        "cases": 0,
        "deaths": 0,
        "status": status,
        "source": "curated",
        "source_url": "https://fsvps.gov.ru",
        "lat": t.get('lat'),
        "lon": t.get('lng'),
        "notes": ' | '.join(notes_parts),
    }
    new_outbreaks.append(outbreak)
    next_id += 1

all_outbreaks = existing['outbreaks'] + new_outbreaks
all_sources = list(set(existing.get('sources', []) + ['curated']))
merged = {
    "updated": "2026-07-06",
    "sources": all_sources,
    "total_outbreaks": len(all_outbreaks),
    "outbreaks": all_outbreaks,
}
with open(DST, 'w', encoding='utf-8') as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)

print(f"\n✓ Written {len(all_outbreaks)} outbreaks ({existing['total_outbreaks']} old + {len(new_outbreaks)} new)")
from collections import Counter
st = Counter(o['status'] for o in all_outbreaks)
print(f"By status: {dict(st)}")
