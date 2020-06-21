const vsRect = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform vec3 uCenter;
uniform vec3 uSize;
uniform float uColor;

in vec3 aPosition;
out vec4 colorData;

void main()
{
    vec3 position = vec3(aPosition.x * uSize.x, aPosition.y * uSize.y, aPosition.z * uSize.z);
    gl_Position = uPMatrix * uCameraMatrix * vec4((position + uCenter), 1.);
    if (uColor == 1.0)
        colorData = gl_Position;
    else
        colorData = vec4(0., 0., 0., 1.0);
}

`;

const fsRect = `#version 300 es
    precision highp float;

    in vec4 colorData;
    out vec4 color;

    void main() 
    {
        color = colorData;
    }
`;