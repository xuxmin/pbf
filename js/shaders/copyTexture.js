
/* 
将整个纹理 uTexture 输出, 存储到 frame buffer 中，
间接地更新与 frame buffer 绑定的纹理数据
*/

// 方法是直接绘制一个矩阵，4个顶点就行

const vsTextureColor = `#version 300 es

out vec2 uv;    // 纹理坐标

void main()
{
    int index = gl_VertexID;    // 四个顶点 0, 1, 2, 3
    // 0, 1, 2, 3 对应于 (-1, -1), (1, -1), (-1, 1), (1, 1)
    vec2 position = 2. * vec2(float(index % 2), float(index / 2)) - vec2(1.);

    // 转换为 (0, 1) 范围的纹理坐标
    uv = 0.5 * position + vec2(0.5);

    gl_Position = vec4(position, 0., 1.);   // 生成了绘制矩形需要的四个顶点
}
`;



const fsTextureColor = `#version 300 es

    precision highp float;
    precision highp sampler2D;

    uniform sampler2D uTexture;
    uniform bool uForceAlpha;
    in vec2 uv;
    out vec4 color;

    void main() {
        color = texture(uTexture, uv);
        if(uForceAlpha) color.a = 1.;
    }

`;