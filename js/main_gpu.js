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

const gui = new dat.gui.GUI();
const myStats = new Stats();
const renderParticlesProgram = new Shader(vsParticles, fsParticles);
const renderRectProgram = new Shader(vsRect, fsRect);
const skyboxProgram = new Shader(vsSkybox, fsSkybox);

const pbf = new PBF();
const rect = new Rectangle(renderRectProgram);
const solid_rect = new SolidRectangle(renderRectProgram);
const camera = new Camera(canvas);
const ssfRender = new SSFRender(canvas, pbf, camera);
const skybox = new Skybox(skyboxProgram);

// 控制参数
var controls = {
    resolution: 48, // 粒子运动范围 0-resolution, 这个范围映射到屏幕上
    particleSize : 7,
    particlesNum: 10000,
    solverIterations: 4,
    deltaTime: 0.02,
    relaxParameter: 0.05,
    correction: true,
    tensileK: 40,
    viscosity: 0.01,
    vorticity: 0.01,
    ax: 0,
    ay: -2,
    az: 0,
    addObstacle: false,
    obstacleX: 0.5,
    obstacleY: 0.2,
    obstacleZ: 0.5,
    sizeX: 0.3,
    sizeY: 0.1,
    sizeZ: 0.8,

    wall: 0,
    SSFR: true,
};


let step_num = 0;
let current_frame = 0;
var running = false;


const initGUI = (gui) => {
    gui.remember(controls);
    gui.addFolder("Parameter Control");
    gui.add(controls, 'SSFR')
    gui.add(controls, 'particleSize', 1, 20).step(1);
    gui.add(controls, 'wall', 0, controls.resolution / 2).step(0.1);
    gui.add(controls, 'deltaTime', 0.00, 0.1).step(0.01);
    gui.add(controls, 'resolution', 32, 64).step(16);
    gui.add(controls, 'particlesNum', 5000, 50000).step(5000);
    gui.add(controls, 'solverIterations', 1, 5).step(1);
    gui.add(controls, 'relaxParameter', 0.05, 0.05);
    gui.add(controls, 'viscosity', 0, 1).step(0.01);
    gui.add(controls, 'vorticity', 0, 20).step(0.1);
    var f0 = gui.addFolder('surface tensile');
    f0.add(controls, 'correction');
    f0.add(controls, 'tensileK', 0, 50).step(1);
    var f1 = gui.addFolder('acceleration');
    f1.add(controls, 'ax', -10, 10).step(1);
    f1.add(controls, 'ay', -10, 10).step(1);
    f1.add(controls, 'az', -10, 10).step(1);
    var f2 = gui.addFolder('Obstacle');
    f2.add(controls, 'addObstacle');
    f2.add(controls, 'obstacleX', 0, 1).step(0.1);
    f2.add(controls, 'obstacleY', 0, 1).step(0.1);
    f2.add(controls, 'obstacleZ', 0, 1).step(0.1);
    f2.add(controls, 'sizeX', 0, 1.0).step(0.1);
    f2.add(controls, 'sizeY', 0, 0.5).step(0.1);
    f2.add(controls, 'sizeZ', 0, 1.0).step(0.1);
    return gui;
}

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
    const pbfResolution = controls.resolution;

    const size = Math.pow(controls.particlesNum, 1/3);

    const start = pbfResolution / 2 - size / 2;
    const end = pbfResolution / 2 + size / 2;

    // particlesPosition.push(0, 10, 10, 1);
    // particlesPosition.push(30, 30, 30, 1);
    // particlesVelocity.push(0, 0, 0, 0); // 对应纹理的 RGBA
    for (let i = start; i < end; i++) {
        for (let j = pbfResolution - size - 2; j < pbfResolution - 2; j++) {
            for (let k = start; k < end; k++) {
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0); // 对应纹理的 RGBA
            }
        }
    }
    pbf.init(particlesPosition, particlesVelocity, pbfResolution);
}


// 初始化 SSFRender
const initSSFRender = (skybox) => {
    ssfRender.init(skybox);
}


const render = () => {
    // 下面的相机参数不能修改，因为已经写死在 shader 中了
    camera.updateCamera(35, 1, 2.5);
    
    skybox.render();

    ssfRender.render(controls.SSFR);

    rect.render(camera, {x:0, y:0, z:0}, {x:1, y:1, z:1}, 0);
    if (controls.addObstacle) {
        solid_rect.render(camera, {
            x: controls.obstacleX,
            y: controls.obstacleY,
            z: controls.obstacleZ
        }, {
            x: controls.sizeX,
            y: controls.sizeY,
            z: controls.sizeZ
        }, 1);
    }

    gl.disable(gl.DEPTH_TEST);

    myStats.update();
}

const exportFrame = () => {
    // 初始化一个zip打包对象
    var zip = new JSZip();

    // 初始化粒子
    initParticles();

    for (let i = 0; i < 800; i++) {

        pbf.simulate(controls);

        let data = pbf.exportFrame();

        // 创建一个被用来打包的文件
        let fileName = "frame" + i.toString() + ".obj";
        zip.file(fileName, data);
        console.log("current", i);
    }
    // 把打包内容异步转成blob二进制格式
    zip.generateAsync({
        type: "blob"
    }).then(function (content) {
        // content就是blob数据，这里以example.zip名称下载    
        // 使用了FileSaver.js  
        saveAs(content, "frameData.zip");
    });
}

const main = () => {
    initParticles();
    initStats(myStats);
    initGUI(gui);
    initSSFRender();
    step();
}

const step = () => {
    if (running) {
        pbf.simulate(controls);
        current_frame++;
    }
    else if (step_num > 0) {
        pbf.simulate(controls);
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