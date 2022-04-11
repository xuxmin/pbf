const vsSkybox = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
in vec3 aPosition;
out vec3 TexCoords;

void main()
{
    // gl_Position = uPMatrix * uCameraMatrix * vec4(aPosition, 1.0);
    gl_Position = vec4(aPosition, 1.0);  
    TexCoords = aPosition;
}`;

const fsSkybox = `#version 300 es
precision highp float;

in vec3 TexCoords;
out vec4 color;

uniform samplerCube skybox;

void main()
{
    color = texture(skybox, TexCoords);
}`;