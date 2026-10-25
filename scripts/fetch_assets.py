"""Fetch only declared Poly Haven CC0 inputs. No credentials or runtime remote APIs.
Large authoring files remain in ignored assets-source/. Verify published MD5 where
available; all derived range selections also receive a SHA-256 receipt.
"""
from pathlib import Path
import copy, hashlib, json, subprocess
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets-source'
CACHE = ROOT / 'work/phase01'
SRC.mkdir(exist_ok=True); CACHE.mkdir(parents=True,exist_ok=True)
RECEIPTS=[]
def fetch(url, path, md5=None, byte_range=None):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() and (not md5 or hashlib.md5(path.read_bytes()).hexdigest()==md5):return path.read_bytes()
    tmp=path.with_suffix(path.suffix+'.partial')
    args=['curl','--tls-max','1.2','--http1.1','--fail','--location','--retry','5','--retry-all-errors','--max-time','180','--silent','--show-error','-H','User-Agent: PersonalWorldPhase01/1.0']
    if byte_range:args+=['--range',f'{byte_range[0]}-{byte_range[1]}']
    subprocess.run(args+[url,'-o',str(tmp)],check=True)
    b=tmp.read_bytes()
    if byte_range and len(b)!=byte_range[1]-byte_range[0]+1:raise ValueError('Server did not return the requested byte range')
    if md5 and hashlib.md5(b).hexdigest()!=md5:raise ValueError('MD5 mismatch: '+str(path))
    tmp.replace(path);return b

def metadata(asset):
    p=CACHE/(asset+'.json')
    if p.exists():return json.loads(p.read_text())
    d={k:json.loads(fetch('https://api.polyhaven.com/'+k+'/'+asset,CACHE/(asset+'-'+k+'.json'))) for k in ['info','files']}
    p.write_text(json.dumps(d));return d

def receipt(asset,d,files,notes):
    RECEIPTS.append({'id':asset,'source':'https://polyhaven.com/a/'+asset,'authors':d['info'].get('authors',{}),'license':'CC0-1.0','licenseURL':'https://polyhaven.com/license','retrievedAt':'2026-10-25','processing':notes,'files':files})

def model(asset,res='1k',selected=None):
    d=metadata(asset);f=d['files']['gltf'][res]['gltf'];folder=SRC/asset
    raw=fetch(f['url'],folder/(asset+'.original.gltf'),f.get('md5'));g=json.loads(raw)
    used=[]
    if selected is not None:
        mesh=copy.deepcopy(g['meshes'][selected]);aids=set()
        for p in mesh['primitives']:aids.update(p['attributes'].values());aids.add(p['indices'])
        vids=sorted({g['accessors'][a]['bufferView'] for a in aids});views=[copy.deepcopy(g['bufferViews'][v]) for v in vids]
        start=min(v.get('byteOffset',0) for v in views);end=max(v.get('byteOffset',0)+v['byteLength'] for v in views)-1
        entry=f['include'][g['buffers'][0]['uri']]
        b=fetch(entry['url'],folder/'selected.bin',byte_range=(start,end))
        for v in views:v['byteOffset']=v.get('byteOffset',0)-start
        amap={old:new for new,old in enumerate(sorted(aids))};vmap={old:new for new,old in enumerate(vids)}
        accessors=[copy.deepcopy(g['accessors'][a]) for a in sorted(aids)]
        for a in accessors:a['bufferView']=vmap[a['bufferView']]
        for p in mesh['primitives']:
            p['attributes']={k:amap[v] for k,v in p['attributes'].items()};p['indices']=amap[p['indices']]
        g.update(meshes=[mesh],nodes=[{'mesh':0,'name':asset+'_variant_C'}],scenes=[{'nodes':[0]}],scene=0,accessors=accessors,bufferViews=views,buffers=[{'uri':'selected.bin','byteLength':len(b)}])
        used.append({'path':'selected.bin','sha256':hashlib.sha256(b).hexdigest(),'sourceURL':entry['url'],'byteRange':[start,end],'fullSourceMD5':entry.get('md5')})
    for name,entry in f['include'].items():
        if selected is not None and name.endswith('.bin'):continue
        b=fetch(entry['url'],folder/name,entry.get('md5'));used.append({'path':name,'sha256':hashlib.sha256(b).hexdigest(),'sourceURL':entry['url']})
    if asset in ['fir_tree_01','grass_medium_01']:
        for name,entry in d['files']['blend']['1k']['blend']['include'].items():
            if '_alpha_' not in name:continue
            b=fetch(entry['url'],folder/name,entry.get('md5'))
            used.append({'path':name,'sha256':hashlib.sha256(b).hexdigest(),'sourceURL':entry['url'],'role':'Explicit opacity mask'})
    out=folder/(asset+'.gltf');out.write_text(json.dumps(g))
    receipt(asset,d,used,'Original glTF; variant C byte-range selection only' if selected is not None else 'Original glTF + dependencies; Blender processing follows')
    print('MODEL_READY',asset,flush=True)

def texture(asset,res='2k'):
    d=metadata(asset);used=[]
    for channel in ['Diffuse','nor_gl','Rough']:
        f=d['files'][channel][res]['jpg'];p=SRC/asset/(channel+'.jpg');b=fetch(f['url'],p,f.get('md5'))
        used.append({'path':channel+'.jpg','sourceURL':f['url'],'sha256':hashlib.sha256(b).hexdigest()})
    receipt(asset,d,used,'PBR texture input, no baked directional shadows added');print('TEXTURE_READY',asset,flush=True)

if __name__=='__main__':
    model('fir_tree_01',selected=2)
    model('rock_moss_set_01',res='2k')
    model('grass_medium_01',res='1k')
    for i in ['rough_wood','forest_floor','aerial_grass_rock']:texture(i)
    d=metadata('alps_field');f=d['files']['hdri']['2k']['hdr'];p=SRC/'alps_field.hdr';b=fetch(f['url'],p,f.get('md5'))
    receipt('alps_field',d,[{'path':p.name,'sourceURL':f['url'],'sha256':hashlib.sha256(b).hexdigest()}],'HDR input; lighting probe and display panorama processed separately')
    f=d['files']['hdri']['4k']['hdr'];p=ROOT/'public/assets/alps-background-4k.hdr';b=fetch(f['url'],p,f.get('md5'))
    RECEIPTS[-1]['files'].append({'path':p.name,'sourceURL':f['url'],'sha256':hashlib.sha256(b).hexdigest(),'role':'High tier 4K background'})
    (ROOT/'docs/phase-01/asset-sources.json').write_text(json.dumps(RECEIPTS,ensure_ascii=False,indent=2)+'\n')
    print('SOURCE_RECEIPTS_SAVED',len(RECEIPTS),flush=True)
