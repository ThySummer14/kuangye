#!/usr/bin/env python3
"""Offline QA in a minimal, uniquely named project copy and disposable caches."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid


PROJECT_FILES = ("project.godot", "main.tscn")
PROJECT_DIRS = ("assets", "scripts", "tests")


def copy_qa_project(source: Path, destination: Path) -> str:
    destination.mkdir(parents=True)
    for name in PROJECT_FILES:
        shutil.copy2(source / name, destination / name)
    for name in PROJECT_DIRS:
        shutil.copytree(source / name, destination / name)

    project_file = destination / "project.godot"
    config = project_file.read_text(encoding="utf-8")
    # XDG paths do not isolate Godot user:// on macOS; migration QA deletes default v3/v4 save files.
    isolated_name = f"Kuangye-QA-{uuid.uuid4().hex}"
    config, replaced = re.subn(
        r"(?m)^config/name=.*$",
        f"config/name={json.dumps(isolated_name)}",
        config,
        count=1,
    )
    if replaced != 1:
        raise RuntimeError("project.godot must contain exactly one application/config/name")
    project_file.write_text(config, encoding="utf-8")
    return isolated_name


def copy_artifacts(source: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        target = destination / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)


def main() -> int:
    project = Path(__file__).resolve().parents[1]
    artifacts = project / "artifacts"
    configured_godot = os.environ.get("GODOT_BIN")
    godot = (shutil.which(configured_godot) or configured_godot) if configured_godot else None
    godot = godot or shutil.which("godot") or shutil.which("godot4")
    if godot is None:
        print("Set GODOT_BIN to official Godot 4.6.3 or add godot to PATH, then run this script again.")
        return 2
    if not Path(godot).is_file():
        print(f"GODOT_BIN does not point to a file: {godot}")
        return 2
    checks = [
        ("import", ["--editor", "--import", "--quit"], 120),
        ("font", ["--script", "res://tests/test_font.gd"], 40),
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
        ("lighting", ["--script", "res://tests/test_lighting.gd"], 60),
        ("lighting-portrait", ["--script", "res://tests/test_lighting.gd", "--", "--portrait"], 60),
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
        temporary_root = Path(temp)
        qa_project = temporary_root / "project"
        qa_name = copy_qa_project(project, qa_project)
        qa_artifacts = qa_project / "artifacts"
        qa_artifacts.mkdir()
        env = os.environ.copy()
        env["KUANGYE_DISPOSABLE_TEST_DATA"] = "1"
        for key, directory in (("XDG_DATA_HOME", "data"), ("XDG_CONFIG_HOME", "config"), ("XDG_CACHE_HOME", "cache")):
            target = temporary_root / directory
            target.mkdir()
            env[key] = str(target)
        probe = temporary_root / "user_data_dir.gd"
        probe.write_text(
            'extends SceneTree\nfunc _initialize() -> void:\n'
            '\tprint("QA_USER_DATA_DIR=", OS.get_user_data_dir())\n\tquit()\n',
            encoding="utf-8",
        )
        probe_log = subprocess.run(
            [godot, "--headless", "--path", str(qa_project), "--script", str(probe)],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env,
            timeout=30, check=False,
        )
        user_data_line = next(
            (line for line in probe_log.stdout.splitlines() if line.startswith("QA_USER_DATA_DIR=")),
            "",
        )
        user_data_dir = user_data_line.partition("=")[2].strip()
        isolated = probe_log.returncode == 0 and Path(user_data_dir).name == qa_name
        (qa_artifacts / "qa-isolation.log").write_text(
            f"project_name={qa_name}\nuser_data_dir_isolated={isolated}\n",
            encoding="utf-8",
        )
        if not isolated:
            print("Godot user:// did not resolve to the unique temporary project name; tests were not run.")
            (qa_artifacts / "qa-isolation-probe.log").write_text(
                probe_log.stdout, encoding="utf-8", errors="replace"
            )
            copy_artifacts(qa_artifacts, artifacts)
            return 2

        for name, args, timeout in checks:
            started = time.monotonic()
            log = qa_artifacts / f"qa-{name}.log"
            try:
                with log.open("w", encoding="utf-8") as output:
                    proc = subprocess.run([godot, "--headless", "--path", str(qa_project), *args],
                                          stdout=output, stderr=subprocess.STDOUT, env=env,
                                          timeout=timeout, check=False)
                returncode = proc.returncode
            except subprocess.TimeoutExpired:
                returncode = 124
            log_text = log.read_text(encoding="utf-8", errors="replace")
            errors = any(marker in log_text for marker in ("SCRIPT ERROR:", "ERROR:", "FAIL "))
            result = {"name": name, "passed": returncode == 0 and not errors,
                      "returncode": returncode, "seconds": round(time.monotonic() - started, 3)}
            results.append(result)
            print(("PASS " if result["passed"] else "FAIL ") + name, flush=True)
            if name in ("portrait", "desktop", "hidpi") and (qa_artifacts / "scene-boundaries.json").exists():
                shutil.copyfile(qa_artifacts / "scene-boundaries.json", qa_artifacts / f"scene-boundaries-{name}.json")
        report = {"mode": "headless CPU/logic only; GPU and actual devices not verified",
                  "project_name": qa_name, "user_data_dir_isolated": isolated,
                  "checks": results, "passed": all(item["passed"] for item in results)}
        (qa_artifacts / "qa-summary.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        copy_artifacts(qa_artifacts, artifacts)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
