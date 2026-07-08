#!/usr/bin/env python3
"""
Install npm packages manually via curl + tar.
Fetches each package.json, resolves deps, downloads, extracts.
"""
import json
import os
import re
import subprocess
import urllib.request
import sys
from pathlib import Path

ROOT = '/home/z/my-project/upload/workspace'
NODE_MODULES = f'{ROOT}/node_modules'
REGISTRY = 'https://registry.npmmirror.com'  # China mirror, faster from this env

os.makedirs(NODE_MODULES, exist_ok=True)

# Track installed packages
INSTALLED = set()

def get_installed_version(pkg):
    """Check if package is installed and return its version."""
    pkg_json = f'{NODE_MODULES}/{pkg}/package.json'
    if not os.path.exists(pkg_json):
        return None
    try:
        with open(pkg_json) as f:
            return json.load(f).get('version')
    except:
        return None

def fetch_json(url):
    """Fetch JSON from URL."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'npm-install/1.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'  ERR fetch {url}: {e}')
        return None

def download_tgz(pkg, version, dest):
    """Download package tarball."""
    # Handle scoped packages: @scope/name → @scope/name-version.tgz
    name_for_url = pkg.replace('/', '%2F')
    basename = pkg.split('/')[-1]
    url = f'{REGISTRY}/{name_for_url}/-/{basename}-{version}.tgz'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'npm-install/1.0'})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        return len(data)
    except Exception as e:
        print(f'  ERR download {url}: {e}')
        return 0

def install_package(pkg, version=None, depth=0):
    """Install a package and its dependencies recursively."""
    if depth > 12:
        print(f'  {"  "*depth}SKIP (too deep): {pkg}')
        return
    
    # Already installed?
    installed_ver = get_installed_version(pkg)
    if installed_ver and (version is None or installed_ver == version.lstrip('^~')):
        INSTALLED.add(pkg)
        return
    
    # Get package metadata
    meta = fetch_json(f'{REGISTRY}/{pkg.replace("/", "%2F")}')
    if not meta:
        print(f'  {"  "*depth}FAIL meta: {pkg}')
        return
    
    # Resolve version
    if version is None or version == 'latest':
        target_ver = meta.get('dist-tags', {}).get('latest')
    elif version.startswith('^') or version.startswith('~'):
        # For simplicity, use latest. Real semver resolution is complex.
        target_ver = meta.get('dist-tags', {}).get('latest')
    else:
        target_ver = version
    
    if not target_ver:
        print(f'  {"  "*depth}FAIL version: {pkg}@{version}')
        return
    
    pkg_meta = meta.get('versions', {}).get(target_ver)
    if not pkg_meta:
        # Try dist-tags latest
        target_ver = meta.get('dist-tags', {}).get('latest')
        pkg_meta = meta.get('versions', {}).get(target_ver, {})
    
    print(f'  {"  "*depth}INSTALL {pkg}@{target_ver}')
    
    # Download and extract
    tgz_path = f'/tmp/_pkg_{pkg.replace("/", "_")}.tgz'
    size = download_tgz(pkg, target_ver, tgz_path)
    if size == 0:
        return
    
    # Extract to node_modules/<pkg>
    target_dir = f'{NODE_MODULES}/{pkg}'
    os.makedirs(target_dir, exist_ok=True)
    
    # Use tar with --strip-components=1
    result = subprocess.run(
        ['tar', 'xzf', tgz_path, '--strip-components=1', '-C', target_dir],
        capture_output=True, timeout=120
    )
    if result.returncode != 0:
        print(f'  {"  "*depth}  EXTRACT FAIL: {result.stderr.decode()[:200]}')
    
    # Verify
    if not os.path.exists(f'{target_dir}/package.json'):
        print(f'  {"  "*depth}  package.json missing after extract')
        return
    
    INSTALLED.add(pkg)
    
    # Install dependencies (only production deps, skip peer/optional)
    deps = pkg_meta.get('dependencies', {}) or {}
    # Filter out already-installed
    for dep_name, dep_ver in deps.items():
        if dep_name in INSTALLED:
            continue
        if dep_name.startswith('@types/'):
            continue
        install_package(dep_name, dep_ver, depth + 1)

# Read package.json deps
with open(f'{ROOT}/package.json') as f:
    pkg = json.load(f)

deps = pkg.get('dependencies', {})
# Skip heavy deps we don't need for the map UI
SKIP = {
    '@prisma/client', 'prisma', '@neondatabase/serverless', 'drizzle-orm',
    'next-auth', '@auth/prisma-adapter', 'bcryptjs',
    '@mdxeditor/editor',  # heavy editor not used by main page
    'nodemailer', 'zustand',
}

# Key deps to install first (in priority order)
PRIORITY = [
    'next', 'react', 'react-dom',
    'leaflet', 'react-leaflet', '@types/leaflet',
    'recharts',
    'lucide-react',
    'tailwindcss', 'class-variance-authority', 'clsx', 'tailwind-merge',
    '@radix-ui/react-accordion',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-label',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-separator',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
    '@radix-ui/react-tooltip',
]

print('=== Phase 1: Priority packages ===')
for name in PRIORITY:
    if name in SKIP:
        continue
    ver = deps.get(name)
    if ver is None:
        ver = 'latest'
    install_package(name, ver)

print(f'\n=== Phase 1 done. Installed: {len(INSTALLED)} packages ===')

# Install remaining deps
print('\n=== Phase 2: Remaining dependencies ===')
for name, ver in deps.items():
    if name in SKIP or name in INSTALLED:
        continue
    install_package(name, ver)

print(f'\n=== Done. Total installed: {len(INSTALLED)} packages ===')

# Print missing
print('\n=== Missing (failed to install) ===')
missing = [d for d in deps if d not in INSTALLED and d not in SKIP]
for m in missing:
    print(f'  {m}')

# Create .bin/next symlink
print('\n=== Creating .bin/next symlink ===')
bin_dir = f'{NODE_MODULES}/.bin'
os.makedirs(bin_dir, exist_ok=True)
next_bin = f'{bin_dir}/next'
if not os.path.exists(next_bin):
    try:
        os.symlink('../next/dist/bin/next', next_bin)
        print(f'  Created symlink: {next_bin}')
    except:
        # Fallback: copy
        import shutil
        shutil.copy2(f'{NODE_MODULES}/next/dist/bin/next', next_bin)
        print(f'  Copied: {next_bin}')

# Verify next is functional
print('\n=== Verification ===')
next_pkg = f'{NODE_MODULES}/next/package.json'
if os.path.exists(next_pkg):
    with open(next_pkg) as f:
        v = json.load(f).get('version')
    print(f'  next: {v} ✓')
    print(f'  next/dist/bin/next exists: {os.path.exists(f"{NODE_MODULES}/next/dist/bin/next")}')
    print(f'  next/dist/server/require-hook.js: {os.path.exists(f"{NODE_MODULES}/next/dist/server/require-hook.js")}')
else:
    print('  next MISSING')
