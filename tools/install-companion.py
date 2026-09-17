#!/usr/bin/env python3
"""Install this project's local helper as a per-user macOS launch agent."""
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys

extension_id = os.environ.get('LOCAL_LOOM_EXTENSION_ID')
if not extension_id or not re.fullmatch(r'[a-p]{32}', extension_id):
    raise SystemExit('Set LOCAL_LOOM_EXTENSION_ID to the recipient Chrome extension ID shown in chrome://extensions (32 letters a-p).')
if sys.platform != 'darwin':
    raise SystemExit('This login-helper installer supports macOS only.')
root = Path(__file__).resolve().parent.parent
label = 'com.local-loom.companion'
agent = Path.home() / 'Library/LaunchAgents' / (label + '.plist')
logs = Path.home() / 'Library/Logs/Local Loom'
if not (root / 'companion/server.py').is_file():
    raise SystemExit('Companion source is missing.')
runtime = Path.home() / 'Library/Application Support/Local Loom'
config = {
    'Label': label,
    'ProgramArguments': [sys.executable, '-m', 'companion.server'],
    'WorkingDirectory': str(runtime),
    'EnvironmentVariables': {'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
                             'LOCAL_LOOM_EXTENSION_ID': extension_id,
                             'LOCAL_LOOM_DATA_DIR': str(runtime / 'data'),
                             'PYTHONUNBUFFERED': '1'},
    'RunAtLoad': True,
    'KeepAlive': True,
    'ThrottleInterval': 10,
    'StandardOutPath': str(logs / 'companion.log'),
    'StandardErrorPath': str(logs / 'companion-error.log'),
}
for variable in ('LOCAL_LOOM_FFMPEG', 'LOCAL_LOOM_FFPROBE', 'LOCAL_LOOM_WHISPER', 'LOCAL_LOOM_WHISPER_MODEL'):
    value = os.environ.get(variable)
    if not value or not Path(value).is_absolute() or not Path(value).is_file():
        raise SystemExit(f'Set {variable} to an existing absolute file path before installing.')
    config['EnvironmentVariables'][variable] = value
if agent.exists():
    old = plistlib.loads(agent.read_bytes())
    if old.get('ProgramArguments') != config['ProgramArguments']:
        raise SystemExit('Existing companion points elsewhere; refusing to replace it.')
runtime.mkdir(parents=True, exist_ok=True, mode=0o700)
(runtime / 'companion').mkdir(exist_ok=True)
for source in (root / 'companion').glob('*.py'):
    shutil.copy2(source, runtime / 'companion' / source.name)
logs.mkdir(parents=True, exist_ok=True)
agent.parent.mkdir(parents=True, exist_ok=True)
if agent.exists():
    subprocess.run(['launchctl', 'bootout', 'gui/' + str(os.getuid()), str(agent)], capture_output=True)
agent.write_bytes(plistlib.dumps(config))
agent.chmod(0o600)
subprocess.run(['launchctl', 'bootstrap', 'gui/' + str(os.getuid()), str(agent)], check=True)
print('Installed ' + str(agent))
