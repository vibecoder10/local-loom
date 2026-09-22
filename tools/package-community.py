#!/usr/bin/env python3
"""Build an allowlisted community bundle; never include recordings or local state."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'dist/local-loom-community-mac-beta.zip'
output.parent.mkdir(exist_ok=True)
# animate-skill/ ships its own scripts (.mjs), sound effects (.wav), fonts (.woff2), license texts (.txt),
# a shell script and a yaml agent config - widen the allowlist to match, on top of the original extension/
# companion suffixes.
ALLOWED_SUFFIXES = {'.md', '.py', '.js', '.mjs', '.cjs', '.html', '.css', '.json', '.txt', '.wav', '.woff2', '.svg', '.sh', '.yaml'}
files = [root / 'README.md', root / 'INSTALL-WITH-AI.md', root / 'tools/install-companion.py']
files += sorted((root / 'extension').glob('*'))
files += sorted((root / 'companion').glob('*.py'))
files += sorted((root / 'animate-skill').rglob('*'))
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        if file.is_file() and file.suffix in ALLOWED_SUFFIXES:
            name = Path('local-loom-community') / file.relative_to(root)
            if file.name == 'manifest.json':
                # The maintainer's pinned "key" must not ship: each recipient gets their own extension ID.
                manifest = json.loads(file.read_text())
                manifest.pop('key', None)
                archive.writestr(str(name), json.dumps(manifest, indent=2) + '\n')
            else:
                archive.write(file, name)
print(output)
