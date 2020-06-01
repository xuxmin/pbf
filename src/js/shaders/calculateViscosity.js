const vsCalculateViscosity = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;
uniform sampler2D uTextureVelocity;
uniform sampler2D uNeighbors;

uniform float uVoxelTextureSize;            // 最终的 voxelTexture 大小
uniform float uBucketSize;                  // 粒子的活动范围
uniform float uBucketNum;                   // voxelTexture 大小对应几个 bucket

uniform float uKernelRadius;
uniform float uRestDensity;
uniform float uViscosityConstant;

vec3 offsets[27];
float texturePositionSize;
float h2;

out vec4 colorData;

void addToSum(in vec3 particlePosition, in float neighborIndex, in vec3 particleVelocity, inout vec3 deltaVelocity) {
    vec2 index = vec2(mod(neighborIndex, texturePositionSize) + 0.5, floor(neighborIndex / texturePositionSize) + 0.5) / texturePositionSize;
    vec3 distance = particlePosition - texture(uTexturePosition, index).rgb;
    float r = length(distance);
    if (r > 0. && r < uKernelRadius)
        deltaVelocity += (particleVelocity - texture(uTextureVelocity, index).rgb) * (uKernelRadius - r);
}

void main() {

    texturePositionSize = float(textureSize(uTexturePosition, 0).x);
    h2 = uKernelRadius * uKernelRadius;

    offsets[0] = vec3(-1., -1., -1.);
    offsets[1] = vec3(-1., -1., 0.);
    offsets[2] = vec3(-1., -1., 1.);
    offsets[3] = vec3(-1., 0., -1.);
    offsets[4] = vec3(-1., 0., 0.);
    offsets[5] = vec3(-1., 0., 1.);
    offsets[6] = vec3(-1., 1., -1.);
    offsets[7] = vec3(-1., 1., 0.);
    offsets[8] = vec3(-1., 1., 1.);
    offsets[9] = vec3(0., -1., -1.);
    offsets[10] = vec3(0., -1., 0.);
    offsets[11] = vec3(0., -1., 1.);
    offsets[12] = vec3(0., 0., -1.);
    offsets[13] = vec3(0., 0., 0.);
    offsets[14] = vec3(0., 0., 1.);
    offsets[15] = vec3(0., 1., -1.);
    offsets[16] = vec3(0., 1., 0.);
    offsets[17] = vec3(0., 1., 1.);
    offsets[18] = vec3(1., -1., -1.);
    offsets[19] = vec3(1., -1., 0.);
    offsets[20] = vec3(1., -1., 1.);
    offsets[21] = vec3(1., 0., -1.);
    offsets[22] = vec3(1., 0., 0.);
    offsets[23] = vec3(1., 0., 1.);
    offsets[24] = vec3(1., 1., -1.);
    offsets[25] = vec3(1., 1., 0.);
    offsets[26] = vec3(1., 1., 1.);

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    vec3 particlePosition = texture(uTexturePosition, index).rgb;
    vec3 particleVelocity = texture(uTextureVelocity, index).rgb;
    vec3 gridPosition = floor(particlePosition);
    vec3 deltaVelocity = vec3(0.);

    for(int i = 0; i < 27; i ++) {

        vec3 neighborsVoxel = gridPosition + offsets[i];
        vec2 voxelsIndex = (neighborsVoxel.xy + uBucketSize * vec2(mod(neighborsVoxel.z, uBucketNum), floor(neighborsVoxel.z / uBucketNum)) + vec2(0.5)) / uVoxelTextureSize;
        vec4 neighbors = texture(uNeighbors, voxelsIndex);

        if(neighbors.r > 0.) addToSum(particlePosition, neighbors.r, particleVelocity, deltaVelocity);
        if(neighbors.g > 0.) addToSum(particlePosition, neighbors.g, particleVelocity, deltaVelocity);
        if(neighbors.b > 0.) addToSum(particlePosition, neighbors.b, particleVelocity, deltaVelocity);
        if(neighbors.a > 0.) addToSum(particlePosition, neighbors.a, particleVelocity, deltaVelocity);
    }

    particleVelocity += (uViscosityConstant / uRestDensity) * deltaVelocity;

    colorData = vec4(particleVelocity, 1.);
}

`;

