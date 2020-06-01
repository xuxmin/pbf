const vsSearchNeighbors = `#version 300 es

precision highp float;
uniform sampler2D uTexturePosition;     // 粒子位置

uniform float uVoxelTextureSize;         // 最终的 voxelTexture 大小
uniform float uBucketSize;               // 粒子的活动范围
uniform float uBucketNum;                // voxelTexture 大小对应几个 bucket
uniform float uTotalParticles;
out vec4 colorData;

void main() 
{
    // 获取纹理大小
    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);

    // 根据 gl_VertexID 计算出纹理坐标, 范围 (0, 1)
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    // 取出粒子的位置, 范围为 [0, pbfResolution]
    vec3 particlePosition = texture(uTexturePosition, index).rgb;

    // 粒子对应到相应的 grid 中
    vec3 gridPosition = floor(particlePosition);

    // 将 grid 的3D位置坐标转换到 2D 的纹理坐标，并归一化到 [-1, 1]
    vec2 voxelPosition = 2. * (gridPosition.xy + uBucketSize * vec2(mod(gridPosition.z, uBucketNum), floor(gridPosition.z / uBucketNum)) + vec2(0.5)) / uVoxelTextureSize - vec2(1.);

    // if (gridPosition.y < 0.) voxelPosition = vec2(1e10);
    
    gl_Position = vec4(voxelPosition, float(gl_VertexID) / uTotalParticles, 1.0);

    colorData = vec4(floor(float(gl_VertexID)));
    gl_PointSize = 1.;
}

`;