const vsExportFrame = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

uniform sampler2D uTexturePosition;     // 2D 数组, 采样获得的 RGBA 对应 x y 1 1
uniform float uScale;                   // pbfResolution

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


void main() 
{
    vec2 index = getIndex();

    // 粒子位置的范围是 [0, uScale], 映射到到 [0, 1]
    vec3 position = texture(uTexturePosition, index).rgb / uScale;

    // 如果有 40000 个粒子，那么
    int x = gl_VertexID / 200;
    int y = gl_VertexID % 200;

    float fx = 2. * x / 200. - 1.;
    float fy = 2. * y / 200. - 1.;

    gl_Position = vec4(fx, fy, 0, 0);

    gl_PointSize = 1.;

    colorData = vec4(position, 1.);
}
`;

const fsExportFrame = `#version 300 es
    precision highp float;

    in vec4 colorData;
    out vec4 color;

    void main() 
    {
        color = colorData;
    }
`;