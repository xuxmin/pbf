# Real-time Position-Based-Fluid in WebGL

This project is an implementation of the paper [**Positon based fluids**](https://dl.acm.org/doi/10.1145/2461912.2461984)  and a simple [screen space fluid render](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.443.6926&rep=rep1&type=pdf) based on WebGL.

View the project online at https://xuxmin.github.io/pbf

Some screenshots:

<img src="http://124.223.26.211:8080/images/2022/04/17/a6734bcbfcb3.png" width=700>

## Features

### Techniques

- 基于[Position based fluids](https://dl.acm.org/doi/10.1145/2461912.2461984) 的不可压缩流体。包括表面张力，粘度（XSPH viscosity），涡流限制（vorticity confinement）
- 使用纹理存储与共享数据，每个粒子的计算在顶点着色器中并行进行，片段着色器进行数据的传输。
- 使用四步渲染算法搜索邻居粒子，参考 [GPU Gems](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-29-real-time-rigid-body-simulation-gpus)。
- 实现了一个简单的屏幕空间流体渲染，包括深度计算，双线性滤波平滑，法线重建，着色。

### Performance

测试环境：Microsoft Edge 浏览器，windows 11 系统。电脑的处理器为 Intel Core i5-11320H @ 3.2GHz, 内存 16GB，显卡为英特尔 CPU 的核心显卡 Intel Iris(R) Xe96EU Graphics, 没有独立显卡。

在流体迭代解算次数为4时，50K粒子运行时对应大约 50 fps。100K粒子大约 25 fps。

## Requirements

可以直接访问 https://xuxmin.github.io/pbf 在线查看效果。也可以将代码下载到本地中运行。

在本地运行需要搭建一个简单的本地服务器。

方法1. 在 Visual Studio Code 插件搭建本地服务器

1. 首先在 Visual Studio Code 中安装插件 Live Server
2. 在编辑器任意界面使用 Ctrl+Shift+P 调出命令行窗口，输入 Live Server: Open with Live Server
3. 随后浏览器自动打开指定地址的本地服务器

方法2. 使用 Node.js 搭建本地服务器

1. 安装 node.js 以及包管理工具 npm

2. 使用 npm 安装一个基于 Node.js 的轻量级 HTTP 服务器

   ```bash
   npm install http-server -g
   ```

3. 安装完 http-server 之后，进入项目根目录，开启本地服务器。

   ```bash
   cd pbf
   http-server . -p 8000
   ```

4. 在浏览器中访问 `http://127.0.0.1:8000/` 即可运行。

## Usage

运行后，整体界面功能如下图所示：

<img src="http://124.223.26.211:8080/images/2022/04/17/4095662b8060.png" width=800>

右上角显示渲染的帧率，右下方显示当前模拟到第几帧。有两种模拟方式：一种是点击 Run 按钮直接开始模拟， 另一种是在 Step 按钮旁边输入想要模拟的帧数，点击 Step 按钮模拟指定的帧数。点击 Reset 按钮可以重置。右边是可供调整的参数，下面逐一进行说明：

- SSFR: 是否开启屏幕空间流体渲染
- particleSize: 粒子渲染的大小。注意只有在 SSFR 关闭的时候才有用。
- deltaTime: 模拟的时间步长
- resolution: 粒子显示的分辨率。调整后必须点击 Reset 按钮。
- particlesNum: 粒子的个数。注意粒子的个数调整后，必须点击 Reset 按钮，同时调整 resolution ，达到最佳的显示效果。全部调整好后，点击 Reset 按钮。
- solverIterations: PBF 算法约束迭代次数
- viscosity: 液体的粘度相关参数。越大液体越显粘稠
- vorticity: Vorticity Confinement 参数。增大会重新赋予系统旋度能量
- correction: 是否开启表面张力校正
- tensileK: 表面张力校正参数
- acceleration: 液体受到的重力加速度
- Obstacle: 障碍物参数的调整。addObstacle 表示是否增加障碍物。obstacleX, obstacleY, obstacleZ 分别表示 障碍物的位置，sizeX, sizeY, sizeZ 分别表示障碍物的长宽高。

## Reference materials

1. Macklin M , Müller, Matthias. Position based fluids[J]. Acm Transactions on Graphics, 2013, 32(4):1-12.
2. W. J. van der Laan, S. Green, and M. Sainz, “[Screen space fluid rendering with curvature flow](https://link.zhihu.com/?target=http%3A//citeseerx.ist.psu.edu/viewdoc/download%3Fdoi%3D10.1.1.443.6926%26rep%3Drep1%26type%3Dpdf),” in Proceedings of the 2009 symposium on Interactive 3D graphics and games - I3D ’09, 2009, p. 91.
3. [【深入浅出 Nvidia FleX】(2) Position Based Fluids](https://zhuanlan.zhihu.com/p/49536480)
4. [Stanford CS348C: Prog. Assignment #1: Position Based Fluids](http://graphics.stanford.edu/courses/cs348c/PA1_PBF2016/index.html)
5. [Chapter 29. Real-Time Rigid Body Simulation on GPUs | NVIDIA Developer](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-29-real-time-rigid-body-simulation-gpus)
6. [naeioi/PBF-CUDA: Position Based Fluids CUDA implementation](https://github.com/naeioi/PBF-CUDA)
7. [Screen Space Fluid  Rendering for Games slices. Simon Green, NVIDIA](https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf)

7. [ttnghia/RealTimeFluidRendering](https://github.com/ttnghia/RealTimeFluidRendering)

