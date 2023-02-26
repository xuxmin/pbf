class Plane {
    constructor(shader) {
        // 1. 定义顶点数据
        this.vertices = [
            0, 0, 0,
            1, 0, 0,
            1,  0, 1,
            0,  0, 1,
        ];

        this.indices = [
            0, 1, 2, 0, 2, 3
        ];

        this.data = [];

        for (let i = 0; i < 24; i++) {
            this.data.push(this.vertices[this.indices[i] * 3 + 0]);
            this.data.push(this.vertices[this.indices[i] * 3 + 1]);
            this.data.push(this.vertices[this.indices[i] * 3 + 2]);
        }
        console.log(this.data)

        //创建顶点VBO
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data), gl.STATIC_DRAW);

        this.shader = shader;
    }

    render(camera) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.height, canvas.height);
        gl.enable(gl.DEPTH_TEST);
        
        this.shader.use();
        this.shader.setUniformMatrix4fv("uCameraMatrix", camera.cameraTransformMatrix);
        this.shader.setUniformMatrix4fv("uPMatrix", camera.perspectiveMatrix);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        const locPosition = this.shader.getAttribLoc('aPosition');
        gl.enableVertexAttribArray(locPosition);
	    gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 12, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
};