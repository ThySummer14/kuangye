import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('package_delivery', Path(__file__).resolve().parents[1] / 'tools/package_delivery.py')
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)

class DeliveryTests(unittest.TestCase):
    def test_rejects_metadata_env_saves_and_traversal(self):
        for name in ('web/.git/config', 'source/.env', 'source/.env.local',
                     'assets/.openai/hosting.json', 'town-prototype-v1.json',
                     'creative-e2e.json', 'town-prototype-v4.json', 'studio-media-ui-fixture.json', 'studio-media-roundtrip.json', 'manual-media-fixture.json', 'web-media-fixture.json', 'town-prototype-v3.json', 'badge-ui-fixture.json', 'badge-roundtrip.json', 'migration-source-fixture.json', 'migration-target-1234.json', 'mascot-motion-fixture.json', '../outside', '/absolute', 'key.pem'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                delivery.safe_name(name)

    def test_source_allowlist_and_existing_output_protection(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'project';root.mkdir()
            (root / 'project.godot').write_text('config_version=5')
            (root / '.git').mkdir();(root / '.git/config').write_text('not for delivery')
            (root / 'artifacts').mkdir();(root / 'artifacts/creative-e2e.json').write_text('{}')
            output = Path(temp) / 'output.zip'
            delivery.package(root, None, output)
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), {'godot-prototype/project.godot', 'FILES_SHA256.json'})
            with self.assertRaises(FileExistsError):delivery.package(root, None, output)

    def test_rejects_site_checkout_and_nested_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'project';root.mkdir();(root / 'project.godot').write_text('config_version=5')
            site = Path(temp) / 'site';site.mkdir()
            with self.assertRaises(ValueError):delivery.package(root, site, Path(temp) / 'bad.zip')
            for name in ('index.html', 'index.js', 'index.pck', 'index.wasm.gz'):(site / name).write_bytes(b'fixture')
            (site / '.git').mkdir();(site / '.git/config').write_text('fixture')
            with self.assertRaises(ValueError):delivery.package(root, site, Path(temp) / 'bad.zip')
            self.assertFalse((Path(temp) / 'bad.zip').exists())

if __name__ == '__main__':unittest.main()
