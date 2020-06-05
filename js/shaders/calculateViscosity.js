const vsCalculateViscosity = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;
uniform sampler2D uTextureVelocity;
uniform sampler2D uNeighbors;

uniform float uGridTextureSize; // 最终的 voxelTexture 大小
uniform float uBucketSize;      // 粒子的活动范围

uniform float uKernelRadius;
uniform float uViscosity;

out vec4 colorData;

vec3 OFFSET[27] = vec3[](
    vec3(0, 0, 0), vec3(1., 0, 0), vec3(-1., 0, 0),
    vec3(1., 1., 0), vec3(-1., 1., 0), vec3(1., -1, 0),
    vec3(-1., -1., 0), vec3(0, 1., 0), vec3(0, -1., 0),
    vec3(0, 0, -1.), vec3(1., 0, -1.), vec3(-1., 0, -1.),
    vec3(1., 1., -1.), vec3(-1., 1., -1.), vec3(1., -1, -1.),
    vec3(-1., -1., -1.), vec3(0, 1., -1.), vec3(0, -1., -1.),
    vec3(0, 0, 1.), vec3(1., 0, 1.), vec3(-1., 0, 1.),
    vec3(1., 1., 1.), vec3(-1., 1., 1.), vec3(1., -1, 1.),
    vec3(-1., -1., 1.), vec3(0, 1., 1.), vec3(0, -1., 1.)
);

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

// 根据从 grid 中获取的顶点序号，计算出对应的纹理坐标
vec2 getNeighborTexIndex(float neighborIndex) {
    float texturePositionSize = float(textureSize(uTexturePosition, 0).x);
    float x = mod(neighborIndex, texturePositionSize) + 0.5;
    float y = floor(neighborIndex / texturePositionSize) + 0.5;
    // 获得了纹理坐标
    vec2 index = vec2(x, y) / texturePositionSize;

    return index;
}

float Wpoly6(float r) {
    float h = uKernelRadius;
    if (r > h)
        return 0.0;
    float tmp = h * h - r * r;
    return 1.56668147106 * tmp * tmp * tmp / (h * h * h * h * h * h * h * h * h);
}

void main() {

    // 获取当前顶点对应的纹理坐标，范围 (0, 1)
    vec2 index = getIndex();

    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    // 取出粒子的位置和速度
    vec3 particlePosition = texture(uTexturePosition, index).rgb;
    vec3 particleVelocity = texture(uTextureVelocity, index).rgb;

    vec3 gridPosition = floor(particlePosition);

    vec3 deltaVelocity = vec3(0.);


    // 遍历所有相邻的 grid
    for(int i = 0; i < 27; i ++) {

        // 获得对应的 gridIndex 纹理坐标
        vec2 gridIndex = getGridCoordinates(gridPosition + OFFSET[i]);

        vec4 neighbors = texture(uNeighbors, gridIndex);

        // 遍历所有的邻居粒子
        for (int j = 0; j < 4; j++) {

            if (neighbors[j] <= 0.)
                continue;
            
            // 邻居粒子纹理坐标
            vec2 neighborIndex = getNeighborTexIndex(neighbors[j]);
            // 邻居粒子的位置和速度
            vec3 neighborPosition = texture(uTexturePosition, neighborIndex).rgb;
            vec3 neighborVelocity = texture(uTextureVelocity, neighborIndex).rgb;

            vec3 distance = particlePosition - neighborPosition;
            float r = length(distance);

            float tmp = Wpoly6(r);
            vec3 v_ij = neighborVelocity - particleVelocity;

            deltaVelocity += v_ij * tmp;
        }
    }

    particleVelocity += uViscosity * deltaVelocity;

    colorData = vec4(particleVelocity, 1.);
}

`;

