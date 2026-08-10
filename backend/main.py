import os
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from pydantic import BaseModel
from typing import List, Optional
import models
from datetime import datetime
from auth import get_current_user
from graph import fetch_organization_members, fetch_user_calendar, find_meeting_times

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="istem-internal API")

app.add_middleware(SessionMiddleware, secret_key="super-secret-key-for-session", max_age=86400, same_site="lax")

oauth = OAuth()
oauth.register(
    name='microsoft',
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET"),
    server_metadata_url=f"https://login.microsoftonline.com/{os.getenv('TENANT_ID')}/v2.0/.well-known/openid-configuration",
    client_kwargs={'scope': 'openid email profile offline_access User.Read Calendars.ReadWrite'}
)

# Setup CORS to allow the Next.js frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class AttendeeCreate(BaseModel):
    email: str
    is_vip: bool
    task_description: Optional[str] = None

class MeetingCreate(BaseModel):
    title: str
    agenda: Optional[str] = None
    date: str
    preferred_time: str
    duration: str
    priority: str
    lunch_protection: bool
    attendees: List[AttendeeCreate]

class StatusUpdate(BaseModel):
    status: str

@app.get("/")
def read_root():
    return {"message": "Welcome to istem-internal API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/auth/login")
async def login(request: Request):
    redirect_uri = "http://localhost:3000/api/auth/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)

@app.get("/api/auth/callback")
async def auth_callback(request: Request):
    token = await oauth.microsoft.authorize_access_token(request)
    user = token.get("userinfo")
    if user:
        import uuid
        from auth import server_sessions
        session_id = str(uuid.uuid4())
        server_sessions[session_id] = {
            "user": dict(user),
            "token": token.get("access_token")
        }
        request.session["session_id"] = session_id
    return RedirectResponse(url="http://localhost:3000")

@app.get("/api/auth/logout")
async def logout(request: Request):
    from auth import server_sessions
    session_id = request.session.get("session_id")
    if session_id and session_id in server_sessions:
        del server_sessions[session_id]
    request.session.pop("session_id", None)
    return RedirectResponse(url="http://localhost:3000")

@app.get("/api/me")
def get_me(user: dict = Depends(get_current_user)):
    return user["user"]

@app.post("/api/schedule")
def schedule_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    # Combine date and time for simplicity in this MVP
    try:
        start_datetime = datetime.strptime(f"{meeting.date} {meeting.preferred_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        start_datetime = datetime.now() # Fallback

    # 1. Create the Meeting Event in SQLite
    db_meeting = models.MeetingEvent(
        title=meeting.title,
        start_time=start_datetime,
        location="Microsoft Teams (Auto)",
        status="Pending Graph API Sync",
        organizer_email=meeting.attendees[0].email if meeting.attendees else "unknown" # Fallback
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)

    # 2. Create the Attendees and Tasks
    for attendee in meeting.attendees:
        if attendee.email:
            db_attendee = models.AttendeeTask(
                meeting_id=db_meeting.id,
                email=attendee.email,
                is_vip=attendee.is_vip,
                task_description=attendee.task_description
            )
            db.add(db_attendee)
    
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully created meeting '{meeting.title}' and saved to SQLite.",
        "meeting_id": db_meeting.id
    }

@app.get("/api/meetings")
def get_meetings(email: Optional[str] = None, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_email = user["username"]
    query = db.query(models.MeetingEvent)
    
    if email:
        # Find meetings where user is an attendee
        attendee_records = db.query(models.AttendeeTask.meeting_id).filter(models.AttendeeTask.email == email).all()
        meeting_ids_as_attendee = [r[0] for r in attendee_records]
        
        # Filter: Either organizer OR in attendee list
        query = query.filter(
            (models.MeetingEvent.organizer_email == email) |
            (models.MeetingEvent.id.in_(meeting_ids_as_attendee))
        )
        
    meetings = query.order_by(models.MeetingEvent.start_time.asc()).all()
    
    result = []
    for m in meetings:
        is_organizer = (m.organizer_email == user_email)
        vip_task = db.query(models.AttendeeTask).filter(
            models.AttendeeTask.meeting_id == m.id,
            models.AttendeeTask.email == user_email,
            models.AttendeeTask.is_vip == True
        ).first()
        is_vip = vip_task is not None
        
        result.append({
            "id": m.id,
            "title": m.title,
            "start_time": m.start_time.isoformat() + "Z" if m.start_time else None,
            "end_time": m.end_time.isoformat() + "Z" if m.end_time else None,
            "location": m.location,
            "status": m.status,
            "organizer_email": m.organizer_email,
            "is_organizer": is_organizer,
            "is_vip": is_vip
        })
        
    return result

@app.get("/api/sync-calendar")
def sync_calendar(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Sync-on-Read: Checks Microsoft Graph for any meetings that were cancelled or declined directly in Teams/Outlook,
    and updates our SQLite DB accordingly. (Mock implementation for local dev)
    """
    token = user["token"]
    user_email = user["username"]
    
    # In a real app, we would query the Graph API for the user's events and compare IDs/Subjects.
    # For this MVP, we will simulate the sync logic.
    # If there's an event in our DB that is 'Scheduled' but no longer exists or was declined in Graph, we mark it 'Cancelled via Teams'.
    
    # Example logic:
    # graph_events = fetch_user_calendar(token)
    # for m in db.query(models.MeetingEvent).filter(models.MeetingEvent.status == "Scheduled").all():
    #     if not any(g.subject == m.title for g in graph_events):
    #         m.status = "Cancelled via Teams"
    
    db.commit()
    return {"status": "success", "message": "Calendar synced with Microsoft Graph"}

@app.get("/api/pending-approvals")
def get_pending_approvals(email: str, db: Session = Depends(get_db)):
    # Find meetings where this user is an attendee and is_vip=True, and meeting status is Pending VIP Approval
    pending_tasks = db.query(models.AttendeeTask).filter(
        models.AttendeeTask.email == email,
        models.AttendeeTask.is_vip == True
    ).all()
    
    pending_meeting_ids = [t.meeting_id for t in pending_tasks]
    
    if not pending_meeting_ids:
        return []
        
    meetings = db.query(models.MeetingEvent).filter(
        models.MeetingEvent.id.in_(pending_meeting_ids),
        models.MeetingEvent.status == "Pending VIP Approval"
    ).all()
    
    return meetings

@app.get("/api/tasks")
def get_tasks(email: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.AttendeeTask)
    if email:
        query = query.filter(models.AttendeeTask.email == email)
    tasks = query.all()
    
    result = []
    for t in tasks:
        meeting_title = "Manual Task"
        if t.meeting_id and t.meeting_id > 0:
            meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == t.meeting_id).first()
            meeting_title = meeting.title if meeting else "Unknown Meeting"
        
        status = t.status.lower()
        if status not in ["todo", "in-progress", "done"]:
            status = "todo"
            
        result.append({
            "id": t.id,
            "title": t.task_description or "Attend meeting",
            "status": status,
            "priority": "high" if t.is_vip else "normal",
            "meeting": meeting_title,
            "email": t.email
        })
    return result

class TaskCreate(BaseModel):
    title: str
    status: str = "todo"
    priority: str = "normal"
    email: str

@app.post("/api/tasks")
def create_manual_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = models.AttendeeTask(
        task_description=task.title,
        status=task.status,
        is_vip=task.priority == "high",
        email=task.email,
        meeting_id=0
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return {"status": "success", "task_id": db_task.id}

@app.put("/api/tasks/{task_id}/status")
def update_task_status(task_id: int, status_update: StatusUpdate, db: Session = Depends(get_db)):
    task = db.query(models.AttendeeTask).filter(models.AttendeeTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = status_update.status
    db.commit()
    return {"status": "success", "new_status": task.status}

class RescheduleRequest(BaseModel):
    new_start: str
    new_end: str
    reason: str

@app.post("/api/meetings/{id}/reschedule")
def reschedule_meeting(id: int, request: RescheduleRequest, db: Session = Depends(get_db)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting.start_time = datetime.fromisoformat(request.new_start.replace('Z', '+00:00'))
    meeting.end_time = datetime.fromisoformat(request.new_end.replace('Z', '+00:00'))
    meeting.status = f"Rescheduled: {request.reason}"
    db.commit()
    return {"status": "success", "message": "Meeting rescheduled"}

class CancelRequest(BaseModel):
    reason: Optional[str] = None

@app.post("/api/meetings/{id}/cancel")
def cancel_meeting(id: int, request: CancelRequest = None, db: Session = Depends(get_db)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    reason_str = request.reason if request and request.reason else "Declined by VIP"
    meeting.status = f"Cancelled: {reason_str}"
    db.commit()
    return {"status": "success", "message": "Meeting cancelled", "reason": reason_str}


class ReminderCreate(BaseModel):
    minutes_before: int
    email: str

@app.post("/api/meetings/{id}/reminders")
def create_reminder(id: int, reminder: ReminderCreate, db: Session = Depends(get_db)):
    db_reminder = models.MeetingReminder(
        meeting_id=id,
        email=reminder.email,
        minutes_before=reminder.minutes_before
    )
    db.add(db_reminder)
    db.commit()
    return {"status": "success", "reminder_id": db_reminder.id}

@app.get("/api/meetings/{id}/reminders")
def get_reminders(id: int, email: str, db: Session = Depends(get_db)):
    reminders = db.query(models.MeetingReminder).filter(
        models.MeetingReminder.meeting_id == id,
        models.MeetingReminder.email == email
    ).all()
    return reminders

class NoteCreate(BaseModel):
    content: str
    email: str
    is_private: bool

@app.post("/api/meetings/{id}/notes")
def create_note(id: int, note: NoteCreate, db: Session = Depends(get_db)):
    db_note = models.MeetingNote(
        meeting_id=id,
        email=note.email,
        is_private=note.is_private,
        content=note.content
    )
    db.add(db_note)
    db.commit()
    return {"status": "success", "note_id": db_note.id}

@app.get("/api/meetings/{id}/notes")
def get_notes(id: int, email: str, db: Session = Depends(get_db)):
    notes = db.query(models.MeetingNote).filter(
        models.MeetingNote.meeting_id == id
    ).all()
    # Filter out private notes not belonging to this user
    visible_notes = [n for n in notes if not n.is_private or n.email == email]
    return visible_notes

@app.get("/api/meetings/{id}/attendees")
def get_meeting_attendees(id: int, db: Session = Depends(get_db)):
    attendees = db.query(models.AttendeeTask).filter(models.AttendeeTask.meeting_id == id).all()
    return attendees

@app.get("/api/my-reminders")
def get_my_reminders(email: str, db: Session = Depends(get_db)):
    reminders = db.query(models.MeetingReminder).filter(models.MeetingReminder.email == email).all()
    result = []
    for r in reminders:
        meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == r.meeting_id).first()
        if meeting and "Cancelled" not in meeting.status:
            result.append({
                "id": r.id,
                "meeting_id": meeting.id,
                "meeting_title": meeting.title,
                "start_time": meeting.start_time.isoformat() + "Z" if meeting.start_time else None,
                "minutes_before": r.minutes_before
            })
    return result

@app.get("/api/org-members")
def get_organization_members(user: dict = Depends(get_current_user)):
    """Fetches all users in the organization using Microsoft Graph API (App-Only Token)"""
    users = fetch_organization_members()
    return users

@app.get("/api/my-calendar")
def get_my_calendar(user: dict = Depends(get_current_user)):
    """Fetches calendar events for the currently logged-in user (Delegated Token)"""
    token = user["token"]
    events = fetch_user_calendar(token)
    return events

from pydantic import BaseModel

class AttendeePayload(BaseModel):
    email: str
    is_vip: bool
    prep_task: str = ""

class FindMeetingTimesRequest(BaseModel):
    attendees: List[AttendeePayload]
    duration: str = "PT1H"
    protect_lunch: bool = False
    date: str
    time: str = ""
    mode: str = "nearest"

@app.post("/api/find-meeting-times")
def api_find_meeting_times(request: FindMeetingTimesRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    token = user["token"]
    attendees_list = [{"email": a.email, "is_vip": a.is_vip} for a in request.attendees]
    
    # Fetch pending meetings for the soft-conflict engine
    pending_db_events = db.query(models.MeetingEvent).filter(
        models.MeetingEvent.status == "Pending VIP Approval"
    ).all()
    
    pending_meetings_data = [
        {
            "title": m.title,
            "start": m.start_time.isoformat() + "Z",
            "end": m.end_time.isoformat() + "Z"
        }
        for m in pending_db_events
    ]

    try:
        from graph import calculate_custom_meeting_times
        return calculate_custom_meeting_times(
            token, attendees_list, request.duration, request.protect_lunch, 
            request.date, request.time, request.mode, pending_meetings_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ScheduleMeetingRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    attendees: List[AttendeePayload]

@app.post("/api/schedule-meeting")
def api_schedule_meeting(request: ScheduleMeetingRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    from graph import create_meeting_event
    token = user["token"]
    
    start_dt = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
    
    # IDEMPOTENCY CHECK: Prevent duplicate rapid-fire submissions
    recent_meeting = db.query(models.MeetingEvent).filter(
        models.MeetingEvent.title == request.title,
        models.MeetingEvent.organizer_email == user["username"],
        models.MeetingEvent.start_time == start_dt
    ).first()
    
    if recent_meeting:
        return {"status": "success", "meeting_id": recent_meeting.id, "state": recent_meeting.status, "teams_link": None, "message": "Duplicate request ignored."}
    
    # EXTERNAL CHECK
    company_domain = user["username"].split('@')[1] if '@' in user["username"] else "istem.com"
    is_external = any(company_domain.lower() not in a.email.lower() for a in request.attendees)
    
    # Check if VIP is present
    has_vip = any(a.is_vip for a in request.attendees)
    
    # VIPs pend ONLY if it's strictly internal
    status = "Scheduled" if is_external else ("Pending VIP Approval" if has_vip else "Scheduled")
    
    # Create Meeting in DB
    meeting = models.MeetingEvent(
        title=request.title,
        start_time=start_dt,
        end_time=datetime.fromisoformat(request.end_time.replace('Z', '+00:00')),
        location="Microsoft Teams",
        status=status,
        organizer_email=user["username"]
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    # Create Attendee Tasks in DB
    for a in request.attendees:
        task = models.AttendeeTask(
            meeting_id=meeting.id,
            email=a.email,
            is_vip=a.is_vip,
            task_description=a.prep_task
        )
        db.add(task)
    db.commit()
    
    # If no VIP or if External, automatically schedule it in Graph API (which is mocked if no O365)
    teams_link = None
    if status == "Scheduled":
        attendees_list = [{"email": a.email} for a in request.attendees]
        prep_tasks = [{"email": a.email, "task": a.prep_task} for a in request.attendees]
        graph_event = create_meeting_event(token, request.title, request.start_time, request.end_time, attendees_list, 15, prep_tasks)
        if graph_event and "onlineMeeting" in graph_event:
            teams_link = graph_event["onlineMeeting"].get("joinUrl")
            
    return {"status": "success", "meeting_id": meeting.id, "state": status, "teams_link": teams_link}

class ApproveMeetingRequest(BaseModel):
    meeting_id: int

@app.post("/api/approve-meeting")
def api_approve_meeting(request: ApproveMeetingRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    from graph import create_meeting_event
    token = user["token"]
    
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == request.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    attendees = db.query(models.AttendeeTask).filter(models.AttendeeTask.meeting_id == meeting.id).all()
    attendees_list = [{"email": a.email} for a in attendees]
    prep_tasks = [{"email": a.email, "task": a.task_description} for a in attendees]
    
    # Actually create the event in Graph API now that VIP approved
    graph_event = create_meeting_event(token, meeting.title, meeting.start_time.isoformat() + "Z", meeting.end_time.isoformat() + "Z", attendees_list, 15, prep_tasks)
    
    meeting.status = "Scheduled"
    db.commit()
    
    teams_link = None
    if graph_event and "onlineMeeting" in graph_event:
        teams_link = graph_event["onlineMeeting"].get("joinUrl")
        
    return {"status": "success", "state": "Scheduled", "teams_link": teams_link}

