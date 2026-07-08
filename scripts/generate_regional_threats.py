#!/usr/bin/env python3
"""
Generate src/lib/generate-regional-threats.ts — a function that creates
reference threat entries for all 84 regions outside ЮФО.

Strategy:
- Disease templates (44 diseases) with shared recommendations/prevention/vaccines
- Region profiles (84 regions) with coordinates and livestock tags
- Threat level calculated from disease category + region relevance
- All generated entries are isRealData: false
"""

import json

OUTPUT = '/home/z/my-project/upload/workspace/src/lib/generate-regional-threats.ts'

# ═══════════════════════════════════════════
# Disease templates
# ═══════════════════════════════════════════
DISEASES = [
    # Category 1: Особо опасные (items 1-11 of Приказ МСХ №62)
    {'name': 'Ящур', 'short': 'Ящур', 'cat': 1, 'tags': ['cattle', 'pigs', 'sheep'],
     'animals': ['КРС', 'МРС', 'Свиньи'], 'season': 'Весна-Осень',
     'baseHigh': ['cattle_heavy', 'pig_heavy', 'border_south'],
     'desc': '{d} представляет потенциальную угрозу для {r} в связи с наличием поголовья восприимчивых животных. Угроза заноса вируса сохраняется из сопредельных государств и соседних регионов. Проводится плановая вакцинация и мониторинг.'},

    {'name': 'АЧС', 'short': 'АЧС', 'cat': 1, 'tags': ['pigs'],
     'animals': ['Свиньи', 'Дикие кабаны'], 'season': 'Круглый год (пик — осень/зима)',
     'baseHigh': ['pig_heavy', 'forest'],
     'desc': '{d} остаётся одной из наиболее серьёзных угроз для свиноводства {r}. Занос вируса возможен от диких кабанов и через заражённую продукцию. Усиление биобезопасности свинокомплексов — приоритетная задача.'},

    {'name': 'Бешенство', 'short': 'Бешенство', 'cat': 1, 'tags': ['universal'],
     'animals': ['Все виды млекопитающих', 'Люди (зооантропоноз)'], 'season': 'Круглый год',
     'baseHigh': ['forest', 'south'],
     'desc': '{d} регистрируется на территории {r} среди диких и домашних животных. Зооантропонозная опасность требует обязательной вакцинации домашних животных и профилактических мероприятий.'},

    {'name': 'Птичий грипп', 'short': 'Птичий грипп', 'cat': 1, 'tags': ['poultry'],
     'animals': ['Домашняя птица', 'Дикие водоплавающие'], 'season': 'Осень-Весна (миграция птиц)',
     'baseHigh': ['poultry_heavy', 'migration_route'],
     'desc': '{d} представляет угрозу для птицеводства {r}. Миграция диких птиц создаёт риск заноса вируса. Проводится мониторинг и профилактические мероприятия на птицефабриках.'},

    {'name': 'Нодулярный дерматит', 'short': 'Нод. дерматит', 'cat': 1, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Лето (пик активности переносчиков)',
     'baseHigh': ['cattle_heavy', 'south'],
     'desc': '{d} КРС представляет угрозу для животноводства {r}. Болезнь передаётся через укусы кровососущих насекомых, что делает летний период наиболее опасным. Проводится вакцинация поголовья.'},

    {'name': 'Блютанг', 'short': 'Блютанг', 'cat': 1, 'tags': ['cattle', 'sheep'],
     'animals': ['КРС', 'МРС'], 'season': 'Лето-Осень (активность комаров)',
     'baseHigh': ['cattle_heavy', 'sheep_heavy', 'south'],
     'desc': '{d} представляет потенциальную угрозу для {r} в связи с наличием поголовья КРС и МРС. Передаётся кровососущими насекомыми. Вакцинация не проводится, основной акцент — на мониторинг и ограничение перемещений.'},

    {'name': 'Сибирская язва', 'short': 'Сиб. язва', 'cat': 1, 'tags': ['cattle', 'universal'],
     'animals': ['КРС', 'МРС', 'Лошади', 'Свиньи'], 'season': 'Лето (пастбищный сезон)',
     'baseHigh': ['cattle_heavy', 'sheep_heavy', 'historic_anthrax'],
     'desc': '{d} представляет потенциальную угрозу для {r}. На территории могут находиться стационарно неблагополучные пункты с почвенными очагами возбудителя. Зооантропоноз. Проводится вакцинация в неблагополучных пунктах.'},

    {'name': 'Чума КРС', 'short': 'Чума КРС', 'cat': 1, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Круглый год',
     'baseHigh': [],
     'desc': '{d} включена в перечень особо опасных болезней. Россия свободна от чумы КРС, однако угроза заноса сохраняется. Проводится мониторинг в соответствии с международными обязательствами.'},

    {'name': 'Классическая чума свиней', 'short': 'Кл. чума свиней', 'cat': 1, 'tags': ['pigs'],
     'animals': ['Свиньи'], 'season': 'Круглый год',
     'baseHigh': [],
     'desc': '{d} включена в перечень особо опасных болезней. На территории {r} проводятся профилактические мероприятия и мониторинг.'},

    {'name': 'Оспа овец и коз', 'short': 'Оспа МРС', 'cat': 1, 'tags': ['sheep'],
     'animals': ['МРС'], 'season': 'Зима-Весна',
     'baseHigh': ['sheep_heavy'],
     'desc': '{d} представляет угрозу для овцеводства и козоводства {r}. Болезнь высококонтагиозна, может вызывать значительный экономический ущерб. Проводится вакцинация в неблагополучных регионах.'},

    {'name': 'Болезнь Ньюкасла', 'short': 'Б. Ньюкасла', 'cat': 1, 'tags': ['poultry'],
     'animals': ['Куры', 'Индейки', 'Другая домашняя птица'], 'season': 'Круглый год',
     'baseHigh': ['poultry_heavy'],
     'desc': '{d} представляет угрозу для птицеводства {r}. Вирус высококонтагиозен, может передаваться от диких птиц. Проводится обязательная вакцинация птицы.'},

    # Category 2: Инфекционные болезни (items 12-31)
    {'name': 'Бруцеллёз', 'short': 'Бруцеллёз', 'cat': 2, 'tags': ['cattle', 'sheep'],
     'animals': ['КРС', 'МРС'], 'season': 'Круглый год',
     'baseHigh': ['cattle_heavy', 'sheep_heavy', 'south'],
     'desc': '{d} регистрируется на территории {r}. Зооантропонозная опасность заболевания требует усиления мониторинга и проведения диагностических исследований. Проводится оздоровление неблагополучных пунктов.'},

    {'name': 'Туберкулёз КРС', 'short': 'Туберкулёз КРС', 'cat': 2, 'tags': ['cattle'],
     'animals': ['КРС', 'МРС', 'Птица'], 'season': 'Круглый год',
     'baseHigh': ['cattle_heavy'],
     'desc': '{d} представляет угрозу для животноводства {r}. Зооантропоноз. Проводятся плановые туберкулинизации и оздоровительные мероприятия.'},

    {'name': 'Лейкоз КРС', 'short': 'Лейкоз КРС', 'cat': 2, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Круглый год',
     'baseHigh': ['cattle_heavy'],
     'desc': '{d} является хронической инфекцией КРС, регистрируемой на территории {r}. Проводятся серологические исследования и оздоровление стада.'},

    {'name': 'ИРТ', 'short': 'ИРТ', 'cat': 2, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Круглый год (пик — зима)',
     'baseHigh': ['cattle_heavy'],
     'desc': '{d} представляет угрозу для молочного скотоводства {r}. Передаётся воздушно-капельным путём, особенно опасен в зимний период. Проводится вакцинация и мониторинг.'},

    {'name': 'Вирусная диарея', 'short': 'Вир. диарея', 'cat': 2, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Круглый год',
     'baseHigh': ['cattle_heavy'],
     'desc': '{d} КРС регистрируется на территории {r}. Наносит экономический ущерб молочному и мясному скотоводству. Проводится диагностический мониторинг и вакцинация.'},

    {'name': 'Парагрипп-3', 'short': 'Парагрипп-3', 'cat': 2, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Зима-Весна',
     'baseHigh': [],
     'desc': '{d} КРС регистрируется на территории {r}. Респираторная инфекция, осложняемая вторичной микрофлорой. Проводится вакцинация.'},

    {'name': 'Лептоспироз', 'short': 'Лептоспироз', 'cat': 2, 'tags': ['cattle', 'pigs', 'universal'],
     'animals': ['КРС', 'МРС', 'Свиньи'], 'season': 'Весна-Лето',
     'baseHigh': ['cattle_heavy', 'pig_heavy'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Источник — грызуны и больные животные. Проводится вакцинация и дератизация.'},

    {'name': 'Сальмонеллёз', 'short': 'Сальмонеллёз', 'cat': 2, 'tags': ['cattle', 'pigs', 'poultry'],
     'animals': ['КРС', 'МРС', 'Свиньи', 'Птица'], 'season': 'Круглый год',
     'baseHigh': ['poultry_heavy', 'pig_heavy'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Поражает молодняк сельскохозяйственных животных и птицу. Проводятся профилактические мероприятия.'},

    {'name': 'Листериоз', 'short': 'Листериоз', 'cat': 2, 'tags': ['cattle', 'sheep', 'universal'],
     'animals': ['КРС', 'МРС', 'Пушные'], 'season': 'Зима-Весна',
     'baseHigh': ['sheep_heavy'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Вызывает аборты у животных. Проводятся диагностические исследования и соблюдение ветеринарно-санитарных правил.'},

    {'name': 'Пастереллёз', 'short': 'Пастереллёз', 'cat': 2, 'tags': ['cattle', 'pigs', 'poultry'],
     'animals': ['КРС', 'МРС', 'Свиньи', 'Птица'], 'season': 'Весна-Осень',
     'baseHigh': ['cattle_heavy', 'poultry_heavy'],
     'desc': '{d} регистрируется на территории {r}. Возникает как вторичная инфекция при стрессах и нарушениях содержания. Проводится вакцинация в неблагополучных хозяйствах.'},

    {'name': 'Энтеротоксемия', 'short': 'Энтеротоксемия', 'cat': 2, 'tags': ['cattle', 'sheep'],
     'animals': ['КРС', 'МРС'], 'season': 'Весна-Лето',
     'baseHigh': ['sheep_heavy'],
     'desc': '{d} регистрируется на территории {r}. Особенно опасна для овец и коз при переводе на пастбищное содержание. Проводится вакцинация.'},

    {'name': 'Паратуберкулёз', 'short': 'Паратуберкулёз', 'cat': 2, 'tags': ['cattle', 'sheep'],
     'animals': ['КРС', 'МРС'], 'season': 'Круглый год',
     'baseHigh': ['cattle_heavy'],
     'desc': '{d} регистрируется на территории {r}. Хроническая инфекция ЖКТ КРС и МРС. Проводятся диагностические исследования и мероприятия по оздоровлению.'},

    {'name': 'РРСС', 'short': 'РРСС', 'cat': 2, 'tags': ['pigs'],
     'animals': ['Свиньи'], 'season': 'Круглый год',
     'baseHigh': ['pig_heavy'],
     'desc': '{d} представляет угрозу для свиноводства {r}. Вызывает репродуктивные нарушения и респираторные симптомы. Проводится вакцинация и мониторинг.'},

    {'name': 'Рожа свиней', 'short': 'Рожа свиней', 'cat': 2, 'tags': ['pigs'],
     'animals': ['Свиньи'], 'season': 'Лето-Осень',
     'baseHigh': [],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Проводится вакцинация свиней и соблюдение ветеринарно-санитарных правил.'},

    {'name': 'Хламидиоз', 'short': 'Хламидиоз', 'cat': 2, 'tags': ['cattle', 'sheep', 'poultry'],
     'animals': ['КРС', 'МРС', 'Птица'], 'season': 'Круглый год',
     'baseHigh': [],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Вызывает аборты, конъюнктивиты и респираторные заболевания. Проводятся диагностические исследования.'},

    {'name': 'Микоплазмоз', 'short': 'Микоплазмоз', 'cat': 2, 'tags': ['poultry', 'cattle', 'pigs'],
     'animals': ['Птица', 'КРС', 'Свиньи'], 'season': 'Круглый год',
     'baseHigh': ['poultry_heavy'],
     'desc': '{d} регистрируется на территории {r}. Вызывает респираторные заболевания у птицы и млекопитающих. Проводится мониторинг и профилактика.'},

    {'name': 'Болезнь Марека', 'short': 'Б-нь Марека', 'cat': 2, 'tags': ['poultry'],
     'animals': ['Птица'], 'season': 'Круглый год',
     'baseHigh': ['poultry_heavy'],
     'desc': '{d} представляет угрозу для птицеводства {r}. Онкогенная вирусная инфекция птицы. Проводится обязательная вакцинация суточного молодняка.'},

    {'name': 'Инфекционный бурсит', 'short': 'Бурсит (Гамборо)', 'cat': 2, 'tags': ['poultry'],
     'animals': ['Птица'], 'season': 'Круглый год',
     'baseHigh': ['poultry_heavy'],
     'desc': '{d} представляет угрозу для птицеводства {r}. Поражает иммунную систему молодняка птицы. Проводится вакцинация и соблюдение биобезопасности.'},

    {'name': 'Эшерихиоз', 'short': 'Эшерихиоз', 'cat': 2, 'tags': ['cattle', 'pigs'],
     'animals': ['Телята', 'Поросята'], 'season': 'Круглый год',
     'baseHigh': ['cattle_heavy', 'pig_heavy'],
     'desc': '{d} регистрируется на территории {r}. Поражает молодняк сельскохозяйственных животных. Проводятся профилактические мероприятия и вакцинация маточного поголовья.'},

    # Category 3: Инвазионные болезни (items 32-42)
    {'name': 'Эхинококкоз', 'short': 'Эхинококкоз', 'cat': 3, 'tags': ['cattle', 'sheep', 'universal'],
     'animals': ['КРС', 'МРС', 'Собаки'], 'season': 'Круглый год',
     'baseHigh': ['sheep_heavy', 'cattle_heavy'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Передаётся через собак — дефинитивных хозяев. Проводится дегельминтизация собак и ветеринарно-санитарная экспертиза.'},

    {'name': 'Трихинеллёз', 'short': 'Трихинеллёз', 'cat': 3, 'tags': ['pigs', 'universal'],
     'animals': ['Свиньи', 'Пушные', 'Дикие кабаны'], 'season': 'Круглый год',
     'baseHigh': ['pig_heavy', 'forest'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Заражение через мясо диких животных и свиней. Проводится трихинеллоскопия туш.'},

    {'name': 'Токсоплазмоз', 'short': 'Токсоплазмоз', 'cat': 3, 'tags': ['cattle', 'sheep', 'universal'],
     'animals': ['КРС', 'МРС', 'Свиньи', 'Кошки'], 'season': 'Круглый год',
     'baseHigh': ['sheep_heavy'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Вызывает аборты у животных. Проводятся диагностические исследования.'},

    {'name': 'Цистицеркозы', 'short': 'Цистицеркозы', 'cat': 3, 'tags': ['cattle', 'pigs'],
     'animals': ['КРС', 'Свиньи'], 'season': 'Круглый год',
     'baseHigh': [],
     'desc': '{d} регистрируется на территории {r}. Личиночные стадии цестод у КРС и свиней. Проводится ветеринарно-санитарная экспертиза мяса.'},

    {'name': 'Пироплазмоз', 'short': 'Пироплазмоз', 'cat': 3, 'tags': ['cattle', 'horses'],
     'animals': ['КРС', 'Лошади', 'Собаки'], 'season': 'Весна-Осень (активность клещей)',
     'baseHigh': ['cattle_heavy', 'horse_heavy', 'south'],
     'desc': '{d} регистрируется на территории {r}. Трансмиссивная болезнь, передаётся клещами. Пик заболеваемости — в период активности переносчиков. Проводится обработка от клещей.'},

    {'name': 'Анаплазмоз', 'short': 'Анаплазмоз', 'cat': 3, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Весна-Осень (активность клещей)',
     'baseHigh': ['cattle_heavy', 'south'],
     'desc': '{d} регистрируется на территории {r}. Трансмиссивная болезнь КРС, передаётся клещами. Проводится обработка животных от эктопаразитов.'},

    {'name': 'Тейлериоз', 'short': 'Тейлериоз', 'cat': 3, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Весна-Осень (активность клещей)',
     'baseHigh': ['cattle_heavy', 'south'],
     'desc': '{d} регистрируется на территории {r}. Протозойная болезнь КРС, передаётся клещами. Проводится обработка от клещей и профилактические обработки.'},

    {'name': 'Гиподерматоз', 'short': 'Гиподерматоз', 'cat': 3, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Осень-Зима (личинки под кожей)',
     'baseHigh': ['cattle_heavy'],
     'desc': '{d} регистрируется на территории {r}. Личинки оводов под кожей КРС. Проводится осенне-зимняя обработка животных.'},

    {'name': 'Варроатоз', 'short': 'Варроатоз', 'cat': 3, 'tags': ['bees'],
     'animals': ['Пчёлы'], 'season': 'Весна-Осень (пик — конец лета)',
     'baseHigh': ['agricultural'],
     'desc': '{d} представляет угрозу для пчеловодства {r}. Клещ Varroa destructor ослабляет пчелиные семьи. Проводятся обработки и мониторинг заклещёванности.'},

    {'name': 'Нозематоз', 'short': 'Нозематоз', 'cat': 3, 'tags': ['bees'],
     'animals': ['Пчёлы'], 'season': 'Весна (пик — после зимовки)',
     'baseHigh': [],
     'desc': '{d} представляет угрозу для пчеловодства {r}. Протозойная болезнь пчёл, особенно после неблагоприятной зимовки. Проводятся весенние обработки и дезинфекция ульев.'},

    {'name': 'Трихомоноз', 'short': 'Трихомоноз', 'cat': 3, 'tags': ['cattle'],
     'animals': ['КРС'], 'season': 'Круглый год',
     'baseHigh': [],
     'desc': '{d} регистрируется на территории {r}. Передаётся при случке. Вызывает аборты и бесплодие у КРС. Проводятся диагностические исследования.'},

    # Category 4: Зооантропонозы (new additions)
    {'name': 'Туляремия', 'short': 'Туляремия', 'cat': 4, 'tags': ['universal'],
     'animals': ['КРС', 'МРС', 'Пушные', 'Грызуны'], 'season': 'Весна-Осень (активность клещей)',
     'baseHigh': ['forest', 'south'],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Природный резервуар — грызуны. Передаётся через клещей и контакт с больными животными.'},

    {'name': 'Лихорадка Ку', 'short': 'Лихорадка Ку', 'cat': 4, 'tags': ['cattle', 'sheep'],
     'animals': ['КРС', 'МРС'], 'season': 'Круглый год (пик — весна, отёл/окот)',
     'baseHigh': [],
     'desc': '{d} регистрируется на территории {r}. Зооантропоноз. Возбудитель Coxiella burnetii выделяется с околоплодными жидкостями. Проводятся серологические исследования.'},
]

# ═══════════════════════════════════════════
# Region profiles (84 regions outside current ЮФО 5)
# ═══════════════════════════════════════════
REGIONS = [
    # ЦФО (18)
    {'name': 'Белгородская область', 'fo': 'ЦФО', 'lat': 50.60, 'lng': 36.58, 'tags': ['pig_heavy', 'poultry_heavy', 'cattle_heavy']},
    {'name': 'Брянская область', 'fo': 'ЦФО', 'lat': 53.24, 'lng': 34.37, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Владимирская область', 'fo': 'ЦФО', 'lat': 56.14, 'lng': 40.41, 'tags': ['cattle_heavy', 'poultry_heavy']},
    {'name': 'Воронежская область', 'fo': 'ЦФО', 'lat': 51.67, 'lng': 39.21, 'tags': ['pig_heavy', 'poultry_heavy', 'cattle_heavy']},
    {'name': 'Ивановская область', 'fo': 'ЦФО', 'lat': 56.99, 'lng': 40.97, 'tags': ['cattle_heavy']},
    {'name': 'Калужская область', 'fo': 'ЦФО', 'lat': 54.51, 'lng': 36.28, 'tags': ['cattle_heavy']},
    {'name': 'Костромская область', 'fo': 'ЦФО', 'lat': 57.76, 'lng': 40.93, 'tags': ['cattle_heavy']},
    {'name': 'Курская область', 'fo': 'ЦФО', 'lat': 51.73, 'lng': 36.19, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Липецкая область', 'fo': 'ЦФО', 'lat': 52.60, 'lng': 39.58, 'tags': ['pig_heavy', 'poultry_heavy', 'cattle_heavy']},
    {'name': 'г. Москва', 'fo': 'ЦФО', 'lat': 55.75, 'lng': 37.62, 'tags': ['low']},
    {'name': 'Московская область', 'fo': 'ЦФО', 'lat': 55.75, 'lng': 37.94, 'tags': ['poultry_heavy', 'pig_heavy', 'cattle_heavy']},
    {'name': 'Орловская область', 'fo': 'ЦФО', 'lat': 52.97, 'lng': 36.08, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Рязанская область', 'fo': 'ЦФО', 'lat': 54.63, 'lng': 39.73, 'tags': ['pig_heavy', 'cattle_heavy']},
    {'name': 'Смоленская область', 'fo': 'ЦФО', 'lat': 54.78, 'lng': 32.04, 'tags': ['cattle_heavy']},
    {'name': 'Тамбовская область', 'fo': 'ЦФО', 'lat': 52.72, 'lng': 41.45, 'tags': ['pig_heavy', 'cattle_heavy']},
    {'name': 'Тверская область', 'fo': 'ЦФО', 'lat': 56.86, 'lng': 35.90, 'tags': ['cattle_heavy']},
    {'name': 'Тульская область', 'fo': 'ЦФО', 'lat': 54.17, 'lng': 37.62, 'tags': ['cattle_heavy', 'poultry_heavy']},
    {'name': 'Ярославская область', 'fo': 'ЦФО', 'lat': 57.63, 'lng': 39.87, 'tags': ['cattle_heavy']},
    # ПФО (14)
    {'name': 'Республика Башкортостан', 'fo': 'ПФО', 'lat': 54.73, 'lng': 55.95, 'tags': ['cattle_heavy', 'horse_heavy', 'pig_heavy', 'agricultural']},
    {'name': 'Республика Марий Эл', 'fo': 'ПФО', 'lat': 56.63, 'lng': 47.88, 'tags': ['cattle_heavy', 'agricultural']},
    {'name': 'Республика Мордовия', 'fo': 'ПФО', 'lat': 54.18, 'lng': 45.18, 'tags': ['pig_heavy', 'cattle_heavy']},
    {'name': 'Республика Татарстан', 'fo': 'ПФО', 'lat': 55.79, 'lng': 49.11, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy', 'agricultural']},
    {'name': 'Удмуртская Республика', 'fo': 'ПФО', 'lat': 56.85, 'lng': 53.22, 'tags': ['cattle_heavy', 'agricultural']},
    {'name': 'Чувашская Республика', 'fo': 'ПФО', 'lat': 55.43, 'lng': 47.07, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Пермский край', 'fo': 'ПФО', 'lat': 58.01, 'lng': 56.25, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Кировская область', 'fo': 'ПФО', 'lat': 58.60, 'lng': 49.66, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Нижегородская область', 'fo': 'ПФО', 'lat': 56.30, 'lng': 44.00, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Оренбургская область', 'fo': 'ПФО', 'lat': 51.77, 'lng': 55.10, 'tags': ['cattle_heavy', 'sheep_heavy', 'horse_heavy']},
    {'name': 'Пензенская область', 'fo': 'ПФО', 'lat': 53.19, 'lng': 45.00, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Самарская область', 'fo': 'ПФО', 'lat': 53.19, 'lng': 50.24, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Саратовская область', 'fo': 'ПФО', 'lat': 51.53, 'lng': 46.02, 'tags': ['cattle_heavy', 'sheep_heavy', 'pig_heavy']},
    {'name': 'Ульяновская область', 'fo': 'ПФО', 'lat': 54.31, 'lng': 48.38, 'tags': ['cattle_heavy', 'pig_heavy']},
    # ЮФО (7 новых — без Адыгеи, Краснодара, Крыма, Ростова, Севастополя)
    {'name': 'Республика Калмыкия', 'fo': 'ЮФО', 'lat': 46.30, 'lng': 44.26, 'tags': ['sheep_heavy', 'cattle_heavy']},
    {'name': 'Астраханская область', 'fo': 'ЮФО', 'lat': 46.35, 'lng': 48.04, 'tags': ['sheep_heavy', 'cattle_heavy', 'south', 'border_south']},
    {'name': 'Волгоградская область', 'fo': 'ЮФО', 'lat': 48.71, 'lng': 44.51, 'tags': ['cattle_heavy', 'sheep_heavy', 'pig_heavy', 'south']},
    {'name': 'Донецкая Народная Республика', 'fo': 'ЮФО', 'lat': 48.00, 'lng': 37.80, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy']},
    {'name': 'Луганская Народная Республика', 'fo': 'ЮФО', 'lat': 48.57, 'lng': 39.32, 'tags': ['cattle_heavy', 'pig_heavy', 'sheep_heavy']},
    {'name': 'Запорожская область', 'fo': 'ЮФО', 'lat': 47.84, 'lng': 35.14, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy']},
    {'name': 'Херсонская область', 'fo': 'ЮФО', 'lat': 46.64, 'lng': 32.62, 'tags': ['cattle_heavy', 'sheep_heavy', 'south']},
    # СКФО (7)
    {'name': 'Республика Дагестан', 'fo': 'СКФО', 'lat': 42.98, 'lng': 47.49, 'tags': ['sheep_heavy', 'cattle_heavy', 'south', 'border_south']},
    {'name': 'Республика Ингушетия', 'fo': 'СКФО', 'lat': 43.04, 'lng': 44.82, 'tags': ['cattle_heavy', 'sheep_heavy', 'south']},
    {'name': 'Кабардино-Балкарская Республика', 'fo': 'СКФО', 'lat': 43.47, 'lng': 43.62, 'tags': ['cattle_heavy', 'sheep_heavy', 'horse_heavy', 'south']},
    {'name': 'Карачаево-Черкесская Республика', 'fo': 'СКФО', 'lat': 43.77, 'lng': 41.73, 'tags': ['sheep_heavy', 'cattle_heavy', 'horse_heavy', 'south']},
    {'name': 'Республика Северная Осетия-Алания', 'fo': 'СКФО', 'lat': 42.87, 'lng': 44.63, 'tags': ['cattle_heavy', 'pig_heavy', 'south']},
    {'name': 'Чеченская Республика', 'fo': 'СКФО', 'lat': 43.32, 'lng': 45.69, 'tags': ['cattle_heavy', 'sheep_heavy', 'south']},
    {'name': 'Ставропольский край', 'fo': 'СКФО', 'lat': 44.65, 'lng': 41.70, 'tags': ['sheep_heavy', 'cattle_heavy', 'pig_heavy', 'poultry_heavy', 'south']},
    # СЗФО (11)
    {'name': 'Республика Карелия', 'fo': 'СЗФО', 'lat': 63.36, 'lng': 33.55, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Республика Коми', 'fo': 'СЗФО', 'lat': 63.50, 'lng': 53.90, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Ненецкий АО', 'fo': 'СЗФО', 'lat': 67.64, 'lng': 53.03, 'tags': ['reindeer', 'low']},
    {'name': 'Архангельская область', 'fo': 'СЗФО', 'lat': 64.54, 'lng': 40.54, 'tags': ['cattle_heavy', 'forest', 'reindeer']},
    {'name': 'Вологодская область', 'fo': 'СЗФО', 'lat': 59.22, 'lng': 39.88, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Калининградская область', 'fo': 'СЗФО', 'lat': 54.71, 'lng': 20.46, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy']},
    {'name': 'Ленинградская область', 'fo': 'СЗФО', 'lat': 59.86, 'lng': 31.36, 'tags': ['pig_heavy', 'poultry_heavy', 'cattle_heavy']},
    {'name': 'Мурманская область', 'fo': 'СЗФО', 'lat': 68.97, 'lng': 33.07, 'tags': ['reindeer', 'low']},
    {'name': 'Новгородская область', 'fo': 'СЗФО', 'lat': 58.52, 'lng': 31.26, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Псковская область', 'fo': 'СЗФО', 'lat': 57.81, 'lng': 28.33, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'г. Санкт-Петербург', 'fo': 'СЗФО', 'lat': 59.93, 'lng': 30.32, 'tags': ['low']},
    # УрФО (6)
    {'name': 'Курганская область', 'fo': 'УрФО', 'lat': 55.46, 'lng': 65.34, 'tags': ['cattle_heavy', 'agricultural']},
    {'name': 'Свердловская область', 'fo': 'УрФО', 'lat': 56.84, 'lng': 60.61, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy']},
    {'name': 'Тюменская область', 'fo': 'УрФО', 'lat': 57.15, 'lng': 65.53, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Ханты-Мансийский АО — Югра', 'fo': 'УрФО', 'lat': 61.00, 'lng': 69.00, 'tags': ['forest', 'reindeer']},
    {'name': 'Челябинская область', 'fo': 'УрФО', 'lat': 55.16, 'lng': 61.40, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy']},
    {'name': 'Ямало-Ненецкий АО', 'fo': 'УрФО', 'lat': 67.63, 'lng': 72.60, 'tags': ['reindeer', 'low']},
    # СФО (10)
    {'name': 'Республика Алтай', 'fo': 'СФО', 'lat': 50.73, 'lng': 86.10, 'tags': ['cattle_heavy', 'sheep_heavy', 'horse_heavy']},
    {'name': 'Республика Тыва', 'fo': 'СФО', 'lat': 51.63, 'lng': 93.70, 'tags': ['cattle_heavy', 'sheep_heavy', 'horse_heavy']},
    {'name': 'Республика Хакасия', 'fo': 'СФО', 'lat': 53.72, 'lng': 91.43, 'tags': ['cattle_heavy', 'sheep_heavy']},
    {'name': 'Алтайский край', 'fo': 'СФО', 'lat': 52.48, 'lng': 82.77, 'tags': ['cattle_heavy', 'pig_heavy', 'agricultural']},
    {'name': 'Красноярский край', 'fo': 'СФО', 'lat': 56.01, 'lng': 93.10, 'tags': ['cattle_heavy', 'pig_heavy', 'reindeer', 'forest']},
    {'name': 'Иркутская область', 'fo': 'СФО', 'lat': 56.10, 'lng': 101.60, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Кемеровская область', 'fo': 'СФО', 'lat': 54.66, 'lng': 86.17, 'tags': ['cattle_heavy', 'pig_heavy']},
    {'name': 'Новосибирская область', 'fo': 'СФО', 'lat': 54.98, 'lng': 82.93, 'tags': ['cattle_heavy', 'pig_heavy', 'agricultural']},
    {'name': 'Омская область', 'fo': 'СФО', 'lat': 55.00, 'lng': 73.37, 'tags': ['cattle_heavy', 'pig_heavy', 'agricultural']},
    {'name': 'Томская область', 'fo': 'СФО', 'lat': 56.48, 'lng': 84.95, 'tags': ['cattle_heavy', 'forest']},
    # ДФО (11)
    {'name': 'Республика Саха (Якутия)', 'fo': 'ДФО', 'lat': 62.03, 'lng': 129.73, 'tags': ['cattle_heavy', 'horse_heavy', 'reindeer', 'forest']},
    {'name': 'Республика Бурятия', 'fo': 'ДФО', 'lat': 51.83, 'lng': 107.59, 'tags': ['cattle_heavy', 'sheep_heavy']},
    {'name': 'Камчатский край', 'fo': 'ДФО', 'lat': 56.07, 'lng': 162.82, 'tags': ['reindeer', 'forest', 'low']},
    {'name': 'Приморский край', 'fo': 'ДФО', 'lat': 45.08, 'lng': 131.89, 'tags': ['cattle_heavy', 'pig_heavy', 'poultry_heavy', 'border_south']},
    {'name': 'Хабаровский край', 'fo': 'ДФО', 'lat': 50.59, 'lng': 136.00, 'tags': ['cattle_heavy', 'forest']},
    {'name': 'Забайкальский край', 'fo': 'ДФО', 'lat': 52.04, 'lng': 113.50, 'tags': ['cattle_heavy', 'sheep_heavy']},
    {'name': 'Амурская область', 'fo': 'ДФО', 'lat': 50.29, 'lng': 127.54, 'tags': ['cattle_heavy', 'pig_heavy', 'agricultural']},
    {'name': 'Магаданская область', 'fo': 'ДФО', 'lat': 59.56, 'lng': 150.80, 'tags': ['reindeer', 'low']},
    {'name': 'Сахалинская область', 'fo': 'ДФО', 'lat': 49.23, 'lng': 143.10, 'tags': ['cattle_heavy', 'forest', 'low']},
    {'name': 'Еврейская автономная область', 'fo': 'ДФО', 'lat': 48.47, 'lng': 132.72, 'tags': ['cattle_heavy']},
    {'name': 'Чукотский автономный округ', 'fo': 'ДФО', 'lat': 66.00, 'lng': 170.00, 'tags': ['reindeer', 'low']},
]

# ═══════════════════════════════════════════
# Recommendations / prevention / vaccines templates per category
# ═══════════════════════════════════════════

RECS = {
    1: [
        {"title": "Мониторинг и надзор", "description": "Проводить регулярный эпизоотический мониторинг и серологические исследования", "priority": "immediate"},
        {"title": "Ограничение перемещений", "description": "Ограничить перемещения животных из неблагополучных регионов", "priority": "urgent"},
        {"title": "Вакцинация", "description": "Проводить плановую вакцинацию восприимчивого поголовья", "priority": "planned"},
    ],
    2: [
        {"title": "Диагностический мониторинг", "description": "Проводить регулярные диагностические исследования поголовья", "priority": "planned"},
        {"title": "Биобезопасность", "description": "Соблюдать ветеринарно-санитарные правила содержания животных", "priority": "planned"},
        {"title": "Оздоровление", "description": "Проводить мероприятия по оздоровлению неблагополучных пунктов", "priority": "urgent"},
    ],
    3: [
        {"title": "Обработка от эктопаразитов", "description": "Проводить регулярную обработку животных от переносчиков", "priority": "planned"},
        {"title": "Диагностика", "description": "Проводить диагностические исследования на инвазионные болезни", "priority": "planned"},
        {"title": "Дегельминтизация", "description": "Проводить плановые дегельминтизации и обработки", "priority": "planned"},
    ],
    4: [
        {"title": "Серологический мониторинг", "description": "Проводить серологические исследования поголовья и населения", "priority": "planned"},
        {"title": "Профилактика", "description": "Соблюдать меры личной гигиены при работе с животными", "priority": "urgent"},
        {"title": "Санитарно-просветительская работа", "description": "Проводить информирование населения о мерах профилактики", "priority": "planned"},
    ],
}

PREVENTION = {
    1: ["Вакцинация восприимчивого поголовья", "Ограничение перемещений животных", "Дезинфекция помещений и транспорта", "Мониторинг и лабораторные исследования", "Карантинирование вновь поступивших животных"],
    2: ["Соблюдение ветеринарно-санитарных правил", "Регулярные диагностические исследования", "Вакцинация в неблагополучных хозяйствах", "Ограничение контакта с дикими животными", "Карантинирование больныеых животных"],
    3: ["Регулярная обработка от эктопаразитов", "Плановые дегельминтизации", "Соблюдение ветеринарно-санитарных правил", "Ограничение выпаса в неблагополучных угодьях", "Ветеринарно-санитарная экспертиза продукции"],
    4: ["Использование СИЗ при работе с животными", "Термическая обработка продуктов животноводства", "Дератизация и борьба с переносчиками", "Вакцинация животных (при наличии)", "Санитарно-просветительская работа"],
}

VACCINES = {
    'Ящур': {"name": "Вакцина против ящура", "manufacturer": "ФГБУ ВНИИЗЖ", "schedule": "Ежегодно", "note": "Плановая вакцинация КРС и МРС"},
    'АЧС': {"name": "Вакцина против АЧС", "manufacturer": "ФГБУ ВНИИЗЖ", "schedule": "По показаниям", "note": "Применяется в угрожаемой зоне"},
    'Бешенство': {"name": "Вакцина антирабическая", "manufacturer": "Щёлковский биокомбинат", "schedule": "Ежегодно", "note": "Обязательная вакцинация домашних животных"},
    'Птичий грипп': {"name": "Вакцина против гриппа птиц", "manufacturer": "ФГБУ ВНИИЗЖ", "schedule": "По эпизоотическим показаниям", "note": "Применяется в угрожаемой зоне"},
    'Нодулярный дерматит': {"name": "Вакцина против нодулярного дерматита КРС", "manufacturer": "ФГБУ ВНИИЗЖ", "schedule": "Ежегодно", "note": "Массовая вакцинация КРС"},
    'Блютанг': {"name": "Вакцинация не применяется", "manufacturer": "—", "schedule": "—", "note": "В РФ вакцинация против блютанга не проводится"},
    'Сибирская язва': {"name": "Вакцина СТИ против сибирской язвы", "manufacturer": "Ставропольская биофабрика", "schedule": "Ежегодно в неблагополучных пунктах", "note": "Обязательная вакцинация в стационарно неблагополучных пунктах"},
    'Чума КРС': {"name": "Вакцина против чумы КРС", "manufacturer": "ФГБУ ВНИИЗЖ", "schedule": "—", "note": "Россия свободна от чумы КРС, вакцинация не проводится"},
    'Классическая чума свиней': {"name": "Вакцина против классической чумы свиней", "manufacturer": "—", "schedule": "—", "note": "В РФ вакцинация не проводится, профилактика — убой"},
    'Оспа овец и коз': {"name": "Вакцина против оспы овец и коз", "manufacturer": "Ставропольская биофабрика", "schedule": "Ежегодно", "note": "Вакцинация в неблагополучных регионах"},
    'Болезнь Ньюкасла': {"name": "Вакцина против болезни Ньюкасла", "manufacturer": "Щёлковский биокомбинат", "schedule": "По схеме", "note": "Обязательная вакцинация птицы"},
}

SOURCES_TEMPLATE = ["Россельхознадзор — fsvps.gov.ru", "Приказ МСХ РФ от 09.03.2011 №62", "ФГБУ ВНИИЗЖ — arriah.ru"]

# ═══════════════════════════════════════════
# Generate TypeScript
# ═══════════════════════════════════════════

def calc_level(disease, region_tags):
    """Calculate threat level based on disease category and region relevance."""
    d_tags = set(disease['tags'])
    r_tags = set(region_tags)
    base_high_tags = set(disease.get('baseHigh', []))
    
    # Check overlap
    overlap = d_tags & r_tags
    high_match = base_high_tags & r_tags
    
    cat = disease['cat']
    
    # Low agricultural regions
    if 'low' in r_tags:
        if cat == 1:
            return 'low'
        return 'low'
    
    # Category 1 (особо опасные): high if relevant, medium if partially, low if not
    if cat == 1:
        if high_match:
            return 'high'
        if overlap:
            return 'medium'
        return 'low'
    
    # Category 2 (инфекционные): medium if relevant, low if not
    if cat == 2:
        if high_match:
            return 'medium'
        if overlap:
            return 'medium'
        return 'low'
    
    # Category 3 (инвазионные): medium if relevant, low if not
    if cat == 3:
        if high_match or overlap:
            return 'medium'
        return 'low'
    
    # Category 4 (зооантропонозы): medium for all with livestock, low for cities
    if cat == 4:
        if 'low' not in r_tags:
            return 'medium'
        return 'low'
    
    return 'low'


def ts_escape(s):
    """Escape single quotes for TypeScript strings."""
    return s.replace("'", "\\'")


# Build TypeScript file
lines = []
lines.append("""// AUTO-GENERATED by fix_geojson_add_fo.py
// Generates reference threat entries for all 84 regions outside the original 5 ЮФО regions
// All entries are isRealData: false (derived from Приказ МСХ РФ №62)

import { type ThreatZone, type ThreatLevel, type Recommendation, type VaccineInfo, type DataSource } from './threat-data';

interface DiseaseTemplate {
  name: string;
  shortName: string;
  category: 1 | 2 | 3 | 4;
  tags: string[];
  animals: string[];
  season: string;
  baseHighTags: string[];
  descTemplate: string;
  recommendations: Recommendation[];
  preventionSteps: string[];
  vaccine: VaccineInfo | null;
  sources: string[];
}

interface RegionProfile {
  name: string;
  fo: string;
  lat: number;
  lng: number;
  tags: string[];
}
""")

# Disease templates
lines.append("const DISEASE_TEMPLATES: DiseaseTemplate[] = [")
for d in DISEASES:
    recs = RECS[d['cat']]
    prev = PREVENTION[d['cat']]
    vac = VACCINES.get(d['name'])
    
    lines.append("  {")
    lines.append(f"    name: '{ts_escape(d['name'])}',")
    lines.append(f"    shortName: '{ts_escape(d['short'])}',")
    lines.append(f"    category: {d['cat']},")
    lines.append(f"    tags: {json.dumps(d['tags'])},")
    lines.append(f"    animals: {json.dumps(d['animals'], ensure_ascii=False)},")
    lines.append(f"    season: '{ts_escape(d['season'])}',")
    lines.append(f"    baseHighTags: {json.dumps(d.get('baseHigh', []))},")
    lines.append(f"    descTemplate: '{ts_escape(d['desc'])}',")
    lines.append(f"    recommendations: {json.dumps(recs, ensure_ascii=False)},")
    lines.append(f"    preventionSteps: {json.dumps(prev, ensure_ascii=False)},")
    if vac:
        lines.append(f"    vaccine: {json.dumps(vac, ensure_ascii=False)},")
    else:
        lines.append(f"    vaccine: null,")
    lines.append(f"    sources: {json.dumps(SOURCES_TEMPLATE, ensure_ascii=False)},")
    lines.append("  },")
lines.append("];")

# Region profiles
lines.append("\nconst REGION_PROFILES: RegionProfile[] = [")
for r in REGIONS:
    lines.append(f"  {{ name: '{ts_escape(r['name'])}', fo: '{r['fo']}', lat: {r['lat']}, lng: {r['lng']}, tags: {json.dumps(r['tags'])} }},")
lines.append("];")

# Generator function
lines.append("""
function calcLevel(disease: DiseaseTemplate, regionTags: string[]): ThreatLevel {
  const dTags = new Set(disease.tags);
  const rTags = new Set(regionTags);
  const baseHigh = new Set(disease.baseHighTags);
  
  const overlap = [...dTags].some(t => rTags.has(t));
  const highMatch = [...baseHigh].some(t => rTags.has(t));
  const isLow = rTags.has('low');
  
  const cat = disease.category;
  
  if (isLow) return cat === 1 ? 'low' : 'low';
  
  if (cat === 1) {
    if (highMatch) return 'high';
    if (overlap) return 'medium';
    return 'low';
  }
  if (cat === 2) {
    if (highMatch || overlap) return 'medium';
    return 'low';
  }
  if (cat === 3) {
    if (highMatch || overlap) return 'medium';
    return 'low';
  }
  // cat 4
  return isLow ? 'low' : 'medium';
}

// Simple seeded random for deterministic offset
function seededRandom(seed: number): number {
  let h = seed;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff;
}

export function generateRegionalThreats(existingRegionNames: Set<string>): ThreatZone[] {
  const entries: ThreatZone[] = [];
  let idCounter = 1000;
  
  for (const region of REGION_PROFILES) {
    if (existingRegionNames.has(region.name)) continue;
    
    for (const disease of DISEASE_TEMPLATES) {
      const level = calcLevel(disease, region.tags);
      idCounter++;
      
      const latOff = (seededRandom(idCounter * 7) - 0.5) * 0.6;
      const lngOff = (seededRandom(idCounter * 13 + 500) - 0.5) * 0.6;
      const radius = 30 + Math.floor(seededRandom(idCounter * 3 + 200) * 70);
      
      const desc = disease.descTemplate
        .replace('{d}', disease.name)
        .replace('{r}', region.name);
      
      const dataSource: DataSource = {
        name: 'Приказ МСХ РФ №62',
        url: 'https://fsvps.gov.ru',
        date: '2026',
        type: 'official',
      };
      
      entries.push({
        id: `gen-${idCounter}`,
        disease: disease.name,
        diseaseShort: disease.shortName,
        region: region.name,
        district: region.name,
        threatLevel: level,
        lat: region.lat + latOff,
        lng: region.lng + lngOff,
        radius,
        description: desc,
        affectedAnimals: disease.animals,
        season: disease.season,
        lastUpdate: '2026-06-01',
        isRealData: false,
        dataSources: [dataSource],
        recommendations: disease.recommendations,
        preventionSteps: disease.preventionSteps,
        vaccines: disease.vaccine ? [disease.vaccine] : [],
        sources: disease.sources,
      });
    }
  }
  
  return entries;
}
""")

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'Generated {OUTPUT}')
print(f'Diseases: {len(DISEASES)}')
print(f'Regions: {len(REGIONS)}')
print(f'Expected entries: {len(DISEASES) * len(REGIONS)}')

# Quick level distribution estimate
level_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
for r in REGIONS:
    for d in DISEASES:
        level = calc_level(d, r['tags'])
        level_counts[level] += 1

print(f'\nLevel distribution (estimated):')
for level, count in sorted(level_counts.items()):
    pct = count / (len(DISEASES) * len(REGIONS)) * 100
    print(f'  {level}: {count} ({pct:.1f}%)')

# Per-FO summary
fo_counts = {}
for r in REGIONS:
    fo = r['fo']
    if fo not in fo_counts:
        fo_counts[fo] = 0
    fo_counts[fo] += len(DISEASES)
print(f'\nPer-FO entries:')
for fo, count in sorted(fo_counts.items()):
    print(f'  {fo}: {count}')
