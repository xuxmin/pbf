class SSFRender {
    constructor(canvas, pbf, camera) {
        this.pbf = pbf;
        this.camera = camera;
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        // shader program
        this.getDepthProgram = null;
        this.getThickProgram = null;
        this.copyTextureProgram = null;             // 用于复制纹理的

        this.depthTexture = null;               // 存储屏幕空间深度
        this.thickTexture = null;               // 存储屏幕空间厚度
        
        this.depthBuffer = null;
        this.thickBuffer = null;

    }

    init() {
        this.getDepthProgram = new Shader(vsSSFDepth, fsSSFDepth);
        this.getThickProgram = new Shader(vsSSFThick, fsSSFThick);
        this.copyTextureProgram = new Shader(vsTextureColor, fsTextureColor);

        this.depthTexture = new Texture();
        this.depthTexture.generate(this.width, this.height, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        this.thickTexture = new Texture();
        this.thickTexture.generate(this.width, this.height, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

        // create framebuffer and bind to textures
        this.depthBuffer = createDrawFramebuffer(this.depthTexture.tex, true, false);
        this.thickBuffer = createDrawFramebuffer(this.thickTexture.tex, true, false);
    }

    render() {
        this.getThick();
        this.copyBetweenTexture(this.thickTexture, null);
    }

    getDepth() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthBuffer);
        gl.viewport(0, 0, this.height, this.width);

        this.getDepthProgram.use();
        this.getDepthProgram.bindTexture("uTexturePosition", this.pbf.positionTexture, 0);
        this.getDepthProgram.setUniform1f("uScale", controls.resolution); // 用于将坐标返回转换到 [0, 1]
        this.getDepthProgram.setUniformMatrix4fv("uCameraMatrix", this.camera.cameraTransformMatrix);
        this.getDepthProgram.setUniformMatrix4fv("uPMatrix", this.camera.perspectiveMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.POINTS, 0, this.pbf.totalParticles);
    }

    getThick() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.thickBuffer);
        gl.viewport(0, 0, this.height, this.width);

        this.getThickProgram.use();
        this.getThickProgram.bindTexture("uTexturePosition", this.pbf.positionTexture, 0);
        this.getThickProgram.setUniform1f("uScale", controls.resolution); // 用于将坐标返回转换到 [0, 1]
        this.getThickProgram.setUniformMatrix4fv("uCameraMatrix", this.camera.cameraTransformMatrix);
        this.getThickProgram.setUniformMatrix4fv("uPMatrix", this.camera.perspectiveMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
        gl.disable(gl.DEPTH_TEST);

        gl.drawArrays(gl.POINTS, 0, this.pbf.totalParticles);
    }
    
    copyBetweenTexture(srcTexture, dstBuffer) {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstBuffer);
        gl.viewport(0, 0, this.height, this.width);
        this.copyTextureProgram.use();
        this.copyTextureProgram.bindTexture("uTexture", srcTexture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
};