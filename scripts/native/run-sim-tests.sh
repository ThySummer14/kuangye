#!/usr/bin/env bash
# Reproducible simulator verification for the native save + backup path.
# The UI tests seed Application Support themselves (see NativeSaveTests), so
# this script only builds, runs, and verifies results from the host side.
set -euo pipefail
cd "$(dirname "$0")/../.."  # repo root
DEV="${KUANGYE_SIM_UDID:?set KUANGYE_SIM_UDID to the booted simulator UDID}"
BUNDLE=dev.kuangye.prototype
PROJ="app/ios/App"
DD=/tmp/kuangye-dd

xcrun simctl terminate "$DEV" "$BUNDLE" 2>/dev/null || true

echo "== 1/4 build =="
( cd "$PROJ" && xcodebuild -project App.xcodeproj -scheme KuangyeTests \
  -destination "platform=iOS Simulator,id=$DEV" -derivedDataPath "$DD" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  build > "../../../output/native/sim-build.txt" 2>&1 )
grep -E "BUILD (SUCCEEDED|FAILED)" output/native/sim-build.txt | tail -1

run_test() {
  echo "== UI test: $1 =="
  rm -rf "/tmp/kuangye-result-$1.xcresult"
  ( cd "$PROJ" && xcodebuild -project App.xcodeproj -scheme KuangyeTests \
    -destination "platform=iOS Simulator,id=$DEV" -derivedDataPath "$DD" \
    CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
    -resultBundlePath "/tmp/kuangye-result-$1.xcresult" \
    -only-testing:KuangyeUITests/NativeSaveTests/"$1" test \
    > "../../../output/native/xctest-$1.txt" 2>&1 ) || true
  grep -E "Test Case.*(passed|failed)" "output/native/xctest-$1.txt" | tail -1
  grep -qE "Test Case.*passed" "output/native/xctest-$1.txt"
}

echo "== 2/4 completion persistence =="
run_test testCompletionWritesNativeSaveAndSurvivesRelaunch

echo "== 3/4 verify dual-generation save on disk =="
CT=$(xcrun simctl get_app_container "$DEV" "$BUNDLE" data)
AS="$CT/Library/Application Support/Kuangye"
node -e '
  const c=require(process.argv[1]+"/current.json"), p=require(process.argv[1]+"/previous.json");
  console.log("current lumens:",c.state.home.lumens,"| previous lumens:",p.state.home.lumens,"| done:",c.state.done.map(d=>d.qid).join(","));
  if(c.state.home.lumens!==362||p.state.home.lumens!==347||c.state.done[0]?.qid!=="run-s1") process.exit(1);' "$AS"
echo "COMPLETION_FILES_OK"

echo "== 4/4 backup export =="
run_test testBackupExportLandsInUserDocuments
# Each xcodebuild test run reinstalls the app and rotates the data container,
# so the Documents check must resolve the container again afterwards.
CT=$(xcrun simctl get_app_container "$DEV" "$BUNDLE" data)
node -e '
  const fs=require("fs");
  const dir=process.argv[1]+"/Documents";
  const f=fs.readdirSync(dir).filter(n=>n.startsWith("kuangye-")&&n.endsWith(".json")).sort().pop();
  if(!f) throw Error("no exported backup in Documents");
  const j=JSON.parse(fs.readFileSync(dir+"/"+f,"utf8"));
  console.log("exported:",f,"| version:",j.version,"| lumens:",j.state.home.lumens);
  if(j.version!==3||typeof j.state.home.lumens!=="number") process.exit(1);' "$CT"
echo "EXPORT_FILE_OK"
echo "ALL_SIM_VERIFICATIONS_OK"
