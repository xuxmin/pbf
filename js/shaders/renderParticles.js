const vsParticles = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform float particleSize;
uniform sampler2D uTexturePosition;     // 2D 数组, 采样获得的 RGBA 对应 x y 1 1
uniform float uScale;                   // pbfResolution
out vec4 colorData;
void main() 
{
    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    vec3 position = texture(uTexturePosition, index).rgb / uScale;
    if(position.y < 0.) position = vec3(0.);
    gl_Position = uPMatrix * uCameraMatrix * vec4(position, 1.);
    gl_PointSize = particleSize;
    colorData = vec4(position.y / 3., position.y / 3., 1.0, 1.0);
}
`;

const fsParticles = `#version 300 es
    precision highp float;
    in vec4 colorData;
    out vec4 color;

    void main() 
    {
        float alpha = max(0.0, 1.0 - dot(gl_PointCoord - vec2(0.5), gl_PointCoord - vec2(0.5)) * 5.);
        color = vec4(colorData.xyz, alpha);
    }
`;