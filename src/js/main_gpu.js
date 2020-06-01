const canvas = document.getElementById('display');
canvas.height = 500;
canvas.width = 500;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";

const gl = canvas.getContext("webgl2"); // 创建 WebGL 渲染上下文
// 可以在 frame buffer 中使用多种浮点格式
gl.getExtension('EXT_color_buffer_float');
// Load the extension to have linear interpolatino for floating point textures
gl.getExtension("OES_texture_float_linear");


const stepper = document.getElementById('stepper');
const run = document.getElementById('run');
const reset = document.getElementById('reset');
const ipt_num = document.getElementById("ipt-stepper-num");
const frame_label = document.getElementById("current-frame");

const myStats = new Stats();
const renderParticlesProgram = new Shader(vsParticles, fsColor);
const renderRectProgram = new Shader(vsRect, fsRect);

let pbfResolution = 32; // 粒子运动范围 0-pbfResolution, 这个范围映射到屏幕上

const pbf = new PBF();
const rect = new Rectangle(renderRectProgram);
const camera = new Camera(canvas);

let cameraDistance = 2.5;
let FOV = 35;

let acceleration = {
    x: 0,
    y: -10,
    z: 0,
}
let deltaTime = 0.02;

const iter = 3;

let step_num = 0;
let current_frame = 0;
let correction = true;
var running = false;


// 初始化统计对象
const initStats = (stats) => {
    //设置统计模式
    stats.setMode(0); // 0: fps, 1: ms
    //统计信息显示在左上角
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    //将统计对象添加到对应的<div>元素中
    document.getElementById("Stats-output").appendChild(stats.domElement);
    return stats;
}

// 初始化粒子
const initParticles = () => {
    let particlesPosition = [];
    let particlesVelocity = [];
    // 我们保证这样初始化的话，满足松弛情况下的密度，也就是说，每个粒子之间间隔为 1 是刚刚好的
    // 假设这个1是1m的话，那么我们可以相应的设置粒子的质量和体积，比如一个 100 x 100 x 100 体积的水，
    // 应该有 100 x 100 x 100 个粒子，那么粒子的质量就是算一下就行。
    // 基于上面的假设， voxel 的 size 可以默认为 1，这样每个 voxel 中不会有超过 4 个粒子。
    for (let i = pbfResolution / 3; i < pbfResolution - 2; i++) {
        for (let j = pbfResolution / 3; j < pbfResolution - 2; j++) {
            for (let k = pbfResolution / 3; k < pbfResolution - 2; k++) {
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0); // 对应纹理的 RGBA
            }
        }
    }
    // init pbf solver
    pbf.init(particlesPosition, particlesVelocity, pbfResolution);
}

const render = () => {
    camera.updateCamera(FOV, 1, cameraDistance);
    //Render particles
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.height, canvas.height);
    renderParticlesProgram.use();
    renderParticlesProgram.bindTexture("uTexturePosition", pbf.positionTexture, 0);
    renderParticlesProgram.setUniform1f("uScale", pbfResolution); // 用于将坐标返回转换到 [0, 1]
    renderParticlesProgram.setUniformMatrix4fv("uCameraMatrix", camera.cameraTransformMatrix);
    renderParticlesProgram.setUniformMatrix4fv("uPMatrix", camera.perspectiveMatrix);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, pbf.totalParticles);
    gl.disable(gl.DEPTH_TEST);

    rect.render(camera);

    // update stats
    myStats.update();
}

const main = () => {
    initParticles();
    initStats(myStats);
    step();
}

const step = () => {
    if (running) {
        pbf.simulate(acceleration, deltaTime, iter, correction);
        current_frame++;
    }
    else if (step_num > 0) {
        pbf.simulate(acceleration, deltaTime, iter, correction);
        current_frame++;
        step_num--;
        ipt_num.value = step_num.toString();
    }
    frame_label.innerHTML = "Current frame:" + current_frame.toString();
    render();
    window.requestAnimationFrame(step);
}

stepper.onclick = () => {
    step_num = parseInt(ipt_num.value);
}

reset.onclick = () => {
    initParticles();
    initStats(myStats);
    current_frame = 0;
    step_num = 0;
    running = false;
    render();
}

run.onclick = () => {
    running = !running;
}

main()