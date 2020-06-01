class Shader {
    constructor(vertexSource, fragmentSource) {
        this.vertexSource = vertexSource;
        this.fragmentSource = fragmentSource;
        this.program = gl.createProgram();
        this.createProgram();
    }

    initShader(code, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw new Error("compile: " + gl.getShaderInfoLog(shader));
        gl.attachShader(this.program, shader);
    }

    createProgram() {
        this.initShader(this.vertexSource, gl.VERTEX_SHADER);
        this.initShader(this.fragmentSource, gl.FRAGMENT_SHADER);

        gl.linkProgram(this.program);
        // Check the link status
        const linked = gl.getProgramParameter(this.program, gl.LINK_STATUS);
        if (!linked) {
            // something went wrong with the link
            const lastError = gl.getProgramInfoLog(program);
            console.log('Error in program linking:' + lastError);
            gl.deleteProgram(program);
            this.program = null;
        }
    }

    use() {
        gl.useProgram(this.program);
    }

    getAttribLoc(name) {
        this.use();
        let loc = gl.getAttribLocation(this.program, name);
        if (loc == -1) throw `getAttribLoc  ${name} error`;
        return loc;
    }

    getUniformLoc(name) {
        this.use();
        let loc = gl.getUniformLocation(this.program, name);
        if (loc == null) throw `getUniformLoc ${name} err`;
        return loc;
    }

    setUniform1f(name, value) {
        gl.uniform1f(this.getUniformLoc(name), value);
    }

    setUniform1i(name, value) {
        gl.uniform1i(this.getUniformLoc(name), value);
    }

    setUniform3f(name, v1, v2, v3) {
        gl.uniform3f(this.getUniformLoc(name), v1, v2, v3);
    }

    setUniformMatrix4fv(name, matrix) {
        gl.uniformMatrix4fv(this.getUniformLoc(name), false, matrix);
    }

    // name: 采样器名字
    // texture: 纹理对象
    // index: 纹理单元
    bindTexture(name, texture, index) {
        let textures = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7, gl.TEXTURE8, gl.TEXTURE9, gl.TEXTURE10, gl.TEXTURE11, gl.TEXTURE12, gl.TEXTURE13, gl.TEXTURE14];
        gl.activeTexture(textures[index]);
        texture.bind();
        gl.uniform1i(this.getUniformLoc(name), index);
    }
};


class Texture {
    constructor() {
        this.tex = gl.createTexture();
    }

    generate(width, height, internalFormat, format, maxFilter, minFilter, type, pixels = null) {
        this.tex.width = width;
        this.tex.height = height;
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, pixels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, maxFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    bind() {
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
    }
};

/*
帧缓冲区也可以称为帧缓存， 对于有独立显卡的PC， 帧缓冲区是GPU的专属内存， 
位于独立显卡上， 是显存的一部分； 像手机等嵌入设备的帧缓冲区往往位于CPU和GPU的共享内存上。 
一般开发的时候只要不涉及到底层性能优化的问题就不用考虑这些和硬件相关的概念。 
所有的帧缓冲区都是都是离散的内存块， 工程师可以通过WebGL API创建， 
渲染管线生成的数据可以写入帧缓冲区中， 帧缓冲区包含一些用于不同功能的子缓冲区， 
存储对应的数据， 也可以通过API读取帧缓冲中的数据。 渲染管线上的深度测试单元可以读取深度缓冲区中的数据， 
模板测试单元可以读取模板缓冲区中的数据， 显示系统可以读取颜色缓冲区中的片元像素数据， 
只有颜色缓冲区中的像素数据会显示在浏览器窗口的canvas画布上。
*/


// Function used to generate multiple drawing buffers
const createDrawFramebuffer = (_textures, useDepth = false, useStencil = false) => {
    //This allows to either have a single texture as input or an array of textures
    let textures = _textures.length == undefined ? [_textures] : _textures;

    let frameData = gl.createFramebuffer();             // 创建帧缓冲
    /* 可以将一个 frame buffer 与多个纹理(颜色缓冲区)绑定，
     通过 drawBuffers 指定绘制到那个颜色缓冲区，可以同时绘制到多个颜色缓冲区 */
    let colorAttachments = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4, gl.COLOR_ATTACHMENT5, gl.COLOR_ATTACHMENT6];
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frameData); // 绑定帧缓冲
    frameData.width = textures[0].width;
    frameData.height = textures[0].height;
    let drawBuffers = [];
    for (let i = 0; i < textures.length; i++) {
        // 将 texture 与 frame buffer 绑定, 这样写入 frame buffer 的数据会同时写入 texture 中
        gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, colorAttachments[i], gl.TEXTURE_2D, textures[i], 0);
        drawBuffers.push(colorAttachments[i]);
    }
    if (useDepth) {
        // 创建一个渲染缓冲区，可以作为帧缓冲区的子缓冲区，接收来自渲染管线的片元像素值、深度值等数据
        let renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        // 指定渲染缓冲区的用途，这里指定为深度缓冲区，接收片元的深度值Z数据。
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textures[0].width, textures[0].height);
        if (useStencil) {
            // 模板缓冲区
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, textures[0].width, textures[0].height);
            // 将渲染缓冲区关联到帧缓冲区，这里是渲染缓冲区作为帧缓冲区的模板缓冲区
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
        } else {
            // 渲染缓冲区作为帧缓冲区的深度缓冲区，接收片元深度值Z
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
        }
    }
    // 指定在当前帧缓冲区的哪个颜色缓冲区进行绘制，并不影响深度、模板缓冲区。
    gl.drawBuffers(drawBuffers);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);  // 解除绑定

    let status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.log('fb status: ' + status.toString(16));
        return null;
    }

    return frameData;
}