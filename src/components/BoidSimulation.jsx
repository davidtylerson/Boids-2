import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Optimized simulation component
const BoidSimulation = ({ boidCount, speedMultiplier, mouseAvoidance }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    console.log(`Creating simulation with: Count=${boidCount}, Speed=${speedMultiplier}x, Avoidance=${mouseAvoidance}`);
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 150;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'auto'; // Allow mouse events for canvas
    
    containerRef.current.appendChild(renderer.domElement);
    
    // Global simulation parameters
    const params = {
      boidCount: boidCount,
      whiteRatio: 0.8,
      whiteCount: Math.floor(boidCount * 0.8),
      orangeCount: Math.ceil(boidCount * 0.2),
      maxSpeed: 1.155 * speedMultiplier,
      minSpeed: 0.616 * speedMultiplier,
      maxForce: 0.09,
      perceptionRadius: 25,
      separationDist: 5,
      worldSize: 100,
      
      // Force weights
      separationWeight: 1.5,
      alignmentWeight: 0.7,
      cohesionWeight: 0.7,
      
      // Wave simulation
      waveInfluence: 0.4,
      wavePropagationFactor: 0.85,
      maxWaveCenters: 5, // NEW: Cap the maximum number of wave centers
      
      // Mouse avoidance
      mouseAvoidanceRadius: 35,
      mouseAvoidanceStrength: mouseAvoidance,
      
      // NEW: Performance settings
      updateThreshold: 0.1, // Only update position if moved more than this
      colorUpdateThreshold: 0.05, // Only update color if changed more than this
      maxActiveWaves: 10, // Limit number of active waves
      frameSkip: 3 // Only update colors every N frames
    };
    
    // Mouse position tracking
    const mouse = new THREE.Vector3(0, 0, 0);
    const mouseWorldCoordinates = new THREE.Vector3(0, 0, 0);
    let mouseOver = false;
    
    // OPTIMIZATION: Pre-allocate shared temp vectors for global use
    const _tempVec1 = new THREE.Vector3();
    const _tempVec2 = new THREE.Vector3();
    const _tempVec3 = new THREE.Vector3();
    
    // Wave centers for murmuration effect
    const waveCenters = [];
    let activeWaveCount = 0;
    
    // Spatial grid for optimizing neighbor lookups
    const spatialGrid = {};
    const gridCellSize = 30;
    
    // NEW: Track which grid cells have changed
    const changedCells = new Set();
    const previousCellKeys = new Map();
    
    // Helper to get grid cell key
    const getCellKey = (position) => {
      const x = Math.floor((position.x + params.worldSize) / gridCellSize);
      const y = Math.floor((position.y + params.worldSize) / gridCellSize);
      const z = Math.floor((position.z + params.worldSize) / gridCellSize);
      return `${x},${y},${z}`;
    };
    
    // Optimized grid operations
    // OPTIMIZATION: Don't clear entire grid, just update changed cells
    const clearGrid = () => {
      // Original approach - clearing all cells
      // Object.keys(spatialGrid).forEach(key => {
      //   delete spatialGrid[key];
      // });
      
      // We don't actually clear the grid completely anymore
      // The add/remove operations happen in the boid move method
    };
    
    // NEW: Remove boid from a cell
    const removeFromGrid = (boid, cellKey) => {
      if (spatialGrid[cellKey]) {
        const index = spatialGrid[cellKey].indexOf(boid);
        if (index !== -1) {
          spatialGrid[cellKey].splice(index, 1);
          changedCells.add(cellKey);
          
          // Clean up empty cells
          if (spatialGrid[cellKey].length === 0) {
            delete spatialGrid[cellKey];
          }
        }
      }
    };
    
    // Update grid with boid position
    const addToGrid = (boid, cellKey) => {
      if (!spatialGrid[cellKey]) {
        spatialGrid[cellKey] = [];
      }
      spatialGrid[cellKey].push(boid);
      changedCells.add(cellKey);
    };
    
    // Get nearby boids using spatial grid
    const getNearbyBoids = (position, radius) => {
      const nearbyBoids = [];
      const cellRadius = Math.ceil(radius / gridCellSize);
      
      const centerX = Math.floor((position.x + params.worldSize) / gridCellSize);
      const centerY = Math.floor((position.y + params.worldSize) / gridCellSize);
      const centerZ = Math.floor((position.z + params.worldSize) / gridCellSize);
      
      // Check all cells within radius
      for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
        for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
          for (let z = centerZ - cellRadius; z <= centerZ + cellRadius; z++) {
            const key = `${x},${y},${z}`;
            const cell = spatialGrid[key];
            
            if (cell) {
              for (const other of cell) {
                // Filter by actual distance
                const dist = position.distanceTo(other.position);
                if (dist <= radius) {
                  nearbyBoids.push(other);
                }
              }
            }
          }
        }
      }
      
      return nearbyBoids;
    };
    
    // Matrix and dummy objects for instance updates
    const dummy = new THREE.Object3D();
    
    // Instanced meshes for white and orange boids
    const geometry = new THREE.PlaneGeometry(1, 1);
    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    
    const orangeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF8800,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    
    // Create instanced meshes
    const whiteInstancedMesh = new THREE.InstancedMesh(
      geometry, 
      whiteMaterial, 
      params.whiteCount
    );
    
    const orangeInstancedMesh = new THREE.InstancedMesh(
      geometry, 
      orangeMaterial, 
      params.orangeCount
    );
    
    whiteInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    orangeInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    scene.add(whiteInstancedMesh);
    scene.add(orangeInstancedMesh);
    
    // Pre-allocate color arrays for performance
    const whiteColorArray = new Float32Array(params.whiteCount * 3);
    const orangeColorArray = new Float32Array(params.orangeCount * 3);
    
    // NEW: Track which boids have changed colors
    const whiteColorChanged = new Array(params.whiteCount).fill(false);
    const orangeColorChanged = new Array(params.orangeCount).fill(false);
    
    // NEW: Track which boids have moved
    const whiteMoved = new Array(params.whiteCount).fill(false);
    const orangeMoved = new Array(params.orangeCount).fill(false);
    
    // Initialize color arrays
    for (let i = 0; i < params.whiteCount; i++) {
      whiteColorArray[i * 3] = 1;
      whiteColorArray[i * 3 + 1] = 1;
      whiteColorArray[i * 3 + 2] = 1;
    }
    
    for (let i = 0; i < params.orangeCount; i++) {
      orangeColorArray[i * 3] = 1;
      orangeColorArray[i * 3 + 1] = 0.55;
      orangeColorArray[i * 3 + 2] = 0;
    }
    
    // Optimized Boid class
    class Boid {
      constructor(x, y, z, isWhite, instanceId) {
        // Position and instance info
        this.position = new THREE.Vector3(x, y, z);
        this.isWhite = isWhite;
        this.instanceId = instanceId;
        
        // Movement properties
        this.velocity = new THREE.Vector3(
          (Math.random() * 2 - 1) * params.minSpeed,
          (Math.random() * 2 - 1) * params.minSpeed,
          (Math.random() * 2 - 1) * params.minSpeed * 0.5
        );
        this.acceleration = new THREE.Vector3();
        
        // Color and appearance properties
        this.scale = 1.0;
        this.opacity = 0.9;
        
        // Wave influence properties
        this.waveValue = 0;
        this.waveDirection = new THREE.Vector3();
        this.turnFactor = 0;
        
        // NEW: Track previous position for change detection
        this.lastPosition = new THREE.Vector3().copy(this.position);
        this.lastRotation = new THREE.Euler();
        this.lastScale = this.scale;
        
        // NEW: Color tracking
        this.lastWaveValue = 0;
        this.colorChangeAmount = 0;
        
        // NEW: Track grid cell
        this.currentCell = getCellKey(this.position);
        previousCellKeys.set(this, this.currentCell);
        addToGrid(this, this.currentCell);
        
        // Update instance matrix
        this.updateInstanceMatrix();
      }
      
      // Update the instance matrix for rendering
      updateInstanceMatrix() {
        // NEW: Only update if significantly moved
        const moved = this.hasSignificantlyMoved();
        
        if (moved) {
          // Set position, scale, and rotation for instance
          dummy.position.copy(this.position);
          dummy.scale.set(this.scale, this.scale, 1);
          
          // Set rotation to face direction
          if (this.velocity.length() > 0.01) {
            // Project velocity onto XY plane for rotation
            dummy.rotation.z = Math.atan2(this.velocity.y, this.velocity.x);
            
            // Tilt based on z-velocity (climbing/diving)
            dummy.rotation.x = THREE.MathUtils.clamp(this.velocity.z * 0.5, -0.5, 0.5);
          }
          
          this.lastRotation.copy(dummy.rotation);
          this.lastScale = this.scale;
          this.lastPosition.copy(this.position);
          
          // Update matrix
          dummy.updateMatrix();
          
          // Apply to instanced mesh
          const mesh = this.isWhite ? whiteInstancedMesh : orangeInstancedMesh;
          mesh.setMatrixAt(this.instanceId, dummy.matrix);
          
          // Mark matrix as needing update
          if (this.isWhite) {
            whiteMoved[this.instanceId] = true;
          } else {
            orangeMoved[this.instanceId] = true;
          }
        }
      }
      
      // NEW: Determine if boid has significantly moved
      hasSignificantlyMoved() {
        const posDiff = this.position.distanceTo(this.lastPosition);
        const scaleDiff = Math.abs(this.scale - this.lastScale);
        
        return posDiff > params.updateThreshold || scaleDiff > 0.05;
      }
      
      // Apply force to acceleration
      applyForce(force) {
        this.acceleration.add(force);
      }
      
      // Vector reuse for optimization
      _steer = new THREE.Vector3();
      _diff = new THREE.Vector3();
      
      // Calculate separation force (optimized)
      separate(boids) {
        this._steer.set(0, 0, 0);
        let count = 0;
        
        for (const other of boids) {
          if (other === this) continue;
          
          const dist = this.position.distanceTo(other.position);
          
          if (dist < params.separationDist) {
            this._diff.subVectors(this.position, other.position)
                     .normalize()
                     .divideScalar(Math.max(0.1, dist));
            
            this._steer.add(this._diff);
            count++;
          }
        }
        
        if (count > 0) {
          this._steer.divideScalar(count);
          
          if (this._steer.length() > 0) {
            this._steer.normalize().multiplyScalar(params.maxSpeed);
            this._steer.sub(this.velocity);
            this._steer.clampLength(0, params.maxForce * 1.5);
          }
        }
        
        return this._steer;
      }
      
      // Reusable vectors for alignment
      _alignSteer = new THREE.Vector3();
      
      // Calculate alignment force (optimized)
      align(boids) {
        this._alignSteer.set(0, 0, 0);
        let count = 0;
        
        for (const other of boids) {
          if (other === this) continue;
          
          this._alignSteer.add(other.velocity);
          count++;
        }
        
        if (count > 0) {
          this._alignSteer.divideScalar(count);
          
          if (this._alignSteer.length() > 0) {
            this._alignSteer.normalize().multiplyScalar(params.maxSpeed);
            this._alignSteer.sub(this.velocity);
            this._alignSteer.clampLength(0, params.maxForce);
          }
        }
        
        return this._alignSteer;
      }
      
      // Reusable vectors for cohesion
      _cohTarget = new THREE.Vector3();
      _cohSteer = new THREE.Vector3();
      
      // Calculate cohesion force (optimized)
      cohesion(boids) {
        this._cohTarget.set(0, 0, 0);
        let count = 0;
        
        for (const other of boids) {
          if (other === this) continue;
          
          this._cohTarget.add(other.position);
          count++;
        }
        
        if (count > 0) {
          this._cohTarget.divideScalar(count);
          return this.seek(this._cohTarget);
        }
        
        return this._cohSteer.set(0, 0, 0);
      }
      
      // Mouse avoidance vector
      _mouseAvoid = new THREE.Vector3();
      _mousePos2D = new THREE.Vector3();
      _avoidDir = new THREE.Vector3();
      
      // Calculate mouse avoidance force
      avoidMouse() {
        // Only apply if mouse is over the container
        if (!mouseOver) return this._mouseAvoid.set(0, 0, 0);
        
        // Calculate distance to mouse (in XY plane primarily)
        this._mousePos2D.set(mouseWorldCoordinates.x, mouseWorldCoordinates.y, this.position.z);
        const distToMouse = this.position.distanceTo(this._mousePos2D);
        
        // CHANGE: Adjust avoidance radius based on aspect ratio
        const adjustedRadius = params.mouseAvoidanceRadius * 
          (window.innerWidth > window.innerHeight ? 1 : window.innerWidth/window.innerHeight);
        
        // Only avoid if within avoidance radius (use adjusted radius)
        if (distToMouse < adjustedRadius) {
          // Calculate avoidance direction (away from mouse)
          this._avoidDir.subVectors(this.position, this._mousePos2D).normalize();
          
          // Stronger avoidance when closer to mouse (inverse square falloff)
          const strength = (1 - (distToMouse / adjustedRadius)) ** 2;
          
          // Create avoidance force - using the direct parameter value
          const avoidanceStrength = params.mouseAvoidanceStrength * params.maxForce * 2;
          return this._mouseAvoid.copy(this._avoidDir).multiplyScalar(strength * avoidanceStrength);
        }
        
        return this._mouseAvoid.set(0, 0, 0);
      }
      
      // Seek reusable vectors
      _seekDesired = new THREE.Vector3();
      _seekSteer = new THREE.Vector3();
      
      // Basic seek force calculation
      seek(target) {
        this._seekDesired.subVectors(target, this.position);
        
        if (this._seekDesired.length() > 0) {
          this._seekDesired.normalize().multiplyScalar(params.maxSpeed);
          
          this._seekSteer.subVectors(this._seekDesired, this.velocity);
          this._seekSteer.clampLength(0, params.maxForce);
          return this._seekSteer;
        }
        
        return this._seekSteer.set(0, 0, 0);
      }
      
      // Wave reusable vectors 
      _waveForce = new THREE.Vector3();
      _dirToWave = new THREE.Vector3();
      
      // Calculate wave influence (optimized)
      calculateWaveInfluence(nearbyBoids) {
        // NEW: Store previous wave value to detect changes
        const prevWaveValue = this.waveValue;
        
        // Get neighboring boids with higher wave values
        let maxNeighborWave = 0;
        
        for (const other of nearbyBoids) {
          if (other === this) continue;
          if (other.waveValue > maxNeighborWave) {
            maxNeighborWave = other.waveValue;
          }
        }
        
        // If there are influential neighbors, increase own wave value
        if (maxNeighborWave > this.waveValue) {
          this.waveValue = Math.max(
            this.waveValue,
            maxNeighborWave * params.wavePropagationFactor
          );
        } else {
          // Decay wave value over time
          this.waveValue *= 0.98;
        }
        
        // Check for being near a wave center
        for (const center of waveCenters) {
          // Skip inactive centers
          if (!center.active) continue;
          
          const distToCenter = this.position.distanceTo(center.position);
          
          // Only affected if within radius
          if (distToCenter < center.radius) {
            // Stronger at the edge, weaker in the middle or outside
            const normalized = distToCenter / center.radius;
            const edgeFactor = Math.sin(normalized * Math.PI); // peaks at 0.5
            
            // Update wave value if the wave center provides stronger influence
            const centerInfluence = edgeFactor * center.strength;
            this.waveValue = Math.max(this.waveValue, centerInfluence);
            
            // Store direction to turn based on this wave center
            if (centerInfluence > 0.1) {
              this._dirToWave.subVectors(center.position, this.position).normalize();
              // Set turn direction perpendicular to the direction to wave center
              this.turnFactor = center.isCW ? 1 : -1;
              
              // Store direction for perpendicular movement
              this.waveDirection.set(
                -this._dirToWave.y * this.turnFactor,
                this._dirToWave.x * this.turnFactor,
                this._dirToWave.z * 0.1
              ).normalize();
            }
          }
        }
        
        // NEW: Check if color needs update
        this.colorChangeAmount = Math.abs(this.waveValue - prevWaveValue);
        
        // Return force based on wave influence
        if (this.waveValue > 0.05 && this.waveDirection.length() > 0) {
          // Update color based on wave value if change is significant
          if (this.colorChangeAmount > params.colorUpdateThreshold) {
            this.updateColorForWave();
          }
          
          return this._waveForce.copy(this.waveDirection)
            .multiplyScalar(this.waveValue * params.waveInfluence * params.maxForce);
        } else {
          // Reset color when not influenced (only if significant)
          if (this.waveValue < 0.05 && prevWaveValue > 0.05) {
            this.resetColor();
          }
          return this._waveForce.set(0, 0, 0);
        }
      }
      
      // Update color array for the instance based on wave influence
      updateColorForWave() {
        const waveIntensity = this.waveValue * 0.7;
        
        if (this.isWhite) {
          // White boids get bluish tint
          whiteColorArray[this.instanceId * 3] = 1 - waveIntensity * 0.5;     // R
          whiteColorArray[this.instanceId * 3 + 1] = 1 - waveIntensity * 0.3; // G
          whiteColorArray[this.instanceId * 3 + 2] = 1;                      // B
          whiteColorChanged[this.instanceId] = true;
        } else {
          // Orange boids get brighter
          orangeColorArray[this.instanceId * 3] = Math.min(1, 1 + waveIntensity * 0.3);      // R
          orangeColorArray[this.instanceId * 3 + 1] = Math.min(1, 0.55 + waveIntensity * 0.2); // G
          orangeColorArray[this.instanceId * 3 + 2] = Math.min(1, waveIntensity * 0.2);       // B
          orangeColorChanged[this.instanceId] = true;
        }
      }
      
      // Reset color to original
      resetColor() {
        if (this.isWhite) {
          whiteColorArray[this.instanceId * 3] = 1;      // R
          whiteColorArray[this.instanceId * 3 + 1] = 1;  // G
          whiteColorArray[this.instanceId * 3 + 2] = 1;  // B
          whiteColorChanged[this.instanceId] = true;
        } else {
          orangeColorArray[this.instanceId * 3] = 1;      // R
          orangeColorArray[this.instanceId * 3 + 1] = 0.55; // G
          orangeColorArray[this.instanceId * 3 + 2] = 0;     // B
          orangeColorChanged[this.instanceId] = true;
        }
      }
      
      // Calculate and apply all flocking forces
      flock() {
        // Get nearby boids using spatial grid (major performance optimization)
        const nearbyBoids = getNearbyBoids(this.position, params.perceptionRadius);
        const closeBoids = nearbyBoids.filter(b => 
          this.position.distanceTo(b.position) < params.separationDist
        );
        
        // Basic flocking forces
        const separation = this.separate(closeBoids).multiplyScalar(params.separationWeight);
        const alignment = this.align(nearbyBoids).multiplyScalar(params.alignmentWeight);
        const cohesion = this.cohesion(nearbyBoids).multiplyScalar(params.cohesionWeight);
        
        // Wave influence for murmuration effect
        const wave = this.calculateWaveInfluence(nearbyBoids);
        
        // Mouse avoidance
        const mouseAvoid = this.avoidMouse();
        
        // Apply all forces
        this.applyForce(separation);
        this.applyForce(alignment);
        this.applyForce(cohesion);
        this.applyForce(wave);
        this.applyForce(mouseAvoid);
      }
      
      // Handle world boundaries (wrap around)
      wrapPosition() {
        const pos = this.position;
        const baseLimit = params.worldSize;
        
        // Adjust X boundary based on aspect ratio
        const xLimit = baseLimit * camera.aspect;
        
        // Use aspect-adjusted limits
        if (pos.x > xLimit) pos.x = -xLimit;
        else if (pos.x < -xLimit) pos.x = xLimit;
        
        if (pos.y > baseLimit) pos.y = -baseLimit;
        else if (pos.y < -baseLimit) pos.y = baseLimit;
        
        if (pos.z > baseLimit * 0.5) pos.z = -baseLimit * 0.5;
        else if (pos.z < -baseLimit * 0.5) pos.z = baseLimit * 0.5;
      }
      // Update boid position and appearance
      update() {
        // Update velocity
        this.velocity.add(this.acceleration);
        
        // Enforce speed limits
        const speed = this.velocity.length();
        
        if (speed > params.maxSpeed) {
          this.velocity.normalize().multiplyScalar(params.maxSpeed);
        } else if (speed < params.minSpeed) {
          this.velocity.normalize().multiplyScalar(params.minSpeed);
        }
        
        // NEW: Get current cell before moving
        const oldCellKey = previousCellKeys.get(this);
        
        // Move
        this.position.add(this.velocity);
        
        // Wrap around world boundaries
        this.wrapPosition();
        
        // NEW: Update grid position if cell changed
        const newCellKey = getCellKey(this.position);
        if (newCellKey !== oldCellKey) {
          removeFromGrid(this, oldCellKey);
          addToGrid(this, newCellKey);
          previousCellKeys.set(this, newCellKey);
        }
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Update appearance for 3D effect
        this.updateAppearance();
        
        // Update instance matrix for rendering
        this.updateInstanceMatrix();
      }
      
      // Update appearance based on depth
      updateAppearance() {
        // Scale based on z-position (further = smaller)
        const zPos = this.position.z;
        const distanceFromCamera = 150 - zPos; // Camera is at z=150
        this.scale = THREE.MathUtils.clamp(80 / distanceFromCamera, 0.6, 1.4);
        
        // Adjust opacity based on depth (for future implementation if needed)
        this.opacity = THREE.MathUtils.clamp(0.4 + (this.scale - 0.6) * 0.6, 0.4, 1.0);
      }
    }
    
    // OPTIMIZATION: Pre-allocate vector for wave center movement
    const waveCenterMoveVec = new THREE.Vector3();
    
    // Create wave centers
    const createWaveCenters = () => {
      // Only create new centers if below the max
      const availableSlots = params.maxWaveCenters - waveCenters.filter(c => c.active).length;
      if (availableSlots <= 0) return;
      
      // Determine how many new centers to create
      const newCount = Math.min(
        availableSlots,
        1 + Math.floor(Math.random() * 2)
      );
      
      // Calculate aspect-adjusted X limit
      const xLimit = params.worldSize * camera.aspect * 0.7;
      const yLimit = params.worldSize * 0.7;
      const zLimit = params.worldSize * 0.3;
      
      // First try to reuse inactive centers
      const inactiveCenters = waveCenters.filter(c => !c.active);
      
      for (let i = 0; i < newCount; i++) {
        if (i < inactiveCenters.length) {
          // Reuse an inactive center
          const center = inactiveCenters[i];
          center.position.set(
            (Math.random() * 2 - 1) * xLimit,  // X position uses aspect-adjusted limit
            (Math.random() * 2 - 1) * yLimit,
            (Math.random() * 2 - 1) * zLimit
          );
          center.radius = 30 + Math.random() * 40;
          center.strength = 0.5 + Math.random() * 0.5;
          center.isCW = Math.random() > 0.5;
          center.active = true;
          center.age = 0;
        } else {
          // Create a new center if needed
          waveCenters.push({
            position: new THREE.Vector3(
              (Math.random() * 2 - 1) * xLimit,  // X position uses aspect-adjusted limit
              (Math.random() * 2 - 1) * yLimit,
              (Math.random() * 2 - 1) * zLimit
            ),
            radius: 30 + Math.random() * 40,
            strength: 0.5 + Math.random() * 0.5,
            isCW: Math.random() > 0.5,
            active: true,
            age: 0
          });
        }
      }
    };
    
    // OPTIMIZATION: Reuse vector for wave center movement
    const moveWaveCenters = () => {
      let activeCount = 0;
      
      for (const center of waveCenters) {
        if (!center.active) continue;
        
        // Count active centers
        activeCount++;
        
        // Increment age
        center.age++;
        
        // Deactivate old centers
        if (center.age > 100) {
          center.active = false;
          continue;
        }
        
        // OPTIMIZATION: Use pre-allocated vector instead of creating new one
        waveCenterMoveVec.set(
          (Math.random() * 2 - 1) * 0.5,
          (Math.random() * 2 - 1) * 0.5,
          (Math.random() * 2 - 1) * 0.2
        );
        center.position.add(waveCenterMoveVec);
        
        // Keep within world bounds
        const pos = center.position;
        const limit = params.worldSize * 0.8;
        
        if (pos.x > limit) pos.x = limit;
        else if (pos.x < -limit) pos.x = -limit;
        
        if (pos.y > limit) pos.y = limit;
        else if (pos.y < -limit) pos.y = -limit;
        
        if (pos.z > limit * 0.4) pos.z = limit * 0.4;
        else if (pos.z < -limit * 0.4) pos.z = -limit * 0.4;
        
        // Slight radius variation
        center.radius *= 0.99 + Math.random() * 0.02;
        center.radius = THREE.MathUtils.clamp(center.radius, 20, 60);
        
        // Slight strength variation
        center.strength *= 0.99 + Math.random() * 0.02;
        center.strength = THREE.MathUtils.clamp(center.strength, 0.4, 1.0);
      }
      
      return activeCount;
    };
    
    // Initialize boids
    const boids = [];
    
    const createBoids = () => {
      // Create white boids
      for (let i = 0; i < params.whiteCount; i++) {
        // Use full world size for more spread out initial positions
        const position = new THREE.Vector3(
          (Math.random() * 2 - 1) * params.worldSize * 0.95,
          (Math.random() * 2 - 1) * params.worldSize * 0.95,
          (Math.random() * 2 - 1) * params.worldSize * 0.45
        );
        boids.push(new Boid(position.x, position.y, position.z, true, i));
      }
      
      // Create orange boids
      for (let i = 0; i < params.orangeCount; i++) {
        // Use full world size for more spread out initial positions
        const position = new THREE.Vector3(
          (Math.random() * 2 - 1) * params.worldSize * 0.95,
          (Math.random() * 2 - 1) * params.worldSize * 0.95,
          (Math.random() * 2 - 1) * params.worldSize * 0.45
        );
        boids.push(new Boid(position.x, position.y, position.z, false, i));
      }
    };
    
    // Update mouse position
    const updateMousePosition = (event) => {
      // Get container dimensions and position
      
      // Calculate normalized device coordinates (-1 to +1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Project mouse position to world coordinates at z=0 plane
      mouseWorldCoordinates.set(
        mouse.x * params.worldSize * camera.aspect,
        mouse.y * params.worldSize,
        0
      );
      
      mouseOver = true;
    };
    
    // Reset mouse state when leaving
    const handleMouseLeave = () => {
      mouseOver = false;
    };
    
    // Initialize simulation
    createBoids();
    createWaveCenters();
    
    // Set up color attributes for the instanced meshes
    const whiteColorAttribute = new THREE.InstancedBufferAttribute(whiteColorArray, 3);
    const orangeColorAttribute = new THREE.InstancedBufferAttribute(orangeColorArray, 3);
    
    whiteInstancedMesh.instanceColor = whiteColorAttribute;
    orangeInstancedMesh.instanceColor = orangeColorAttribute;
    
    whiteInstancedMesh.geometry.setAttribute('color', whiteColorAttribute);
    orangeInstancedMesh.geometry.setAttribute('color', orangeColorAttribute);
    
    // Add mouse event listeners
    renderer.domElement.addEventListener('mousemove', updateMousePosition);
    containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    
    // Periodically update wave centers
    const waveUpdateInterval = setInterval(() => {
      const activeCount = moveWaveCenters();
      
      // Only create new wave centers if below the max
      if (activeCount < params.maxWaveCenters && Math.random() < 0.15) {
        createWaveCenters();
      }
      
      // Occasionally initiate a wave at a random boid, but limit total active waves
      const activeWaves = boids.filter(b => b.waveValue > 0.2).length;
      
      if (activeWaves < params.maxActiveWaves && Math.random() < 0.15) {
        const randomBoid = boids[Math.floor(Math.random() * boids.length)];
        randomBoid.waveValue = 1.0;
        randomBoid.waveDirection.set(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          (Math.random() * 2 - 1) * 0.5
        ).normalize();
      }
    }, 500);
    
    // Animation variables
    let animationStarted = false;
    let animationId = null;
    let startTime = null;
    let lastFrameTime = 0;
    let frameCount = 0;
    let lastFpsUpdate = 0;
    
    // NEW: Performance tracking variables
    let updatedWhiteMatrices = 0;
    let updatedOrangeMatrices = 0;
    let updatedWhiteColors = 0;
    let updatedOrangeColors = 0;
    let frameSkipCounter = 0;
    
    // Animation loop
    const animate = (time) => {
      if (!startTime) {
        startTime = time;
        lastFrameTime = time;
        lastFpsUpdate = time;
      }
      
      const elapsedTime = time - startTime;
      const deltaTime = time - lastFrameTime;
      lastFrameTime = time;
      
      // FPS calculation
      frameCount++;
      if (time - lastFpsUpdate > 1000) {
        // Update FPS counter in UI
        const fps = Math.round(frameCount * 1000 / (time - lastFpsUpdate));
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
          fpsElement.textContent = `FPS: ${fps}`;
        }
        
        // Update boid updates counter
        const updatesElement = document.getElementById('boid-updates');
        if (updatesElement) {
          const avgUpdates = (updatedWhiteMatrices + updatedOrangeMatrices) / frameCount;
          updatesElement.textContent = `Updates: ${Math.round(avgUpdates)} boids/frame`;
        }
        
        // Reset counters
        frameCount = 0;
        lastFpsUpdate = time;
        updatedWhiteMatrices = 0;
        updatedOrangeMatrices = 0;
        updatedWhiteColors = 0;
        updatedOrangeColors = 0;
      }
      
      // Start movement after 1 second
      if (elapsedTime > 1000 && !animationStarted) {
        animationStarted = true;
      }
      
      // Update boids
      if (animationStarted) {
        // First calculate all forces
        for (const boid of boids) {
          boid.flock();
        }
        
        // Then update all positions
        for (const boid of boids) {
          boid.update();
        }
        
        // Update matrices only if needed
        let whiteMatrixNeedsUpdate = false;
        let orangeMatrixNeedsUpdate = false;
        
        // Check if any matrices need updates
        for (let i = 0; i < whiteMoved.length; i++) {
          if (whiteMoved[i]) {
            whiteMatrixNeedsUpdate = true;
            whiteMoved[i] = false;
            updatedWhiteMatrices++;
          }
        }
        
        for (let i = 0; i < orangeMoved.length; i++) {
          if (orangeMoved[i]) {
            orangeMatrixNeedsUpdate = true;
            orangeMoved[i] = false;
            updatedOrangeMatrices++;
          }
        }
        
        // Apply matrix updates if needed
        if (whiteMatrixNeedsUpdate) {
          whiteInstancedMesh.instanceMatrix.needsUpdate = true;
        }
        
        if (orangeMatrixNeedsUpdate) {
          orangeInstancedMesh.instanceMatrix.needsUpdate = true;
        }
        
        // Update colors less frequently (every N frames)
        frameSkipCounter = (frameSkipCounter + 1) % params.frameSkip;
        if (frameSkipCounter === 0) {
          let whiteColorNeedsUpdate = false;
          let orangeColorNeedsUpdate = false;
          
          // Check if any colors need updates
          for (let i = 0; i < whiteColorChanged.length; i++) {
            if (whiteColorChanged[i]) {
              whiteColorNeedsUpdate = true;
              whiteColorChanged[i] = false;
              updatedWhiteColors++;
            }
          }
          
          for (let i = 0; i < orangeColorChanged.length; i++) {
            if (orangeColorChanged[i]) {
              orangeColorNeedsUpdate = true;
              orangeColorChanged[i] = false;
              updatedOrangeColors++;
            }
          }
          
          // Apply color updates if needed
          if (whiteColorNeedsUpdate) {
            whiteInstancedMesh.geometry.attributes.color.needsUpdate = true;
          }
          
          if (orangeColorNeedsUpdate) {
            orangeInstancedMesh.geometry.attributes.color.needsUpdate = true;
          }
        }
      }
      
      // Render scene
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', updateMousePosition);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      clearInterval(waveUpdateInterval);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // Clean up all THREE.js resources
      scene.clear();
      
      // Clear instance matrices
      if (whiteInstancedMesh) {
        scene.remove(whiteInstancedMesh);
        whiteInstancedMesh.dispose();
      }
      if (orangeInstancedMesh) {
        scene.remove(orangeInstancedMesh);
        orangeInstancedMesh.dispose();
      }
      
      // Clean up geometry and materials
      geometry.dispose();
      whiteMaterial.dispose();
      orangeMaterial.dispose();
      
      // Dispose renderer
      renderer.dispose();
      
      // Remove canvas
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [boidCount, speedMultiplier, mouseAvoidance]); // Recreate simulation when any of these change

  return (
    <div 
      ref={containerRef} 
      className="w-full h-screen bg-black"
    />
  );
};

export default BoidSimulation;