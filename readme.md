# Real-time Position-Based-Fluid in WebGL

This project is an implementation of the paper [**Positon based fluids**](https://dl.acm.org/doi/10.1145/2461912.2461984)  and a simple [screen space fluid render](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.443.6926&rep=rep1&type=pdf) based on WebGL.

View the project online at https://xuxmin.github.io/pbf

## Gallery

**50k particles**:

<img src="http://124.223.26.211:8080/images/2023/02/26/533bb5fd56b3.png" width=700>

## Features

### Techniques

- Incompressible fluid simulation based on PBF method([Position based fluids](https://dl.acm.org/doi/10.1145/2461912.2461984)), including surface tension, XSPH viscosity, and vorticity confinement.
- Use texture to store and share data. The calculation of each particles is carried out in parallel in the vertex shader, and the fragment shader is responsible for transferring data between textures.
- A four-step rendering method to search for neighbor particles, which is described in detail in [GPU Gems](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-29-real-time-rigid-body-simulation-gpus).
- A simple screen space fliud rendering method, including depth/thick calculation, bilinear filtering smoothing, normal reconstruction, and shading.


### Performance

The Performance was evaluated on my laptop with Intel Iris(R) Xe96EU Graphics, Intel Core i5-11320H @ 3.2GHz, no discrete graphics.

Under the configuration of 4 incompressibility confinement iterations each frame, the 50K particle runs at about 50 fps, 100K particles are about 25 fps.

## Requirements

View the project online in https://xuxmin.github.io/pbf. You can also download the code to run locally. If you want to run locally, you need to build a simple local server.

Method 1. Use the plugin of  Visual Studio Code.

1. In Visual Studio Code, install the plugin Live Server
2. Ctrl+Shift+P，enter “Live Server: Open with Live Server”
3. Then the browser automatically opens the local server with the specified address

Method 2. Use Node.js

1. Install node.js and npm.

2. Install a lightweight http server based on Node.js.

   ```bash
   npm install http-server -g
   ```

3. Enter the project root directory and start the local server.

   ```bash
   cd pbf
   http-server . -p 8000
   ```

4. Access `http://127.0.0.1:8000/` in the browser.

## Usage

The web page is shown below:

<img src="http://124.223.26.211:8080/images/2023/02/26/c1f734f647e1.png" width=800>

The frame rate is displayed in the top left corner. Click **"Run"** button to start simulation,  click again to stop. Press "Reset" button to reset the status. You can also enter the frame number in the text box next to the "Step" button, and then press "Step" button to simulate the specific frame number.

The parameters that can be adjusted:

- particleSize: the size of particle to render, only useful when SSFR is off.

- deltaTime: the time step of simulation.
- resolution: the resolution to display the particles, you must click "Reset" button after adjust it.
- particlesNum: the number of particles. Note that adjust the resolution at the same time to achieve the best display effect, finally click "Reset" button again.
- solverIterations: the number of confinement iterations.
- viscosity: the viscosity of the fluid.
- vorticity: vorticity confinement.

- SSFR: Screen space fluid rendering.

  - SSFR: whether to open the screen space fluid rendering.

  - tint_color_(r/g/b): the tint color.

  - max_attenuate, attenuate_k: color attenuation from thickness, `attenuate = max(exp(-attenuate_k*thickness), max_attenuate)`.

- Surface tensile:

  - correction: whether surface tension correction is enabled.

  - tensileK: the parameter of surface tension correction.

- Acceleration: the acceleration of the fliud (usually only gravity).

- Obstacle: Add an obstacle。obstacleX, obstacleY, obstacleZ control the position。sizeX, sizeY, sizeZ control the size.

## Reference materials

1. Macklin M , Müller, Matthias. Position based fluids[J]. Acm Transactions on Graphics, 2013, 32(4):1-12.
2. W. J. van der Laan, S. Green, and M. Sainz, “[Screen space fluid rendering with curvature flow](https://link.zhihu.com/?target=http%3A//citeseerx.ist.psu.edu/viewdoc/download%3Fdoi%3D10.1.1.443.6926%26rep%3Drep1%26type%3Dpdf),” in Proceedings of the 2009 symposium on Interactive 3D graphics and games - I3D ’09, 2009, p. 91.
3. [【深入浅出 Nvidia FleX】(2) Position Based Fluids](https://zhuanlan.zhihu.com/p/49536480)
4. [Stanford CS348C: Prog. Assignment #1: Position Based Fluids](http://graphics.stanford.edu/courses/cs348c/PA1_PBF2016/index.html)
5. [Chapter 29. Real-Time Rigid Body Simulation on GPUs | NVIDIA Developer](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-29-real-time-rigid-body-simulation-gpus)
6. [naeioi/PBF-CUDA: Position Based Fluids CUDA implementation](https://github.com/naeioi/PBF-CUDA)
7. [Screen Space Fluid  Rendering for Games slices. Simon Green, NVIDIA](https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf)

7. [ttnghia/RealTimeFluidRendering](https://github.com/ttnghia/RealTimeFluidRendering)

