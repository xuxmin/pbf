const vsCalculateDeltaP = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;         // 预测的粒子位置
uniform sampler2D uNeighbors;               // 邻居例子信息
uniform sampler2D uLambda;                  // lambda 信息

uniform float uGridTextureSize;             // 最终的 gridTexture 大小
uniform float uBucketSize;                  // 粒子的活动范围

uniform float uKernelRadius;
uniform float uRestDensity;

uniform bool  uCorrection;
uniform float uTensileK;


// obstacle 信息
uniform float uCollide;         // 是否进行冲突检测
uniform vec3 uCenterPosition;   // 中心位置
uniform vec3 uSize;             // 长宽高

float h2;

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

// 根据从 grid 中获取的顶点序号，计算出对应的纹理坐标
vec2 getNeighborTexIndex(float neighborIndex) {
    float texturePositionSize = float(textureSize(uTexturePosition, 0).x);
    float x = mod(neighborIndex, texturePositionSize) + 0.5;
    float y = floor(neighborIndex / texturePositionSize) + 0.5;
    // 获得了纹理坐标
    vec2 index = vec2(x, y) / texturePositionSize;

    return index;
}

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

vec3 gradWspiky(vec3 r) {
    float h = uKernelRadius;
    float l = length(r);
    if (l > h || l == 0.0)
        return vec3(0);
    float tmp = h - l;
    return (-14.3239569771 * tmp * tmp) * r / (l * h * h * h * h * h * h);
}

float Wpoly6(float r) {
    float h = uKernelRadius;
    if (r > h)
        return 0.0;
    float tmp = h * h - r * r;
    return 1.56668147106 * tmp * tmp * tmp / (h * h * h * h * h * h * h * h * h);
}

void main() {

    h2 = uKernelRadius * uKernelRadius;

    // 获取当前顶点对应的纹理坐标，范围 (0, 1)
    vec2 index = getIndex();

    // 纹理坐标范围转换到 (-1, 1)
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    // 取出粒子的位置, 范围为 [0, pbfResolution]
    vec3 particlePosition = texture(uTexturePosition, index).rgb;

    // 对应到相应的 grid 中
    vec3 gridPosition = floor(particlePosition);

    float lambda_i = texture(uLambda, index).x;
    vec3 deltaPosition = vec3(0.);

    // 遍历所有相邻的 grid
    for (int i = 0; i < 27; i++) {

        // 获得对应的 gridIndex 纹理坐标
        vec2 gridIndex = getGridCoordinates(gridPosition + OFFSET[i]);

        // 获得存储的邻居粒子 index
        vec4 neighbors = texture(uNeighbors, gridIndex);

        // 遍历所有的邻居粒子
        for (int j = 0; j < 4; j++) {
            if (neighbors[j] <= 0.)
                continue;

            // 邻居粒子纹理坐标
            vec2 neighborIndex = getNeighborTexIndex(neighbors[j]);
            // 邻居粒子的位置
            vec3 neighborPosition = texture(uTexturePosition, neighborIndex).rgb;

            vec3 distance = particlePosition - neighborPosition;
            float r = length(distance);

            // 邻居粒子 lambda_j
            float lambda_j = texture(uLambda, neighborIndex).r;

            // the lambda Correction
            float lambda_corr = 0.0;
            if (uCorrection) {
                float tmp = Wpoly6(r);
                float scorr = (1.0 / Wpoly6(0.1 * uKernelRadius)) * tmp;
                lambda_corr = -uTensileK * pow(scorr, 4.);
            }

            vec3 temp = gradWspiky(distance);
            deltaPosition += (lambda_i + lambda_j + lambda_corr) * temp;
        }
    }

    
    // 粒子最终的位置
    vec3 endPosition = particlePosition + (1. / uRestDensity) * deltaPosition;

    // 对粒子进行约束
    if (endPosition.x > uBucketSize - 0.5)
        endPosition.x = uBucketSize - 0.5;
    if (endPosition.x < 0.5)
        endPosition.x = 0.5;

    if (endPosition.y > uBucketSize - 0.5)
        endPosition.y = uBucketSize - 0.5;
    if (endPosition.y < 0.5)
        endPosition.y = 0.5;

    if (endPosition.z > uBucketSize - 0.5)
        endPosition.z = uBucketSize - 0.5;
    if (endPosition.z < 0.5)
        endPosition.z = 0.5;

    // 冲突检测
    if (uCollide == 1.0)  {
        float up = (uCenterPosition.y + uSize.y / 2.0) * uBucketSize;
        float down = (uCenterPosition.y - uSize.y / 2.0) * uBucketSize;
        float back = (uCenterPosition.x - uSize.x / 2.0) * uBucketSize;
        float front = (uCenterPosition.x + uSize.x / 2.0) * uBucketSize;
        float left = (uCenterPosition.z - uSize.z / 2.0) * uBucketSize;
        float right = (uCenterPosition.z + uSize.z / 2.0) * uBucketSize;
        float x = endPosition.x;
        float y = endPosition.y;
        float z = endPosition.z;
        // 与上面相撞
        if (x >= back && x <= front && z >= left && z <= right && y >= up - 0.4 && y < up) {
            endPosition.y = up;
        } 
        // 与下面相撞
        else if (x >= back && x <= front && z >= left && z <= right && y <= down + 0.4 && y > down) {
            endPosition.y = down;
        }
        // 与左面相撞
        else if (x >= back && x <= front && y >= down && y <= up && z <= left + 0.4 && z > left) {
            endPosition.z = left;
        }
        // 与右面相撞
        else if (x >= back && x <= front && y >= down && y <= up && z >= right - 0.4 && z < right) {
            endPosition.z = right;
        }
        // 与后面相撞
        else if (y >= down && y <= up && z >= left && z <= right && x <= back + 0.4 && x > back) {
            endPosition.x = back;
        }
        // 与前面相撞
        else if (y >= down && y <= up && z >= left && z <= right && x >= front - 0.4 && x < front) {
            endPosition.x = front;
        }
    }

    colorData = vec4(endPosition, texture(uLambda, index).g + 1.);
}

`;