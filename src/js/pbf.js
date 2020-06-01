class PBF {
    constructor() {

        this.totalParticles = 0;        // 所有粒子数目
        this.particlesTextureSize = 0;  // Math.ceil(Math.sqrt(this.totalParticles));

        this.bucketSize = 0;            // 粒子的活动范围 (x, y, z) in [0, bucketSize]
        this.gridsTextureSize = 0;     // Math.ceil(Math.sqrt(Math.pow(bucketSize, 3)));

        // some parameters
        this.restDensity = 1000;
        this.kernelRadius = 1.8; // 至少要大于 1 吧?
        this.particleMass = this.restDensity; // mass = density * volume / totalParticles
        this.polyConstant = (315 / (64 * Math.PI * Math.pow(this.kernelRadius, 9))) * this.particleMass;  // TODO !!!
        this.spikyGradConstant = - 45 / (Math.PI * Math.pow(this.kernelRadius, 6));
        this.relaxParameter = 0.05;         // !!!
        // for lambda correction
        this.tensileK = 40;
        this.tensilePower = 4;
        this.tensileDistanceMultiplier = 0.3;
        this.tensileDistance = this.tensileDistanceMultiplier * this.kernelRadius;

        this.viscosity = 0.1;
        this.viscosityConstant = - this.viscosity * 45 / (Math.PI * Math.pow(this.kernelRadius, 6) * this.restDensity);

        this.forcePosition = 0.0;
        this.forcePositionDelta = 0.1;

        // shader program
        this.copyTextureProgram = null;             // 用于复制纹理的
        this.predictPositionsProgram = null;        // 根据速度预测新的位置
        this.searchNeighbordsProgram = null;        // 搜索邻居粒子
        this.calculateLambdaProgram = null;         // 计算 Lambda
        this.calculateDeltaPProgram = null;         // 计算 ΔP
        this.calculateVelocityProgram  = null;      // 根据 ΔP 计算速度
        this.calculateViscosityProgram = null;      // 施加粘度

        // texture
        this.positionTexture = null;                // 存储粒子位置信息
        this.tmpPositionTexture = null;             // 存储粒子位置中间计算结果
        this.velocityTexture = null;                // 存储粒子速度信息
        this.tmpVelocityTexture = null;
        this.gridsTexture = null;                  // 存储每个 grid 对应的粒子
        this.lambdaTexture = null;                  // 存储每个粒子的 lambda
        this.vorticityTexture = null;               // 

        // buffer
        this.positionBuffer = null;
        this.tmpPositionBuffer = null;
        this.velocityBuffer = null;
        this.tmpVelocityBuffer = null;
        this.gridsBuffer   = null;
        this.lambdaBuffer   = null;
        this.vorticityBuffer  = null;
    }

    /**
     * 
     * @param {Array} particlesPosition 所有粒子的位置，每4个数对应一个粒子 [x y 1 1]
     * @param {Array} particlesVelocity 所有粒子的速度，每4个数对应一个粒子的 [vx, vy, 0, 0]
     * @param {*} _bucketSize           粒子的活动范围，(x, y, z) in [0, bucketSize]
     */
    init(particlesPosition, particlesVelocity, _bucketSize) {
        this.totalParticles = particlesPosition.length / 4.;
        // this.particlesTextureSize = Math.ceil(Math.sqrt(this.totalParticles));
        this.particlesTextureSize = 512;
        console.log("Total Partivles: " + this.totalParticles.toString());
        console.log("Particle TextureSize: " + this.particlesTextureSize.toString());

        this.bucketSize = _bucketSize;
        // this.gridsTextureSize = Math.ceil(Math.sqrt(Math.pow(this.bucketSize, 3)));
        this.gridsTextureSize = 512;    // TODO: 设置成上面的为什么会出错??
        console.log("Bucket Size: " + this.bucketSize.toString());
        console.log("Grid TextureSize: " + this.gridsTextureSize.toString());

        // 填充 particlesPosition 与 particlesVelocity 用于生成纹理
        for (let i = this.totalParticles; i < this.particlesTextureSize * this.particlesTextureSize; i++) {
            particlesPosition.push(0, 0, 0, 0);
            particlesVelocity.push(0, 0, 0, 0);
        }

        // 初始化着色器程序
        this.predictPositionsProgram    = new Shader(vsPredictPositions, fsColor);
        this.searchNeighbordsProgram    = new Shader(vsSearchNeighbors, fsColor);
        this.copyTextureProgram         = new Shader(vsTextureColor, fsTextureColor);
        this.calculateLambdaProgram     = new Shader(vsCalculateLambda, fsColor);
        this.calculateDeltaPProgram     = new Shader(vsCalculateDeltaP, fsColor);
        this.calculateVelocityProgram   = new Shader(vsCalculateVelocity, fsColor);
        this.calculateViscosityProgram  = new Shader(vsCalculateViscosity, fsColor);

        // 初始化纹理
        this.positionTexture = new Texture();
        this.positionTexture.generate(this.particlesTextureSize, this.particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
        this.velocityTexture = new Texture();
        this.velocityTexture.generate(this.particlesTextureSize, this.particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesVelocity));
        this.tmpPositionTexture = new Texture(); // 用于存储粒子位置的中间计算结果
        this.tmpPositionTexture.generate(this.particlesTextureSize, this.particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        this.lambdaTexture = new Texture();       
        this.lambdaTexture.generate(this.particlesTextureSize, this.particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        this.tmpVelocityTexture = new Texture();  // 存储速度的中间计算结果
        this.tmpVelocityTexture.generate(this.particlesTextureSize, this.particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

        this.gridsTexture = new Texture();      // 粒子映射到相应的 voxel 中
        this.gridsTexture.generate(this.gridsTextureSize, this.gridsTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
        
        this.vorticityTexture = new Texture();
        this.vorticityTexture.generate(this.particlesTextureSize, this.particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

        // create framebuffer and bind to textures
        this.positionBuffer     = createDrawFramebuffer(this.positionTexture.tex);
        this.velocityBuffer     = createDrawFramebuffer(this.velocityTexture.tex);
        this.tmpPositionBuffer  = createDrawFramebuffer(this.tmpPositionTexture.tex);
        this.tmpVelocityBuffer  = createDrawFramebuffer(this.tmpVelocityTexture.tex);
        this.lambdaBuffer       = createDrawFramebuffer(this.lambdaTexture.tex);
        this.gridsBuffer       = createDrawFramebuffer(this.gridsTexture.tex, true, true); // 这里需要同时拥有深度缓冲区与模板缓冲区

        this.vorticityBuffer    = createDrawFramebuffer(this.vorticityTexture.tex);
    }

    /**
     * 
     * @param {Dict} acceleration 加速度 x, y, z 三个轴的加速度
     * @param {*} deltaTime 
     * @param {*} constrainsIterations 
     * @param {bool} correction         是否开启 "Surface tension" correction
     */
    simulate(acceleration, deltaTime, constrainsIterations, correction) {

        // 根据施加外力后的粒子速度，预测粒子位置，存储于 tmpPositionBuffer
        this.predictPositions(acceleration, deltaTime);
        
        // 根据预测的粒子位置, hush to grid, 数据存储于 gridsBuffer 中
        this.searchNeighbords();

        // 迭代约束
        for (let iter = 0; iter < constrainsIterations; iter++) {
            // 计算每个粒子的密度，以及对应的 lambda
            this.calculateLambda();
            // 计算 ΔP，并更新位置，写入 tmpPositionBuffer
            // 由于不能写入 tmpvelocityBuffer， 也不能覆盖掉 positionBuffer, 所以我们暂时写入
            // velocityBuffer， 因为 velocityBuffer 中已经没有用了，后面要重新计算的。
            this.calculateDeltaP(correction);

            // 将 velocityBuffer 中的数据写入 tmpPositionBuffer
            this.copyBetweenTexture(this.velocityTexture, this.tmpPositionBuffer);
        }

        // 根据新位置计算新的速度，
        // this.calculateVelocity(this.tmpvelocityBuffer);
        this.calculateVelocity(deltaTime);
        // 计算粘度，同时更新速度
        this.calculateViscosity();

        // Update the positions.
        this.copyBetweenTexture(this.tmpPositionTexture, this.positionBuffer);
    }

    predictPositions(acceleration, deltaTime) {
        // predictPositions, 根据外力(eg. gravity) 计算新位置
        // 存储于 tmpPositionBuffer(tmpPositionTexture) 中
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.tmpPositionBuffer);
        gl.viewport(0, 0, this.particlesTextureSize, this.particlesTextureSize);
        this.predictPositionsProgram.use();
        this.predictPositionsProgram.setUniform1f("uDeltaTime", deltaTime);
        this.predictPositionsProgram.setUniform3f("uAcceleration", acceleration.x, acceleration.y, acceleration.z);
        this.predictPositionsProgram.bindTexture("uTexturePosition", this.positionTexture, 0);
        this.predictPositionsProgram.bindTexture("uTextureVelocity", this.velocityTexture, 1);

        const forceDirection = {
            x: 1,
            y: 0,
            z: 0,
        }
        this.predictPositionsProgram.setUniform1f("uForcePosition", this.forcePosition);
        // if (this.forcePosition >= 20 || this.forcePosition < 1.0) {
        //     this.forcePositionDelta = - this.forcePositionDelta;
        // }
        // this.forcePosition += this.forcePositionDelta;
        // console.log(this.forcePosition);
        this.predictPositionsProgram.setUniform3f("uForceDirection", forceDirection.x, forceDirection.y, forceDirection.z);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);
    }

    // 根据粒子位置(存储于tmpPositionTexture)
    // 将粒子对应到 gridsBuffer 中
    // 参考: https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch29.html
    
    searchNeighbords() {

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gridsBuffer);
        gl.viewport(0, 0, this.gridsBuffer.width, this.gridsBuffer.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.enable(gl.STENCIL_TEST);    
        gl.enable(gl.DEPTH_TEST);      // 开启模板测试与深度测试

        this.searchNeighbordsProgram.use();
        this.searchNeighbordsProgram.bindTexture("uTexturePosition", this.tmpPositionTexture, 0);
        this.searchNeighbordsProgram.setUniform1f("uVoxelTextureSize", this.gridsTextureSize);
        this.searchNeighbordsProgram.setUniform1f("uBucketSize", this.bucketSize);
        this.searchNeighbordsProgram.setUniform1f("uBucketNum", this.gridsTextureSize / this.bucketSize);
        this.searchNeighbordsProgram.setUniform1f("uTotalParticles", this.totalParticles);

        // pass 1
        gl.colorMask(true, false, false, false);   // 只写入 R 通道
        gl.depthFunc(gl.LESS);                     // index 值作为深度值
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);
        
        // pass 2
        gl.colorMask(false, true, false, false);
        gl.depthFunc(gl.GREATER);
        gl.stencilFunc(gl.GREATER, 1, 1); // gl.GREATER:   Pass if (ref & mask) >  (stencil & mask).
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);

        // pass 3
        gl.colorMask(false, false, true, false);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);

        // pass 4
        gl.colorMask(false, false, false, true);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);

        // 恢复原状
        gl.colorMask(true, true, true, true);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    calculateLambda() {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.lambdaBuffer);
        gl.viewport(0, 0, this.particlesTextureSize, this.particlesTextureSize);
        this.calculateLambdaProgram.use();
        this.calculateLambdaProgram.bindTexture("uTexturePosition", this.tmpPositionTexture, 0);    // 粒子位置信息
        this.calculateLambdaProgram.bindTexture("uNeighbors", this.gridsTexture, 1);                // 粒子邻居信息
    
        this.calculateLambdaProgram.setUniform1f("uGridTextureSize", this.gridsTextureSize);        // gridTexture 纹理大小
        this.calculateLambdaProgram.setUniform1f("uBucketSize", this.bucketSize);                   // 粒子活动范围
        this.calculateLambdaProgram.setUniform1f("uBucketNum", this.gridsTextureSize / this.bucketSize);

        this.calculateLambdaProgram.setUniform1f("uPolyKernelConstant", this.polyConstant);
        this.calculateLambdaProgram.setUniform1f("uSpikyGradConstant", this.spikyGradConstant);
        this.calculateLambdaProgram.setUniform1f("uKernelRadius", this.kernelRadius);
        this.calculateLambdaProgram.setUniform1f("uRestDensity", this.restDensity);
        this.calculateLambdaProgram.setUniform1f("uRelaxParameter", this.relaxParameter);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);
    }

    calculateDeltaP(correction) {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.velocityBuffer);
        gl.viewport(0, 0, this.particlesTextureSize, this.particlesTextureSize);
        this.calculateDeltaPProgram.use();
        this.calculateDeltaPProgram.bindTexture("uTexturePosition", this.tmpPositionTexture, 0);
        this.calculateDeltaPProgram.bindTexture("uNeighbors", this.gridsTexture, 1);
        this.calculateDeltaPProgram.bindTexture("uLambda", this.lambdaTexture, 2);
        this.calculateDeltaPProgram.setUniform1f("uVoxelTextureSize", this.gridsTextureSize);
        this.calculateDeltaPProgram.setUniform1f("uBucketSize", this.bucketSize);
        this.calculateDeltaPProgram.setUniform1f("uBucketNum", this.gridsTextureSize / this.bucketSize);
        this.calculateDeltaPProgram.setUniform1f("uKernelRadius", this.kernelRadius);
        this.calculateDeltaPProgram.setUniform1f("uRestDensity", this.restDensity);
        this.calculateDeltaPProgram.setUniform1f("uSpikyGradConstant", this.spikyGradConstant);
        // lambda correction
        this.calculateDeltaPProgram.setUniform1i("uCorrection", correction);
        this.calculateDeltaPProgram.setUniform1f("uTensileK", this.tensileK);
        this.calculateDeltaPProgram.setUniform1f("uTensileDistance", this.tensileDistance);
        this.calculateDeltaPProgram.setUniform1f("uTensilePower", this.tensilePower);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);
    }

    // 根据新位置计算新的速度，存储于 tmpvelocityBuffer
    calculateVelocity(deltaTime) {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.tmpVelocityBuffer);
        gl.viewport(0, 0, this.particlesTextureSize, this.particlesTextureSize);
        this.calculateVelocityProgram.use();
        this.calculateVelocityProgram.setUniform1f("uDeltaTime", deltaTime);
        this.calculateVelocityProgram.bindTexture("uTexturePosition", this.tmpPositionTexture, 0);
        this.calculateVelocityProgram.bindTexture("uTexturePositionOld", this.positionTexture, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);
    }

    calculateViscosity() {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.velocityBuffer);
        gl.viewport(0, 0, this.particlesTextureSize, this.particlesTextureSize);
        this.calculateViscosityProgram.use();
        this.calculateViscosityProgram.bindTexture("uTexturePosition", this.tmpPositionTexture, 0);
        this.calculateViscosityProgram.bindTexture("uTextureVelocity", this.tmpVelocityTexture, 1);
        this.calculateViscosityProgram.bindTexture("uNeighbors", this.gridsTexture, 2);
        this.calculateViscosityProgram.setUniform1f("uVoxelTextureSize", this.gridsTextureSize);
        this.calculateViscosityProgram.setUniform1f("uBucketSize", this.bucketSize);
        this.calculateViscosityProgram.setUniform1f("uBucketNum", this.gridsTextureSize / this.bucketSize);
        this.calculateViscosityProgram.setUniform1f("uKernelRadius", this.kernelRadius);
        this.calculateViscosityProgram.setUniform1f("uRestDensity", this.restDensity);
        this.calculateViscosityProgram.setUniform1f("uViscosityConstant", this.viscosityConstant);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, this.totalParticles);
    }

    
    copyBetweenTexture(srcTexture, dstBuffer) {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstBuffer);
        gl.viewport(0, 0, this.particlesTextureSize, this.particlesTextureSize);
        this.copyTextureProgram.use();
        this.copyTextureProgram.bindTexture("uTexture", srcTexture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
};

