const vsSSFSmoothDepth = `#version 300 es

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


const fsSSFSmoothDepth = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexture;

in vec2 uv;
out vec4 color;

float getZ(int x, int y) {
	return - texelFetch(uTexture, ivec2(x, y), 0).x;
}

float bilateral(int x, int y) {

    int kernel_r = 10;
    float blur_r = 1. / 6.;
    float blur_z = 10.;

	float z = getZ(x, y);
	float sum = 0., wsum = 0.;

	for(int dx = -kernel_r; dx <= kernel_r; dx++)
		for (int dy = -kernel_r; dy <= kernel_r; dy++) {
			float s = getZ(x+dx, y+dy);

			float w = exp(- float(dx*dx + dy*dy) * blur_r * blur_r);

			float r2 = (s - z) * blur_z;
			float g = exp(-r2 * r2);

			float wg = w * g;
			sum += s * wg;
			wsum += wg;
		}

	if (wsum > 0.) sum /= wsum;
	return sum;
}


void main() {

    int x = int(gl_FragCoord.x), y = int(gl_FragCoord.y);

    float depth = getZ(x, y);

    // 将默认深度设置为 100.0, 排除掉这些像素
    if (depth < -90.) {
        discard;
        return;
    }

    float zz = bilateral(x, y);

    color = vec4(-zz, 0.0, 0.0, 1.0);
}

`;