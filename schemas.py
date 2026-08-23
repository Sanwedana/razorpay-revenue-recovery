from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TransactionBase(BaseModel):
    id: str
    customer_id: str
    amount: float
    currency: str = "INR"
    failure_code: str
    failure_reason: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    attempt_count: int
    max_retries: int
    status: str
    created_at: datetime
    last_attempt_at: datetime

    class Config:
        from_attributes = True

class AgentDecisionResponse(BaseModel):
    transaction_id: str
    action: str
    delay_hours: int
    reasoning: str