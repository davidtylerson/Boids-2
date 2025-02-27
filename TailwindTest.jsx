import React from 'react';

const TailwindTest = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-blue-500 mb-4">Tailwind Test</h1>
        <p className="text-gray-700 mb-4">If this text is gray, Tailwind is working!</p>
        <p className="text-red-500 mb-4">This should be red text</p>
        <p className="text-green-500 mb-4">This should be green text</p>
        <p className="text-white bg-black p-2 rounded">White on black background</p>
        <div className="mt-4 flex space-x-4">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Blue Button
          </button>
          <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Red Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;