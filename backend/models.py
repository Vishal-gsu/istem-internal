from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class MeetingEvent(Base):
    __tablename__ = "meeting_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    location = Column(String)
    status = Column(String, default="Scheduled")
    organizer_email = Column(String, nullable=True)
    is_project = Column(Boolean, default=False)
    project_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), nullable=True)

class AttendeeTask(Base):
    __tablename__ = "attendee_tasks"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), index=True)
    email = Column(String, index=True)
    is_vip = Column(Boolean, default=False)
    task_description = Column(String)
    status = Column(String, default="Pending")
    start_date = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    priority = Column(String, default="medium")
    depends_on = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("attendee_tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    weight = Column(Integer, default=1)

class MeetingReminder(Base):
    __tablename__ = "meeting_reminders"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), index=True)
    email = Column(String, index=True)
    minutes_before = Column(Integer)

class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), index=True)
    email = Column(String, index=True)
    is_private = Column(Boolean, default=False)
    content = Column(String)

class ProjectRole(Base):
    __tablename__ = "project_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), index=True)
    email = Column(String, index=True)
    role = Column(String)  # Owner, PM, Manager, Team Member
    status = Column(String, default="accepted") # pending, accepted, declined
    
    __table_args__ = (UniqueConstraint('project_id', 'email', name='_project_user_uc'),)

class GamificationPoints(Base):
    __tablename__ = "gamification_points"
    
    email = Column(String, primary_key=True, index=True)
    points = Column(Integer, default=0)

class ProjectAnnouncement(Base):
    __tablename__ = "project_announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), index=True)
    content = Column(String)
    author_email = Column(String)
    created_at = Column(String)

class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    status = Column(String, default="open") # open, closed
    project_id = Column(Integer, nullable=True)
    meeting_id = Column(Integer, nullable=True)
    creator_email = Column(String)
    assigned_to = Column(String, nullable=True)
    created_at = Column(String)

class ProjectTask(Base):
    __tablename__ = "project_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("meeting_events.id", ondelete="CASCADE"), index=True)
    title = Column(String, index=True)
    description = Column(String)
    status = Column(String, default="todo") # tentative, todo, in-progress, blocked, waiting-client, pending_review, done
    start_date = Column(String, nullable=True)
    target_date = Column(String, nullable=True)
    hard_deadline = Column(String, nullable=True)
    estimated_hours = Column(Integer, default=0)
    priority = Column(String, default="medium")
    depends_on = Column(String, nullable=True) # comma separated task ids
    weight = Column(Integer, default=1)
    assignor_email = Column(String, nullable=True)

class TaskAssignment(Base):
    __tablename__ = "task_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("project_tasks.id", ondelete="CASCADE"), index=True)
    email = Column(String, index=True)
    is_vip = Column(Boolean, default=False)
