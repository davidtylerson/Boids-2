import React, { useState } from 'react';
import BoidSimulation from './components/BoidSimulation';
import ControlPanel from './components/ControlPanel';

const App = () => {
  // State for controller values
  const [boidCount, setBoidCount] = useState(1000);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [mouseAvoidance, setMouseAvoidance] = useState(2.0);
  
  // State to track if settings have been applied
  const [appliedSettings, setAppliedSettings] = useState({
    boidCount: 1000,
    speedMultiplier: 1.0,
    mouseAvoidance: 2.0
  });
  
  // Apply changes function
  const handleApplyChanges = () => {
    console.log(`Applying settings: Boids=${boidCount}, Speed=${speedMultiplier}x, Avoidance=${mouseAvoidance}`);
    setAppliedSettings({
      boidCount,
      speedMultiplier,
      mouseAvoidance
    });
  };
  
  return (
    <div className="relative w-full h-screen" style={{isolation: 'isolate'}}>
      <BoidSimulation 
        boidCount={appliedSettings.boidCount}
        speedMultiplier={appliedSettings.speedMultiplier}
        mouseAvoidance={appliedSettings.mouseAvoidance}
      />
      <div style={{position: 'fixed', top: 0, right: 0, zIndex: 100, pointerEvents: 'none'}}>
        <ControlPanel 
          boidCount={boidCount}
          setBoidCount={setBoidCount}
          speedMultiplier={speedMultiplier}
          setSpeedMultiplier={setSpeedMultiplier}
          mouseAvoidance={mouseAvoidance}
          setMouseAvoidance={setMouseAvoidance}
          onApplyChanges={handleApplyChanges}
        />
      </div>
    </div>
  );
};

export default App;