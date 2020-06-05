const vsIntegrateVelocity = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uTexturePosition;
uniform sampler2D uTexturePositionOld;
uniform float uDeltaTime;

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

    vec2 index = getIndex();

    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    vec3 velocity = (texture(uTexturePosition, index).rgb - texture(uTexturePositionOld, index).rgb) / uDeltaTime;

    colorData = vec4(velocity, 1.);
}

`;