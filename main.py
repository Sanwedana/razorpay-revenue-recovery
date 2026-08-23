from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import database, models, schemas
from mock_gateway.simulator import generate_mock_failure
from agent.engine import evaluate_recovery_strategy
from fastapi.middleware.cors import CORSMiddleware

# Build database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Razorpay AI Revenue Recovery Engine",
    description="Autonomous payment retry and dunning agent framework",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "online", "system": "NVIDIA-Powered AI Revenue Recovery Agent Active"}

@app.post("/simulate-failure", response_model=schemas.TransactionResponse)
def simulate_payment_failure(db: Session = Depends(database.get_db)):
    """Generates a mock failed transaction and saves it to SQLite."""
    raw_event = generate_mock_failure()
    
    transaction = models.Transaction(
        id=raw_event["id"],
        customer_id=raw_event["customer_id"],
        amount=raw_event["amount"],
        currency=raw_event["currency"],
        failure_code=raw_event["failure_code"],
        failure_reason=raw_event["failure_reason"],
        status=models.TransactionStatus.FAILED
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@app.post("/recover/{transaction_id}", response_model=schemas.AgentDecisionResponse)
def process_recovery(transaction_id: str, db: Session = Depends(database.get_db)):
    """Triggers the NVIDIA LLM agent to analyze the failed payment and pick a recovery plan."""
    txn = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Guardrail check: Terminate if max retries reached
    if txn.attempt_count >= txn.max_retries:
        txn.status = models.TransactionStatus.TERMINATED
        db.commit()
        return {
            "transaction_id": txn.id,
            "action": "TERMINATE",
            "delay_hours": 0,
            "reasoning": "Hard limit reached: Exceeded maximum allowed retries (3)."
        }

    # Pass payload to NVIDIA LLM Agent
    payload = {
        "id": txn.id,
        "failure_code": txn.failure_code,
        "failure_reason": txn.failure_reason,
        "amount": txn.amount,
        "attempt_count": txn.attempt_count
    }
    
    decision = evaluate_recovery_strategy(payload)
    
    # Audit log creation
    log = models.AuditLog(
        transaction_id=txn.id,
        agent_action=decision.get("action", "UNKNOWN"),
        reasoning=decision.get("reasoning", "")
    )
    
    # Update transaction state
    txn.attempt_count += 1
    txn.status = models.TransactionStatus.PENDING_RETRY
    
    db.add(log)
    db.commit()
    
    return {
        "transaction_id": txn.id,
        "action": decision.get("action"),
        "delay_hours": decision.get("delay_hours", 0),
        "reasoning": decision.get("reasoning")
    }

@app.get("/transactions")
def get_all_transactions(db: Session = Depends(database.get_db)):
    """Fetches all transactions stored in SQLite."""
    return db.query(models.Transaction).all()

@app.get("/audit-logs")
def get_audit_logs(db: Session = Depends(database.get_db)):
    """Fetches all AI decisions and execution history."""
    return db.query(models.AuditLog).all()