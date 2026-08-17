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
from auth import get_current_user, get_current_admin
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
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Ensure the base origin is allowed even if FRONTEND_URL has a subpath (like /sync)
from urllib.parse import urlparse
parsed_url = urlparse(frontend_url)
base_origin = f"{parsed_url.scheme}://{parsed_url.netloc}"

allowed_origins = [
    frontend_url, 
    base_origin,
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "https://istemstaging.iisc.ac.in"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
    project_id: Optional[int] = None
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
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect_uri = f"{frontend_url}/api/auth/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)

@app.get("/api/auth/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
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
        
        # User tracking
        email = user.get("preferred_username") or user.get("email") or user.get("name", "unknown")
        name = user.get("name")
        if email != "unknown":
            from datetime import datetime
            now_str = datetime.utcnow().isoformat() + "Z"
            db_user = db.query(models.User).filter(models.User.email == email).first()
            if db_user:
                db_user.last_login = now_str
                db_user.name = name
            else:
                new_user = models.User(
                    email=email,
                    name=name,
                    created_at=now_str,
                    last_login=now_str
                )
                db.add(new_user)
            db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=frontend_url)

@app.get("/api/auth/logout")
async def logout(request: Request):
    from auth import server_sessions
    session_id = request.session.get("session_id")
    if session_id and session_id in server_sessions:
        del server_sessions[session_id]
    request.session.pop("session_id", None)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=frontend_url)

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

    has_vip = any(a.is_vip for a in meeting.attendees)
    
    # 1. Create the Meeting Event in SQLite
    db_meeting = models.MeetingEvent(
        title=meeting.title,
        start_time=start_datetime,
        location="Microsoft Teams (Auto)",
        status="Pending VIP Approval" if has_vip else "Scheduled",
        organizer_email=meeting.attendees[0].email if meeting.attendees else "unknown", # Fallback
        is_project=False,
        project_id=meeting.project_id
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

class ProjectRoleCreate(BaseModel):
    email: str
    role: str

@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_email = user["username"]
    
    # User is either organizer or explicitly given a ProjectRole
    roles = db.query(models.ProjectRole).filter(models.ProjectRole.email == user_email).all()
    project_ids_from_roles = [r.project_id for r in roles]
    
    # Exclude pending invites from project list
    projects = db.query(models.MeetingEvent).filter(
        models.MeetingEvent.is_project == True,
        (
            (models.MeetingEvent.organizer_email == user_email) |
            (models.MeetingEvent.id.in_(
                db.query(models.ProjectRole.project_id).filter(
                    models.ProjectRole.email == user_email,
                    models.ProjectRole.status == "accepted"
                )
            ))
        )
    ).all()
    
    result = []
    for p in projects:
        # Determine effective role
        effective_role = "Owner" if p.organizer_email == user_email else "Team Member"
        role_record = next((r for r in roles if r.project_id == p.id), None)
        if role_record:
            effective_role = role_record.role
            
        result.append({
            "id": p.id,
            "title": p.title,
            "start_time": p.start_time.isoformat() + "Z" if p.start_time else None,
            "location": p.location,
            "status": p.status,
            "organizer_email": p.organizer_email,
            "my_role": effective_role
        })
    return result

class ProjectCreate(BaseModel):
    title: str
    start_time: str
    location: str

@app.post("/api/projects")
def create_project(project: ProjectCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    from datetime import datetime
    try:
        start_dt = datetime.fromisoformat(project.start_time.replace("Z", ""))
    except ValueError:
        start_dt = datetime.utcnow()
        
    db_project = models.MeetingEvent(
        title=project.title,
        start_time=start_dt,
        location=project.location,
        status="Active",
        organizer_email=user["username"],
        is_project=True
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Automatically add the creator as Owner in ProjectRole
    new_role = models.ProjectRole(project_id=db_project.id, email=user["username"], role="Owner", status="accepted")
    db.add(new_role)
    db.commit()
    
    return {"status": "success", "project_id": db_project.id}

@app.get("/api/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_email = user["username"]
    p = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
        
    role_record = db.query(models.ProjectRole).filter(
        models.ProjectRole.project_id == project_id, 
        models.ProjectRole.email == user_email
    ).first()
    
    if p.organizer_email != user_email and (not role_record or role_record.status != "accepted"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    effective_role = "Owner" if p.organizer_email == user_email else (role_record.role if role_record else "Team Member")
    
    return {
        "id": p.id,
        "title": p.title,
        "start_time": p.start_time.isoformat() + "Z" if p.start_time else None,
        "location": p.location,
        "status": p.status,
        "organizer_email": p.organizer_email,
        "my_role": effective_role
    }

@app.get("/api/projects/{project_id}/roles")
def get_project_roles(project_id: int, db: Session = Depends(get_db)):
    roles = db.query(models.ProjectRole).filter(models.ProjectRole.project_id == project_id).all()
    return [{"id": r.id, "email": r.email, "role": r.role} for r in roles]

class RoleCreate(BaseModel):
    email: str
    role: str

@app.post("/api/projects/{project_id}/roles")
def add_project_role(project_id: int, role_data: RoleCreate, db: Session = Depends(get_db)):
    # Legacy direct add
    existing = db.query(models.ProjectRole).filter(
        models.ProjectRole.project_id == project_id, 
        models.ProjectRole.email == role_data.email
    ).first()
    if existing:
        existing.role = role_data.role
        existing.status = "accepted"
    else:
        new_role = models.ProjectRole(project_id=project_id, email=role_data.email, role=role_data.role, status="accepted")
        db.add(new_role)
    db.commit()
    return {"status": "success"}

@app.post("/api/projects/{project_id}/invites")
def invite_to_project(project_id: int, role_data: RoleCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ProjectRole).filter(
        models.ProjectRole.project_id == project_id, 
        models.ProjectRole.email == role_data.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in project or invited")
        
    new_role = models.ProjectRole(project_id=project_id, email=role_data.email, role=role_data.role, status="pending")
    db.add(new_role)
    db.commit()
    return {"status": "success", "message": "Invited"}

@app.get("/api/projects/invites/pending")
def get_pending_invites(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_email = user["username"]
    invites = db.query(models.ProjectRole).filter(
        models.ProjectRole.email == user_email,
        models.ProjectRole.status == "pending"
    ).all()
    
    result = []
    for inv in invites:
        p = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == inv.project_id).first()
        if p:
            result.append({
                "id": inv.id,
                "project_id": p.id,
                "project_title": p.title,
                "role": inv.role
            })
    return result

class InviteUpdate(BaseModel):
    status: str # accepted or declined

@app.put("/api/projects/invites/{invite_id}")
def respond_to_invite(invite_id: int, update: InviteUpdate, db: Session = Depends(get_db)):
    inv = db.query(models.ProjectRole).filter(models.ProjectRole.id == invite_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if update.status == "declined":
        db.delete(inv)
    else:
        inv.status = "accepted"
        
    db.commit()
    return {"status": "success"}

@app.delete("/api/projects/{project_id}/roles/{email}")
def remove_project_role(project_id: int, email: str, db: Session = Depends(get_db)):
    role = db.query(models.ProjectRole).filter(
        models.ProjectRole.project_id == project_id, 
        models.ProjectRole.email == email
    ).first()
    if role:
        db.delete(role)
        db.commit()
    return {"status": "success"}

@app.get("/api/meetings")
def get_meetings(email: Optional[str] = None, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_email = user["username"]
    query = db.query(models.MeetingEvent).filter(models.MeetingEvent.is_project == False)
    
    target_email = email if email else user_email
    
    # Find meetings where user is an attendee
    attendee_records = db.query(models.AttendeeTask.meeting_id).filter(models.AttendeeTask.email == target_email).all()
    meeting_ids_as_attendee = [r[0] for r in attendee_records]
    
    # Filter: Either organizer OR in attendee list
    query = query.filter(
        (models.MeetingEvent.organizer_email == target_email) |
        (models.MeetingEvent.id.in_(meeting_ids_as_attendee))
    )
        
    meetings = query.order_by(models.MeetingEvent.start_time.asc()).all()
    
    from datetime import datetime
    now = datetime.utcnow()
    
    result = []
    for m in meetings:
        # Auto-close past meetings
        if m.end_time and m.end_time < now and m.status not in ["Closed", "Cancelled", "Pending VIP Approval", "Declined"]:
            m.status = "Closed"
            db.commit()
            
        user_email_lower = user_email.lower() if user_email else None
        is_organizer = (m.organizer_email.lower() == user_email_lower) if m.organizer_email and user_email_lower else False
        # Get all attendees for this meeting
        attendees = db.query(models.AttendeeTask).filter(models.AttendeeTask.meeting_id == m.id).all()
        attendees_str = ", ".join([a.email for a in attendees]) if attendees else m.organizer_email
        
        vip_task = next((a for a in attendees if a.email and user_email_lower and a.email.lower() == user_email_lower and a.is_vip), None)
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
            "is_vip": is_vip,
            "attendees": [{"email": a.email, "is_vip": a.is_vip} for a in attendees],
            "remark": m.remark
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
        models.AttendeeTask.email.ilike(email),
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
class WebhookPayload(BaseModel):
    meeting_id: int
    action: str # "cancel", "reschedule", "confirm"
    start_time: Optional[str] = None
    end_time: Optional[str] = None

@app.post("/api/webhooks/graph")
def handle_graph_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    """
    Receives push notifications from Microsoft Graph when meetings change.
    (This simulates the webhook payload for MVP purposes).
    """
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == payload.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if payload.action == "cancel":
        meeting.status = "Cancelled"
    elif payload.action == "confirm":
        meeting.status = "Scheduled"
    elif payload.action == "reschedule":
        from datetime import datetime
        try:
            if payload.start_time:
                meeting.start_time = datetime.fromisoformat(payload.start_time.replace("Z", ""))
            if payload.end_time:
                meeting.end_time = datetime.fromisoformat(payload.end_time.replace("Z", ""))
        except ValueError:
            pass
            
    db.commit()
    return {"status": "success", "message": f"Webhook processed: {payload.action}"}
from fastapi.responses import HTMLResponse

@app.get("/api/members/{email}/availability")
def get_member_availability(email: str, db: Session = Depends(get_db)):
    """
    Returns today's busy blocks for a specific user to power the Team Dashboard.
    Hides meeting titles for privacy.
    """
    from datetime import datetime, time
    import pytz
    
    # We will use today's date in local server time for MVP (or IST)
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    start_of_day = datetime.combine(now.date(), time(0, 0))
    end_of_day = datetime.combine(now.date(), time(23, 59, 59))
    
    # Find meetings where they are an attendee
    attendee_tasks = db.query(models.AttendeeTask).filter(models.AttendeeTask.email == email).all()
    meeting_ids = [t.meeting_id for t in attendee_tasks]
    
    if not meeting_ids:
        return []
        
    # Get meetings for today that are not Cancelled
    meetings = db.query(models.MeetingEvent).filter(
        models.MeetingEvent.id.in_(meeting_ids),
        models.MeetingEvent.start_time >= start_of_day,
        models.MeetingEvent.start_time <= end_of_day,
        models.MeetingEvent.status != "Cancelled"
    ).all()
    
    busy_blocks = []
    for m in meetings:
        busy_blocks.append({
            "start": m.start_time.isoformat() + "Z",
            "end": m.end_time.isoformat() + "Z" if m.end_time else None
        })
        
    return busy_blocks

class ChatMessageRequest(BaseModel):
    content: str

@app.get("/api/chat/{email}")
def api_get_chat(email: str, user: dict = Depends(get_current_user)):
    from graph import get_chat_messages
    return get_chat_messages(user["token"], user["username"], email)

@app.post("/api/chat/{email}")
def api_send_chat(email: str, req: ChatMessageRequest, user: dict = Depends(get_current_user)):
    from graph import send_chat_message
    success = send_chat_message(user["token"], user["username"], email, req.content)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send message via Graph API")
    return {"status": "success"}

@app.get("/api/meetings/{meeting_id}/respond", response_class=HTMLResponse)
def respond_to_meeting(meeting_id: int, email: str, action: str, db: Session = Depends(get_db)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == meeting_id).first()
    if not meeting:
        return "<h1>Meeting not found</h1>"
        
    if action == "confirm":
        meeting.status = "Scheduled"
        msg = f"Thank you! You have confirmed the meeting: {meeting.title}."
    elif action == "reject":
        meeting.status = "Cancelled"
        msg = f"You have rejected the meeting: {meeting.title}. It has been cancelled."
    else:
        return "<h1>Invalid action</h1>"
        
    db.commit()
    
    # Return a beautiful HTML response
    return f"""
    <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
            <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
                <h1 style="color: #334155; margin-bottom: 20px;">{msg}</h1>
                <p style="color: #64748b; margin-bottom: 30px;">You can safely close this window.</p>
                <a href="http://localhost:3000/schedule" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Return to Planner</a>
            </div>
        </body>
    </html>
    """

class RescheduleRequest(BaseModel):
    start_time: str
    end_time: str
    reason: Optional[str] = None

@app.put("/api/meetings/{meeting_id}/reschedule")
def reschedule_meeting(meeting_id: int, req: RescheduleRequest, db: Session = Depends(get_db)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    from datetime import datetime
    try:
        meeting.start_time = datetime.fromisoformat(req.start_time.replace("Z", ""))
        meeting.end_time = datetime.fromisoformat(req.end_time.replace("Z", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
        
    db.commit()
    return {"status": "success", "message": "Meeting rescheduled"}

@app.put("/api/meetings/{meeting_id}/cancel")
def cancel_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting.status = "Cancelled"
    db.commit()
    return {"status": "success", "message": "Meeting cancelled"}

class RebookRequest(BaseModel):
    start_time: str
    end_time: str

@app.post("/api/meetings/{meeting_id}/rebook")
def rebook_meeting(meeting_id: int, req: RebookRequest, db: Session = Depends(get_db)):
    old_meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == meeting_id).first()
    if not old_meeting:
        raise HTTPException(status_code=404, detail="Original meeting not found")
        
    from datetime import datetime
    try:
        new_start = datetime.fromisoformat(req.start_time.replace("Z", ""))
        new_end = datetime.fromisoformat(req.end_time.replace("Z", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    # Clone meeting
    new_meeting = models.MeetingEvent(
        title=old_meeting.title,
        start_time=new_start,
        end_time=new_end,
        location=old_meeting.location,
        status="Scheduled",
        organizer_email=old_meeting.organizer_email
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    # Clone attendees
    old_attendees = db.query(models.AttendeeTask).filter(models.AttendeeTask.meeting_id == old_meeting.id).all()
    for att in old_attendees:
        new_att = models.AttendeeTask(
            meeting_id=new_meeting.id,
            email=att.email,
            is_vip=att.is_vip,
            task_description=att.task_description,
            due_date=att.due_date,
            start_date=att.start_date,
            priority=att.priority,
            depends_on=att.depends_on,
            status=att.status
        )
        db.add(new_att)
    
    db.commit()
    return {"status": "success", "message": "Meeting rebooked successfully", "new_meeting_id": new_meeting.id}

class IssueLink(BaseModel):
    task_id: int

@app.put("/api/issues/{issue_id}/link-task")
def link_issue_to_task(issue_id: int, payload: IssueLink, db: Session = Depends(get_db)):
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if issue:
        issue.task_id = payload.task_id
        issue.status = "assigned"
        db.commit()
    return {"status": "success"}

@app.get("/api/notifications")
def get_notifications(email: str, db: Session = Depends(get_db)):
    notifs = db.query(models.Notification).filter(models.Notification.email == email).order_by(models.Notification.id.desc()).all()
    return [
        {
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at
        } for n in notifs
    ]

@app.put("/api/notifications/{notif_id}/read")
def read_notification(notif_id: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

@app.get("/api/tasks")
def get_tasks(email: Optional[str] = None, meeting_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.AttendeeTask)
    if email:
        query = query.filter(models.AttendeeTask.email == email)
    if meeting_id is not None:
        query = query.filter(models.AttendeeTask.meeting_id == meeting_id)
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
            "id": str(t.id),
            "title": t.task_description or "Attend meeting",
            "description": t.task_description,
            "status": status,
            "priority": t.priority if hasattr(t, 'priority') and t.priority else ("high" if t.is_vip else "medium"),
            "meeting": meeting_title,
            "email": t.email,
            "assigneeIds": [t.email] if t.email else [],
            "start": t.start_date or "",
            "due": t.due_date or "",
            "dependsOn": t.depends_on.split(",") if t.depends_on else [],
            "parentId": str(t.parent_id) if t.parent_id else None,
            "weight": t.weight if hasattr(t, 'weight') else 1,
            "meetingId": str(t.meeting_id) if t.meeting_id else None
        })
    return result

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    email: Optional[str] = None
    assigneeIds: Optional[List[str]] = None
    start: Optional[str] = None
    due: Optional[str] = None
    dependsOn: Optional[List[str]] = None
    parentId: Optional[str] = None
    weight: Optional[int] = 1
    meetingId: Optional[int] = None

@app.post("/api/tasks")
def create_manual_task(task: TaskCreate, db: Session = Depends(get_db)):
    # Convert parentId string to int if present
    parent_id = int(task.parentId) if task.parentId else None
    
    db_task = models.AttendeeTask(
        task_description=task.description or task.title,
        status=task.status,
        is_vip=task.priority == "high",
        priority=task.priority,
        email=task.assigneeIds[0] if task.assigneeIds else (task.email or ""),
        start_date=task.start,
        due_date=task.due,
        depends_on=",".join(task.dependsOn) if task.dependsOn else "",
        meeting_id=task.meetingId or 0,
        parent_id=parent_id,
        weight=task.weight or 1
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
        
    old_status = task.status
    task.status = status_update.status
    
    # Gamification: Award points if marking as 'done'
    if old_status != "done" and status_update.status == "done" and task.email:
        pts = db.query(models.GamificationPoints).filter(models.GamificationPoints.email == task.email).first()
        if not pts:
            pts = models.GamificationPoints(email=task.email, points=0)
            db.add(pts)
        pts.points += task.weight if hasattr(task, 'weight') and task.weight else 1
    
    db.commit()
    return {"status": "success", "new_status": task.status}

# --- NEW PROJECT TASKS API (PHASE 2) ---

class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    hard_deadline: Optional[str] = None
    estimated_hours: int = 0
    priority: str = "medium"
    depends_on: Optional[List[str]] = None
    weight: Optional[int] = 1
    project_id: Optional[int] = None
    assignees: Optional[List[str]] = None
    source_type: Optional[str] = "manual"
    source_id: Optional[str] = None

@app.post("/api/project-tasks")
def create_project_task(task: ProjectTaskCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    db_task = models.ProjectTask(
        project_id=task.project_id,
        title=task.title,
        description=task.description or "",
        status=task.status,
        start_date=task.start_date,
        target_date=task.target_date,
        hard_deadline=task.hard_deadline,
        estimated_hours=task.estimated_hours,
        priority=task.priority,
        depends_on=",".join(task.depends_on) if task.depends_on else "",
        weight=task.weight,
        assignor_email=user["username"],
        source_type=task.source_type,
        source_id=task.source_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    if task.assignees:
        for email in task.assignees:
            db_assign = models.TaskAssignment(task_id=db_task.id, email=email)
            db.add(db_assign)
        db.commit()

    return {"status": "success", "task_id": db_task.id}

@app.get("/api/project-tasks")
def get_project_tasks(email: Optional[str] = None, project_id: Optional[int] = None, assignor_email: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.ProjectTask)
    if project_id:
        query = query.filter(models.ProjectTask.project_id == project_id)
    if assignor_email:
        query = query.filter(models.ProjectTask.assignor_email == assignor_email)
        
    tasks = query.all()
    result = []
    
    user_dependent_task_ids = set()
    if email:
        for t in tasks:
            assignees = db.query(models.TaskAssignment).filter(models.TaskAssignment.task_id == t.id).all()
            assignee_emails = [a.email for a in assignees]
            if email in assignee_emails and t.depends_on:
                for dep in t.depends_on.split(","):
                    if dep.strip():
                        user_dependent_task_ids.add(dep.strip())

    for t in tasks:
        assignees = db.query(models.TaskAssignment).filter(models.TaskAssignment.task_id == t.id).all()
        assignee_emails = [a.email for a in assignees]
        
        is_assignee = email in assignee_emails if email else False
        is_assignor = (t.assignor_email == email) if email else False
        is_dependent = str(t.id) in user_dependent_task_ids
        
        if email and not is_assignee and not is_assignor and not is_dependent and (project_id is None) and (assignor_email is None):
            continue
            
        if email and not is_assignee and not is_assignor and is_dependent:
            # Read-only dependency summary
            result.append({
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "assigneeIds": assignee_emails,
                "is_dependency_readonly": True,
                "projectId": str(t.project_id)
            })
        else:
            result.append({
                "id": str(t.id),
                "projectId": str(t.project_id),
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "start": t.start_date or "",
                "targetDate": t.target_date or "",
                "hardDeadline": t.hard_deadline or "",
                "estimatedHours": t.estimated_hours,
                "priority": t.priority,
                "dependsOn": t.depends_on.split(",") if t.depends_on else [],
                "weight": t.weight,
                "assigneeIds": assignee_emails,
                "assignorEmail": t.assignor_email,
                "sourceType": getattr(t, "source_type", None),
                "sourceId": getattr(t, "source_id", None)
            })
    return result

@app.get("/api/project-tasks/pending-approvals")
def get_pending_task_approvals(email: str, db: Session = Depends(get_db)):
    tasks = db.query(models.ProjectTask).filter(
        models.ProjectTask.assignor_email == email,
        models.ProjectTask.status == "pending_review"
    ).all()
    
    result = []
    for t in tasks:
        assignees = db.query(models.TaskAssignment).filter(models.TaskAssignment.task_id == t.id).all()
        result.append({
            "id": t.id,
            "title": t.title,
            "project_id": t.project_id,
            "assignees": [a.email for a in assignees]
        })
    return result

class ProjectTaskUpdate(BaseModel):
    status: Optional[str] = None
    hard_deadline: Optional[str] = None
    target_date: Optional[str] = None
    estimated_hours: Optional[int] = None
    assignees: Optional[List[str]] = None

@app.put("/api/project-tasks/{task_id}")
def update_project_task(task_id: int, update: ProjectTaskUpdate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    task = db.query(models.ProjectTask).filter(models.ProjectTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    old_deadline = task.hard_deadline
    old_status = task.status

    if update.status is not None:
        # Intercept "done" if not the assignor
        if update.status == "done" and task.assignor_email and task.assignor_email != user["username"]:
            task.status = "pending_review"
            db.add(models.Notification(email=task.assignor_email, message=f"Task '{task.title}' requires your review.", created_at=datetime.now().isoformat()))
        else:
            task.status = update.status
            if update.status == "done" and task.assignor_email and task.assignor_email != user["username"]:
                db.add(models.Notification(email=task.assignor_email, message=f"Task '{task.title}' was completed.", created_at=datetime.now().isoformat()))
            
    if update.hard_deadline is not None:
        task.hard_deadline = update.hard_deadline
    if update.target_date is not None:
        task.target_date = update.target_date
    if update.estimated_hours is not None:
        task.estimated_hours = update.estimated_hours
        
    if update.assignees is not None:
        # Clear existing assignees and rewrite
        db.query(models.TaskAssignment).filter(models.TaskAssignment.task_id == task_id).delete()
        for email in update.assignees:
            db.add(models.TaskAssignment(task_id=task_id, email=email))

    db.commit()
    
    # Auto-Shift Logic for dependent tasks
    if old_deadline and update.hard_deadline and old_deadline != update.hard_deadline:
        try:
            from datetime import datetime, timedelta
            old_dt = datetime.fromisoformat(old_deadline.replace("Z", ""))
            new_dt = datetime.fromisoformat(update.hard_deadline.replace("Z", ""))
            delta_days = (new_dt - old_dt).days
            
            if delta_days != 0:
                # Shift dependent tasks
                all_tasks = db.query(models.ProjectTask).filter(models.ProjectTask.project_id == task.project_id).all()
                for dep in all_tasks:
                    if dep.depends_on and str(task_id) in dep.depends_on.split(","):
                        if dep.start_date:
                            s = datetime.fromisoformat(dep.start_date.replace("Z", ""))
                            dep.start_date = (s + timedelta(days=delta_days)).strftime("%Y-%m-%d")
                        if dep.hard_deadline:
                            d = datetime.fromisoformat(dep.hard_deadline.replace("Z", ""))
                            dep.hard_deadline = (d + timedelta(days=delta_days)).strftime("%Y-%m-%d")
                        if dep.target_date:
                            t_dt = datetime.fromisoformat(dep.target_date.replace("Z", ""))
                            dep.target_date = (t_dt + timedelta(days=delta_days)).strftime("%Y-%m-%d")
                db.commit()
        except Exception as e:
            print("Auto-shift error:", e)

    return {"status": "success", "new_status": task.status}

@app.post("/api/project-tasks/{task_id}/approve")
def approve_project_task(task_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    task = db.query(models.ProjectTask).filter(models.ProjectTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.assignor_email != user["username"]:
        raise HTTPException(status_code=403, detail="Only the assignor can approve this task")
        
    task.status = "done"
    db.commit()
    return {"status": "success", "new_status": "done"}

# --- END NEW PROJECT TASKS API ---

@app.get("/api/gamification")
def get_gamification(db: Session = Depends(get_db)):
    points = db.query(models.GamificationPoints).order_by(models.GamificationPoints.points.desc()).all()
    return [{"email": p.email, "points": p.points} for p in points]

import asyncio
from fastapi.responses import StreamingResponse

announcement_queues = {} # project_id -> list of Queue

@app.get("/api/projects/{project_id}/stream")
async def project_stream(project_id: int):
    q = asyncio.Queue()
    if project_id not in announcement_queues:
        announcement_queues[project_id] = []
    announcement_queues[project_id].append(q)
    
    async def event_generator():
        try:
            while True:
                msg = await q.get()
                yield f"data: {msg}\n\n"
        except asyncio.CancelledError:
            if project_id in announcement_queues and q in announcement_queues[project_id]:
                announcement_queues[project_id].remove(q)
                if not announcement_queues[project_id]:
                    del announcement_queues[project_id]
                    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

class AnnouncementCreate(BaseModel):
    content: str

@app.post("/api/projects/{project_id}/announcements")
async def create_announcement(project_id: int, ann: AnnouncementCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    from datetime import datetime
    import json
    
    db_ann = models.ProjectAnnouncement(
        project_id=project_id,
        content=ann.content,
        author_email=user["username"],
        created_at=datetime.utcnow().isoformat()
    )
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)
    
    # Publish to SSE
    if project_id in announcement_queues:
        payload = json.dumps({"id": db_ann.id, "content": db_ann.content, "author": db_ann.author_email, "created_at": db_ann.created_at})
        for q in announcement_queues[project_id]:
            await q.put(payload)
            
    return {"status": "success", "announcement_id": db_ann.id}

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

class IssueCreate(BaseModel):
    title: str
    description: str
    project_id: Optional[int] = None
    meeting_id: Optional[int] = None
    assigned_to: Optional[str] = None

@app.post("/api/issues")
def create_issue(issue: IssueCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    from datetime import datetime
    new_issue = models.Issue(
        title=issue.title,
        description=issue.description,
        project_id=issue.project_id,
        meeting_id=issue.meeting_id,
        creator_email=user["username"],
        assigned_to=issue.assigned_to,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    return {"status": "success", "issue_id": new_issue.id}

@app.get("/api/issues")
def get_issues(project_id: Optional[int] = None, meeting_id: Optional[int] = None, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    query = db.query(models.Issue)
    if project_id:
        query = query.filter(models.Issue.project_id == project_id)
    if meeting_id:
        query = query.filter(models.Issue.meeting_id == meeting_id)
        
    # If no specific filter, return issues created by or assigned to the user
    if not project_id and not meeting_id:
        query = query.filter(
            (models.Issue.creator_email == user["username"]) | 
            (models.Issue.assigned_to == user["username"])
        )
        
    issues = query.all()
    return [{
        "id": i.id,
        "title": i.title,
        "description": i.description,
        "status": i.status,
        "project_id": i.project_id,
        "meeting_id": i.meeting_id,
        "creator_email": i.creator_email,
        "assigned_to": i.assigned_to,
        "created_at": i.created_at
    } for i in issues]

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
def get_organization_members(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Fetches all registered users from the local database instead of MS Graph."""
    users = db.query(models.User).all()
    return [
        {
            "id": u.email,
            "displayName": u.name,
            "mail": u.email,
            "userPrincipalName": u.email,
            "jobTitle": u.role,
            "photoUrl": u.photo_url
        }
        for u in users
    ]

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
    cancel_meeting_id: Optional[int] = None
    remark: Optional[str] = None

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
        organizer_email=user["username"],
        remark=request.remark
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    # Handle Rebook Cancellation
    if request.cancel_meeting_id:
        old_meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == request.cancel_meeting_id).first()
        if old_meeting:
            old_meeting.status = "Cancelled"
            db.commit()
            
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
    elif status == "Pending VIP Approval":
        from graph import send_vip_confirmation_email
        for a in request.attendees:
            if a.is_vip:
                send_vip_confirmation_email(token, a.email, meeting.id, meeting.title)
            
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

class DeclineMeetingRequest(BaseModel):
    meeting_id: int
    remark: Optional[str] = None

@app.post("/api/decline-meeting")
def api_decline_meeting(request: DeclineMeetingRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == request.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting.status = "Declined"
    if request.remark:
        meeting.remark = request.remark
    db.commit()
    return {"status": "success", "state": "Declined"}


# ==========================================
# ADMIN ROUTES
# ==========================================

@app.get("/api/admin/check")
def admin_check(admin: dict = Depends(get_current_admin)):
    return {"status": "ok", "admin": admin["username"]}

@app.get("/api/admin/meetings")
def admin_get_meetings(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    meetings = db.query(models.MeetingEvent).all()
    return meetings

@app.delete("/api/admin/meetings/{meeting_id}")
def admin_delete_meeting(meeting_id: int, db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    meeting = db.query(models.MeetingEvent).filter(models.MeetingEvent.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/admin/tasks")
def admin_get_tasks(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    tasks = db.query(models.ProjectTask).all()
    return tasks

@app.delete("/api/admin/tasks/{task_id}")
def admin_delete_task(task_id: int, db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    task = db.query(models.ProjectTask).filter(models.ProjectTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/admin/issues")
def admin_get_issues(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    issues = db.query(models.Issue).all()
    return issues

@app.delete("/api/admin/issues/{issue_id}")
def admin_delete_issue(issue_id: int, db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    db.delete(issue)
    db.commit()
    return {"status": "deleted"}
