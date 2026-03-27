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
  const [location, setLocation] = useState('');
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
  const [additionalNotes, setAdditionalNotes] = useState('');

  // New States
  const [reportedMood, setReportedMood] = useState({
    mood: '',
    endorse: '',
    denies: '',
    energy: '',
    sleep: '',
    appetite: ''
  });
  const [compliance, setCompliance] = useState('');
  const [safety, setSafety] = useState({
    sideEffect: '',
    suicide: '',
    homicide: '',
    stressors: ''
  });
  
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
      return selections.length > 0 ? `${cat.label}: ${selections.join(', ')}` : null;
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

    const moodSummary = Object.entries(reportedMood)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      .join(', ');

    const safetySummary = Object.entries(safety)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      .join(', ');

    // Use Local SLM if running in Electron, otherwise fallback to Gemini
    if (window.electronAPI) {
      try {
        setGenerationStatus('Initializing local engine...');
        const result = await window.electronAPI.generateNote({
          patientName, age, sex, dateOfService, diagnosis,
          mseSummary, rosSummary, planSummary,
          reportedMood: moodSummary,
          compliance,
          safety: safetySummary,
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
      You are a professional medical assistant. Based on the form data provided, generate a medical clinical note in the EXACT format specified below.

      DATA PROVIDED:
      Patient Name/ID: ${patientName}
      Age: ${age}
      Sex: ${sex}
      Date: ${dateOfService}
      Location: ${location}
      Diagnosis: ${diagnosis}

      Subjective Data:
      - Mood: ${reportedMood.mood}
      - Endorse: ${reportedMood.endorse}
      - Denies: ${reportedMood.denies}
      - Energy: ${reportedMood.energy}
      - Sleep: ${reportedMood.sleep}
      - Appetite: ${reportedMood.appetite}
      - Compliance: ${compliance}
      - Side Effects: ${safety.sideEffect}
      - Suicide Screening: ${safety.suicide}
      - Homicide Screening: ${safety.homicide}
      - Stressors: ${safety.stressors}
      
      Review of Symptoms (ROS):
      ${rosSummary}

      Mental Status Exam (MSE):
      ${mseSummary}
      
      Assessment (Provider Notes):
      ${providerNotes}
      
      Plan Selections:
      ${planSummary}

      Additional Notes:
      ${additionalNotes}
      
      REQUIRED OUTPUT FORMAT (Follow this exactly, do not add extra preamble or conversational filler):

      **SUBJECTIVE**
      Patient, ${patientName} is a ${age} year old ${sex} seen at ${location} on ${dateOfService} for follow-up of ${diagnosis} care. ${patientName} reports mood as ${reportedMood.mood}. ${patientName} also endorses ${reportedMood.endorse} and denies ${reportedMood.denies}. Sleep is ${reportedMood.sleep} and appetite is ${reportedMood.appetite}. ${patientName} reports ${compliance} to medication with ${safety.sideEffect} of side effects. ${patientName} [states they 'deny' or 'endorse' based on Suicide Screening data] suicidal ideations and [states they 'deny' or 'endorse' based on Homicide Screening data] homicidal ideations. ${patientName} identifies stressors including ${safety.stressors}.

      **MENTAL STATUS EXAM**
      [List the MSE categories and their selected findings in this format: "Category Title: Selected Finding, Selected Finding 1"]

      **REVIEW OF SYMPTOMS**
      [List the ROS categories. For each category that has selections, list the findings. Use clear clinical language.]

      **ASSESSMENT**
      ${providerNotes}

      **PLAN**
      [Generate a suggested clinical plan based on the 'Plan Selections' and incorporate any specific directives from 'Additional Notes' ("${additionalNotes}"). Ensure it reads as a coherent clinical plan.]

      Note Disclaimer: Portions of this note have been compiled using an AI-assisted documentation tool. The entirety of this record has been personally reviewed, edited, and verified by the undersigned for accuracy and clinical integrity. The final content reflects the provider’s independent medical judgment.
    `;

    try {
      
      //Groq API call
      const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    });
      const text = result.choices[0].message.content;
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
                <label>Other:</label>
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
            <h2>Subjective</h2>
            
            <div className="subsection">
              <h3>Patient Details</h3>
              <div className="input-row-narrow">
                <div className="input-group">
                  <label>ID#</label>
                  <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Name" />
                </div>
                <div className="input-group">
                  <label>Date</label>
                  <input type="date" value={dateOfService} onChange={(e) => setDateOfService(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
                </div>
                <div className="input-group">
                  <label>Age</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />
                </div>
              </div>
              <div className="input-row-narrow">
                <div className="input-group">
                  <label>Sex</label>
                  <div className="radio-group-horizontal">
                    <label><input type="radio" name="sex" value="male" checked={sex === 'male'} onChange={(e) => setSex(e.target.value)} /> M</label>
                    <label><input type="radio" name="sex" value="female" checked={sex === 'female'} onChange={(e) => setSex(e.target.value)} /> F</label>
                  </div>
                </div>
                <div className="input-group span-3">
                  <label>Diagnosis</label>
                  <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="ICD-10 Code / Description" />
                </div>
              </div>
            </div>

            <div className="subsection">
              <h3>Reported Mood</h3>
              <div className="input-row-narrow">
                <div className="input-group">
                  <label>Mood</label>
                  <input type="text" value={reportedMood.mood} onChange={(e) => setReportedMood({...reportedMood, mood: e.target.value})} placeholder="Patient's mood..." />
                </div>
                <div className="input-group">
                  <label>Endorse</label>
                  <input type="text" value={reportedMood.endorse} onChange={(e) => setReportedMood({...reportedMood, endorse: e.target.value})} placeholder="e.g. Anxiety" />
                </div>
                <div className="input-group">
                  <label>Denies</label>
                  <input type="text" value={reportedMood.denies} onChange={(e) => setReportedMood({...reportedMood, denies: e.target.value})} placeholder="e.g. Depression" />
                </div>
                <div className="input-group">
                  <label>Energy</label>
                  <input type="text" value={reportedMood.energy} onChange={(e) => setReportedMood({...reportedMood, energy: e.target.value})} placeholder="e.g. Good" />
                </div>
              </div>
              <div className="input-row-narrow">
                <div className="input-group">
                  <label>Sleep</label>
                  <input type="text" value={reportedMood.sleep} onChange={(e) => setReportedMood({...reportedMood, sleep: e.target.value})} placeholder="e.g. 6-7 hrs" />
                </div>
                <div className="input-group">
                  <label>Appetite</label>
                  <input type="text" value={reportedMood.appetite} onChange={(e) => setReportedMood({...reportedMood, appetite: e.target.value})} placeholder="e.g. Normal" />
                </div>
              </div>
            </div>

            <div className="subsection">
              <h3>Compliance & Safety</h3>
              <div className="compliance-section">
                <label className="sub-label">Medication Compliance</label>
                <div className="radio-group-horizontal">
                  <label><input type="radio" name="compliance" value="Compliance" checked={compliance === 'Compliance'} onChange={(e) => setCompliance(e.target.value)} /> Compliance</label>
                  <label><input type="radio" name="compliance" value="Non-Compliance" checked={compliance === 'Non-Compliance'} onChange={(e) => setCompliance(e.target.value)} /> Non-Compliance</label>
                  <label><input type="radio" name="compliance" value="Partial Compliance" checked={compliance === 'Partial Compliance'} onChange={(e) => setCompliance(e.target.value)} /> Partial Compliance</label>
                </div>
              </div>
              
              <div className="safety-grid">
                <div className="safety-item">
                  <label>Side Effects</label>
                  <div className="radio-group-horizontal">
                    <label><input type="radio" name="sideEffect" value="Not Present" checked={safety.sideEffect === 'Not Present'} onChange={(e) => setSafety({...safety, sideEffect: e.target.value})} /> Not Present</label>
                    <label><input type="radio" name="sideEffect" value="Present" checked={safety.sideEffect === 'Present'} onChange={(e) => setSafety({...safety, sideEffect: e.target.value})} /> Present</label>
                  </div>
                </div>
                <div className="safety-item">
                  <label>Suicide</label>
                  <div className="radio-group-horizontal">
                    <label><input type="radio" name="suicide" value="Deny" checked={safety.suicide === 'Deny'} onChange={(e) => setSafety({...safety, suicide: e.target.value})} /> Deny</label>
                    <label><input type="radio" name="suicide" value="Endorse" checked={safety.suicide === 'Endorse'} onChange={(e) => setSafety({...safety, suicide: e.target.value})} /> Endorse</label>
                  </div>
                </div>
                <div className="safety-item">
                  <label>Homicide</label>
                  <div className="radio-group-horizontal">
                    <label><input type="radio" name="homicide" value="Deny" checked={safety.homicide === 'Deny'} onChange={(e) => setSafety({...safety, homicide: e.target.value})} /> Deny</label>
                    <label><input type="radio" name="homicide" value="Endorse" checked={safety.homicide === 'Endorse'} onChange={(e) => setSafety({...safety, homicide: e.target.value})} /> Endorse</label>
                  </div>
                </div>
              </div>
              <div className="input-group" style={{marginTop: '1.5rem'}}>
                <label>Stressors</label>
                <input type="text" value={safety.stressors} onChange={(e) => setSafety({...safety, stressors: e.target.value})} placeholder="e.g. Financial, family, etc." />
              </div>
            </div>
          </div>

          {renderCheckboxGroup(medData.mseCategories, mseSelections, setMseSelections, "Mental Status Exam")}
          {renderCheckboxGroup(medData.rosCategories, rosSelections, setRosSelections, "Review of Symptoms")}
          
          <div className="form-card">
            <h2>Assessment</h2>
            <p className="hint">Describe the visit and assessment in raw detail. MedNotes AI will use this to generate professional clinical narratives.</p>
            <textarea 
              className="notes-area large"
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              placeholder="e.g., Patient reports feeling 'ok' today. Assessment of progress..."
            />
          </div>

          {renderCheckboxGroup(medData.planCategories, planSelections, setPlanSelections, "Plan")}

          <div className="form-card">
            <h2>Additional Notes</h2>
            <p className="hint">Include any additional clinical information or specific requests for the generated note.</p>
            <textarea 
              className="notes-area large"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Any other relevant details..."
            />
          </div>

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
