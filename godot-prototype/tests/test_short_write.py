"""Linux-only real buffered short-write fixture; never fills the disk.
The size limit and SIGXFSZ handling affect only this disposable Godot child.
"""
import json,os,resource,signal,subprocess,tempfile,sys
from pathlib import Path
if sys.platform!="linux":
    print("SKIP: Linux-only bounded write failure fixture");raise SystemExit(0)
project=Path(__file__).resolve().parents[1]
def limit_child():
    resource.setrlimit(resource.RLIMIT_FSIZE,(512,512))
    signal.signal(signal.SIGXFSZ,signal.SIG_IGN)
with tempfile.TemporaryDirectory(prefix='kuangye-short-write-') as temp:
    env=os.environ.copy();env['KUANGYE_WRITE_LIMIT_TEST']='512'
    for key,sub in [('XDG_DATA_HOME','data'),('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache')]:
        target=Path(temp)/sub;target.mkdir();env[key]=str(target)
    r=subprocess.run(['godot','--headless','--path',str(project),'--script','res://tests/test_short_write.gd'],env=env,preexec_fn=limit_child,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=20)
    (project/'artifacts/short-write.log').write_text(r.stdout)
    print(r.stdout)
    report=next((json.loads(line) for line in r.stdout.splitlines() if line.startswith('{"export_')),None)
    if report is None: report=next((json.loads(line) for line in r.stdout.splitlines() if line.startswith('{') and 'state_rejected' in line),None)
    if r.returncode!=0 or not report or not all(report.get(k) for k in ['state_rejected_and_old_preserved','export_rejected_and_old_preserved','export_temporary_removed']):raise SystemExit(1)
    (project/'artifacts/short-write-results.json').write_text(json.dumps(report,indent=2))
