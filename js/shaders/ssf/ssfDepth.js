const vsSSFDepth = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

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


const fsSSFDepth = `#version 300 es
    precision highp float;
    uniform mat4 uPMatrix;

    in vec4 viewPos;    // 粒子中心在相机空间坐标

    out vec4 color;

    void main() 
    {
        vec2 xy = gl_PointCoord * 2. - 1.0;
        float r2 = dot(xy, xy);
        
        // 丢弃圆外的像素, 保证绘制球体而不是正方形
        if (r2 > 1.0) {
            discard;
            // return;
        }
        
        float radius = 0.05;            // 粒子半径
        
        // 根据 gl_PointCoord 计算出当前着色的点在相机空间的坐标
        float z = sqrt(1.0 - r2);
        vec4 nviewPos = vec4(viewPos.xyz + vec3(xy, z) * radius, 1.);
        vec4 nclipPos = uPMatrix * viewPos;

        vec4 ndcPos = nclipPos / nclipPos.w;
        gl_FragDepth = 0.5 * (gl_DepthRange.diff * ndcPos.z + gl_DepthRange.far + gl_DepthRange.near);
        
        color = vec4(-nviewPos.z, 0., 0., 1.0);
    }
`;