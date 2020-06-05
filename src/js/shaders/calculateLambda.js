const vsCalculateLambda = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;     // 粒子位置信息
uniform sampler2D uNeighbors;           // 粒子邻居信息

uniform float uGridTextureSize;        // 最终的 gridTexture 大小
uniform float uBucketSize;             // 粒子的活动范围

uniform float uKernelRadius;
uniform float uParticleMass;
uniform float uRestDensity;
uniform float uRelaxParameter; // epsilon

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
vec2 getGridCoordinates(vec3 gridPosition)
{
    float BucketNum = uGridTextureSize / uBucketSize;
    float x = mod(gridPosition.z, BucketNum);
    float y = floor(gridPosition.z / BucketNum);
    vec2 coord = vec2(x, y);

    vec2 gridIndex = (gridPosition.xy + uBucketSize * coord + vec2(0.5)) / uGridTextureSize;

    return gridIndex;
}

float Wpoly6(float r) {
    float h = uKernelRadius;
    if (r > h)
        return 0.0;
    float tmp = h * h - r * r;
    return 1.56668147106 * tmp * tmp * tmp / (h * h * h * h * h * h * h * h * h);
}

vec3 gradWspiky(vec3 r) {
    float h = uKernelRadius;
    float l = length(r);
    if (l > h || l == 0.0)
    	return vec3(0);
    float tmp = h - l;
    return (-14.3239569771 * tmp * tmp) * r / (l * h * h * h * h * h * h);
}


void main() {
    // 获取当前顶点对应的纹理坐标，范围 (0, 1)
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
            float r = length(distance); // 粒子与邻居的距离
            
            density += uParticleMass * Wpoly6(r);    // 累加该粒子处的密度, 这里注意乘上了粒子质量

            vec3 grad_pk_Ci = gradWspiky(distance);
            grad_pk_Ci *= 1.0 / uRestDensity;
            sum_k_grad_Ci += dot(grad_pk_Ci, grad_pk_Ci);

			// Now use j as j again and accumulate grad_pi_Ci for the case k=i
			grad_pi_Ci += grad_pk_Ci;
        }
    }

    float densityConstrain = density / uRestDensity - 1.;

    sum_k_grad_Ci += dot(grad_pi_Ci, grad_pi_Ci);

    float lambda = - densityConstrain / (sum_k_grad_Ci + uRelaxParameter);

    colorData = vec4(lambda, densityConstrain, density, 1.);
}
`;
