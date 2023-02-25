class Skybox {
    constructor(shader) {
        this.data = [
            // positions          
		-1.0,  1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0, 1.0,  1.0, -1.0, -1.0,  1.0, -1.0,

		-1.0, -1.0,  1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,
		-1.0,  1.0, -1.0, -1.0,  1.0,  1.0, -1.0, -1.0,  1.0,

		 1.0, -1.0, -1.0, 1.0, -1.0,  1.0, 1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0, 1.0,  1.0, -1.0, 1.0, -1.0, -1.0,

		-1.0, -1.0,  1.0, -1.0,  1.0,  1.0, 1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0, 1.0, -1.0,  1.0, -1.0, -1.0,  1.0,

		-1.0,  1.0, -1.0, 1.0,  1.0, -1.0, 1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0,

		-1.0, -1.0, -1.0, -1.0, -1.0,  1.0, 1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0, -1.0, -1.0,  1.0, 1.0, -1.0,  1.0
        ];

        //创建顶点VBO
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data), gl.STATIC_DRAW);

        this.shader = shader;

        this.img_list =  [
            document.getElementById("cube_right"), document.getElementById("cube_left"),
            document.getElementById("cube_top"), document.getElementById("cube_bottom"),
            document.getElementById("cube_back"), document.getElementById("cube_front"),
        ];
    }

    valid() {
        for (let i = 0; i < 6; i++) {
            if (!this.img_list[i].complete)
                return false;
        }
        return true;
    }

    generate() {
        this.cubemapTexture = new TextureCube()
        this.cubemapTexture.generate(2048, 2048, this.img_list)
    }

    render() {

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.height, canvas.height);
        gl.disable(gl.DEPTH_TEST);

        this.shader.use();
        this.shader.bindTexture("skybox", this.cubemapTexture, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        const locPosition = this.shader.getAttribLoc('aPosition');
        gl.enableVertexAttribArray(locPosition);
        gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 12, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
};
