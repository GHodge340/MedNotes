import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SplashPage from './components/SplashPage';
import NoteGenerator from './components/NoteGenerator';
import PatientScheduler from './components/PatientScheduler';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/generator" element={<NoteGenerator />} />
        <Route path="/scheduler" element={<PatientScheduler />} />
      </Routes>
    </Router>
  );
}

export default App;
