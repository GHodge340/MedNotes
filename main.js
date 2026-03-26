import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let llama = null;
let model = null;
let context = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In production, the model is in the 'models' folder relative to resourcesPath
  // In development, it's in '../../models' relative to this file
  const modelPath = app.isPackaged
    ? path.join(process.resourcesPath, 'models', 'qwen2.5-1.5b-instruct-q4_k_m.gguf')
    : path.resolve(__dirname, '..', 'models', 'qwen2.5-1.5b-instruct-q4_k_m.gguf');

  console.log("Loading model from:", modelPath);

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

async function initLlama() {
  try {
    const modelPath = app.isPackaged
      ? path.join(process.resourcesPath, 'models', 'qwen2.5-1.5b-instruct-q4_k_m.gguf')
      : path.resolve(__dirname, '..', 'models', 'qwen2.5-1.5b-instruct-q4_k_m.gguf');

    llama = await getLlama();
    model = await llama.loadModel({ modelPath });
    context = await model.createContext();
    console.log("Local SLM initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Local SLM:", error);
  }
}

ipcMain.handle('generate-note', async (event, formData) => {
  if (!model) {
    await initLlama();
  }

  const { patientName, age, sex, dateOfService, diagnosis, mseSummary, rosSummary, planSummary, providerNotes } = formData;

  event.sender.send('generation-progress', 'Loading model context...');
  
  const prompt = `Task: Convert MedNotes form data into a SOAP note.
Data Input:
- Patient: ${patientName}, ${age}, ${sex}
- Date: ${dateOfService}
- Diagnosis: ${diagnosis}
- Symptoms: ${rosSummary}
- MSE: ${mseSummary}
- Plan: ${planSummary}
- Provider Notes: ${providerNotes}

Note Layout:
1. Subjective: Summarize symptoms and medication status.
2. Objective: Summarize Mental Status Exam.
3. Assessment: Summarize Provider Assessment.
4. Plan: Summarize next steps, safety, and follow-up.

Constraint: You must end the note with the MedNotes AI Disclaimer: "Portions of this note have been compiled using an AI-assisted documentation tool. The entirety of this record has been personally reviewed, edited, and verified by the undersigned for accuracy and clinical integrity. The final content reflects the provider’s independent medical judgment."
Do not add conversational filler. Be brief and professional.`;

  try {
    event.sender.send('generation-progress', 'Analyzing clinical data...');
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });
    
    event.sender.send('generation-progress', 'Generating SOAP report (this may take a moment)...');
    const response = await session.prompt(prompt);
    
    event.sender.send('generation-progress', 'Report complete.');
    return response;
  } catch (error) {
    console.error("Inference Error:", error);
    return "Error during local note generation: " + error.message;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
