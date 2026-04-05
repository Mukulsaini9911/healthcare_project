# 🚀 HOW TO RUN THE COMPLETE HEALTHCARE DASHBOARD PROJECT

---

## QUICK START (2 Minutes)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the application
python app.py

# 3. Open browser
# Go to: http://127.0.0.1:5000
```

✅ Done! Dashboard is live with 167 hospitals.

---

## DETAILED SETUP GUIDE

### STEP 1: VERIFY PREREQUISITES

**Check Python version** (Need 3.10+):
```powershell
python --version
```

Expected output: `Python 3.12.x` (or 3.10, 3.11)

**Check if pip is installed:**
```powershell
pip --version
```

Expected output: `pip 24.x.x from ...`

---

### STEP 2: INSTALL ALL DEPENDENCIES

**Option A: Using requirements.txt (Recommended)**

```powershell
# Navigate to project folder
cd d:\healthcare_project

# Install all packages at once
pip install -r requirements.txt
```

**Option B: Manual installation (if above fails)**

```powershell
pip install flask==2.3.0
pip install pandas==2.0.0
pip install numpy==1.24.0
pip install scikit-learn==1.2.0
pip install matplotlib==3.7.0
pip install openpyxl==3.10.0
pip install folium==0.14.0
pip install reportlab==4.0.4
pip install Pillow==9.5.0
```

**Verify all installed:**
```powershell
python -c "import flask; import pandas; import numpy; import sklearn; import folium; import reportlab; print('✓ All dependencies installed')"
```

---

### STEP 3: RUN THE FLASK SERVER

**Start the application:**

```powershell
python app.py
```

**Expected output:**
```
 * Serving Flask app 'app'
 * Debug mode: off
 WARNING in app.run(), running the built-in development server is not suitable for production.
 * Running on http://127.0.0.1:5000
```

**Leave this terminal running!** Don't close it.

---

### STEP 4: OPEN THE DASHBOARD

**Option A: Automatic (if browser doesn't open)**

1. Open your web browser
2. Go to: **http://127.0.0.1:5000**

**You should see:**
- ✓ Healthcare Analytics Dashboard title
- ✓ 12 interactive tabs
- ✓ Summary cards showing risk distribution
- ✓ Interactive map with 167 hospital pins
- ✓ Charts and visualizations

---

## COMMON ISSUES & FIXES

### ❌ Port 5000 Already in Use

**Symptom:** `Address already in use`

**Solution 1: Kill existing process**
```powershell
# Find and stop process using port 5000
netstat -ano | findstr :5000
# Kill it (replace 12345 with your PID)
taskkill /PID 12345 /F

# Then run again
python app.py
```

**Solution 2: Use different port**
```powershell
# Edit app.py last line, change to:
app.run(debug=False, port=5001)

# Then access at: http://127.0.0.1:5001
```

---

### ❌ "No module named 'flask'"

**Symptom:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```powershell
# Make sure you're in the right directory
cd d:\healthcare_project

# Install dependencies again
pip install -r requirements.txt

# Or install Flask directly
pip install flask==2.3.0
```

---

### ❌ CSV File Not Found

**Symptom:** `FileNotFoundError: data.csv`

**Solution:**
```powershell
# Verify data.csv exists in project folder
dir d:\healthcare_project\data.csv

# If missing, it should be there. Check file location in app.py
```

---

### ❌ Charts/Features Not Loading

**Symptom:** Dashboard shows but no data in charts

**Solution:**
```powershell
# Check browser console for errors (F12 → Console)

# Verify API is working
curl http://127.0.0.1:5000/api/summary

# Expected response: JSON data with hospitals count
```

---

## COMPLETE PROJECT STRUCTURE

```
d:\healthcare_project\
├── app.py                          ← Main Flask server (START HERE)
├── main.py                         ← Alternative entry point
├── data.csv                        ← 167 hospitals dataset
├── requirements.txt                ← All dependencies listed
│
├── templates/
│   └── index.html                  ← Main dashboard UI (12 tabs)
│
├── static/
│   ├── css/
│   │   └── style.css               ← Styling + dark mode
│   └── js/
│       └── script.js               ← All interactive features
│
└── Documentation/
    ├── HOW_TO_RUN.md               ← This file
    ├── PROJECT_PRESENTATION.md     ← Feature breakdown
    ├── JUDGES_REFERENCE.md         ← Judge Q&A
    ├── DEPLOYMENT_GUIDE.md         ← Production scaling
    ├── PROBLEM_SOLUTION.md         ← Problem statement
    ├── DATA_FLOW_UPDATES.md        ← Data architecture
    └── DAILY_UPDATE_PRODUCTION.md  ← Daily scheduling
```

---

## USING THE DASHBOARD

### Dashboard Tabs (All 12 Features)

After opening the browser, you'll see 12 tabs:

1. **Dashboard** - Summary of all hospitals (Critical/High/Medium/Low)
2. **Map** - Interactive map showing 167 hospital locations
3. **Compare** - Side-by-side comparison of 3 hospitals
4. **Alerts** - Critical hospitals needing immediate attention
5. **Hospitals** - List of all 167 hospitals with search/filter
6. **Analytics** - Detailed metrics and efficiency scores
7. **Predictions** - Patient load forecasts for next 3 days
8. **Models** - ML model performance (LR/RF/MLP accuracy)
9. **Clustering** - Hospital grouping analysis
10. **Chatbot** - Ask questions about hospitals
11. **Dark Mode** - Toggle button (top right)
12. **Export** - Download PDF reports

### Interactive Features

**Map Tab:**
- Click on hospital pins to see details
- Zoom in/out with mouse wheel
- Pan by dragging
- Color-coded: Red=Critical, Orange=High, Yellow=Medium

**Compare Tab:**
- Select 3 different hospitals
- Click "Compare"
- See side-by-side metrics

**Hospital Tab:**
- Search by hospital name
- Filter by risk level
- Click hospital name for detailed analysis

**Chatbot Tab:**
- Ask: "How many critical hospitals?"
- Ask: "Show me hospitals in Delhi"
- Ask: "What's the average patient-doctor ratio?"

**Export Tab:**
- Download as PDF (single or all hospitals)

---

## RUNNING OPTIONAL FEATURES

### A. Daily Automatic Updates (Production Only)

**For development (no automatic updates):**
Just run the regular Flask server as shown above. Data stays static.

**For production (automatic daily updates):**
Follow the guide in: [DAILY_UPDATE_PRODUCTION.md](DAILY_UPDATE_PRODUCTION.md)

```bash
# This sets up PostgreSQL + scheduled jobs
# Not needed for hackathon demo/demo
```

---

### B. Run with Debug Mode (Development)

```powershell
# Edit app.py, change last line to:
app.run(debug=True, port=5000)

# Then run:
python app.py

# Benefits:
# - Auto-reloads when you edit files
# - Better error messages
# - Debug console available
```

---

### C. Run from main.py (Alternative)

```powershell
python main.py
```

This is just another way to start the same application.

---

## USING MULTIPLE TERMINALS

**Terminal 1: Run Flask Server**
```powershell
cd d:\healthcare_project
python app.py
# Keep this open!
```

**Terminal 2 (Optional): Test APIs**
```powershell
# Test if server is working
curl http://127.0.0.1:5000/api/summary

# Should return JSON:
# {"total_hospitals": 167, "critical_risk": 7, ...}
```

**Terminal 3 (Optional): View Logs**
```powershell
# Tail Flask logs (if enabled)
# Just monitor console from Terminal 1
```

---

## PERFORMANCE TIPS

### For Large Hospitals Dataset (50,000+ hospitals)

**Switch to PostgreSQL** (instead of CSV):
Follow: [DAILY_UPDATE_PRODUCTION.md](DAILY_UPDATE_PRODUCTION.md) → "STEP 1: SET UP POSTGRESQL"

**Enable caching:**
```python
# In app.py, add at top:
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

# Cache API endpoints:
@app.route('/api/summary')
@cache.cached(timeout=300)  # Cache 5 minutes
def get_summary():
    ...
```

---

## TESTING THE APPLICATION

### Quick Tests

**Test 1: API connectivity**
```powershell
curl http://127.0.0.1:5000/api/summary
```
Expected: JSON with hospital counts ✓

**Test 2: Map generation**
```powershell
curl http://127.0.0.1:5000/api/map > map.html
# Then open map.html in browser - should show 167 pins
```

**Test 3: PDF export**
```powershell
curl http://127.0.0.1:5000/api/export/hospital/AIIMS%20Delhi > hospital.pdf
# Should download PDF with hospital details
```

**Test 4: Chatbot**
```powershell
curl -X POST http://127.0.0.1:5000/api/chatbot \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How many hospitals total?\"}"
# Expected: {"response": "There are 167 hospitals in the network."}
```

---

## DEVELOPMENT WORKFLOW

If you want to **modify the code**:

1. **Edit files** (e.g., static/js/script.js)
2. **Browser auto-reloads** (with debug mode)
3. **Or manually refresh** F5 key

**Most common edits:**
- `static/css/style.css` - Change colors/layout
- `static/js/script.js` - Change features/logic
- `app.py` - Add new API endpoints
- `data.csv` - Add/edit hospital data
- `templates/index.html` - Add new UI elements

Example: Add new hospital to data.csv
```csv
231,Delhi,"St. Mary's Hospital",500,120,1200
```

Then refresh dashboard - new hospital automatically appears!

---

## PRODUCTION DEPLOYMENT

### Deploy to Cloud (AWS/Azure/Heroku)

See: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

Quick summary:
```bash
# 1. Create requirements.txt (already exists)
# 2. Create Procfile for Heroku
# 3. Push to GitHub
# 4. Deploy to Heroku/AWS/Azure
# 5. Configure PostgreSQL in cloud
# 6. Set environment variables
```

---

## SHUTTING DOWN

**To stop the Flask server:**
```powershell
# In the terminal running Flask, press:
CTRL + C

# You should see:
# KeyboardInterrupt
# Server stopped ✓
```

**To restart:**
```powershell
python app.py
```

---

## COMPLETE COMMAND REFERENCE

```powershell
# Navigate to project
cd d:\healthcare_project

# Install dependencies (one time only)
pip install -r requirements.txt

# Run application
python app.py

# Run with debug mode
# (Edit app.py first, set debug=True)

# Test APIs
curl http://127.0.0.1:5000/api/summary

# View logs
# Check Terminal 1 console

# Stop server
# CTRL + C in the Flask terminal

# Check if port is in use
netstat -ano | findstr :5000

# Kill process on port 5000
taskkill /PID 12345 /F
```

---

## QUICK REFERENCE: FIRST TIME SETUP

**Time needed: 5 minutes**

1. **Install Python 3.12+**
   ```powershell
   python --version
   ```

2. **Navigate to project**
   ```powershell
   cd d:\healthcare_project
   ```

3. **Install packages**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Run server**
   ```powershell
   python app.py
   ```

5. **Open browser**
   ```
   http://127.0.0.1:5000
   ```

6. **Done!** ✅ Dashboard is live

---

## TELL JUDGES THIS

> "To run the project:
>
> 1. **Install dependencies** - `pip install -r requirements.txt`
> 2. **Run Flask server** - `python app.py`
> 3. **Open browser** - http://127.0.0.1:5000
> 4. **Explore all 12 features** with 167 real Indian hospitals
>
> Data loads from CSV, so it's instant. In production, we'd use PostgreSQL with daily automated updates.
>
> All features are fully functional - map, comparisons, predictions, chatbot, PDF exports, dark mode."

---

**You're ready to run! 🚀**

Start with: `python app.py`
