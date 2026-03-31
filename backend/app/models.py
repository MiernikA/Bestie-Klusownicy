from sqlalchemy import JSON, Column, DateTime, String, func

from app.db import Base


class GameSessionModel(Base):
    __tablename__ = "game_sessions"

    id = Column(String, primary_key=True)
    state = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
