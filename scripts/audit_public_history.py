"""Scan every reachable Git blob and available LFS payload; never print values."""
from pathlib import Path
import subprocess, json, re, hashlib, sys

root = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)

patterns = {
    'private_key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    'github_token': rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})',
    'aws_access_key': rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'openai_key': rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}',
    'slack_token': rb'\bxox[baprs]-[A-Za-z0-9-]{24,}',
    'credential_assignment': rb'(?i)(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[=:]\s*[\"\x27][A-Za-z0-9_+/=-]{24,}[\"\x27]',
    'device_identifier': rb'(?i)(?:hardware[_ ]?uuid|serial[_ ]?number|provisioning[_ ]?udid)\s*[\"\x27]?\s*[:=]\s*[\"\x27]?[A-Za-z0-9-]{10,}',
}
objects = {}
for line in git('rev-list', '--objects', '--all').decode().splitlines():
    parts = line.split(' ', 1)
    if len(parts) == 2: objects.setdefault(parts[0], set()).add(parts[1])
hits, forbidden, pointers, missing, lfs_checked = [], [], {}, [], 0
blob_count = byte_count = 0
for oid, paths in objects.items():
    if git('cat-file', '-t', oid).strip() != b'blob': continue
    data = git('cat-file', 'blob', oid)
    blob_count += 1
    byte_count += len(data)
    for path in paths:
        parts = Path(path).parts
        if any(x in parts for x in ['node_modules', '.aws', '.ssh', 'personal-data', 'assets-source', 'work', 'outputs']) or Path(path).name in ['.env', '.netrc'] or Path(path).name.startswith('.env.'):
            forbidden.append({'object': oid, 'path': path})
    m = re.match(rb'version https://git-lfs.github.com/spec/v1\noid sha256:([a-f0-9]{64})\nsize (\d+)\n', data)
    if m:
        digest = m[1].decode()
        pointers[digest] = {'sha256': digest, 'bytes': int(m[2]), 'paths': sorted(paths)}
        payload = root / '.git/lfs/objects' / digest[:2] / digest[2:4] / digest
        if not payload.exists():
            missing.append({'sha256': digest, 'paths': sorted(paths)})
            continue
        data = payload.read_bytes()
        if len(data) != int(m[2]) or hashlib.sha256(data).hexdigest() != digest:
            hits.append({'rule': 'lfs_integrity', 'paths': sorted(paths)})
        lfs_checked += 1
        byte_count += len(data)
    for name, pattern in patterns.items():
        if re.search(pattern, data):
            hits.append({'rule': name, 'object': oid, 'paths': sorted(paths)})

manifest = json.loads((root / 'public/assets/manifest.json').read_text())
receipts = []
for file in ['docs/phase-01/asset-sources.json', 'docs/phase-01b/asset-sources.json']:
    receipts.extend(json.loads((root / file).read_text()))
known = {x['id']: x for x in receipts}
known.update({x: {'license':'original'} for x in ['original-exterior','original-architecture-phase01b']})
license_issues = []
for item in manifest['files']:
    for source in item.get('sourceIds', []):
        if source not in known or known[source].get('license') not in ['original', 'CC0-1.0']:
            license_issues.append({'asset': item['file'], 'source': source})
    if not item.get('sourceIds'): license_issues.append({'asset':item['file'], 'source':'missing'})

result = {
    'date':'2026-10-25', 'head':git('rev-parse','HEAD').decode().strip(),
    'scope':'All local reachable refs/commits, every Git blob, all locally available LFS payloads; current runtime asset source receipts.',
    'commits':int(git('rev-list','--all','--count')), 'gitBlobs':blob_count,
    'lfsPayloads':lfs_checked, 'scannedBytes':byte_count, 'missingLfsPayloads':missing,
    'credentialOrDeviceMatches':hits, 'forbiddenHistoryPaths':forbidden,
    'runtimeAssets':len(manifest['files']), 'runtimeLicenseIssues':license_issues,
    'findingsContainValues':False,
    'limitations':'Pattern-based review cannot prove that every natural-language fact or binary pixel is non-private. Historic browser evidence contains deliberately labeled synthetic verification fixtures and machine model/browser performance data; no production personal records were introduced. Film references are links/research commentary, not redistributed film photos or runtime textures. Local user backups and caches remain ignored.',
    'passed':not(hits or forbidden or missing or license_issues),
}
target = root / (sys.argv[1] if len(sys.argv)>1 else 'docs/sprint-v2/public-history-audit.json')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
if not result['passed']: sys.exit(1)
