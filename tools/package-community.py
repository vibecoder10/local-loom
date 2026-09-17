#!/usr/bin/env python3
"""Build an allowlisted community bundle; never include recordings or local state."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'local-loom-community-mac-beta.zip'
files = [root / 'README.md', root / 'INSTALL-WITH-AI.md', root / 'package.json', root / 'tools/install-companion.py', root / 'tools/package-community.py']
files += sorted((root / 'extension').glob('*'))
files += sorted((root / 'companion').glob('*.py'))
files += sorted((root / 'tests').glob('*'))
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        if file.is_file() and file.suffix in {'.md', '.py', '.js', '.html', '.css', '.json'}:
            archive.write(file, Path('local-loom-community') / file.relative_to(root))
print(output)
