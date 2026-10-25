"""Blender AO only; no offline beauty render is submitted as browser evidence."""
import bpy,math

def bake(cabin,destination):
 select=bpy.ops.object.select_all;select(action='DESELECT');cabin.select_set(True);bpy.context.view_layer.objects.active=cabin
 primary=cabin.data.uv_layers[0];ao_uv=cabin.data.uv_layers.new(name='AO_UV');cabin.data.uv_layers.active=ao_uv
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.006);bpy.ops.object.mode_set(mode='OBJECT')
 image=bpy.data.images.new('cabin contact AO',1024,1024);image.colorspace_settings.name='Non-Color'
 for mat in cabin.data.materials:
  node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;mat.node_tree.nodes.active=node
 sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=16
 bpy.ops.object.bake(type='AO',margin=4,use_clear=True)
 image.filepath_raw=str(destination/'cabin-ao.png');image.file_format='PNG';image.save()
 group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 for mat in cabin.data.materials:
  tree=mat.node_tree;tex=next(n for n in tree.nodes if n.type=='TEX_IMAGE' and n.image==image);uv=tree.nodes.new('ShaderNodeUVMap');uv.uv_map='AO_UV';tree.links.new(uv.outputs['UV'],tex.inputs['Vector'])
  node=tree.nodes.new('ShaderNodeGroup');node.node_tree=group;tree.links.new(tex.outputs['Color'],node.inputs['Occlusion'])
 cabin.data.uv_layers.active=primary;primary.active_render=True
 print('CABIN_AO_BAKED',flush=True)
