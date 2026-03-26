import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wand2, Clipboard, ShieldCheck, Download, Loader2 } from 'lucide-react';
//import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import medData from '../data/medData.json';

// Initialize Gemini
//const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
//const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-preview-02-05" });

//Initialize OpenAI (for fallback if not running in Electron)
const groq = new OpenAI({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side React
  baseURL: 'https://api.groq.com/openai/v1' // Groq API base URL
});

function NoteGenerator() {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [dateOfService, setDateOfService] = useState(new Date().toISOString().split('T')[0]);
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  
  // Selection States
  const [mseSelections, setMseSelections] = useState({});
  const [rosSelections, setRosSelections] = useState({});
  const [planSelections, setPlanSelections] = useState({});
  const [planTexts, setPlanTexts] = useState({});
  const [customMood, setCustomMood] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  const handleCheckboxChange = (stateUpdate, categoryId, option) => {
    stateUpdate(prev => {
      const current = prev[categoryId] || [];
      if (current.includes(option)) {
        return { ...prev, [categoryId]: current.filter(o => o !== option) };
      } else {
        return { ...prev, [categoryId]: [...current, option] };
      }
    });
  };

  const handlePlanTextChange = (option, text) => {
    setPlanTexts(prev => ({ ...prev, [option]: text }));
  };

  const generateReport = async () => {
    if (!providerNotes && Object.keys(mseSelections).length === 0) {
      alert("Please enter some clinical details or selections first.");
      return;
    }

    setIsGenerating(true);
    
    // Construct Context for AI
    const mseSummary = medData.mseCategories.map(cat => {
      let selections = mseSelections[cat.id] || [];
      if (cat.id === 'mood' && customMood) selections = [...selections, `"${customMood}"`];
      return selections.length > 0 ? `${cat.label.split('. ')[1]}: ${selections.join(', ')}` : null;
    }).filter(Boolean).join('\n');

    const rosSummary = medData.rosCategories.map(cat => {
      const selections = rosSelections[cat.id] || [];
      return selections.length > 0 ? `${cat.label}: ${selections.join(', ')}` : null;
    }).filter(Boolean).join('\n');

    const planSummary = medData.planCategories.map(cat => {
      const selections = (planSelections[cat.id] || []).map(opt => {
        const text = planTexts[opt];
        return text ? `${opt}: ${text}` : opt;
      });
      return selections.length > 0 ? `${cat.label}: ${selections.join(', ')}` : null;
    }).filter(Boolean).join('\n');

    // Use Local SLM if running in Electron, otherwise fallback to Gemini
    if (window.electronAPI) {
      try {
        setGenerationStatus('Initializing local engine...');
        const result = await window.electronAPI.generateNote({
          patientName, age, sex, dateOfService, diagnosis,
          mseSummary, rosSummary, planSummary,
          providerNotes
        }, (status) => setGenerationStatus(status));
        setGeneratedReport(result);
      } catch (error) {
        console.error("Local SLM Error:", error);
        alert("Local AI Generation failed.");
      } finally {
        setIsGenerating(false);
        setGenerationStatus('');
      }
      return;
    }

    const prompt = `
      You are a professional medical assistant. Based on the form data provided you are to generate report in a medical SOAP note (Subjective Objective Assessment Plan) format. 
      A note disclaimer should be at the end of every generated note that states, "Portions of this note have been compiled using an AI-assisted documentation tool. The entirety of this record has been personally reviewed, edited, and verified by the undersigned for accuracy and clinical integrity. The final content reflects the provider’s independent medical judgment."

      Patient Details:
      Name: ${patientName}
      Age: ${age}
      Sex: ${sex}
      Date: ${dateOfService}
      Diagnosis: ${diagnosis}
      
      Mental Status Exam Selections:
      ${mseSummary}
      
      Review of Symptoms Selections:
      ${rosSummary}
      
      Plan Selections:
      ${planSummary}
      
      Provider's Clinical Assessment:
      ${providerNotes}
      
      TASK:
      1. Generate a "Report Format" paragraph:
      "[Patient name] is a [age]-year-old [male/female] seen on [date] for a follow-up of [diagnosis]. [Patient name] has reported [summary based on REVIEW OF SYMPTOMS]. [Patient name] also reports [adherence/non-adherence based on PLAN] to medications with the [presence/absence based on PLAN/PROVIDER ASSESSMENT] of side effects. [Patient name] [acknowledges/denies based on PLAN/PROVIDER ASSESSMENT] stressors, suicidal/homicidal feelings, unmet needs and/or medication issues."

      2. Generate a structured "Note Review" that should have a Layout with these sections:
      - [SOAP REPORT] (Subjective, Objective, Assessment, Plan sections)
      - [MENTAL STATUS EXAM SUMMARY]
      - [REVIEW OF SYMPTOMS SUMMARY]
      - [PROVIDER ASSESSMENT SUMMARY]
      - [PLAN SUMMARY]
      - [NOTE DISCLAIMER]

      STYLE: Professional, concise, clinical, and objective. Use medical terminology.
    `;

    try {
      
      //Groq API call
      const result = await groq.responses.create({
      model: "llama-3.1-8b-instant",
      input: prompt,
    });
      const text = result.output_text;
      setGeneratedReport(text);
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("AI Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${patientName.replace(/\s+/g, '_') || 'Patient'}_${dateOfService}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderCheckboxGroup = (categories, selections, stateUpdate, title) => (
    <div className="form-card">
      <h2>{title}</h2>
      {categories.map(cat => (
        <div key={cat.id} className="mse-category">
          <h3>{cat.label}</h3>
          <div className="checkbox-grid">
            {cat.options.map(opt => (
              <div key={opt}>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={(selections[cat.id] || []).includes(opt)}
                    onChange={() => handleCheckboxChange(stateUpdate, cat.id, opt)}
                  />
                  {opt}
                </label>
                {cat.nested && cat.nested[opt] && (selections[cat.id] || []).includes(opt) && (
                  <div className="nested-checkboxes">
                    {cat.nested[opt].map(nestedOpt => (
                      <label key={nestedOpt} className="checkbox-label nested">
                        <input 
                          type="checkbox" 
                          checked={(selections[cat.id] || []).includes(`${opt}: ${nestedOpt}`)}
                          onChange={() => handleCheckboxChange(stateUpdate, cat.id, `${opt}: ${nestedOpt}`)}
                        />
                        {nestedOpt}
                      </label>
                    ))}
                  </div>
                )}
                {cat.hasText && cat.hasText.includes(opt) && (selections[cat.id] || []).includes(opt) && (
                  <input 
                    type="text" 
                    className="inline-text-input"
                    placeholder="Details..."
                    value={planTexts[opt] || ''}
                    onChange={(e) => handlePlanTextChange(opt, e.target.value)}
                  />
                )}
              </div>
            ))}
            {cat.allowCustom && (
              <div className="custom-input">
                <label>Specific Mood:</label>
                <input 
                  type="text" 
                  value={customMood} 
                  onChange={(e) => setCustomMood(e.target.value)}
                  placeholder="e.g. OK, I guess"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="generator-container">
      <nav className="top-nav">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} /> Back to Home
        </button>
        <div className="branding-mini">
          <ShieldCheck size={24} color="#3498db" />
          <span>MedNotes AI</span>
        </div>
      </nav>

      <main className="generator-layout">
        <section className="input-section">
          <div className="form-card">
            <h2>Patient Demographics</h2>
            <div className="input-row">
              <div className="input-group">
                <label>Initials/Alias/ID#</label>
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Name" />
              </div>
              <div className="input-group">
                <label>Visit Date</label>
                <input type="date" value={dateOfService} onChange={(e) => setDateOfService(e.target.value)} />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Age</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />
              </div>
              <div className="input-group">
                <label>Sex</label>
                <select value={sex} onChange={(e) => setSex(e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Diagnosis</label>
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="ICD-10 Code / Description" />
              </div>
            </div>
          </div>

          {renderCheckboxGroup(medData.mseCategories, mseSelections, setMseSelections, "Mental Status Exam")}
          {renderCheckboxGroup(medData.rosCategories, rosSelections, setRosSelections, "Review of Symptoms")}
          
          <div className="form-card">
            <h2>Provider Assessment</h2>
            <p className="hint">Describe the visit and assessment in raw detail. MedNotes AI will use this to generate professional clinical narratives.</p>
            <textarea 
              className="notes-area large"
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              placeholder="e.g., Patient reports feeling 'ok' today. Assessment of progress..."
            />
          </div>

          {renderCheckboxGroup(medData.planCategories, planSelections, setPlanSelections, "Plan")}

          <button className="generate-btn" onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={20} /> {generationStatus || 'Generating with MedNotes AI...'}</>
            ) : (
              <><Wand2 size={20} /> Generate AI Clinical Report</>
            )}
          </button>
        </section>

        <section className="preview-section">
          <h2>Clinical Report Preview</h2>
          {generatedReport ? (
            <div className="report-card">
              <div className="report-content">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{generatedReport}</pre>
              </div>
              <div className="report-actions">
                <button className="copy-btn" onClick={() => {
                  navigator.clipboard.writeText(generatedReport).then(() => alert('Copied to clipboard!')).catch(err => alert('Failed to copy: ' + err));
                }}>
                  <Clipboard size={18} /> Copy to Clipboard
                </button>
                <button className="download-btn" onClick={downloadReport}>
                  <Download size={18} /> Save as .txt
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-preview">
              <p>Complete the form and clinical assessment, then click "Generate" to create your AI-assisted report.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default NoteGenerator;
