#!/usr/bin/env python3
"""
Generate Category 4 — Зооантропонозы (items 52-53 — Туляремия, Лихорадка Ку).
Other 10 зооантропонозы already present in map from categories 2-3.
2 diseases × 5 regions = 10 entries.
"""

diseases = {
    'Туляремия': {
        'short': 'Туляремия',
        'animals': ['КРС', 'МРС', 'Пушные', 'Грызуны'],
        'etiology': 'Бактериальная',
        'season': 'Весна-Осень (активность клещей)',
        'recommendations': [
            ('Борьба с грызунами', 'Проводить дератизацию в животноводческих помещениях и кормохранилищах. Уничтожать грызунов-переносчиков.', 'urgent'),
            ('Акарицидная обработка', 'Проводить обработку животных и помещений акарицидами против клещей-переносчиков.', 'urgent'),
            ('Защита людей', 'Обеспечить работников СИЗ. При симптомах — немедленное обращение к врачу. Зооантропоноз!', 'immediate'),
        ],
        'prevention': [
            'Дератизация животноводческих помещений',
            'Акарицидная обработка против клещей',
            'Защита водоёмов от загрязнения грызунами',
            'Использование СИЗ при работе с животными',
            'Контроль численности грызунов на пастбищах',
            'Санитарно-просветительская работа с населением',
            'Своевременное обращение к врачу при симптомах',
        ],
        'vaccines': [('Вакцина против туляремии живая сухая (для людей)', 'ФГУП «Микроген»', 'Однократно, ревакцинация через 5 лет', 'Применяется для групп риска (охотники, ветспециалисты)')],
        'sources': ['Россельхознадзор — fsvps.gov.ru', 'Роспотребнадзор — rospotrebnadzor.ru'],
    },
    'Лихорадка Ку': {
        'short': 'Лихорадка Ку',
        'animals': ['КРС', 'МРС'],
        'etiology': 'Бактериальная (риккетсия)',
        'season': 'Круглый год (пик — весна, отёл/окот)',
        'recommendations': [
            ('Серологический мониторинг', 'Проводить серологическое исследование поголовья на антитела к Coxiella burnetii.', 'planned'),
            ('Изоляция больных', 'Изолировать животных с признаками заболевания. Симптоматическое лечение.', 'urgent'),
            ('Защита людей при отёле/окоте', 'Использовать СИЗ при приёме родов. Утилизировать послед сжиганием.', 'immediate'),
        ],
        'prevention': [
            'Серологический мониторинг поголовья',
            'Использование СИЗ при приёме родов',
            'Утилизация последов и абортов сжиганием',
            'Пастеризация молока перед употреблением',
            'Дезинфекция родильных отделений',
            'Карантин для вновь поступивших животных',
            'Санитарно-просветительская работа',
        ],
        'vaccines': [('Вакцинация животных не применяется routinely', '—', '—', 'Вакцина против лихорадки Ку для животных в РФ не применяется routinely')],
        'sources': ['Россельхознадзор — fsvps.gov.ru', 'Роспотребнадзор — rospotrebnadzor.ru'],
    },
}

regions = {
    'Ростовская область': {
        'lat_base': 47.80, 'lng_base': 40.50,
        'threat_levels': {
            'Туляремия': 'medium',
            'Лихорадка Ку': 'low',
        },
        'districts': {
            'Туляремия': 'Степные районы (восток области), поймы рек',
            'Лихорадка Ку': 'Молочные хозяйства области',
        },
    },
    'Краснодарский край': {
        'lat_base': 45.35, 'lng_base': 38.85,
        'threat_levels': {
            'Туляремия': 'medium',
            'Лихорадка Ку': 'low',
        },
        'districts': {
            'Туляремия': 'Степные районы края, дельта Кубани',
            'Лихорадка Ку': 'Молочные хозяйства края',
        },
    },
    'Республика Адыгея': {
        'lat_base': 44.60, 'lng_base': 40.10,
        'threat_levels': {
            'Туляремия': 'medium',
            'Лихорадка Ку': 'low',
        },
        'districts': {
            'Туляремия': 'Степные и предгорные районы, пойма реки Белая',
            'Лихорадка Ку': 'Молочные хозяйства республики',
        },
    },
    'Республика Крым': {
        'lat_base': 45.30, 'lng_base': 34.00,
        'threat_levels': {
            'Туляремия': 'medium',
            'Лихорадка Ку': 'low',
        },
        'districts': {
            'Туляремия': 'Степные районы Крыма, поймы рек',
            'Лихорадка Ку': 'Молочные хозяйства степной зоны',
        },
    },
    'Севастополь': {
        'lat_base': 44.62, 'lng_base': 33.52,
        'threat_levels': {
            'Туляремия': 'low',
            'Лихорадка Ку': 'low',
        },
        'districts': {
            'Туляремия': 'Пригородные зоны, ЛПХ',
            'Лихорадка Ку': 'Личные подсобные хозяйства',
        },
    },
}

excel_context = {
    'Туляремия': 'Природные очаги в степной зоне. Грызуны — резервуар. Трансмиссивный путь (клещи). Зооантропоноз — передаётся людям через укусы клещей, контакт с больными животными, загрязнённую воду.',
    'Лихорадка Ку': 'Трансмиссивный путь. Риккетсия Coxiella burnetii. Атипичная пневмония у людей. Высокая контагиозность — заражение происходит при контакте с больными животными, их выделениями, абортированными плодами, последом, а также через молоко.',
}

region_additions = {
    'Ростовская область': 'Ростовская область — регион с обширными степными природными очагами туляремии и значительным поголовьем КРС.',
    'Краснодарский край': 'Краснодарский край — регион с тёплым климатом, способствующим активности клещей-переносчиков.',
    'Республика Адыгея': 'Республика Адыгея — республика со степными и предгорными природными очагами туляремии.',
    'Республика Крым': 'Республика Крым — полуостров с обширными степными природными очагами туляремии.',
    'Севастополь': 'Севастополь — город-регион с ограниченным животноводством, угроза заноса минимальна.',
}

coord_offsets = {
    'Туляремия': (0.95, -0.85),
    'Лихорадка Ку': (-0.95, 0.85),
}

radius_map = {'high': 50, 'medium': 35, 'low': 25}

next_id = 210  # continue from 209 + 1

entries_by_region = {}

for region_name, region_data in regions.items():
    region_entries = []
    for disease_name, disease_info in diseases.items():
        threat_level = region_data['threat_levels'][disease_name]
        district = region_data['districts'][disease_name]
        base_desc = excel_context[disease_name]
        region_add = region_additions[region_name]
        desc = f'{base_desc} {region_add} На территории {region_name} проводятся плановые противоэпизоотические мероприятия и мониторинг.'

        lat_off, lng_off = coord_offsets[disease_name]
        lat = round(region_data['lat_base'] + lat_off, 2)
        lng = round(region_data['lng_base'] + lng_off, 2)
        radius = radius_map[threat_level]

        animals_str = repr(disease_info['animals'])

        recs_str = ""
        for title, desc_r, priority in disease_info['recommendations']:
            recs_str += f"""
      {{
        title: '{title}',
        description: '{desc_r}',
        priority: '{priority}',
      }},"""

        prev_str = ""
        for step in disease_info['prevention']:
            prev_str += f"""
      '{step}',"""

        vacc_str = ""
        for v_name, v_manuf, v_sched, v_note in disease_info['vaccines']:
            vacc_str += f"""
      {{
        name: '{v_name}',
        manufacturer: '{v_manuf}',
        schedule: '{v_sched}',
        note: '{v_note}',
      }},"""

        src_str = ""
        for source in disease_info['sources']:
            src_str += f"""
      '{source}',"""

        desc_escaped = desc.replace("'", "\\'")

        entry = f"""  {{
    id: '{next_id}',
    disease: '{disease_name}',
    diseaseShort: '{disease_info['short']}',
    region: '{region_name}',
    district: '{district}',
    threatLevel: '{threat_level}',
    lat: {lat},
    lng: {lng},
    radius: {radius},
    description: '{desc_escaped}',
    affectedAnimals: {animals_str},
    season: '{disease_info['season']}',
    lastUpdate: '2026-06-17',
    isRealData: false,
    dataSources: [
      {{ name: 'Приказ Минсельхоза РФ от 09.03.2011 №62', url: 'https://fsvps.gov.ru', date: '2011', type: 'official' }},
      {{ name: 'Таблица угроз ЮФО (2025-2026) — Категория 4: Зооантропонозы', url: 'https://fsvps.gov.ru/jepizooticheskaja-situacija/rossija', date: '2026', type: 'official' }},
    ],
    recommendations: [{recs_str}
    ],
    preventionSteps: [{prev_str}
    ],
    vaccines: [{vacc_str}
    ],
    sources: [{src_str}
    ],
  }},"""

        region_entries.append(entry)
        next_id += 1

    entries_by_region[region_name] = region_entries

total = 0
for region_name in ['Ростовская область', 'Краснодарский край', 'Республика Адыгея', 'Республика Крым', 'Севастополь']:
    entries = entries_by_region[region_name]
    if entries:
        print(f"  // ===== {region_name.upper()} — КАТЕГОРИЯ 4: ЗООАНТРОПОНОЗЫ (НОВЫЕ) =====")
        print()
        for entry in entries:
            print(entry)
            print()
        total += len(entries)

print(f"// Total new entries: {total}")
