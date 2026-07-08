#!/usr/bin/env python3
"""
Download and process Russia regions GeoJSON for ЭпизоМонитор.
- Extract Russian federal subjects
- Add Crimea and the 4 new regions from Ukrainian data
- Mark active regions (target for the app) vs inactive (dimmed)
- Save processed GeoJSON
"""

import urllib.request
import json
import os

# Target active regions
ACTIVE_REGIONS_ISO = {
    'RU-ROS',   # Ростовская область
    'RU-KDA',   # Краснодарский край
    'RU-AD',    # Республика Адыгея
    'UA-43',    # Крым (Republic of Crimea)
    'UA-40',    # Севастополь
}

ACTIVE_REGION_NAMES = {
    'UA-43': 'Республика Крым',
    'UA-40': 'Севастополь',
}

# 4 новых региона — пока затемнены, потом активируем
NEW_REGIONS_ISO = {
    'UA-14',    # Донецкая Народная Республика
    'UA-09',    # Луганская Народная Республика
    'UA-23',    # Запорожская область
    'UA-65',    # Херсонская область
}
NEW_REGION_NAMES = {
    'UA-14': 'Донецкая Народная Республика',
    'UA-09': 'Луганская Народная Республика',
    'UA-23': 'Запорожская область',
    'UA-65': 'Херсонская область',
}

OUTPUT_PATH = '/home/z/my-project/public/russia_regions.geojson'

def main():
    url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'
    raw_cache = '/home/z/my-project/public/ne_10m_admin1_raw.geojson'
    
    if os.path.exists(raw_cache):
        print(f'Loading cached raw data from {raw_cache}')
        with open(raw_cache, 'r', encoding='utf-8') as f:
            gj = json.load(f)
    else:
        print(f'Downloading full GeoJSON from Natural Earth...')
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=120) as response:
            data = response.read()
        print(f'Downloaded {len(data)} bytes')
        gj = json.loads(data)
        with open(raw_cache, 'w', encoding='utf-8') as f:
            json.dump(gj, f)
        print(f'Cached raw data to {raw_cache}')
    
    out_features = []
    active_count = 0
    inactive_count = 0
    
    for f in gj['features']:
        props = f.get('properties', {})
        iso_a2 = props.get('iso_a2', '')
        iso_3166_2 = props.get('iso_3166_2', '')
        
        is_russian = iso_a2 == 'RU'
        is_active_ua = iso_3166_2 in ACTIVE_REGIONS_ISO
        is_new_region = iso_3166_2 in NEW_REGIONS_ISO
        
        if iso_3166_2 == 'RU-X01~':
            continue
        
        if not is_russian and not is_active_ua and not is_new_region:
            continue
        
        is_active = iso_3166_2 in ACTIVE_REGIONS_ISO
        
        display_name = props.get('name_local', '') or props.get('name', '') or ''
        if iso_3166_2 in ACTIVE_REGION_NAMES:
            display_name = ACTIVE_REGION_NAMES[iso_3166_2]
        elif iso_3166_2 in NEW_REGION_NAMES:
            display_name = NEW_REGION_NAMES[iso_3166_2]
        
        new_props = {
            'iso': iso_3166_2,
            'name_en': props.get('name', ''),
            'name_ru': display_name,
            'name_alt': props.get('name_alt', ''),
            'is_active': is_active,
            'region_type': props.get('type_en', '') or props.get('type', ''),
        }
        
        new_feature = {
            'type': 'Feature',
            'properties': new_props,
            'geometry': f['geometry'],
        }
        
        out_features.append(new_feature)
        
        if is_active:
            active_count += 1
        else:
            inactive_count += 1
    
    out_gj = {
        'type': 'FeatureCollection',
        'features': out_features,
    }
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out_gj, f, ensure_ascii=False)
    
    file_size = os.path.getsize(OUTPUT_PATH)
    print(f'\nProcessed GeoJSON saved to {OUTPUT_PATH}')
    print(f'  Active regions: {active_count}')
    print(f'  Inactive (dimmed) regions: {inactive_count}')
    print(f'  Total features: {len(out_features)}')
    print(f'  File size: {file_size / 1024 / 1024:.1f} MB')
    
    print('\nActive regions:')
    for f in sorted(out_features, key=lambda x: x['properties'].get('name_ru', '')):
        if f['properties']['is_active']:
            p = f['properties']
            print(f'  {p["iso"]:8s} {p["name_ru"]}')

if __name__ == '__main__':
    main()
