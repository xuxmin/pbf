const vsPlane = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

in vec3 aPosition;
out vec3 TexCoords;

void main()
{
    gl_Position = uPMatrix * uCameraMatrix * vec4(aPosition, 1.);
    TexCoords = aPosition;
}

`;

const fsPlane = `#version 300 es
    precision highp float;

    in vec3 TexCoords;
    out vec4 color;

    void main() 
    {
		float scale = 10.0;
		vec2 uv = scale * (TexCoords.xz);
		float u = mod(uv.x, 1.), v = mod(uv.y, 1.);

        if (u >= 0.0 && u < 0.5 && v >= 0.0 && v < 0.5
            || u >= 0.5 && u < 1.0 && v >= 0.5 && v < 1.0) {
                color = vec4(0.1, 0.1, 0.1, 1.0);
        }
        else {
			color = vec4(0.5, 0.5, 0.5, 1.0);
        }
    }
`;