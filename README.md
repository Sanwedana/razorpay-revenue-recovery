# 💳 Razorpay AI Revenue Recovery Agent

An autonomous payment recovery and dunning workflow powered by **NVIDIA NIM (Llama 3.1 70B)**, **FastAPI**, and **React**. Designed for Track 3 ("AI Revenue Recovery") of the Razorpay Buildathon.

---

## 🚀 Key Features

* **Autonomous Recovery Strategy Engine**: Evaluates failed transactions and dynamically outputs JSON strategies based on error signatures (e.g., `INSUFFICIENT_FUNDS`, `BANK_TIMEOUT`, `EXPIRED_CARD`).
* **Guardrails & Circuit Breakers**: Automatically terminates retry loops after 3 unsuccessful attempts to prevent system abuse.
* **Audit Trail**: Logs AI decisions and execution history into SQLite for transparent reporting.
* **Modern SaaS Dashboard**: Real-time React frontend with Tailwind CSS and live server health tracking.

---

## 🛠️ Architecture & Tech Stack

* **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Axios
* **Backend**: FastAPI, SQLAlchemy, SQLite, Pydantic
* **AI Orchestration**: NVIDIA NIM Endpoint (`meta/llama-3.1-70b-instruct`) via LangChain

---

## 🏃 Quickstart Guide

### 1. Backend Setup
```bash
# Navigate to project root
cd razorpay-revenue-recovery

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy langchain-openai python-dotenv

# Run FastAPI server
uvicorn main:app --reload --port 8000