const vsRect = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform vec3 uCenter;
uniform vec3 uSize;
uniform float uColor;

in vec3 aPosition;
out vec3 TexCoords;

void main()
{
    vec3 position = vec3(aPosition.x * uSize.x, aPosition.y * uSize.y, aPosition.z * uSize.z);
    gl_Position = uPMatrix * uCameraMatrix * vec4((position + uCenter), 1.);
    if (uColor == 1.0)
        vec4 colorData = gl_Position;
    else
        vec4 colorData = vec4(0., 0., 0., 1.0);
    TexCoords = aPosition;
}

`;

const fsRect = `#version 300 es
    precision highp float;

    in vec3 TexCoords;
    out vec4 color;

    uniform samplerCube skybox;

    void main() 
    {
        color = texture(skybox, TexCoords);
    }
`;