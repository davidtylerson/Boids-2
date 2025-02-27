import React from 'react';

const ControlPanel = ({ 
  boidCount, 
  setBoidCount, 
  speedMultiplier, 
  setSpeedMultiplier, 
  mouseAvoidance,
  setMouseAvoidance,
  onApplyChanges
}) => {
  return (
    <div className="fixed top-2 right-2 bg-gray-900 bg-opacity-80 p-4 rounded-lg text-white w-64 shadow-lg z-50" style={{pointerEvents: 'auto'}}>
      <div className="text-lg font-bold mb-3 text-white">Simulation Controls</div>
      
      <div className="mb-3">
        <label className="block mb-1 text-sm !text-white">Boid Count: {boidCount}</label>
        <input 
          type="range" 
          min="100" 
          max="2000" 
          step="100" 
          value={boidCount} 
          onChange={(e) => setBoidCount(parseInt(e.target.value))} 
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <div className="mb-3">
        <label className="block mb-1 text-sm text-white">Speed: {speedMultiplier.toFixed(1)}x</label>
        <input 
          type="range" 
          min="0.1" 
          max="2.0" 
          step="0.1" 
          value={speedMultiplier} 
          onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))} 
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-white">Slow</span>
          <span className="text-xs text-white">Fast</span>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block mb-1 text-sm text-white">Mouse Avoidance: {mouseAvoidance.toFixed(1)}</label>
        <input 
          type="range" 
          min="0" 
          max="5" 
          step="0.5" 
          value={mouseAvoidance} 
          onChange={(e) => setMouseAvoidance(parseFloat(e.target.value))} 
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-white">None</span>
          <span className="text-xs text-white">Strong</span>
        </div>
      </div>
      
      <button 
        onClick={onApplyChanges}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        Apply Changes
      </button>
      
      {/* Performance metrics display */}
      <div className="mt-3 text-xs text-white">
        <div id="fps-counter" className="text-white">FPS: --</div>
        <div id="boid-updates" className="text-white">Updates: -- boids/frame</div>
      </div>
    </div>
  );
};

export default ControlPanel;