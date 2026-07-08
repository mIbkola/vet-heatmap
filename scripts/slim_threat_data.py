#!/usr/bin/env python3
"""
Slim down threat-data.ts:
- Remove the giant _baseThreats array (148k+ lines of hardcoded data)
- Remove the generateRegionalThreats import and call
- Keep: types, configs, helpers, regionToFO, foConfig, regionCenters
- Replace `export const threats` with async loader from /data/threats.json
"""
import re

PATH = '/home/z/my-project/upload/workspace/src/lib/threat-data.ts'

with open(PATH, 'r') as f:
    content = f.read()

print(f"Original size: {len(content):,} chars, {content.count(chr(10)):,} lines")

# ─── 1. Remove the import line ───
content = re.sub(
    r"^import \{ generateRegionalThreats \} from '\./generate-regional-threats';\n",
    "",
    content,
    count=1,
    flags=re.MULTILINE
)

# ─── 2. Remove the giant _baseThreats array ───
# Find start and end of the array
arr_start_marker = "const _baseThreats: ThreatZone[] = ["
arr_start = content.find(arr_start_marker)
if arr_start == -1:
    print("ERROR: _baseThreats not found")
    exit(1)

# Find \n]; after arr_start
arr_end = content.find("\n];", arr_start)
if arr_end == -1:
    print("ERROR: end of array not found")
    exit(1)

# Find the start of the line containing arr_start_marker
line_start = content.rfind("\n", 0, arr_start) + 1
# arr_end points at "\n];" — include the "];"
arr_end_full = arr_end + len("\n];")

# Replace with comment
replacement = (
    "// ──────────────────────────────────────────────────────────────────\n"
    "// Данные угроз выгружены в /public/data/threats.json (3915 записей).\n"
    "// Загружаются через fetch() в хуке useThreats().\n"
    "// См. /src/hooks/use-threats.ts\n"
    "// ──────────────────────────────────────────────────────────────────\n"
    "\n"
    "// Пустой массив — данные грузятся асинхронно из JSON.\n"
    "// Оставлен для обратной совместимости с кодом, который импортирует `threats` напрямую.\n"
    "// Для актуальных данных используйте хук useThreats().\n"
    "const _baseThreats: ThreatZone[] = [];\n"
)

content = content[:line_start] + replacement + content[arr_end_full:]

# ─── 3. Remove the generateRegionalThreats call ───
content = content.replace(
    "// Generate reference threats for all regions outside the original 5 ЮФО\n"
    "const _existingRegions = new Set(_baseThreats.map(t => t.region));\n"
    "const _generatedThreats = generateRegionalThreats(_existingRegions);\n"
    "\n"
    "export const threats: ThreatZone[] = [..._baseThreats, ..._generatedThreats];\n",
    "// Экспорт синхронной версии threats — теперь содержит только _baseThreats (пусто).\n"
    "// Для загрузки реальных данных используйте хук useThreats().\n"
    "export const threats: ThreatZone[] = _baseThreats;\n"
)

# ─── 4. Add async loader function at the end ───
async_loader = '''

// ==========================================
// АСИНХРОННАЯ ЗАГРУЗКА ДАННЫХ ИЗ JSON
// ==========================================

let _cachedThreats: ThreatZone[] | null = null;
let _loadingPromise: Promise<ThreatZone[]> | null = null;

/**
 * Загружает все угрозы из /data/threats.json.
 * Кеширует результат — повторные вызовы возвращают тот же Promise.
 *
 * Используйте хук useThreats() в React-компонентах.
 * Для не-React кода (сервер, скрипты) можно вызвать напрямую.
 */
export async function loadThreats(): Promise<ThreatZone[]> {
  if (_cachedThreats) return _cachedThreats;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = fetch('/data/threats.json')
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load threats.json: ${r.status}`);
      return r.json();
    })
    .then((data: ThreatZone[]) => {
      _cachedThreats = data;
      return data;
    })
    .finally(() => {
      _loadingPromise = null;
    });

  return _loadingPromise;
}

/**
 * Сбросить кеш (для тестов или принудительного обновления).
 */
export function resetThreatsCache(): void {
  _cachedThreats = null;
  _loadingPromise = null;
}
'''

if 'loadThreats' not in content:
    content = content.rstrip() + '\n' + async_loader

with open(PATH, 'w') as f:
    f.write(content)

print(f"New size: {len(content):,} chars, {content.count(chr(10)):,} lines")
print(f"Reduction: {100*(1 - len(content)/5437287):.1f}%")
