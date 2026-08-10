# I-STEM Internal Hub

This is the standalone web application for the I-STEM organization, replacing the legacy Power Apps infrastructure. 

It is built with a modern stack designed for performance, customizability, and beautiful UX.

## 🛠️ Technology Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: SQLite (via SQLAlchemy)

## 🎨 Design Philosophy
- **Strict Color Palette**: We enforce a very clean, enterprise-grade 3-color palette:
  - **Primary**: Indigo (`indigo-500` through `indigo-700`)
  - **Neutral**: Slate (`slate-50` through `slate-900`)
  - **Base**: White (`bg-white`)
- **Responsive**: Fully responsive design for Desktop and Mobile viewing.

## 🚀 How to Run the Application

### 1. Start the Backend (FastAPI)
Open a terminal in the root directory and run:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```
The backend API will be available at `http://127.0.0.1:8000`.

### 2. Start the Frontend (Next.js)
Open a second terminal in the root directory and run:
```powershell
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## 📂 Project Structure
- `/frontend`: Contains the Next.js UI.
  - `src/app/page.tsx`: The Dashboard (Calendar & Kanban Board).
  - `src/app/schedule/page.tsx`: The Meeting creation form.
  - `src/app/team/page.tsx`: Role management.
- `/backend`: Contains the FastAPI server.
  - `main.py`: All API routing logic.
  - `models.py`: Database schema definitions.
  - `database.py`: SQLite connection logic.
  - `istem.db`: The local SQLite database file.

## 🔗 API Endpoints
- `POST /api/schedule`: Creates a new meeting and associated preparation tasks.
- `GET /api/meetings`: Fetches all upcoming meetings.
- `GET /api/tasks`: Fetches all assigned prep tasks.
- `PUT /api/tasks/{task_id}/status`: Updates the status (`todo`, `in-progress`, `done`) of a specific task.
