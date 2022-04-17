const vsSSFShading = `#version 300 es

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


const fsSSFShading = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uDepthTexture;
uniform sampler2D uThickTexture;
uniform sampler2D uNormalTexture;
uniform samplerCube skybox;

in vec2 uv;
out vec4 color;

float getZ(vec2 uv) {
    return - texture(uDepthTexture, uv).x;
}

// 着色计算在相机坐标系下进行

// calculate eye-space position
vec3 uvToEye(vec2 uv) {
    float depth = getZ(uv);

    float height = 0.00315;
    float width = height;

    float near = 0.01;
    float x = (2. * uv.x - 1.) * height * (- depth) / near;
    float y = (2. * uv.y - 1.) * width * (- depth) / near;
    return vec3(x, y, depth);
}


float proj(float ze) {
    float near = 0.01;
    float far = 10.;
	return (far + near) / (far - near) + 2. * far * near / ((far - near) * ze);
}

void shading_depth() {
	float z = -getZ(uv);
    if (z > 90.) discard;

	float c = exp(z) / (exp(z) + 1.);
	c = (c - 0.5) * 2.;

	color = vec4(c, c, c, 1.);
}

void shading_thick() {
	float z = -getZ(uv);
    if (z > 90.) discard;

	float t = texture(uThickTexture, uv).x;

	t = exp(t) / (exp(t) + 1.);
	t = (t - 0.5) * 2.;

	color = vec4(t, t, t, 1);
}

void shading_normal() {
    vec3 normal = texture(uNormalTexture, uv).xyz;
    if (dot(normal, normal) < 0.01) {
        discard;
    }
	color = vec4(normal, 1.0);
}


void shading_fresnel_scale() {
	vec3 normal = texture(uNormalTexture, uv).xyz;

    if (dot(normal, normal) < 0.01) {
        discard;
    }

    vec3 viewDir = -uvToEye(uv);
    viewDir = normalize(viewDir);

    float n1 = 1.3333f;
    float t = (n1 - 1.) / (n1 + 1.);
    float r0 = t * t;

    float r = r0 + (1. - r0) * pow(1. - dot(normal, viewDir), 2.);

    r = dot(normal, viewDir);
    color = vec4(r, r, r, 1.0);
}

vec3 computeAttennuation(float thickness) {
    const float k_r = 0.5f;
    const float k_g = 0.2f;
    const float k_b = 0.05f;
    return vec3(exp(-k_r * thickness), exp(-k_g * thickness), exp(-k_b * thickness));
}

void shading_fresnel() {
	vec3 normal = texture(uNormalTexture, uv).xyz;

    if (dot(normal, normal) < 0.01) {
        discard;
    }

    vec3 shadePos = uvToEye(uv);
    vec3 viewDir = normalize(-shadePos);

    float n1 = 1.3333f;
    float t = (n1 - 1.) / (n1 + 1.);
    float r0 = t * t;
    float fresnelRatio = clamp(r0 + (1. - r0) * pow(1. - dot(normal, viewDir), 3.), 0., 1.);

	float thickness = texture(uThickTexture, uv).x;

	vec3 reflectionDir = -viewDir + 2. * normal * dot(normal, viewDir);
    vec3 reflectionColor = texture(skybox, reflectionDir).rgb;

    // Color Attenuation from Thickness (Beer's Law)
    vec3 attenuate = computeAttennuation(thickness * 5.0f);
    attenuate = mix(vec3(1., 1., 1.), attenuate, 1.0);

	vec3 refractionDir = -viewDir - 0.2*normal;
    vec3 refractionColor = attenuate * texture(skybox, refractionDir).rgb;

	color = vec4(mix(refractionColor, reflectionColor, fresnelRatio), 1);
}

void main() {
    // {
	//     vec3 n = texture(uNormalTexture, uv).xyz;
	//     n = texture(uThickTexture, uv).xyz;
	//     n = texture(uDepthTexture, uv).xyz;
    //     n = texture(skybox, vec3(1., 1., 1.)).xyz;
    // }

    float depth = getZ(uv);
    float z_ndc = proj(depth);

    gl_FragDepth = 0.5 * (gl_DepthRange.diff * z_ndc + gl_DepthRange.far + gl_DepthRange.near);	

    shading_fresnel();
}

`;