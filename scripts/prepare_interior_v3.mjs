import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { flatten, join, dedup, weld, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
import { stat, writeFile, rename } from "node:fs/promises";
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({"meshopt.encoder":MeshoptEncoder,"meshopt.decoder":MeshoptDecoder});
const reports=[];
for(const name of ["cabin-v3-shell","cabin-interior-v3"]){
 const d=await io.read(`assets-source/v3/${name}-authoring.glb`);
 await d.transform(flatten(),join(),dedup(),weld(),textureCompress({encoder:sharp,targetFormat:"webp",quality:94,resize:[2048,2048]}),meshopt({encoder:MeshoptEncoder,level:"medium"}));
 const file=`public/assets/${name}.glb`;await io.write(file+".next.glb",d);await rename(file+".next.glb",file);
 const report={file,bytes:(await stat(file)).size,meshes:d.getRoot().listMeshes().length,materials:d.getRoot().listMaterials().map(m=>m.getName()),textures:d.getRoot().listTextures().map(t=>({name:t.getName(),size:t.getSize(),mime:t.getMimeType()}))};
 reports.push(report);console.log(report);
}
await writeFile("docs/v3/interior-runtime.json",JSON.stringify(reports,null,2)+"\n");
