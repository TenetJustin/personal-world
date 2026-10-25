from pathlib import Path
import subprocess,json,re,sys
root=Path(__file__).resolve().parents[1]
files=[f for f in subprocess.check_output(['git','diff','--cached','--name-only','-z'],cwd=root).decode().split('\0')if f]
assert files,'Nothing staged; cannot claim the staging audit passed'
forbidden=[p for p in files if any(x in Path(p).parts for x in ['node_modules','work','assets-source','outputs','.git','.aws','.ssh']) or Path(p).name.startswith('.env')]
patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'\bghp_[A-Za-z0-9]{30,}',rb'github_pat_[A-Za-z0-9_]{30,}',rb'\bAKIA[A-Z0-9]{16}\b',rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}']
hits=[]
for f in files:
 if Path(f).suffix.lower() not in ['.md','.ts','.tsx','.js','.json','.py','.html','.css','.mjs','.txt']:continue
 try:b=subprocess.check_output(['git','show',':'+f],cwd=root,stderr=subprocess.DEVNULL)
 except subprocess.CalledProcessError:continue # deleted path
 if any(re.search(p,b)for p in patterns):hits.append(f)
assert not forbidden and not hits,(forbidden,hits)
assert subprocess.check_output(['git','branch','--show-current'],cwd=root).decode().strip()=='dev/phase-01-exterior'
assert not subprocess.check_output(['git','diff','819f15b6a1fdf8c9eb0ad377e357dcd36f825b51','--','docs/planning'],cwd=root)
r={'date':'2026-10-25','checkedStagedFiles':len(files),'forbiddenPaths':forbidden,'credentialPatternMatches':hits,'phase00PlanningChanged':False,'branch':'dev/phase-01-exterior','note':'Scanned actual staged index bytes. Sprint V2 explicitly authorizes the existing Public repository and Pages. Full history/LFS audit is separate. Only explicitly reviewed public content may be shipped; browser drafts/backups stay private. Pattern scanning is not a mathematical guarantee.'}
target=root/(sys.argv[1] if len(sys.argv)>1 else 'docs/sprint-v2/repository-safety.json')
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(r,indent=2)+'\n');print(r)
