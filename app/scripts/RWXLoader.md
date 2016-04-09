# RWX (Renderware) Object Loader for ThreeJS

RWXLoader is a ThreeJS object loader for Renderware (RWX) files. It has been specifically written to support loading RWX objects as used in [ActiveWorlds](https://www.activeworlds.com), but should be able to load RWX files from other sources too.

## Status

The below table lists the status of RWX support. At the bottom of the table the AW extensions and commands not supported by AW are listed too. All this was based on the [ActiveWorlds wiki page](http://wiki.activeworlds.com/index.php?title=Renderware) on RWX.

| Command                | Implemented | Notes |
| ---------------------- | :---------: | ----- |
| AddMaterialMode        | | |
| AddTextureMode         | | |
| Ambient                | | |
| AxisALignment          | | |
| Block                  | | |
| ClumpBegin             | x | |
| ClumpEnd               | x | |
| Collision              | | |
| Color                  | x | |
| Cone                   | | |
| Cylinder               | | |
| Diffuse                | | |
| Disc                   | | |
| GeometrySampling       | | |
| Hemisphere             | | |
| Identity               | x | |
| LightSampling          | | |
| MaterialBegin          | | |
| MaterialMode           | | |
| MaterialEnd            | | |
| ModelBegin             | x | No-op |
| ModelEnd               | x | No-op |
| Opacity                | | |
| Polygon                | x | |
| ProtoBegin             | x | |
| ProtoEnd               | x | |
| ProtoInstance          | x | |
| ProtoInstanceGeometry  | | |
| Quad                   | x | |
| RemoveMaterialMode     | | |
| RemoveTextureMode      | | |
| Rotate                 | x | |
| Scale                  | x | |
| Specular               | | |
| Sphere                 | | |
| Surface                | | |
| Tag                    | | |
| Texture                | x | Mask argument is not used |
| TextureAddressMode     | | |
| TextureMipmapState     | | |
| TextureMode            | | |
| Transform              | x | |
| TransformBegin         | x | |
| TransformEnd           | x | |
| Translate              | x | |
| Triangle               | x | |
| Vertex                 | x | |
| **AW extensions:**     | | |
| OpacityFix             | | |
| Prelight               | | |
| Seamless               | | |
| RandomUVs              | | |
| TextureAddressMode     | | |
| **Unsupported by AW:** | | |
| AddHint                | | |
| Hints                  | | |
| Include                | | |
| IncludeGeometry        | | |
| RemoveHint             | | |
| TextureDithering       | | |
| TextureGammaCorrection | | |
| Trace                  | | |
| TransformJoint         | | |
