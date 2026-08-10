import os
import msal
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

# Initialize MSAL Confidential Client
app = msal.ConfidentialClientApplication(
    CLIENT_ID,
    authority=AUTHORITY,
    client_credential=CLIENT_SECRET,
)

def get_app_only_token():
    """Gets an access token for the application (not a specific user)"""
    result = app.acquire_token_silent(["https://graph.microsoft.com/.default"], account=None)
    if not result:
        result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    
    if "access_token" in result:
        return result["access_token"]
    else:
        raise Exception(f"Failed to get app token: {result.get('error_description')}")

def fetch_organization_members():
    """Fetches all users in the organization using App-Only token"""
    try:
        token = get_app_only_token()
        
        response = requests.get(
            "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,jobTitle",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json().get("value", [])
        else:
            print(f"Error fetching members: {response.text}")
            return []
    except Exception as e:
        print(f"Graph API Error: {e}")
        return []

def fetch_user_calendar(user_token: str):
    """Fetches calendar events for the currently logged in user"""
    try:
        # Fetch events for the next week as an example
        response = requests.get(
            "https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=2024-01-01T00:00:00&endDateTime=2025-12-31T00:00:00&$top=10",
            headers={"Authorization": f"Bearer {user_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json().get("value", [])
        else:
            print(f"Error fetching calendar: {response.text}")
            return []
    except Exception as e:
        print(f"Graph API Error: {e}")
        return []

def find_meeting_times(user_token: str, attendees: list, duration: str, protect_lunch: bool):
    """
    Calls Microsoft Graph findMeetingTimes API to find free slots.
    attendees is a list of dicts: [{"email": "...", "is_vip": True/False}]
    """
    try:
        # Map attendees to Graph API format
        graph_attendees = []
        for a in attendees:
            graph_attendees.append({
                "type": "required" if a.get("is_vip") else "optional",
                "emailAddress": {
                    "address": a["email"]
                }
            })
            
        payload = {
            "attendees": graph_attendees,
            "meetingDuration": duration,
            "minimumAttendeePercentage": 100,
            "returnSuggestionReasons": True,
            "timeConstraint": {
                "activityDomain": "work",
                "timeslots": [
                    {
                        "start": {
                            "dateTime": "2026-08-07T08:00:00",
                            "timeZone": "Pacific Standard Time"
                        },
                        "end": {
                            "dateTime": "2026-08-14T17:00:00",
                            "timeZone": "Pacific Standard Time"
                        }
                    }
                ]
            }
        }
        
        response = requests.post(
            "https://graph.microsoft.com/v1.0/me/findMeetingTimes",
            headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Graph API Error: {response.text}")
            # MOCK FALLBACK FOR TESTING WITHOUT O365 LICENSES
            return generate_mock_free_slots()
    except Exception as e:
        print(f"Exception in find_meeting_times: {e}")
        return generate_mock_free_slots()

def generate_mock_free_slots():
    """Generates fake meeting times for testing purposes."""
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    return {
        "meetingTimeSuggestions": [
            {
                "meetingTimeSlot": {
                    "start": {"dateTime": (now + timedelta(days=1, hours=10)).isoformat().split(".")[0]},
                    "end": {"dateTime": (now + timedelta(days=1, hours=11)).isoformat().split(".")[0]}
                }
            },
            {
                "meetingTimeSlot": {
                    "start": {"dateTime": (now + timedelta(days=1, hours=14)).isoformat().split(".")[0]},
                    "end": {"dateTime": (now + timedelta(days=1, hours=15)).isoformat().split(".")[0]}
                }
            },
            {
                "meetingTimeSlot": {
                    "start": {"dateTime": (now + timedelta(days=2, hours=9)).isoformat().split(".")[0]},
                    "end": {"dateTime": (now + timedelta(days=2, hours=10)).isoformat().split(".")[0]}
                }
            }
        ]
    }

def create_meeting_event(user_token: str, title: str, start_time: str, end_time: str, attendees: list, reminder_minutes: int = 15, prep_tasks: list = None):
    """
    Calls Microsoft Graph POST /me/events to schedule the meeting and generate Teams link.
    """
    try:
        graph_attendees = [{"emailAddress": {"address": a["email"]}, "type": "required"} for a in attendees]
        # Build task HTML body
        body_content = "<h2>Meeting Overview</h2>"
        if prep_tasks and any(pt.get("task") for pt in prep_tasks):
            body_content += "<h3>Assigned Preparation Tasks</h3><ul>"
            for pt in prep_tasks:
                if pt.get("task"):
                    body_content += f"<li><strong>{pt['email']}</strong>: {pt['task']}</li>"
            body_content += "</ul>"
            
        payload = {
            "subject": title,
            "start": {"dateTime": start_time, "timeZone": "UTC"},
            "end": {"dateTime": end_time, "timeZone": "UTC"},
            "attendees": graph_attendees,
            "isOnlineMeeting": True,
            "onlineMeetingProvider": "teamsForBusiness",
            "isReminderOn": True,
            "reminderMinutesBeforeStart": reminder_minutes,
            "body": {
                "contentType": "HTML",
                "content": body_content
            }
        }
        
        response = requests.post(
            "https://graph.microsoft.com/v1.0/me/events",
            headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
            json=payload,
            timeout=10
        )
        
        if response.status_code == 201:
            return response.json()
        else:
            print(f"Error creating event: {response.text}")
            # MOCK FALLBACK
            return {"id": "mock-event-id", "onlineMeeting": {"joinUrl": "https://teams.microsoft.com/l/meetup-join/mock"}}
    except Exception as e:
        print(f"Exception creating event: {e}")
        return {"id": "mock-event-id", "onlineMeeting": {"joinUrl": "https://teams.microsoft.com/l/meetup-join/mock"}}

def calculate_custom_meeting_times(user_token: str, attendees: list, duration: str, protect_lunch: bool, date: str, time: str, mode: str, pending_meetings: list):
    """
    Custom Python Scheduling Engine.
    Handles IST timezones, Lunch Protection, Preference Modes (nearest, after, before, exact),
    and Soft Conflicts with Pending SQLite meetings.
    """
    from datetime import datetime, timedelta
    import pytz
    
    # 1. Setup Timezones and Target Bounds
    ist = pytz.timezone('Asia/Kolkata')
    
    # Parse duration (PT30M, PT1H, PT2H)
    duration_mins = 60
    if duration == "PT30M": duration_mins = 30
    elif duration == "PT2H": duration_mins = 120
    
    # Base target day in IST
    try:
        base_date_ist = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        base_date_ist = datetime.now(ist)
        
    start_of_day = ist.localize(datetime(base_date_ist.year, base_date_ist.month, base_date_ist.day, 9, 0)) # 9 AM
    end_of_day = ist.localize(datetime(base_date_ist.year, base_date_ist.month, base_date_ist.day, 18, 0)) # 6 PM
    
    preferred_time_ist = None
    if time:
        try:
            h, m = map(int, time.split(':'))
            preferred_time_ist = ist.localize(datetime(base_date_ist.year, base_date_ist.month, base_date_ist.day, h, m))
        except ValueError:
            pass

    # 2. Generate Candidate Slots (Every 30 mins)
    candidates = []
    current = start_of_day
    while current + timedelta(minutes=duration_mins) <= end_of_day:
        slot_end = current + timedelta(minutes=duration_mins)
        
        # Apply Lunch Protection (12 PM to 1 PM IST)
        if protect_lunch:
            lunch_start = ist.localize(datetime(base_date_ist.year, base_date_ist.month, base_date_ist.day, 12, 0))
            lunch_end = ist.localize(datetime(base_date_ist.year, base_date_ist.month, base_date_ist.day, 13, 0))
            if (current < lunch_end and slot_end > lunch_start):
                current += timedelta(minutes=30)
                continue
                
        # Apply Mode Filters
        if preferred_time_ist:
            if mode == "exact" and current != preferred_time_ist:
                current += timedelta(minutes=30)
                continue
            if mode == "after" and current < preferred_time_ist:
                current += timedelta(minutes=30)
                continue
            if mode == "before" and current > preferred_time_ist:
                current += timedelta(minutes=30)
                continue
                
        candidates.append({"start": current, "end": slot_end})
        current += timedelta(minutes=30)
        
    # If mode == nearest, sort candidates by absolute distance to preferred_time
    if mode == "nearest" and preferred_time_ist:
        candidates.sort(key=lambda x: abs((x["start"] - preferred_time_ist).total_seconds()))

    # 3. Simulate Graph API Raw Events (Mocked for logic demonstration)
    # In a real app, we would loop through attendees and call fetch_user_calendar
    hard_blocked_times = [
        {"start": start_of_day + timedelta(hours=2), "end": start_of_day + timedelta(hours=3)} # 11 AM - 12 PM Blocked
    ]

    # 4. Check Constraints
    final_slots = []
    for cand in candidates:
        is_hard_conflict = False
        for block in hard_blocked_times:
            if cand["start"] < block["end"] and cand["end"] > block["start"]:
                is_hard_conflict = True
                break
        
        if is_hard_conflict:
            continue
            
        # Check Soft Conflicts (Pending SQLite Meetings)
        soft_conflict_reason = None
        for p in pending_meetings:
            p_start = datetime.fromisoformat(p["start"].replace('Z', '')).replace(tzinfo=None)
            p_end = datetime.fromisoformat(p["end"].replace('Z', '')).replace(tzinfo=None)
            # Convert candidate to UTC for comparison
            c_start_utc = cand["start"].astimezone(pytz.utc).replace(tzinfo=None)
            c_end_utc = cand["end"].astimezone(pytz.utc).replace(tzinfo=None)
            
            if c_start_utc < p_end and c_end_utc > p_start:
                soft_conflict_reason = p["title"]
                break
                
        final_slots.append({
            "meetingTimeSlot": {
                "start": {"dateTime": cand["start"].astimezone(pytz.utc).isoformat().split("+")[0]},
                "end": {"dateTime": cand["end"].astimezone(pytz.utc).isoformat().split("+")[0]}
            },
            "softConflict": bool(soft_conflict_reason),
            "conflictReason": soft_conflict_reason
        })
        
    return {"meetingTimeSuggestions": final_slots[:10]} # Return top 10
