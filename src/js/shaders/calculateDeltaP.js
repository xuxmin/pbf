const vsCalculateDeltaP = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;         // 预测的粒子位置
uniform sampler2D uNeighbors;               // 邻居例子信息
uniform sampler2D uLambda;                  // lambda 信息

uniform float uVoxelTextureSize;            // 最终的 voxelTexture 大小
uniform float uBucketSize;                  // 粒子的活动范围
uniform float uBucketNum;                   // voxelTexture 大小对应几个 bucket

uniform float uKernelRadius;
uniform float uRestDensity;
uniform float uSpikyGradConstant;

uniform bool  uCorrection;
uniform float uTensileK;
uniform float uTensileDistance;
uniform float uTensilePower;

vec3 offsets[27];
float texturePositionSize;
float h2;

out vec4 colorData;

void addToSum(in vec3 particlePosition, in float neighborIndex, in float lambda_i, inout vec3 deltaP) {

    vec2 index = vec2(mod(neighborIndex, texturePositionSize) + 0.5, floor(neighborIndex / texturePositionSize) + 0.5) / texturePositionSize;
    vec3 neighborPosition = texture(uTexturePosition, index).rgb;
    vec3 distance = particlePosition - neighborPosition;
    float r = length(distance);

    if (r > 0. && r < uKernelRadius) {

        float lambda_j = texture(uLambda, index).r;
        float partial = uKernelRadius - r;

        // TODO: For the lambda Correction !!!
        float lambda_corr = 0.0;
        if (uCorrection) {
            lambda_corr = -uTensileK * pow((h2 - r * r) / (h2 - uTensileDistance * uTensileDistance), 3. * uTensilePower);
        }
        deltaP += (lambda_i + lambda_j + lambda_corr) * partial * partial * normalize(distance);
    }
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

    float lambdaPressure = texture(uLambda, index).x;
    vec3 particlePosition = texture(uTexturePosition, index).rgb;
    vec3 gridPosition = floor(particlePosition);
    vec3 deltaPosition = vec3(0.);

    for(int i = 0; i < 27; i ++) {

        vec3 neighborsVoxel = gridPosition + offsets[i];
        // 获得对应的 voxelsTexture 纹理坐标
        vec2 voxelsIndex = (neighborsVoxel.xy + uBucketSize * vec2(mod(neighborsVoxel.z, uBucketNum), floor(neighborsVoxel.z / uBucketNum)) + vec2(0.5)) / uVoxelTextureSize;
        // 获得存储的邻居粒子 index
        vec4 neighbors = texture(uNeighbors, voxelsIndex);

        if(neighbors.r > 0.) addToSum(particlePosition, neighbors.r, lambdaPressure, deltaPosition);
        if(neighbors.g > 0.) addToSum(particlePosition, neighbors.g, lambdaPressure, deltaPosition);
        if(neighbors.b > 0.) addToSum(particlePosition, neighbors.b, lambdaPressure, deltaPosition);
        if(neighbors.a > 0.) addToSum(particlePosition, neighbors.a, lambdaPressure, deltaPosition);
    }

    // 粒子最终的位置
    vec3 endPosition = particlePosition + (uSpikyGradConstant / uRestDensity) * deltaPosition;

    // 对粒子进行约束
    if (endPosition.x > uBucketSize - 0.2)
        endPosition.x = uBucketSize - 0.2;
    if (endPosition.x < 0.2)
        endPosition.x = 0.2;

    if (endPosition.y > uBucketSize - 0.2)
        endPosition.y = uBucketSize - 0.2;
    if (endPosition.y < 0.2)
        endPosition.y = 0.2;

    if (endPosition.z > uBucketSize - 0.2)
        endPosition.z = uBucketSize - 0.2;
    if (endPosition.z < 0.2)
        endPosition.z = 0.2;

    colorData = vec4(endPosition, texture(uLambda, index).g + 1.);
}


`;