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
