const vsSSFRestoreNormal = `#version 300 es

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


const fsSSFRestoreNormal = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexture;

in vec2 uv;
out vec4 color;

float getZ(vec2 uv) {
    return - texture(uTexture, uv).x;
}

// calculate eye-space position
vec3 uvToEye(vec2 uv) {
    float depth = getZ(uv);

    float near = 0.01;
    float x = (2. * uv.x - 1.) * 250. * - depth / near;
    float y = (2. * uv.y - 1.) * 250. * - depth / near;

    return vec3(x, y, depth);
}

void main() {

    float depth = getZ(uv);

    // 将默认深度设置为 100.0, 排除掉这些像素
    if (depth < -90.) {
        discard;
        return;
    }

    float du = 1. / 500.;
    float dv = 1. / 500.;

    // vec3 posEye = uvToEye(uv);

    // calculate defferences
    // vec3 ddx = uvToEye(uv + vec2(du, 0)) - posEye;
    // vec3 ddx2 = posEye - uvToEye(uv - vec2(du, 0));
    // if (abs(ddx.z) > abs(ddx2.z)) {
    //     ddx = ddx2;
    // }

    // vec3 ddy = uvToEye(uv + vec2(0, dv)) - posEye;
    // vec3 ddy2 = posEye - uvToEye(uv - vec2(0, dv));
    // if (abs(ddy.z) > abs(ddy2.z)) {
    //     ddy = ddy2;
    // }

    // vec3 n = cross(ddx, ddy);
    // n = normalize(n);

    float ddx = getZ(uv + vec2(du, 0)) - depth;
    float ddx2 = depth - getZ(uv - vec2(du, 0));
    if (abs(ddx) > abs(ddx2)) {
        ddx = ddx2;
    }

    float ddy = getZ(uv + vec2(0, dv)) - depth;
    float ddy2 = depth - getZ(uv - vec2(0, dv));
    if (abs(ddy) > abs(ddy2)) {
        ddy = ddy2;
    }

    float c_y = 2. / (0.01 * 2.);
    float c_x = 2. / (0.01 * 2.);

    vec3 n = vec3(-c_y * ddx, -c_x * ddy, c_x*c_y*depth);

    color = vec4(n, 1.0);
}

`;