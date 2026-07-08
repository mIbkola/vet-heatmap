#!/usr/bin/env python3
"""
Extract all threat entries from threat-data.ts → public/data/threats.json
Leaves threat-data.ts with only types, configs, and helpers.
"""
import json
import re

SRC = '/home/z/my-project/upload/workspace/src/lib/threat-data.ts'
DST = '/home/z/my-project/upload/workspace/public/data/threats.json'

print("Reading threat-data.ts...")
with open(SRC, 'r') as f:
    content = f.read()

print(f"File size: {len(content):,} chars, {content.count(chr(10)):,} lines")

# ─── 1. Parse each threat entry ───
# Each entry is a TypeScript object literal starting with "  {\n    id:" 
# and ending with "  }," or "  }"

# Use a robust parser: find all object literals starting with id field
entry_regex = re.compile(
    r"\{\s*\n\s*id:\s*'(\d+)',"
    r"(?:[^{}]*?)"
    r"\s*disease:\s*'([^']*)',"
    r"(?:[^{}]*?)"
    r"\s*diseaseShort:\s*'([^']*)',"
    r"(?:[^{}]*?)"
    r"\s*region:\s*'([^']*)',"
    r"(?:[^{}]*?)"
    r"\s*district:\s*'([^']*)',"
    r"(?:[^{}]*?)"
    r"\s*threatLevel:\s*'(critical|high|medium|low)',"
    r"(?:[^{}]*?)"
    r"\s*lat:\s*(-?[\d.]+),"
    r"(?:[^{}]*?)"
    r"\s*lng:\s*(-?[\d.]+),"
    r"(?:[^{}]*?)"
    r"\s*radius:\s*(\d+),"
    r"(?:[^{}]*?)"
    r"\s*description:\s*'((?:[^'\\]|\\.)*)',"
    r"(?:[^{}]*?)"
    r"\s*affectedAnimals:\s*\[([^\]]*)\],"
    r"(?:[^{}]*?)"
    r"\s*season:\s*'([^']*)',"
    r"(?:[^{}]*?)"
    r"\s*lastUpdate:\s*'([^']*)',"
    r"(?:[^{}]*?)"
    r"\s*isRealData:\s*(true|false),"
    r"(?:[^{}]*?)"
    r"(?:\s*outbreakStatus:\s*'(active|monitoring|resolved)',)?"
    r"(?:[^{}]*?)"
    r"\s*dataSources:\s*\[(.*?)\],"
    r"(?:[^{}]*?)"
    r"\s*recommendations:\s*\[(.*?)\],"
    r"(?:[^{}]*?)"
    r"\s*preventionSteps:\s*\[(.*?)\],"
    r"(?:[^{}]*?)"
    r"\s*vaccines:\s*\[(.*?)\],"
    r"(?:[^{}]*?)"
    r"\s*sources:\s*\[(.*?)\],"
    r"(?:[^{}]*?)"
    r"\s*\}",
    re.DOTALL
)

print("Extracting entries (this may take a moment)...")
matches = entry_regex.findall(content)
print(f"Found {len(matches)} entries")

# ─── Helper: extract string array ───
def parse_str_array(s):
    """Parse ['a', 'b', 'c'] → ['a', 'b', 'c']"""
    items = re.findall(r"'((?:[^'\\]|\\.)*)'", s)
    return [item.replace("\\'", "'") for item in items]

def parse_data_sources(s):
    """Parse { name: '...', url: '...', date: '...', type: '...' }, ..."""
    objs = re.findall(r"\{\s*name:\s*'((?:[^'\\]|\\.)*)',\s*url:\s*'((?:[^'\\]|\\.)*)',\s*date:\s*'([^']*)',\s*type:\s*'(official|media|scientific)'\s*\}", s)
    return [{'name': n.replace("\\'", "'"), 'url': u.replace("\\'", "'"), 'date': d, 'type': t} for n, u, d, t in objs]

def parse_recommendations(s):
    """Parse { title: '...', description: '...', priority: '...' }, ..."""
    objs = re.findall(r"\{\s*title:\s*'((?:[^'\\]|\\.)*)',\s*description:\s*'((?:[^'\\]|\\.)*)',\s*priority:\s*'(immediate|urgent|planned)'\s*\}", s)
    return [{'title': t.replace("\\'", "'"), 'description': d.replace("\\'", "'"), 'priority': p} for t, d, p in objs]

def parse_vaccines(s):
    """Parse { name: '...', manufacturer: '...', schedule: '...', note: '...' }, ..."""
    objs = re.findall(r"\{\s*name:\s*'((?:[^'\\]|\\.)*)',\s*manufacturer:\s*'((?:[^'\\]|\\.)*)',\s*schedule:\s*'((?:[^'\\]|\\.)*)',\s*note:\s*'((?:[^'\\]|\\.)*)'\s*\}", s)
    return [{'name': n.replace("\\'", "'"), 'manufacturer': m.replace("\\'", "'"), 'schedule': sc.replace("\\'", "'"), 'note': no.replace("\\'", "'")} for n, m, sc, no in objs]

# ─── 2. Build JSON entries ───
threats = []
parse_errors = 0

for m in matches:
    (eid, disease, disease_short, region, district, level,
     lat, lng, radius, desc, animals_str, season, last_update,
     is_real, outbreak_status, ds_str, rec_str, prev_str, vax_str, src_str) = m
    
    try:
        entry = {
            'id': eid,
            'disease': disease.replace("\\'", "'"),
            'diseaseShort': disease_short.replace("\\'", "'"),
            'region': region,
            'district': district,
            'threatLevel': level,
            'lat': float(lat),
            'lng': float(lng),
            'radius': int(radius),
            'description': desc.replace("\\'", "'"),
            'affectedAnimals': parse_str_array(animals_str),
            'season': season,
            'lastUpdate': last_update,
            'isRealData': is_real == 'true',
            'dataSources': parse_data_sources(ds_str),
            'recommendations': parse_recommendations(rec_str),
            'preventionSteps': parse_str_array(prev_str),
            'vaccines': parse_vaccines(vax_str),
            'sources': parse_str_array(src_str),
        }
        if outbreak_status:
            entry['outbreakStatus'] = outbreak_status
        threats.append(entry)
    except Exception as e:
        parse_errors += 1
        print(f"  ERROR id={eid}: {e}")

print(f"\nParsed {len(threats)} entries, {parse_errors} errors")

# ─── 3. Save JSON ───
import os
os.makedirs('/home/z/my-project/upload/workspace/public/data', exist_ok=True)

with open(DST, 'w', encoding='utf-8') as f:
    json.dump(threats, f, ensure_ascii=False, indent=2)

print(f"✓ Saved {len(threats)} threats to {DST}")
print(f"  File size: {os.path.getsize(DST):,} bytes")

# ─── 4. Stats ───
from collections import Counter
real = sum(1 for t in threats if t['isRealData'])
ref = sum(1 for t in threats if not t['isRealData'])
levels = Counter(t['threatLevel'] for t in threats)
print(f"\nStats:")
print(f"  Real outbreaks: {real}")
print(f"  Reference: {ref}")
print(f"  By level: {dict(levels)}")
print(f"  Unique regions: {len(set(t['region'] for t in threats))}")
print(f"  Unique diseases: {len(set(t['disease'] for t in threats))}")
