# Three.js Boids Simulation

A high-performance simulation of flocking behavior (boids) implemented in Three.js and React. This project creates an interactive, visually appealing simulation that mimics the natural murmurations of bird flocks in 3D space.

## Features

- **Realistic Flocking Behavior**: Implements Craig Reynolds' boids model with separation, alignment, and cohesion rules
- **Wave Propagation**: Features emergent wave-like patterns that travel through the flock
- **3D Visualization**: True 3D movement with depth effects including size, opacity, and render priority
- **Interactive Controls**: Adjust boid count, speed, and mouse avoidance sensitivity
- **Mouse Interaction**: Boids react to mouse movements by flowing around the cursor
- **Optimized Performance**: Handles 1000+ boids with smooth animation, even on lower-end devices

## Performance Optimizations

This implementation includes several optimizations for sustained performance:

- **Object Pooling**: Pre-allocated vectors reduce garbage collection pressure
- **Selective Rendering**: Only update matrices and colors when necessary
- **Wave System Management**: Controlled wave creation/deletion cycle
- **Efficient Spatial Partitioning**: Incremental grid updates
- **Performance Monitoring**: Real-time FPS and update metrics

## Prerequisites

- Node.js (v14.0 or newer)
- npm or yarn
- Git (optional, for cloning)

## Installation

1. Clone this repository or download the source code:
   ```
   git clone https://your-repository-url/boids-simulation.git
   cd boids-simulation
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn
   ```

3. Start the development server:
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
boids-simulation/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── ...
├── src/
│   ├── components/
│   │   ├── BoidSimulation.jsx      # Main simulation component
│   │   └── ControlPanel.jsx        # UI controls component
│   ├── App.jsx                     # Main application component
│   ├── index.jsx                   # Entry point
│   └── index.css                   # Global styles
├── package.json                    # Dependencies and scripts
├── README.md                       # This file
└── ...
```

## Controls

- **Boid Count**: Adjust the number of boids from 100 to 2000
- **Speed**: Change the movement speed from 0.1x to 2.0x
- **Mouse Avoidance**: Control how strongly boids avoid the mouse cursor

## How It Works

The simulation is based on three simple rules that create complex flocking behavior:

1. **Separation**: Boids avoid crowding neighbors (short range repulsion)
2. **Alignment**: Boids align their direction with nearby neighbors
3. **Cohesion**: Boids move toward the center of mass of their neighbors

Additionally, the simulation includes wave propagation effects that create organic, rippling patterns through the flock.

## Customization

You can customize the simulation by adjusting parameters in the `BoidSimulation.jsx` file:

- Perception radius
- Separation distance
- Force weights
- Wave influence
- World size

## Performance Tips

- For lower-end devices, reduce the boid count to 500 or less
- Adjust the frameSkip parameter to balance visual smoothness with performance
- Monitor the FPS counter to gauge performance on your system

## License

MIT

## Acknowledgements

- Craig Reynolds for the original Boids algorithm
- Three.js team for the powerful 3D library
- React team for the UI framework

---

Created with Three.js and React