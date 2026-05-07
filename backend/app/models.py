from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CardBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class CardCreate(CardBase):
    column_id: int


class CardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    column_id: Optional[int] = None
    position: Optional[int] = None


class CardMove(BaseModel):
    column_id: int
    position: int


class Card(CardBase):
    id: int
    column_id: int
    position: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ColumnBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class ColumnCreate(ColumnBase):
    board_id: int
    position: int


class ColumnUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class ColumnWithCards(ColumnBase):
    id: int
    board_id: int
    position: int
    cards: List[Card] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class BoardCreate(BoardBase):
    pass


class BoardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class Board(BoardBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardFull(Board):
    columns: List[ColumnWithCards] = []

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user: User
    token: str


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully"


class ErrorResponse(BaseModel):
    detail: str
    status_code: int


class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None


class CardOperation(BaseModel):
    type: Literal["create_card", "move_card", "update_card", "delete_card"]
    column_id: Optional[int] = None
    card_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    message: str
    operations: List[CardOperation] = []
    board: Optional[BoardFull] = None
