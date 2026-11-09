import React from 'react';
import Navbar from '../layout/Navbar';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to My Portfolio</h1>
        <p className="text-lg">This is a modern portfolio built with MERN stack.</p>
      </main>
    </div>
  );
};

export default Home;