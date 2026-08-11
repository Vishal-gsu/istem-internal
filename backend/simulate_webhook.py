import requests
import json
import sys

def simulate_webhook(meeting_id: int, action: str, start_time: str = None, end_time: str = None):
    url = "http://localhost:8000/api/webhooks/graph"
    payload = {
        "meeting_id": meeting_id,
        "action": action
    }
    
    if start_time:
        payload["start_time"] = start_time
    if end_time:
        payload["end_time"] = end_time
        
    try:
        print(f"Simulating Microsoft Graph Webhook for meeting {meeting_id} -> action: {action}")
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            print("✅ Webhook processed successfully by backend.")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Failed to process webhook. Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python simulate_webhook.py <meeting_id> <action> [start_time] [end_time]")
        print("Example: python simulate_webhook.py 1 cancel")
        print("Example: python simulate_webhook.py 1 confirm")
        print("Example: python simulate_webhook.py 1 reschedule 2026-08-15T10:00:00Z 2026-08-15T11:00:00Z")
        sys.exit(1)
        
    meeting_id = int(sys.argv[1])
    action = sys.argv[2]
    
    start_time = sys.argv[3] if len(sys.argv) > 3 else None
    end_time = sys.argv[4] if len(sys.argv) > 4 else None
    
    simulate_webhook(meeting_id, action, start_time, end_time)
