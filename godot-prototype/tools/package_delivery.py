#!/usr/bin/env python3
"""Package explicit source/build roots; never recursively archive a checkout/site.

Example: python3 tools/package_delivery.py --web-dir /path/to/dist --output /tmp/kuangye.zip
Uses only the Python standard library. Does not upload or change existing files.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

ROOT_FILES = {'.gitignore', 'README.md', 'PROJECT-LICENSE.txt', 'project.godot', 'main.tscn', 'export_presets.cfg'}
SOURCE_DIRS = ('assets', 'scripts', 'tests', 'tools', 'docs')
WEB_FILES = {'index.html', 'index.js', 'index.pck', 'index.wasm.gz', 'index.audio.worklet.js',
             'index.audio.position.worklet.js', 'kuangye-engine-loader.js', '_headers',
             'GODOT_ENGINE_NOTICES.txt', 'NotoSansSC-LICENSE.txt', 'PROJECT-LICENSE.txt'}
FORBIDDEN = {'.git', '.godot', '.openai', '.aws', '.ssh', '.codex', '.agents', '__pycache__'}
SAVE = re.compile(r'^(town-(?:prototype|qa|fixture).*|creative-(?:ui|e2e|roundtrip)|badge-(?:ui-fixture|roundtrip)|migration-(?:source-fixture|target-[0-9]+)|mascot-motion-fixture|studio-media-(?:roundtrip|ui-fixture)|manual-media-fixture|web-media-fixture)\.json$')

def safe_name(name: str) -> None:
    path = Path(name)
    if path.is_absolute() or '..' in path.parts:
        raise ValueError('Archive names must stay relative to the delivery root')
    if any(part in FORBIDDEN or part == '.env' or part.startswith('.env.') for part in path.parts):
        raise ValueError('Repository, environment, or local-tool metadata cannot enter a delivery')
    if SAVE.match(path.name) or path.suffix in {'.tmp', '.pem', '.key', '.pyc'}:
        raise ValueError('Save files, temporary data, or credential material cannot enter a delivery')

def add_file(archive, file: Path, root: Path, prefix: str, manifest: dict) -> None:
    if file.is_symlink() or not file.resolve().is_relative_to(root.resolve()):
        raise ValueError('Symlinks and paths outside the declared root are not packaged')
    name = prefix + '/' + file.relative_to(root).as_posix()
    safe_name(name)
    data = file.read_bytes()
    archive.writestr(name, data)
    manifest[name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def package(project: Path, web: Path | None, output: Path, evidence=()) -> dict:
    if not (project / 'project.godot').is_file():
        raise ValueError('The source root must be this Godot project')
    if web and not all((web / f).is_file() for f in ('index.html', 'index.js', 'index.pck', 'index.wasm.gz')):
        raise ValueError('--web-dir must be the exported dist directory, not a Site checkout')
    # Validate names before creating the archive so a failure never leaves a
    # seemingly complete artifact. A normal source-root .git is outside the list.
    source = [project / name for name in sorted(ROOT_FILES) if (project / name).is_file()]
    for name in SOURCE_DIRS:
        source.extend(f for f in sorted((project / name).rglob('*')) if f.is_file() and '__pycache__' not in f.parts)
    web_files = [f for f in sorted(web.rglob('*')) if f.is_file()] if web else []
    for f in source:
        safe_name('godot-prototype/' + f.relative_to(project).as_posix())
        if f.is_symlink(): raise ValueError('Source symlinks are not packaged')
    for f in web_files:
        safe_name('web-preview/dist/' + f.relative_to(web).as_posix())
        if f.relative_to(web).as_posix() not in WEB_FILES or f.is_symlink():
            raise ValueError('Unexpected file in Web export; review it before extending the allowlist')
    evidence_names = set()
    for f in evidence:
        name = 'evidence/' + f.parent.name + '/' + f.name
        safe_name(name)
        if not f.is_file() or f.is_symlink() or f.suffix not in {'.png', '.json', '.log'} or name in evidence_names:
            raise ValueError('Evidence must be explicit, unique PNG/JSON/log files')
        evidence_names.add(name)
    if output.exists():
        raise FileExistsError('Choose a new output filename; existing delivery was not changed')
    manifest = {}
    with zipfile.ZipFile(output, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for f in source: add_file(archive, f, project, 'godot-prototype', manifest)
        for f in web_files: add_file(archive, f, web, 'web-preview/dist', manifest)
        for f in evidence: add_file(archive, f, f.parent, 'evidence/' + f.parent.name, manifest)
        archive.writestr('FILES_SHA256.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None: raise ValueError('Delivery CRC verification failed')
        for name in archive.namelist(): safe_name(name)
    return {'file': str(output), 'bytes': output.stat().st_size,
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'entries': len(manifest)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--web-dir', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--evidence', type=Path, action='append', default=[])
    args = parser.parse_args()
    print(json.dumps(package(args.project, args.web_dir, args.output, args.evidence), ensure_ascii=False))
