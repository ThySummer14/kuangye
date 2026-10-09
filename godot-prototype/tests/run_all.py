#!/usr/bin/env python3
"""Offline, standard-library-only QA. Uses disposable user/config/cache directories."""
from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time


def main() -> int:
    project = Path(__file__).resolve().parents[1]
    artifacts = project / "artifacts"
    artifacts.mkdir(exist_ok=True)
    godot = shutil.which("godot") or shutil.which("godot4")
    if godot is None:
        print("Install official Godot 4.6.3 and add it to PATH, then run this script again.")
        return 2
    checks = [
        ("import", ["--editor", "--import", "--quit"], 120),
        ("studio-images", ["--script", "res://tests/test_studio_images.gd"], 40),
        ("studio-media-model", ["--script", "res://tests/test_studio_media_model.gd"], 60),
        ("studio-export", ["--script", "res://tests/test_studio_export.gd"], 40),
        ("studio-media-ui", ["--script", "res://tests/test_studio_media_ui.gd"], 40),
        ("state", ["--script", "res://tests/test_state.gd"], 30),
        ("badges", ["--script", "res://tests/test_badges.gd"], 40),
        ("badge-ui", ["--script", "res://tests/test_badge_ui.gd"], 40),
        ("badge-notice", ["--script", "res://tests/test_badge_notice.gd"], 40),
        ("creative", ["--script", "res://tests/test_creative.gd"], 40),
        ("ui-layout", ["--script", "res://tests/test_ui_layout.gd"], 40),
        ("mascot-motion", ["--script", "res://tests/test_mascot_motion.gd"], 40),
        ("room-return", ["--script", "res://tests/test_room_return.gd"], 45),
        ("integration", ["--", "--qa"], 40),
        ("portrait", ["--script", "res://tests/test_scene_boundaries.gd"], 40),
        ("desktop", ["--script", "res://tests/test_scene_boundaries.gd", "--", "--desktop"], 40),
        ("hidpi", ["--script", "res://tests/test_scene_boundaries.gd", "--", "--hidpi"], 40),
        ("touch-furnishing", ["--script", "res://tests/test_touch_furnishing.gd"], 40),
        ("product-paths", ["--script", "res://tests/test_product_paths.gd"], 40),
        ("sequences", ["--script", "res://tests/test_state_sequences.gd"], 120),
        ("scene-soak", ["--script", "res://tests/test_scene_soak.gd"], 120),
    ]
    results = []
    with tempfile.TemporaryDirectory(prefix="kuangye-godot-qa-") as temp:
        env = os.environ.copy()
        env["KUANGYE_DISPOSABLE_TEST_DATA"] = "1"
        for key, directory in (("XDG_DATA_HOME", "data"), ("XDG_CONFIG_HOME", "config"), ("XDG_CACHE_HOME", "cache")):
            target = Path(temp) / directory
            target.mkdir()
            env[key] = str(target)
        for name, args, timeout in checks:
            started = time.monotonic()
            log = artifacts / f"qa-{name}.log"
            try:
                with log.open("w", encoding="utf-8") as output:
                    proc = subprocess.run([godot, "--headless", "--path", str(project), *args],
                                          stdout=output, stderr=subprocess.STDOUT, env=env,
                                          timeout=timeout, check=False)
                returncode = proc.returncode
            except subprocess.TimeoutExpired:
                returncode = 124
            text = log.read_text(encoding="utf-8", errors="replace")
            errors = any(marker in text for marker in ("SCRIPT ERROR:", "ERROR:", "FAIL "))
            result = {"name": name, "passed": returncode == 0 and not errors,
                      "returncode": returncode, "seconds": round(time.monotonic() - started, 3)}
            results.append(result)
            print(("PASS " if result["passed"] else "FAIL ") + name, flush=True)
            if name in ("portrait", "desktop", "hidpi") and (artifacts / "scene-boundaries.json").exists():
                shutil.copyfile(artifacts / "scene-boundaries.json", artifacts / f"scene-boundaries-{name}.json")
    report = {"mode": "headless CPU/logic only; GPU and actual devices not verified", "checks": results,
              "passed": all(item["passed"] for item in results)}
    (artifacts / "qa-summary.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
