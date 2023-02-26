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
        this.restoreNormalProgram = null;
        this.smoothDepthProgram = null;
        this.shadingProgram = null;
        this.copyTextureProgram = null;             // 用于复制纹理的
        this.renderParticlesProgram = null;

        this.depthTexture = null;               // 存储屏幕空间深度
        this.smoothDepthTexture = null;
        this.thickTexture = null;               // 存储屏幕空间厚度
        this.normalTexture = null;              // 存储恢复的法线
        
        this.depthBuffer = null;
        this.thickBuffer = null;
        this.normalBuffer = null;
        this.smoothDepthBuffer = null;
    }

    init() {
        this.skybox = skybox

        this.getDepthProgram = new Shader(vsSSFDepth, fsSSFDepth);
        this.getThickProgram = new Shader(vsSSFThick, fsSSFThick);
        this.restoreNormalProgram = new Shader(vsSSFRestoreNormal, fsSSFRestoreNormal);
        this.smoothDepthProgram = new Shader(vsSSFSmoothDepth, fsSSFSmoothDepth)
        this.copyTextureProgram = new Shader(vsTextureColor, fsTextureColor);
        this.shadingProgram = new Shader(vsSSFShading, fsSSFShading);
        this.renderParticlesProgram = new Shader(vsParticles, fsParticles);
        
        this.depthTexture = new Texture();
        this.depthTexture.generate(this.width, this.height, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        this.smoothDepthTexture = new Texture();
        this.smoothDepthTexture.generate(this.width, this.height, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        this.thickTexture = new Texture();
        this.thickTexture.generate(this.width, this.height, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        this.normalTexture = new Texture();
        this.normalTexture.generate(this.width, this.height, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

        // create framebuffer and bind to textures
        this.depthBuffer = createDrawFramebuffer(this.depthTexture.tex, true, false);
        this.thickBuffer = createDrawFramebuffer(this.thickTexture.tex, true, false);
        this.normalBuffer = createDrawFramebuffer(this.normalTexture.tex, false, false);
        this.smoothDepthBuffer = createDrawFramebuffer(this.smoothDepthTexture.tex, false, false);
    }

    render(controls) {
        const ssfr = controls.SSFR;
        if (ssfr) {
            this.getDepth();
            this.smoothDepth();
            this.copyBetweenTexture(this.smoothDepthTexture, this.depthBuffer);
            this.smoothDepth();
            this.getThick();
            this.restoreNormal();
            this.shading(controls);            
        }
        else {
            this.renderParticles();
        }

    }

    getDepth() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthBuffer);
        gl.viewport(0, 0, this.height, this.width);

        this.getDepthProgram.use();
        this.getDepthProgram.bindTexture("uTexturePosition", this.pbf.positionTexture, 0);
        this.getDepthProgram.setUniform1f("uScale", controls.resolution); // 用于将坐标返回转换到 [0, 1]
        this.getDepthProgram.setUniformMatrix4fv("uCameraMatrix", this.camera.cameraTransformMatrix);
        this.getDepthProgram.setUniformMatrix4fv("uPMatrix", this.camera.perspectiveMatrix);
        
        gl.clearColor(100.0, 100.0, 100.0, 100.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.POINTS, 0, this.pbf.totalParticles);
        gl.disable(gl.DEPTH_TEST);              // 深度还是有些问题
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
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

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
    }

    restoreNormal() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalBuffer);
        gl.viewport(0, 0, this.height, this.width);
        this.restoreNormalProgram.use();
        this.restoreNormalProgram.bindTexture("uTexture", this.smoothDepthTexture, 0);
        // this.restoreNormalProgram.setUniformMatrix4fv("uPMatrix", this.camera.perspectiveMatrix);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
    }

    smoothDepth() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.smoothDepthBuffer);
        gl.viewport(0, 0, this.height, this.width);
        this.smoothDepthProgram.use();
        this.smoothDepthProgram.bindTexture("uTexture", this.depthTexture, 0);
        gl.clearColor(100.0, 100.0, 100.0, 100.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
    }

    shading() {
        const attenuate_k = controls.attenuate_k;
        const max_attenuate = controls.max_attenuate;
        const tx = controls.tint_color_r;
        const ty = controls.tint_color_g;
        const tz = controls.tint_color_b;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.height, this.width);
        this.shadingProgram.use();
        this.shadingProgram.bindTexture("uDepthTexture", this.smoothDepthTexture, 0);
        this.shadingProgram.bindTexture("uThickTexture", this.thickTexture, 1);
        this.shadingProgram.bindTexture("uNormalTexture", this.normalTexture, 2);
        this.shadingProgram.bindTexture("uSkybox", this.skybox.cubemapTexture, 3);
        this.shadingProgram.setUniformMatrix4fv("uCameraMatrix", this.camera.cameraTransformMatrix);
        this.shadingProgram.setUniform3f("uTintColor", tx / 255.0, ty / 255.0, tz / 255.0);
        this.shadingProgram.setUniform1f("uMaxAttenuate", max_attenuate);
        this.shadingProgram.setUniform1f("uAttenuateK", attenuate_k);
        gl.disable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    renderParticles() {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.viewport(0, 0, this.height, this.height);
        renderParticlesProgram.use();
        renderParticlesProgram.bindTexture("uTexturePosition", this.pbf.positionTexture, 0);
        renderParticlesProgram.setUniform1f("uScale", controls.resolution); // 用于将坐标返回转换到 [0, 1]
        renderParticlesProgram.setUniform1f("particleSize", controls.particleSize);
        renderParticlesProgram.setUniformMatrix4fv("uCameraMatrix", this.camera.cameraTransformMatrix);
        renderParticlesProgram.setUniformMatrix4fv("uPMatrix", this.camera.perspectiveMatrix);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.POINTS, 0, this.pbf.totalParticles);
    }
    
    copyBetweenTexture(srcTexture, dstBuffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstBuffer);
        gl.viewport(0, 0, this.height, this.width);
        this.copyTextureProgram.use();
        this.copyTextureProgram.bindTexture("uTexture", srcTexture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    exportTexture(texture) {
        const fb = gl.createFramebuffer();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.tex, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        var data = new Float32Array(this.width * this.height * 4);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
        
        console.log(data)
        return data;
    }
};