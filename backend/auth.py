import os
from fastapi import Request, HTTPException

server_sessions = {}

def get_current_user(request: Request):
    """
    Validates the user by checking the session_id in the cookie against server_sessions.
    """
    session_id = request.session.get("session_id")
    
    if not session_id or session_id not in server_sessions:
        raise HTTPException(
            status_code=401, 
            detail="Not authenticated"
        )
        
    session_data = server_sessions[session_id]
    user = session_data["user"]
    token = session_data["token"]
        
    return {
        "user": user,
        "token": token,
        "username": user.get("preferred_username") or user.get("email") or user.get("name", "unknown")
    }

def get_current_admin(request: Request):
    user_data = get_current_user(request)
    email = user_data["username"].lower()
    
    admin_emails_str = os.getenv("ADMIN_EMAILS", "")
    admin_emails = [e.strip().lower() for e in admin_emails_str.split(",") if e.strip()]
    
    if email not in admin_emails:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin access required"
        )
        
    return user_data
