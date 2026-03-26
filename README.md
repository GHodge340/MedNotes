# MedNotes: The Medical Provider AI Assistant

MedNotes is a specialized React-based clinical documentation and patient management tool designed for psychiatric providers. It leverages the power of Google's **Gemini AI** to transform raw visit observations into professional, structured clinical reports.

## 🚀 Key Features

### 1. AI-Powered Medical Note Generator
- **Gemini AI Integration:** Uses the `gemini-2.0-flash-lite` model to generate Subjective and Assessment/Plan narratives from raw provider notes.
- **Mental Status Examination (MSE):** Comprehensive checkbox system based on standardized clinical criteria.
- **Review of Symptoms:** Cluster-based symptom tracking (Depressive, Manic, Psychotic, Anxiety, etc.).
- **Enhanced Substance Use Tracking:** Category-based substance tracking with specific quantity and frequency inputs.

### 2. Interactive Patient Visit Scheduler
- **CSV-Based Template:** Initialized with patient data from `patienttracker.csv`.
- **Automated Calculations:** Real-time tracking of "Days Since Last Visit" and estimated "Next Visit" dates.
- **Local Persistence:** Changes are saved automatically to the browser's local storage.
- **Patient Management:** Add new patients via an integrated form or clear the entire list to reset to the template.

### 3. Professional Workflow & Export
- **Clipboard Utility:** Single-click "Copy to Clipboard" for seamless EMR integration.
- **Local Export:** Save complete reports as `.txt` files for local records.
- **Modern UI:** Responsive, clean "Medical/Modern" theme using Lucide-React icons and Inter typography.

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, React Router 6.
- **AI:** Google Generative AI SDK (Gemini API).
- **Icons:** Lucide-React.
- **Styling:** Modular Vanilla CSS.

## 📋 Setup & Deployment

### Prerequisites
- Node.js installed.
- A Google Gemini API Key.

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root and add your API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

### Running Locally
```bash
npm run dev
```

### Deployment
- **GitHub:** Initialized with git for version control.
- **Vercel:** Optimized for one-click deployment via GitHub integration.

## 📖 Future Roadmap
- **Google Sheets Integration:** Enable live synchronization with Google Sheets via the Sheets API.
- **PDF Export:** Support for direct PDF generation with clinic branding.
- **Multi-Provider Support:** Role-based access and shared patient databases.

---
*Disclaimer: This tool is intended to assist medical providers. All AI-generated content should be reviewed and verified by a licensed professional before finalization.*
