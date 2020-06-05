const stepper = document.getElementById('stepper');
const run = document.getElementById('run');
const reset = document.getElementById('reset');
const canvas = document.getElementById('display');
const ctx = canvas.getContext('2d');

var particles = [];

var controls = {
    restDensity: 6000,
    numParticles: 400,
    solverIterations: 3,
    epsilon: 300,

    defaultColor: "#33a3dc",
    chosenColor: "#FF0000",
    neighborColor: "#00FF00",
};

var running = false;

const timestep = 1 / 60;
const kernelRadius = 0.1;

// const particleMass = 1;
let grid = [];          // 存储每个 grid 对应的下标
let gridOffsets = [];
let horizontalCells = 0;

/* Physical constraints and constants */
const gravity = vec2.fromValues(0, 1);

const gui = new dat.gui.GUI();
const myStats = new Stats();

const initGUI = (gui) => {
    gui.remember(controls);
    gui.add(controls, 'restDensity');
    gui.add(controls, 'numParticles');
    gui.add(controls, 'solverIterations');
    gui.add(controls, 'epsilon');
    var f1 = gui.addFolder('Colors');
    f1.addColor(controls, 'defaultColor');
    f1.addColor(controls, 'chosenColor');
    f1.addColor(controls, 'neighborColor');
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

const render = () => {
    ctx.clearRect(0, 0, 500, 500);
    particles.forEach((p1) => {
        ctx.beginPath();
        ctx.arc(p1.pos[0] * 500, p1.pos[1] * 500, 2, 0, 2 * Math.PI);
        ctx.fillStyle = p1.color;
        ctx.fill();
        ctx.closePath();
    });
    myStats.update();
}

run.onclick = () => {
    running = ! running;
    step();
}

const step = () => {
    simulate();
    render();
    if (running) {
        window.requestAnimationFrame(step);
    }
}

stepper.onclick = () => {
    step();
}

reset.onclick = () => {
    initParticles();
    render();
}

canvas.onclick = function(e) {
    
    particles.forEach((p1) => {
        p1.color = controls.defaultColor;
    });

    const pos1 = vec2.create();
    vec2.set(pos1, e.offsetX, e.offsetY);

    const scale = vec2.create();
    vec2.set(scale, 500, 500);

    for (let i = 0; i < particles.length; i++) {
        const p2 = particles[i];

        const pos2 = vec2.create();
        vec2.mul(pos2, p2.pos, scale);
        const diff = vec2.create();
        vec2.sub(diff, pos1, pos2);

        const d = vec2.len(diff);

        if (d < 2) {
            p2.neighbors.forEach((pos) => {
                // console.log(particles[pos]);
                particles[pos].color = controls.neighborColor;
            })
            p2.color = controls.chosenColor;
            break;
        }
    }

    render();
}


function main() {
    initParticles();
    initStats(myStats);
    initGUI(gui);
    render();
    createSpatialHashingGrid();
    updateNeighbors();
}

// -----------------------------------------------
// 使用 poly6 核估计密度
const poly6 = (p1, p2) => {
    const r = vec2.create();
    vec2.sub(r, p1, p2);

    var result = 0;
    if (vec2.len(r) <= kernelRadius)
        result = 315.0 / (64.0 * Math.PI * Math.pow(kernelRadius, 9)) * Math.pow(kernelRadius * kernelRadius - vec2.len(r) * vec2.len(r), 3);
    return result;
}

// 使用 spiky 核计算梯度
const spiky_grad = (p1, p2) => {
    const r = vec2.create();
    vec2.sub(r, p1, p2);

    if (vec2.len(r) > kernelRadius || vec2.len(r) === 0) {
        return vec2.fromValues(0, 0);
    }
    var result = 0;
    if (vec2.len(r) <= kernelRadius) {
        // TODO: 公式有问题 ???
        result = -45.0 / (Math.PI * Math.pow(kernelRadius, 6)) * Math.pow(kernelRadius * kernelRadius - vec2.len(r) * vec2.len(r), 2) * 1 / vec2.len(r);
    }
    
    vec2.scale(r, r, result);
    console.assert(isFinite(result), "spiky not finite");
    return r;
}

// 初始化粒子
const initParticles = () => {
    particles = []
    for (let i = 0; i < controls.numParticles; i++) {
        particles.push({
            id: i,
            pos: vec2.fromValues(Math.random(), Math.random() / 2),
            vel: vec2.fromValues(0, 0),
            newPos: vec2.fromValues(0, 0),
            deltaP: vec2.fromValues(0, 0),
            neighbors: [],      // 存储的是对应的下标
            lambda: 0,
            density: 0,
            color: controls.defaultColor,
        });
    }
    createSpatialHashingGrid();
}

// 根据重力更新速度与位置
const predictPositions = () => {
    particles.forEach((p) => {
        vec2.scaleAndAdd(p.vel, p.vel, gravity, timestep);  // apply force
        vec2.scaleAndAdd(p.newPos, p.pos, p.vel, timestep);
    });
}

// 获得粒子对应的 gird bin
const getBin = (particle) => {
    const x = Math.max(Math.min(Math.floor(particle.pos[0] / kernelRadius), horizontalCells - 1), 0);
    const y = Math.max(Math.min(Math.floor(particle.pos[1] / kernelRadius), horizontalCells - 1), 0);
    const bin = x + horizontalCells * y;
    return bin;
}

const createSpatialHashingGrid = () => {
    horizontalCells = Math.ceil(1 / (kernelRadius));
    // 每个 grid 有多少个粒子
    let gridSums = new Array(horizontalCells * horizontalCells).fill(0);
    grid = new Array();
    // 每个grid前面有多少个粒子，例如 gridOffsets[2] 表示前面两个grid的粒子数。
    gridOffsets = new Array((horizontalCells) * (horizontalCells)).fill(0);

    for (let i = 0; i < controls.numParticles; i++) {
        const bin = getBin(particles[i]);
        gridSums[bin]++;
    }

    for (let i = 1; i < gridSums.length; i++) {
        gridOffsets[i] = gridOffsets[i - 1] + gridSums[i - 1];
    }

    for (let i = 0; i < controls.numParticles; i++) {
        const bin = getBin(particles[i]);
        gridSums[bin]--;
        console.assert(isFinite((gridSums[bin]) + gridOffsets[bin]), 'asdf');

        grid[gridSums[bin] + gridOffsets[bin]] = i; // 将对应的下标存入 grid 中
    }

}

// 更新每个粒子的邻居
/* Uses the hash grid to crate a list of the neighbours for
 * each particle */
const updateNeighbors = () => {
    particles.forEach((p1) => {
        const neighbors = [];

        // 计算粒子所在的 grid
        const x = Math.max(Math.min(Math.floor(p1.pos[0] / kernelRadius), horizontalCells - 1), 0);
        const y = Math.max(Math.min(Math.floor(p1.pos[1] / kernelRadius), horizontalCells - 1), 0);

        const kernelRadius2 = kernelRadius * kernelRadius;
        // 考虑所在位置处的 9个grid
        const masks = [
            [0, 0], /* Same grid */
            [1, 1], /* Top left */
            [0, 1], /* Top */
            [-1, 1], /* Top Right */
            [-1, 0], /* Right */
            [-1, -1], /* Bottom Right*/
            [0, -1], /* Bottom */
            [1, -1], /* Bottom Left */
            [1, 0]
        ]; /* Left */

        for (let i = 0; i < masks.length; i++) {
            const mask = masks[i];
            const newX = mask[0] + x;
            const newY = mask[1] + y;

            if (newX >= 0 && newY >= 0 && newX < horizontalCells && newY < horizontalCells) {
                const bin = newX + newY * horizontalCells;
                const limit = bin < gridOffsets.length - 1 ? gridOffsets[bin + 1] : controls.numParticles;
                // 遍历属于该 grid 的所有粒子
                for (let q = gridOffsets[bin]; q < limit; q++) {
                    const pos = grid[q];
                    const p2 = particles[pos];
                    const diff = vec2.create();
                    vec2.sub(diff, p1.pos, p2.pos);
                    const r2 = vec2.sqrLen(diff);
                    if (r2 < kernelRadius2) {
                        neighbors.push(pos);      // 
                    }
                }
            }
        }
        p1.neighbors = neighbors;
    });
}

// 计算每个粒子处的密度
const calculateDensities = () => {
    particles.forEach((p1) => {
        let density = 0;
        p1.neighbors.forEach((pos) => {
            const p2 = particles[pos];
            density += poly6(p1.newPos, p2.newPos);
        });
        p1.density = density;
    });
}

/* Calculates lambda (the estimated distance along the constraint gradient)
 * to reach rest density*/
const calculateLambda = () => {
    particles.forEach((p1) => {
        const constraint = p1.density / controls.restDensity - 1;

        let gradientSum = 0;
        let gradientKI = vec2.create();

        p1.neighbors.forEach((pos) => {
            const p2 = particles[pos];
            const gradient = spiky_grad(p1.newPos, p2.newPos);
            vec2.scale(gradient, gradient, 1 / controls.restDensity);

            gradientSum += vec2.len(gradient) * vec2.len(gradient);

            vec2.add(gradientKI, gradientKI, gradient);
        });

        gradientSum += vec2.len(gradientKI) * vec2.len(gradientKI);
        p1.lambda = - constraint / (gradientSum + controls.epsilon)
    });
}

/* Calculates the required distance to move the particle/ */
const calculateDeltaP = () => {
    particles.forEach((p1) => {
        let lambdaSum = vec2.fromValues(0, 0);
        p1.neighbors.forEach((pos) => {
            const p2 = particles[pos];
            const gradient = spiky_grad(p1.newPos, p2.newPos);

            vec2.scaleAndAdd(lambdaSum, lambdaSum, gradient, p1.lambda + p2.lambda);
        });
        vec2.scale(p1.deltaP, lambdaSum, 1 / controls.restDensity);
        vec2.add(p1.newPos, p1.newPos, p1.deltaP);
    })
}

/* Extremely basic constraint handling (clamps to edge of box) */
// 盒子的大小是 1 x 1
const constrainParticles = () => {
    particles.forEach((p1) => {
        //console.log(p1.pos);
        if (p1.newPos[0] > 1) {
            p1.newPos[0] = 1;
        }
        if (p1.newPos[0] < 0) {
            p1.newPos[0] = 0.000;
        }
        if (p1.newPos[1] < 0) {
            p1.newPos[1] = 0.00;
        }
        if (p1.newPos[1] > 1) {
            p1.newPos[1] = 1;
        }
    });
};

/* Updates the particle's position for rendering and uses verlet integration to update the velocity */
const updatePosition = () => {
    particles.forEach((p1) => {
        vec2.scaleAndAdd(p1.vel, p1.newPos, p1.pos, -1);
        vec2.scale(p1.vel, p1.vel, 1 / timestep);
        p1.pos = vec2.clone(p1.newPos);
    });
};

const simulate = () => {
    predictPositions();
    createSpatialHashingGrid();
    updateNeighbors();
    // 密度约束
    for (let iter = 0; iter < controls.solverIterations; iter++) {
        calculateDensities();       // 计算密度
        calculateLambda();          // 计算拉格朗日乘子 λi
        calculateDeltaP();          // 计算位移向量 Δpi, 同时更新位置 newPos
        constrainParticles();       // 约束粒子，不要跑出盒子
    }
    updatePosition();               // 更新粒子速度和位置
}
// ----------------------------------------------


main();

