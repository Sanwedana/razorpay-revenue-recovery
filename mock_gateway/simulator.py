import random
import uuid
from datetime import datetime

FAILURE_REASONS = [
    {"code": "INSUFFICIENT_FUNDS", "reason": "Customer account balance low at time of debit."},
    {"code": "BANK_TIMEOUT", "reason": "Issuing bank server took too long to respond."},
    {"code": "EXPIRED_CARD", "reason": "Card expiry date has passed."},
    {"code": "NETWORK_DROP", "reason": "Transient gateway failure during settlement."},
]

def generate_mock_failure():
    """Generates a random failed transaction payload."""
    failure = random.choice(FAILURE_REASONS)
    return {
        "id": f"pay_{uuid.uuid4().hex[:10]}",
        "customer_id": f"cust_{random.randint(1000, 9999)}",
        "amount": round(random.uniform(299.0, 4999.0), 2),
        "currency": "INR",
        "failure_code": failure["code"],
        "failure_reason": failure["reason"],
        "created_at": datetime.utcnow().isoformat()
    }