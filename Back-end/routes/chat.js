from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

router = APIRouter()

class QARequest(BaseModel):
    question: str
    context: str

# رابط DeepSeek API
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

@router.post("/ask")
async def answer_question(request: QARequest):
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DeepSeek API key not found")

    try:
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant specialized in machinery maintenance."},
                {"role": "user", "content": f"Context: {request.context}\nQuestion: {request.question}"}
            ],
            "stream": False
        }

        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        answer = result["choices"][0]["message"]["content"]
        return {"answer": answer, "score": 0.9}

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"DeepSeek API error: {str(e)}")