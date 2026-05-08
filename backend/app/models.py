from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    email: str


class UserRegister(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    display_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


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
    description: Optional[str] = Field(None, max_length=500)
    color: str = Field(default='#00d3ff', max_length=20)


class BoardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=20)


class Board(BoardBase):
    id: int
    user_id: int
    description: Optional[str] = None
    color: str = '#00d3ff'
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardFull(Board):
    columns: List[ColumnWithCards] = []

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
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
    board_id: Optional[int] = None


class ChatResponse(BaseModel):
    message: str
    operations: List[CardOperation] = []
    board: Optional[BoardFull] = None
