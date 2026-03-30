import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Save, Trash2, Plus, UserPlus, X, Download, Upload } from 'lucide-react';

function PatientScheduler() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', lastSeen: '', notes: '' });
  const fileInputRef = useRef(null);

  const templateData = [
    { name: "Holloway, Brandon", lastSeen: "2026-02-26", notes: "" },
    { name: "Hackett, Phillis", lastSeen: "2026-02-26", notes: "" },
    { name: "Mauney, Scotty", lastSeen: "2026-02-26", notes: "" },
    { name: "Burnette, Demarco", lastSeen: "2026-03-05", notes: "" },
    { name: "Smith, Brenda", lastSeen: "2026-03-05", notes: "" },
    { name: "Saunders, Cobb", lastSeen: "2026-03-05", notes: "" },
    { name: "Williams, Ollie", lastSeen: "2026-03-05", notes: "" },
    { name: "Isaacs, Terry", lastSeen: "2025-03-05", notes: "" },
    { name: "Young, Tajuana", lastSeen: "2026-03-05", notes: "" },
    { name: "Newkirk, Trenton", lastSeen: "2026-03-05", notes: "" },
    { name: "Dunham, Wyatt", lastSeen: "2026-03-12", notes: "" },
    { name: "Oneil, Julia", lastSeen: "2026-03-12", notes: "" },
    { name: "Maxwell, Justin", lastSeen: "2026-03-12", notes: "" },
    { name: "Williams, Derrick", lastSeen: "2026-03-12", notes: "" },
    { name: "Laughlin, Robin", lastSeen: "2026-03-12", notes: "" },
    { name: "Kennedy, Janet", lastSeen: "2026-03-12", notes: "" },
    { name: "Davis, Austin", lastSeen: "2026-03-17", notes: "" },
    { name: "Lockhart, TaShaun", lastSeen: "2026-03-17", notes: "" },
    { name: "McCrae, Kristopher", lastSeen: "2026-03-17", notes: "" },
    { name: "Falcone, Mark", lastSeen: "2026-03-17", notes: "" }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('mednotes_patients');
    if (saved) {
      setPatients(JSON.parse(saved).map(p => calculateDates(p)));
    } else {
      setPatients(templateData.map(p => calculateDates(p)));
    }
  }, []);

  const calculateDates = (patient) => {
    const today = new Date();
    const lastSeen = patient.lastSeen ? new Date(patient.lastSeen) : null;
    
    let daysSince = "";
    let nextVisit = "";
    
    if (lastSeen) {
      const diffTime = Math.abs(today - lastSeen);
      daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const nextVisitDate = new Date(lastSeen);
      nextVisitDate.setDate(nextVisitDate.getDate() + 30);
      nextVisit = nextVisitDate.toISOString().split('T')[0];
    }

    return { ...patient, daysSince, nextVisit };
  };

  const saveToLocal = (data) => {
    localStorage.setItem('mednotes_patients', JSON.stringify(data));
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all patients? This will permanently delete the current list.")) {
      setPatients([]);
      localStorage.setItem('mednotes_patients', JSON.stringify([]));
    }
  };

  const downloadCSV = () => {
    const headers = ["Member Name", "Last Seen", "Notes"];
    const csvContent = [
      headers.join(","),
      ...patients.map(p => `"${p.name}","${p.lastSeen}","${p.notes}"`)
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_scheduler.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) return;
      
      // Basic header detection - if first line contains common keywords, skip it
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('name') || firstLine.includes('seen') || firstLine.includes('notes') || firstLine.includes('member');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsed = dataLines.map(line => {
        // Split by comma but respect quotes
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const name = (parts[0] || '').replace(/^"|"$/g, '').trim();
        const lastSeen = (parts[1] || '').replace(/^"|"$/g, '').trim();
        const notes = (parts[2] || '').replace(/^"|"$/g, '').trim();
        return { name, lastSeen, notes };
      }).filter(p => p.name);

      const calculated = parsed.map(p => calculateDates(p));
      const updated = [...patients, ...calculated];
      setPatients(updated);
      saveToLocal(updated);
      
      // Reset file input so same file can be imported again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const addPatient = (e) => {
    e.preventDefault();
    if (!newPatient.name) return;
    const added = calculateDates(newPatient);
    const updated = [added, ...patients];
    setPatients(updated);
    saveToLocal(updated);
    setNewPatient({ name: '', lastSeen: '', notes: '' });
    setShowAddForm(false);
  };

  const removePatient = (index) => {
    const updated = patients.filter((_, i) => i !== index);
    setPatients(updated);
    saveToLocal(updated);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...patients];
    updated[index][field] = value;
    if (field === 'lastSeen') {
      const recalculated = calculateDates(updated[index]);
      updated[index].daysSince = recalculated.daysSince;
      updated[index].nextVisit = recalculated.nextVisit;
    }
    setPatients(updated);
    saveToLocal(updated);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="scheduler-container">
      <nav className="top-nav">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} /> Back to Home
        </button>
        <h2>Patient Visit Scheduler</h2>
      </nav>

      <div className="table-actions">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="action-btns">
          <input type="file" ref={fileInputRef} onChange={importCSV} accept=".csv" style={{ display: 'none' }} />
          <button className="add-btn" onClick={() => setShowAddForm(true)}><UserPlus size={18} /> Add</button>
          <button className="action-btn" onClick={() => fileInputRef.current.click()}><Upload size={18} /> Import</button>
          <button className="action-btn" onClick={downloadCSV}><Download size={18} /> Export</button>
          <button className="clear-btn" onClick={clearAll}><Trash2 size={18} /> Clear</button>
        </div>
      </div>
      
      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-form-card">
            <div className="modal-header">
              <h3>Add New Patient</h3>
              <button onClick={() => setShowAddForm(false)} className="close-modal-btn"><X size={20} /></button>
            </div>
            <form onSubmit={addPatient}>
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label>Member Name</label>
                <input 
                  type="text" 
                  value={newPatient.name} 
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="Last Name, First Name"
                  required
                  autoFocus
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label>Last Seen Date</label>
                <input 
                  type="date" 
                  value={newPatient.lastSeen} 
                  onChange={(e) => setNewPatient({ ...newPatient, lastSeen: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Initial Clinical Notes</label>
                <input 
                  type="text" 
                  value={newPatient.notes} 
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                  placeholder="Optional notes or observations"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-add-btn">Add to Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="table-wrapper">
        <table className="patient-table">
          <thead>
            <tr><th>Member Name</th><th>Last Seen</th><th>Days Since</th><th>Next Visit (Est.)</th><th>Clinical Notes</th><th></th></tr>
          </thead>
          <tbody>
            {filteredPatients.map((p, index) => (
              <tr key={index}>
                <td><input type="text" value={p.name} onChange={(e) => handleFieldChange(index, 'name', e.target.value)} className="inline-edit-input bold" /></td>
                <td><input type="date" value={p.lastSeen} onChange={(e) => handleFieldChange(index, 'lastSeen', e.target.value)} className="inline-edit-input date" /></td>
                <td><span className={`status-pill ${p.daysSince > 30 ? 'overdue' : (p.daysSince === "" ? "" : "active")}`}>{p.daysSince ? `${p.daysSince} days` : 'N/A'}</span></td>
                <td>{p.nextVisit || 'N/A'}</td>
                <td><input type="text" value={p.notes} onChange={(e) => handleFieldChange(index, 'notes', e.target.value)} className="inline-edit-input" /></td>
                <td><button className="row-delete-btn" onClick={() => removePatient(index)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PatientScheduler;
