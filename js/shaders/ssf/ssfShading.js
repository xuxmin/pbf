const vsSSFShading = `#version 300 es

uniform mat4 uCameraMatrix;
out vec2 uv;    // 纹理坐标

void main()
{
    int index = gl_VertexID;    // 四个顶点 0, 1, 2, 3
    // 0, 1, 2, 3 对应于 (-1, -1), (1, -1), (-1, 1), (1, 1)
    vec2 position = 2. * vec2(float(index % 2), float(index / 2)) - vec2(1.);

    // 转换为 (0, 1) 范围的纹理坐标
    uv = 0.5 * position + vec2(0.5);

    vec4 viewPos = uCameraMatrix * vec4(1.);

    gl_Position = vec4(position, 0., 1.);   // 生成了绘制矩形需要的四个顶点
}
`;


const fsSSFShading = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uDepthTexture;
uniform sampler2D uThickTexture;
uniform sampler2D uNormalTexture;
uniform samplerCube uSkybox;
uniform mat4 uCameraMatrix;
uniform vec3 uTintColor;
uniform float uMaxAttenuate;
uniform float uAttenuateK;

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

vec3 trace_color(vec3 p_in_cam, vec3 d_in_cam) {
    mat4 inv_cam = inverse(uCameraMatrix);
    vec4 p_in_world = inv_cam * vec4(p_in_cam, 1.);
    vec3 d_in_world = vec3(transpose(uCameraMatrix) * vec4(d_in_cam, 1.0));

    // 计算与 x, z [0, 1] 这个正方形的交点
    float t = -p_in_world.y / d_in_world.y;
	vec3 world_its = p_in_world.xyz + t * d_in_world;

    if (t > 0.0 && world_its.x < 1.0 && world_its.x > 0.0 && world_its.z < 1.0 && world_its.z > 0.0) {
		float scale = 10.0;
		vec2 uv = scale * (world_its.xz);
		float u = mod(uv.x, 1.), v = mod(uv.y, 1.);

        if (u >= 0.0 && u < 0.5 && v >= 0.0 && v < 0.5
            || u >= 0.5 && u < 1.0 && v >= 0.5 && v < 1.0) {
			return vec3(0.1, 0.1, 0.1);
        }
        else {
			return vec3(0.5, 0.5, 0.5);
        }
	}
	else
        return texture(uSkybox, d_in_world).rgb;
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
    vec3 reflectionColor = trace_color(shadePos, reflectionDir);

    // Color Attenuation from Thickness (Beer's Law)
    float attenuate = max(exp(-uAttenuateK * thickness), uMaxAttenuate);

	vec3 refractionDir = -viewDir - 0.2*normal;
    vec3 refractionColor = mix(uTintColor, trace_color(shadePos, refractionDir), attenuate);

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