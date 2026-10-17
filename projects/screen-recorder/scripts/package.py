from pathlib import Path
import json, shutil, zipfile

root = Path(__file__).resolve().parents[1]
out = root / 'dist'
out.mkdir(exist_ok=True)
version = json.loads((root / 'package.json').read_text())['version']
for browser in ['firefox', 'chrome']:
    folder = out / browser
    if folder.exists():
        shutil.rmtree(folder)
    shutil.copytree(root / 'src', folder)
    manifest = json.loads((folder / 'manifest.json').read_text())
    if browser == 'firefox':
        manifest['browser_specific_settings'] = {'gecko': {
            'id': 'screen-recorder@xendersecrets.com',
            'strict_min_version': '142.0',
            'data_collection_permissions': {'required': ['none']}
        }}
    else:
        manifest['minimum_chrome_version'] = '116'
        (folder / 'platform.js').write_text("export const platform = {name: 'Chrome', displayAudio: true};\n")
    (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    target = out / f'xender-recorder-{browser}-{version}.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(folder.rglob('*')):
            if path.is_file():
                archive.write(path, path.relative_to(folder))
    print(target)
target = out / f'xender-recorder-firefox-source-{version}.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file() and not any(part in path.parts for part in ['dist', '.git', 'node_modules']):
            archive.write(path, path.relative_to(root))
print(target)
