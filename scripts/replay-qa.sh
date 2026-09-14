#!/bin/sh
set -eu
scenario=${1:-map-navigation}
width=${2:-1280}
case "$scenario" in map-navigation|woodshop|emotion-lab) ;; *) exit 2;; esac
cli="${HOME}/.codex/skills/playwright/scripts/playwright_cli.sh"
url="http://127.0.0.1:5182/?qa#map"
if [ "$scenario" = emotion-lab ]; then url="http://127.0.0.1:5182/emotion-lab.html?qa"; fi
mkdir -p output/playwright
"$cli" -s=kuangye-batch goto "$url"
"$cli" -s=kuangye-batch resize "$width" 900
"$cli" -s=kuangye-batch eval "window.__KUANGYE__.reset('$scenario')"
"$cli" -s=kuangye-batch snapshot
"$cli" -s=kuangye-batch screenshot --filename="output/playwright/$scenario-$width.png"
"$cli" -s=kuangye-batch eval 'window.__KUANGYE__.snapshot()' > "output/playwright/$scenario-$width.state.txt"
