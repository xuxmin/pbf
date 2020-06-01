const vsRect = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

in vec3 aPosition;

void main()
{
    gl_Position = uPMatrix * uCameraMatrix * vec4(aPosition, 1.);
}

`;

const fsRect = `#version 300 es
    precision highp float;

    out vec4 color;

    void main() 
    {
        color = vec4(0, 0, 0, 1);
    }
`;