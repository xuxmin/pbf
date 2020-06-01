const vsCalculateLambda = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;     // 粒子位置信息
uniform sampler2D uNeighbors;           // 粒子邻居信息

uniform float uGridTextureSize;        // 最终的 gridTexture 大小
uniform float uBucketSize;             // 粒子的活动范围
uniform float uBucketNum;              // gridTexture 大小对应几个 bucket

uniform float uKernelRadius;
uniform float uPolyKernelConstant;
uniform float uSpikyGradConstant;
uniform float uRestDensity;
uniform float uRelaxParameter; // epsilon

out vec4 colorData;
float texturePositionSize;
float h2;

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

// 遍历一遍所有粒子的邻居，累加好 密度，
void addToSum(in vec3 particlePosition, in float neighborIndex, inout float density, inout float sum_k_grad_Ci, inout vec3 grad_pi_Ci) {

    vec2 index = vec2(mod(neighborIndex, texturePositionSize) + 0.5, floor(neighborIndex / texturePositionSize) + 0.5) / texturePositionSize;
    // 邻居粒子的位置
    vec3 neighborPosition = texture(uTexturePosition, index).rgb;
    vec3 distance = particlePosition - neighborPosition;

    float r = length(distance);

    if (r < uKernelRadius) {    // 是邻居粒子

        float partial = h2 - dot(distance, distance);
        density += uPolyKernelConstant * partial * partial * partial;

        if(r > 0.) {
            partial = uKernelRadius - r;
            vec3 grad_pk_Ci = uSpikyGradConstant * partial * partial * normalize(distance) / uRestDensity;
            sum_k_grad_Ci += dot(grad_pk_Ci, grad_pk_Ci);
            grad_pi_Ci += grad_pk_Ci;
        }
    }
}

// 根据 gl_VertexID 计算出对应的纹理坐标，范围 (0, 1)
vec2 getIndex() {
    // 获取纹理大小
    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(texturePositionSize);
    float x = (float(gl_VertexID % tSize) + 0.5) / textureSize;
    float y = (floor(float(gl_VertexID) / textureSize) + 0.5) / textureSize;
    return vec2(x, y);
}

void main() {

    texturePositionSize = float(textureSize(uTexturePosition, 0).x);
    h2 = uKernelRadius * uKernelRadius;

    // 计算出对应的纹理坐标, 范围 (0, 1)
    vec2 index = getIndex();
    
    // 纹理坐标范围转换到 (-1, 1)
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    // 取出粒子的位置, 范围为 [0, pbfResolution]
    vec3 particlePosition = texture(uTexturePosition, index).rgb;

    // 对应到相应的 grid 中
    vec3 gridPosition = floor(particlePosition);

    float density = 0.;
    float sum_k_grad_Ci = 0.;
    vec3 grad_pi_Ci = vec3(0.);

    // 遍历所有相邻的 grid
    for(int i = 0; i < 27; i ++) {

        vec3 neighborsVoxel = gridPosition + OFFSET[i];
        // 获得对应的 voxelsTexture 纹理坐标
        vec2 voxelsIndex = (neighborsVoxel.xy + uBucketSize * vec2(mod(neighborsVoxel.z, uBucketNum), floor(neighborsVoxel.z / uBucketNum)) + vec2(0.5)) / uGridTextureSize;
        // 获得存储的邻居粒子 index
        vec4 neighbors = texture(uNeighbors, voxelsIndex);
        
        if(neighbors.r > 0.) addToSum(particlePosition, neighbors.r, density, sum_k_grad_Ci, grad_pi_Ci);
        if(neighbors.g > 0.) addToSum(particlePosition, neighbors.g, density, sum_k_grad_Ci, grad_pi_Ci);
        if(neighbors.b > 0.) addToSum(particlePosition, neighbors.b, density, sum_k_grad_Ci, grad_pi_Ci);
        if(neighbors.a > 0.) addToSum(particlePosition, neighbors.a, density, sum_k_grad_Ci, grad_pi_Ci);
    }

    float densityConstrain = density / uRestDensity - 1.;

    sum_k_grad_Ci += dot(grad_pi_Ci, grad_pi_Ci);

    float lambda = - densityConstrain / (sum_k_grad_Ci + uRelaxParameter);

    colorData = vec4(lambda, densityConstrain, density, 1.);
}
`;