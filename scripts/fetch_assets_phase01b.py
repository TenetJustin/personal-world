import sys,json,copy,hashlib
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts'))
import fetch_assets as f
receipts=[]
for asset in ['rock_wall_02','grass_ground']:
 f.texture(asset)
receipts+=f.RECEIPTS
# Fuller crown A, independently downloaded to avoid reusing C's range cache.
d=f.metadata('fir_tree_01');g=json.loads((f.SRC/'fir_tree_01/fir_tree_01.original.gltf').read_text());mesh=copy.deepcopy(g['meshes'][0]);aids=set()
for p in mesh['primitives']:aids.update(p['attributes'].values());aids.add(p['indices'])
vids=sorted({g['accessors'][a]['bufferView'] for a in aids});views=[copy.deepcopy(g['bufferViews'][v]) for v in vids]
start=min(v.get('byteOffset',0) for v in views);end=max(v.get('byteOffset',0)+v['byteLength'] for v in views)-1
entry=d['files']['gltf']['1k']['gltf']['include'][g['buffers'][0]['uri']]
folder=f.SRC/'fir_tree_01_A';folder.mkdir(exist_ok=True)
b=f.fetch(entry['url'],folder/'selected-A.bin',byte_range=(start,end))
for v in views:v['byteOffset']=v.get('byteOffset',0)-start
amap={old:new for new,old in enumerate(sorted(aids))};vmap={old:new for new,old in enumerate(vids)}
accessors=[copy.deepcopy(g['accessors'][a]) for a in sorted(aids)]
for a in accessors:a['bufferView']=vmap[a['bufferView']]
for p in mesh['primitives']:p['attributes']={k:amap[v] for k,v in p['attributes'].items()};p['indices']=amap[p['indices']]
for im in g['images']:im['uri']='../fir_tree_01/'+im['uri']
g.update(meshes=[mesh],nodes=[{'mesh':0,'name':'fir_A_full_crown'}],scenes=[{'nodes':[0]}],scene=0,accessors=accessors,bufferViews=views,buffers=[{'uri':'selected-A.bin','byteLength':len(b)}])
(folder/'fir_A.gltf').write_text(json.dumps(g))
receipts.append({'id':'fir_tree_01_A','source':'https://polyhaven.com/a/fir_tree_01','authors':d['info']['authors'],'license':'CC0-1.0','licenseURL':'https://polyhaven.com/license','retrievedAt':'2026-10-25','processing':'Variant A full crown; original GLTF byte range, existing common source textures.','files':[{'path':'selected-A.bin','sourceURL':entry['url'],'byteRange':[start,end],'sha256':hashlib.sha256(b).hexdigest(),'fullSourceMD5':entry.get('md5')}]})
(Path.cwd()/'docs/phase-01b/asset-sources.json').write_text(json.dumps(receipts,indent=2)+'\n')
print('PHASE01B_INPUTS_READY',flush=True)
