"""Rebuild and compare the exact Firefox files uploaded for the recorded release."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
release = json.loads((root / 'release/firefox-0.1.1.json').read_text())
subprocess.run([sys.executable, str(root / 'scripts/package.py')], check=True)
package = root / 'dist' / f"xender-recorder-firefox-{release['version']}.zip"
with zipfile.ZipFile(package) as archive:
    actual = archive.namelist()
    if len(actual) != len(set(actual)) or set(actual) != set(release['files']):
        raise SystemExit('Release file list differs from the uploaded package.')
    for name, expected in release['files'].items():
        data = archive.read(name)
        if len(data) != expected['size_bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
            raise SystemExit(f'Release content differs: {name}')
print(f"Verified {len(release['files'])} files match uploaded Firefox {release['version']} exactly.")
