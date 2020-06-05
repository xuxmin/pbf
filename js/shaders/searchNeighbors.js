const vsSearchNeighbors = `#version 300 es

precision highp float;
uniform sampler2D uTexturePosition;     // 粒子位置

uniform float uGridTextureSize; // 最终的 voxelTexture 大小
uniform float uBucketSize;               // 粒子的活动范围
// uniform float uBucketNum;                // voxelTexture 大小对应几个 bucket
uniform float uTotalParticles;
out vec4 colorData;

// 根据 gl_VertexID 计算出对应的纹理坐标，范围 (0, 1)
vec2 getIndex() {
    // 获取纹理大小
    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    float x = (float(gl_VertexID % tSize) + 0.5) / textureSize;
    float y = (floor(float(gl_VertexID) / textureSize) + 0.5) / textureSize;
    return vec2(x, y);
}

// 根据三维 grid 坐标, 计算出对应的 Grid 纹理坐标
vec2 getGridCoordinates(vec3 gridPosition) {
    float BucketNum = uGridTextureSize / uBucketSize;
    float x = mod(gridPosition.z, BucketNum);
    float y = floor(gridPosition.z / BucketNum);
    vec2 coord = vec2(x, y);

    vec2 gridIndex = (gridPosition.xy + uBucketSize * coord + vec2(0.5)) / uGridTextureSize;

    return gridIndex;
}

void main() 
{
    // 根据 gl_VertexID 计算出纹理坐标, 范围 (0, 1)
    vec2 index = getIndex();

    // 取出粒子的位置, 范围为 [0, pbfResolution]
    vec3 particlePosition = texture(uTexturePosition, index).rgb;

    // 粒子对应到相应的 grid 中
    vec3 gridPosition = floor(particlePosition);

    // 将 grid 的3D位置坐标转换到 2D 的纹理坐标，并归一化到 [-1, 1]
    vec2 gridIndex = getGridCoordinates(gridPosition);

    gridIndex = 2. * gridIndex - vec2(1.);

    // if (gridPosition.y < 0.) gridIndex = vec2(1e10);
    
    gl_Position = vec4(gridIndex, float(gl_VertexID) / uTotalParticles, 1.0);

    colorData = vec4(floor(float(gl_VertexID)));
    gl_PointSize = 1.;
}

`;