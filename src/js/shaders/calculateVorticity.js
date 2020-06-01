const vsCalculateVorticity = `#version 300 es

precision highp float;
precision highp sampler3D;

// Uniforms:
uniform sampler2D uTexturePosition; 
uniform sampler2D uTextureVelocity; // Holds particle velocities and the phase
uniform sampler2D uTextureVorticity;


uniform vec2 uResolution;

uniform vec3 uBinCountVec;

uniform float uTextureSize;
uniform float uTime;
uniform float uKernelRadius;
uniform float uVorticity;


vec3 gradWspiky(vec3 r) {
    float h = uKernelRadius;
    float l = length(r);
    if (l > h || l == 0.0)
        return vec3(0);
    float tmp = h - l;
    return (-3.0 * 4.774648292756860 * tmp * tmp) * r / (l * h * h * h * h * h * h);
}

vec3 computeVorticity( in vec2 uv) {

    // There is a maximum of 108 particle neighbors (27 bins * 4 particles)
    // Each bin has 4 particle IDs of the partices they inhabit
    vec4 neighborBins[27];
    vec4 particles[4];
    vec3 shift;
    vec2 texel;
    vec3 v_i = particleVelocity;
    vec3 vorticityArray[4];
    vec3 v = vec3(0);
    vec3 vorticity = texture(uVorticityTex, uv).xyz;
    vec3 gradVorticity = vec3(0);

    // Look up the values of the neighboring bins to get the neighboring particles
    for (int i = 0; i < 27; i++) {

        // Get the particle IDs
        shift = vec3(OFFSET[i].x * steps.x, OFFSET[i].y * steps.y, OFFSET[i].z * steps.z);
        neighborBins[i] = texture(uBin3DTex, binCoord + shift).rgba;

        for (int j = 0; j < 4; j++) {
            // Convert the particle IDs to the corresponding texture coordinates and get the particle values
            if (neighborBins[i][j] == -1.0) {
                particles[j] = vec4(-1.0);
            } else {
                texel.y = floor(neighborBins[i][j] / uTextureSize);
                texel.x = neighborBins[i][j] - (texel.y * uTextureSize);
                texel = texel / uTextureSize;
                particles[j] = texture(uTexturePosition, texel);
                vorticityArray[j] = texture(uVorticityTex, texel).xyz;
            }
        }

        int k = 0;
        vec4 particlesCorrected[4] = particles;
        float colorCounter = 0.0;

        for (int j = 0; j < 4; j++) {

            if (particles[j] != vec4(-1.0)) {

                // Compute vorticity
                vec3 position_j = particles[j].xyz;

                vec3 p_ij = particlePosition - position_j;

                gradVorticity += length(vorticityArray[j]) * gradWspiky(p_ij);
            }
        }

    }

    float l = length(gradVorticity);
    if (l > 0.0)
        gradVorticity /= l;

    vec3 N = gradVorticity;

    // Apply vorticity force
    v = v_i + uTime * uVorticity * cross(N, vorticity);

    return v;

}

vec3 offsets[27];
float texturePositionSize;
float h2;

out vec4 colorData;

void addToSum( in vec3 particlePosition, in float neighborIndex, in vec3 particleVelocity, inout vec3 deltaVelocity) {
    vec2 index = vec2(mod(neighborIndex, texturePositionSize) + 0.5, floor(neighborIndex / texturePositionSize) + 0.5) / texturePositionSize;
    vec3 distance = particlePosition - texture(uTexturePosition, index).rgb;
    float r = length(distance);
    if (r > 0. && r < uKernelRadius)
        deltaVelocity += (particleVelocity - texture(uTextureVelocity, index).rgb) * (uKernelRadius - r);
}


void main() {

    texturePositionSize = float(textureSize(uTexturePosition, 0).x);
    h2 = uKernelRadius * uKernelRadius;

    offsets[0] = vec3(-1., -1., -1.);
    offsets[1] = vec3(-1., -1., 0.);
    offsets[2] = vec3(-1., -1., 1.);
    offsets[3] = vec3(-1., 0., -1.);
    offsets[4] = vec3(-1., 0., 0.);
    offsets[5] = vec3(-1., 0., 1.);
    offsets[6] = vec3(-1., 1., -1.);
    offsets[7] = vec3(-1., 1., 0.);
    offsets[8] = vec3(-1., 1., 1.);
    offsets[9] = vec3(0., -1., -1.);
    offsets[10] = vec3(0., -1., 0.);
    offsets[11] = vec3(0., -1., 1.);
    offsets[12] = vec3(0., 0., -1.);
    offsets[13] = vec3(0., 0., 0.);
    offsets[14] = vec3(0., 0., 1.);
    offsets[15] = vec3(0., 1., -1.);
    offsets[16] = vec3(0., 1., 0.);
    offsets[17] = vec3(0., 1., 1.);
    offsets[18] = vec3(1., -1., -1.);
    offsets[19] = vec3(1., -1., 0.);
    offsets[20] = vec3(1., -1., 1.);
    offsets[21] = vec3(1., 0., -1.);
    offsets[22] = vec3(1., 0., 0.);
    offsets[23] = vec3(1., 0., 1.);
    offsets[24] = vec3(1., 1., -1.);
    offsets[25] = vec3(1., 1., 0.);
    offsets[26] = vec3(1., 1., 1.);

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    vec3 particlePosition = texture(uTexturePosition, index).rgb;
    vec3 particleVelocity = texture(uTextureVelocity, index).rgb;
    vec3 gridPosition = floor(particlePosition);
    vec3 deltaVelocity = vec3(0.);

    for (int i = 0; i < 27; i++) {

        vec3 neighborsVoxel = gridPosition + offsets[i];
        vec2 voxelsIndex = (neighborsVoxel.xy + uBucketSize * vec2(mod(neighborsVoxel.z, uBucketNum), floor(neighborsVoxel.z / uBucketNum)) + vec2(0.5)) / uVoxelTextureSize;
        vec4 neighbors = texture(uNeighbors, voxelsIndex);

        if (neighbors.r > 0.) addToSum(particlePosition, neighbors.r, particleVelocity, deltaVelocity);
        if (neighbors.g > 0.) addToSum(particlePosition, neighbors.g, particleVelocity, deltaVelocity);
        if (neighbors.b > 0.) addToSum(particlePosition, neighbors.b, particleVelocity, deltaVelocity);
        if (neighbors.a > 0.) addToSum(particlePosition, neighbors.a, particleVelocity, deltaVelocity);
    }

    particleVelocity += (uViscosityConstant / uRestDensity) * deltaVelocity;

    colorData = vec4(particleVelocity, 1.);
}

`;