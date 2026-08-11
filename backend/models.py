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
