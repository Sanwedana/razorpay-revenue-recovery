from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum
from database import Base
import datetime
import enum

class TransactionStatus(str, enum.Enum):
    FAILED = "FAILED"
    PENDING_RETRY = "PENDING_RETRY"
    RECOVERED = "RECOVERED"
    TERMINATED = "TERMINATED"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    failure_code = Column(String, nullable=False)  # e.g. INSUFFICIENT_FUNDS, BANK_TIMEOUT
    failure_reason = Column(String)
    attempt_count = Column(Integer, default=1)
    max_retries = Column(Integer, default=3)
    status = Column(String, default=TransactionStatus.FAILED)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_attempt_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    agent_action = Column(String, nullable=False)  # e.g., SCHEDULE_RETRY, SEND_WHATSAPP
    reasoning = Column(Text)
    prompt_used = Column(Text)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)