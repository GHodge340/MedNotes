import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, ShieldCheck, Download } from 'lucide-react';

function SplashPage() {
  const navigate = useNavigate();

  return (
    <div className="splash-container">
      <div className="hero-section">
        <div className="logo-area">
          <ShieldCheck color="#3498db" className="splash-logo-icon" />
          <h1>MedNotes</h1>
          <p className="tagline">The Medical Provider AI Assistant</p>
        </div>
        
        <div className="cta-grid">
          <button className="cta-card" onClick={() => navigate('/generator')}>
            <FileText size={48} />
            <h2>Medical Note Generator</h2>
            <p>Create professional clinical reports with AI-assisted narratives and checkbox systems.</p>
          </button>
          
          <button className="cta-card" onClick={() => navigate('/scheduler')}>
            <Calendar size={48} />
            <h2>Patient Visit Scheduler</h2>
            <p>Interactive patient tracker with automated visit calculations and clinical notes.</p>
          </button>
        </div>

        <button 
          className="download-standalone-btn" 
          onClick={() => window.open('https://www.mediafire.com/file/7zxhir4ts52e6f4/MedNotes+AI+1.0.0.exe/file', '_blank')}
        >
          <Download size={18} />
          Download Windows Standalone App (Offline Mode)
        </button>
      </div>
      
      <footer className="splash-footer">
        <p>© 2026 MedNotes AI. Secure & HIPAA Compliant Workflow. Developed by: <a href="https://devbygreg.com" target="_blank" rel="noopener noreferrer">DevByGreg.com</a></p>
      </footer>
    </div>
  );
}

export default SplashPage;
