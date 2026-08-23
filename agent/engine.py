import os
import json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from agent.prompts import RECOVERY_SYSTEM_PROMPT

load_dotenv()

# Connects to NVIDIA NIM endpoint using LangChain's ChatOpenAI wrapper
llm = ChatOpenAI(
    model="meta/llama-3.1-70b-instruct",
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)

def evaluate_recovery_strategy(transaction_data: dict) -> dict:
    """Passes payment failure details to the NVIDIA LLM to decide the recovery strategy."""
    
    prompt = RECOVERY_SYSTEM_PROMPT.format(
        transaction_id=transaction_data["id"],
        failure_code=transaction_data["failure_code"],
        failure_reason=transaction_data["failure_reason"],
        amount=transaction_data["amount"],
        attempt_count=transaction_data.get("attempt_count", 1)
    )

    response = llm.invoke(prompt)
    
    try:
        # Parse output as JSON strategy
        strategy = json.loads(response.content)
    except Exception:
        # Fallback strategy if JSON parsing fails
        strategy = {
            "action": "SCHEDULE_RETRY",
            "delay_hours": 6,
            "reasoning": "Fallback rule activated due to unparseable response."
        }

    return strategy