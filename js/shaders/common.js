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