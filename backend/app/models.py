"""Pydantic models for request/response validation."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# User Models
# ============================================================================

class UserBase(BaseModel):
    """Base user model."""
    email: str


class UserCreate(UserBase):
    """User creation model."""
    password: str


class User(UserBase):
    """User response model."""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Card Models
# ============================================================================

class CardBase(BaseModel):
    """Base card model."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class CardCreate(CardBase):
    """Card creation model."""
    column_id: int


class CardUpdate(BaseModel):
    """Card update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    column_id: Optional[int] = None
    position: Optional[int] = None


class CardMove(BaseModel):
    """Card move model."""
    column_id: int
    position: int


class Card(CardBase):
    """Card response model."""
    id: int
    column_id: int
    position: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Column Models
# ============================================================================

class ColumnBase(BaseModel):
    """Base column model."""
    title: str = Field(..., min_length=1, max_length=255)


class ColumnCreate(ColumnBase):
    """Column creation model."""
    board_id: int
    position: int


class ColumnUpdate(BaseModel):
    """Column update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class ColumnWithCards(ColumnBase):
    """Column with all cards."""
    id: int
    board_id: int
    position: int
    cards: List[Card] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Board Models
# ============================================================================

class BoardBase(BaseModel):
    """Base board model."""
    title: str = Field(..., min_length=1, max_length=255)


class BoardCreate(BoardBase):
    """Board creation model."""
    pass


class BoardUpdate(BaseModel):
    """Board update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class Board(BoardBase):
    """Board response model (without cards)."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardFull(Board):
    """Board with all columns and cards."""
    columns: List[ColumnWithCards] = []

    class Config:
        from_attributes = True


# ============================================================================
# Auth Models
# ============================================================================

class LoginRequest(BaseModel):
    """Login request model."""
    email: str
    password: str


class LoginResponse(BaseModel):
    """Login response model."""
    user: User
    token: str


class LogoutResponse(BaseModel):
    """Logout response model."""
    message: str = "Logged out successfully"


# ============================================================================
# Error Response Model
# ============================================================================

class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str
    status_code: int


# ============================================================================
# Generic Response Models
# ============================================================================

class SuccessResponse(BaseModel):
    """Generic success response."""
    message: str
    data: Optional[dict] = None
