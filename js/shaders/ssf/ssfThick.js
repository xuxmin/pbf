const vsSSFThick = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

// uniform float particleSize;

uniform sampler2D uTexturePosition;     // 2D 数组, 采样获得的 RGBA 对应 x y 1 1
uniform float uScale;                   // pbfResolution

out vec4 viewPos;


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

    viewPos = uCameraMatrix * vec4(position, 1.);
    
    gl_Position = uPMatrix * viewPos;

    float height = 500.0 / 2.0;
    float top = 0.00315;
    float near = 0.01;
    float radius = 0.05;            // 粒子半径
    gl_PointSize = height * near * radius / (- viewPos.z * top);
}
`;


const fsSSFThick = `#version 300 es
    precision highp float;
    uniform mat4 uPMatrix;

    out vec4 color;

    void main() 
    {
        // 丢弃圆外的像素, 保证绘制球体而不是正方形
        if (dot(gl_PointCoord - vec2(0.5), gl_PointCoord - vec2(0.5)) > 0.25) {
            discard;
            return;
        }
        
        float radius = 0.05;            // 粒子半径
        
        // 根据 gl_PointCoord 计算出当前着色的点在相机空间的坐标
        vec2 xy = (gl_PointCoord - vec2(0.5)) * 2.;
        float z = sqrt(1.0 - dot(xy, xy));

        vec3 viewDir = vec3(0., 0., 1.);
        float thickness = 2. * radius * dot(vec3(xy, z), viewDir);

        color = vec4(thickness, 0., 0., 1.);
    }
`;