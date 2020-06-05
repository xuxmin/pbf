const vsPredictPositions = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uTexturePosition;     // 粒子原位置
uniform sampler2D uTextureVelocity;     // 粒子速度
uniform float uDeltaTime;
uniform vec3 uAcceleration;

uniform vec3 uForceDirection;
uniform float uForcePosition;

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

void main() {

    // 获取当前顶点对应的纹理坐标，范围 (0, 1)
    vec2 index = getIndex();

    // 取出对应纹理坐标下的数据
    vec3 old_position = texture(uTexturePosition, index).rgb;
    vec3 velocity = texture(uTextureVelocity, index).rgb;
    
    // 纹理坐标范围转换到 (-1, 1), 即设备坐标系, 用于绘制，保存数据
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    // 假设力会给粒子 10 的加速度
    vec3 force_acce = vec3(10.0, 0.0, 0.0) * uForceDirection;
    if (old_position.x <= uForcePosition) {
        velocity = velocity + (uAcceleration + force_acce) * uDeltaTime;
    }
    else {
        velocity = velocity + uAcceleration * uDeltaTime;
    }

    colorData = vec4(old_position + velocity * uDeltaTime, 1.);
}

`;