from fastapi import APIRouter

chat = APIRouter()

@chat.get("/chat")
async def chat_endpoint():
    return {"message": "Chat endpoint"}