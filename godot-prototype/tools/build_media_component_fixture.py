"""Build the renderer-free browser component fixture from production sources.
Run native tests/test_studio_export.gd first to produce PNG/HTML in artifacts.
This fixture is QA only; it never enters the production Web dist.
"""
from pathlib import Path
import argparse,re,shutil,json,hashlib
ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
root=Path(__file__).resolve().parents[1];out=args.output;out.mkdir(parents=True,exist_ok=True)
for name in ['index.html','download.js','GODOT_ENGINE_NOTICES.txt']:shutil.copy2(root/'tests/browser_component'/name,out/name)
picker=re.search(r'const PICKER_SCRIPT="""([\s\S]*?)"""',(root/'scripts/studio_files.gd').read_text()).group(1)
(out/'picker.js').write_text(picker)
for source,target in [('media-export-album.html','album.html'),('media-export-page.png','page.png')]:shutil.copy2(root/'artifacts'/source,out/target)
manifest={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.is_file() and p.name!='EXPECTED.json'}
(out/'EXPECTED.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'files':len(manifest),'scope':'browser component, not Godot WASM or IndexedDB'}))
