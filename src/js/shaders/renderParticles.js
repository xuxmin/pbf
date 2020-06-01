const vsParticles = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

uniform sampler2D uTexturePosition;     // 2D 数组, 采样获得的 RGBA 对应 x y 1 1
uniform float uScale;                   // pbfResolution

out vec4 colorData;

void main() 
{
    // textureSize 返回纹理的大小
    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);

    /* gl_VertexID 当前正在处理的顶点的索引, 一直处理完所有点。
       顶点个数由调用drawArrays时的第三个参数确定 */

    // 根据 gl_VertexID 计算出纹理坐标, 范围 (0, 1)
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    // 粒子位置的范围是 [0, uScale], 映射到到 [0, 1]
    vec3 position = texture(uTexturePosition, index).rgb / uScale;

    if(position.y < 0.) position = vec3(0.);

    gl_Position = uPMatrix * uCameraMatrix * vec4(position, 1.);

    gl_PointSize = 4.;

    colorData = vec4(0.0, 0.0, 1.0, 1.0);
    // colorData.rgb = position;
    // colorData.a = 1.;

}
`;

// 通用的片段着色器：将输入的纹理数据原样输出
const fsColor = `#version 300 es
    precision highp float;

    in vec4 colorData;
    out vec4 color;

    void main() 
    {
        float alpha = max(0.0, 1.0 - dot(gl_PointCoord - vec2(0.5), gl_PointCoord - vec2(0.5)) * 5.);
        color = vec4(colorData.xyz, alpha);
        // color = colorData;
    }
`;