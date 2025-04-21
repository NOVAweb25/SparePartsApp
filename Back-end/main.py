from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import BearerTransport, JWTStrategy, AuthenticationBackend
from pymongo import MongoClient
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import jwt
from pydantic import BaseModel, EmailStr
import requests
import os
from dotenv import load_dotenv
import redis
import json
from pathlib import Path
from passlib.context import CryptContext
from bson import ObjectId
import shutil

# تحميل متغيرات البيئة
load_dotenv()
print(f"Loaded SECRET_KEY: {os.getenv('SECRET_KEY')}")

# إنشاء تطبيق FastAPI
app = FastAPI()

# إعداد تشفير كلمات المرور
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# إعداد Redis للتخزين المؤقت
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# إعداد مجلد لتخزين الصور
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# الاتصال بـ MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["HeavyMachinery"]
products_collection = db["Products"]
users_collection = db["Users"]
orders_collection = db["Orders"]
offers_collection = db["Offers"]
faqs_collection = db["CustomerSupport"]
chat_history_collection = db["ChatHistory"]
feedback_collection = db["Feedback"]

# إضافة فهرسة لتحسين الأداء
products_collection.create_index([("name", 1)])
products_collection.create_index([("brand", 1)])
products_collection.create_index([("category", 1)])
users_collection.create_index([("email", 1)])
users_collection.create_index([("username", 1), ("phoneNumber", 1)])
orders_collection.create_index([("user_id", 1)])
chat_history_collection.create_index([("user_id", 1)])
offers_collection.create_index([("product_id", 1)])

# رابط DeepSeek API
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# نموذج المستخدم لإنشاء مستخدم جديد (UserCreate)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    phoneNumber: str
    subscription: bool = False

# نموذج المستخدم لإرجاع بيانات المستخدم (User)
class User(BaseModel):
    id: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    subscription: bool = False
    purchase_history: List[dict] = []
    username: str
    phoneNumber: str

# قاعدة بيانات المستخدمين المخصصة باستخدام pymongo
class MongoDBUserDatabase:
    def __init__(self):
        self.collection = users_collection

    async def get(self, id: str) -> Optional[User]:
        user = self.collection.find_one({"_id": ObjectId(id)})
        if user:
            user["id"] = str(user["_id"])
            user.pop("_id")
            return User(**user)
        return None

    async def get_by_email(self, email: str) -> Optional[User]:
        user = self.collection.find_one({"email": email})
        if user:
            user["id"] = str(user["_id"])
            user.pop("_id")
            return User(**user)
        return None

    async def get_by_username(self, username: str) -> Optional[User]:
        user = self.collection.find_one({"username": username})
        if user:
            user["id"] = str(user["_id"])
            user.pop("_id")
            return User(**user)
        return None

    async def create(self, user: UserCreate) -> User:
        if await self.get_by_username(user.username):
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
        user_dict = user.dict()
        user_dict["hashed_password"] = pwd_context.hash(user_dict["password"])
        existing_password = self.collection.find_one({"hashed_password": user_dict["hashed_password"]})
        if existing_password:
            raise HTTPException(status_code=400, detail="كلمة المرور مستخدمة بالفعل")
        if not user_dict.get("phoneNumber"):
            raise HTTPException(status_code=400, detail="رقم الهاتف مطلوب")
        user_dict.pop("password")
        user_dict["is_active"] = True
        user_dict["is_superuser"] = False
        user_dict["purchase_history"] = []
        result = self.collection.insert_one(user_dict)
        user_dict["id"] = str(result.inserted_id)
        return User(**user_dict)

    async def update(self, user: User) -> User:
        user_dict = user.dict()
        if "hashed_password" in user_dict:
            user_dict["hashed_password"] = pwd_context.hash(user_dict["hashed_password"])
        self.collection.update_one({"_id": ObjectId(user.id)}, {"$set": user_dict})
        return user

    async def delete(self, user: User) -> None:
        self.collection.delete_one({"_id": ObjectId(user.id)})

# إعداد الأمان باستخدام fastapi-users و JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

bearer_transport = BearerTransport(tokenUrl="/auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET_KEY, lifetime_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, str](
    lambda: MongoDBUserDatabase(),
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)

# نماذج البيانات باستخدام Pydantic
class Product(BaseModel):
    name: str
    description: str
    price: float
    stock: int
    category: str
    brand: str
    specifications: dict
    image_url: Optional[str] = None

class Offer(BaseModel):
    product_id: str
    discount: float
    description: str
    start_date: str
    end_date: str

class Order(BaseModel):
    user_id: str
    products: List[Dict[str, int]]
    total_price: float
    payment_method: str  # "Tamara", "Tabby", "CustomInstallment", "Cash"
    delivery_method: str  # "SMSA", "Aramex", "SitePickup"
    status: str = "Pending"

class FAQ(BaseModel):
    question: str
    answer: str
    added_by: str  # "user" أو "company"

class ChatMessage(BaseModel):
    user_id: str
    message: str
    response: str
    timestamp: str

# مسار مخصص لتسجيل مستخدم جديد مع التحقق من الحقول
@app.post("/auth/register")
async def register_user(user_data: dict):
    required_fields = ["username", "password", "phoneNumber", "email"]
    for field in required_fields:
        if field not in user_data:
            raise HTTPException(status_code=400, detail=f"الحقل {field} مطلوب")

    existing_user = users_collection.find_one({"username": user_data["username"]})
    if existing_user:
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")

    existing_email = users_collection.find_one({"email": user_data["email"]})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    existing_phone = users_collection.find_one({"phoneNumber": user_data["phoneNumber"]})
    if existing_phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم بالفعل")

    user_data["hashed_password"] = pwd_context.hash(user_data["password"])
    user_data.pop("password")

    existing_password = users_collection.find_one({"hashed_password": user_data["hashed_password"]})
    if existing_password:
        raise HTTPException(status_code=400, detail="كلمة المرور مستخدمة بالفعل")

    user_data["is_active"] = True
    user_data["is_superuser"] = False
    user_data["subscription"] = user_data.get("subscription", False)
    user_data["purchase_history"] = []
    user_data["created_at"] = datetime.utcnow().isoformat()

    result = users_collection.insert_one(user_data)
    user_data["id"] = str(result.inserted_id)
    return {"message": "تم إنشاء الحساب بنجاح", "user_id": str(result.inserted_id)}

# مسار للتحقق من حالة تسجيل الدخول
@app.get("/auth/check")
async def check_user(current_user: User = Depends(current_active_user)):
    return {"user_id": current_user.id, "username": current_user.username}

# مسار لرفع الصور
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    file_extension = file.filename.split('.')[-1]
    file_name = f"{datetime.utcnow().timestamp()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_url": f"/uploads/{file_name}"}

# مسار لإضافة منتج جديد مع صورة
@app.post("/products/add")
async def add_product(
    name: str,
    description: str,
    price: float,
    stock: int,
    category: str,
    brand: str,
    specifications: str,
    image: UploadFile = File(...),
    current_user: User = Depends(current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can add products")

    try:
        specifications_dict = json.loads(specifications)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid specifications format. It should be a valid JSON string.")

    file_extension = image.filename.split('.')[-1]
    file_name = f"{datetime.utcnow().timestamp()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    product_dict = {
        "name": name,
        "description": description,
        "price": price,
        "stock": stock,
        "category": category,
        "brand": brand,
        "specifications": specifications_dict,
        "image_url": f"/uploads/{file_name}",
        "trending_score": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    result = products_collection.insert_one(product_dict)
    product_dict["id"] = str(result.inserted_id)
    return {"message": "Product added successfully", "product": product_dict}

# مسار لعرض جميع المنتجات
@app.get("/products")
async def get_products(brand: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if brand:
        query["brand"] = brand
    if category:
        query["category"] = category
    products = list(products_collection.find(query, {"_id": 0}))
    for product in products:
        product["available"] = product["stock"] > 0
    return products

# مسار للبحث عن منتج
@app.get("/products/search")
async def search_products(query: str):
    products = list(products_collection.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"brand": {"$regex": query, "$options": "i"}}
        ]
    }, {"_id": 0}))
    return products

# مسار لعرض المنتجات المتشابهة
@app.get("/products/similar/{product_id}")
async def get_similar_products(product_id: str):
    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    similar_products = list(products_collection.find({
        "category": product["category"],
        "brand": product["brand"],
        "_id": {"$ne": ObjectId(product_id)}
    }, {"_id": 0}))
    return similar_products

# مسار لتصنيف المنتجات حسب السعر
@app.get("/products/sort/price")
async def sort_products_by_price(order: str = "asc"):
    sort_order = 1 if order == "asc" else -1
    products = list(products_collection.find({}, {"_id": 0}).sort("price", sort_order))
    return products

# مسار لتحديد المنتجات الأكثر طلبًا
@app.get("/products/trending")
async def get_trending_products():
    cache_key = "trending_products"
    try:
        cached_response = redis_client.get(cache_key)
        if cached_response:
            print("Cache hit for trending products")
            return json.loads(cached_response)
    except redis.RedisError as e:
        print(f"Redis error: {e}, falling back to database")

    products = list(products_collection.find({}, {"_id": 0}).sort("trending_score", -1).limit(10))
    try:
        redis_client.setex(cache_key, 3600, json.dumps(products))
    except redis.RedisError as e:
        print(f"Redis error while setting cache: {e}")
    return products

# مسار لإنشاء طلب جديد
async def process_payment_with_tamara(order: Order):
    print(f"Processing payment with Tamara for order: {order}")
    return {"status": "success", "payment_id": "tamara_123"}

async def process_payment_with_tabby(order: Order):
    print(f"Processing payment with Tabby for order: {order}")
    return {"status": "success", "payment_id": "tabby_123"}

async def create_shipment_with_smsa(order: Order):
    print(f"Creating shipment with SMSA for order: {order}")
    return {"status": "success", "tracking_number": "smsa_123"}

async def create_shipment_with_aramex(order: Order):
    print(f"Creating shipment with Aramex for order: {order}")
    return {"status": "success", "tracking_number": "aramex_123"}

@app.post("/orders/create")
async def create_order(order: Order, current_user: User = Depends(current_active_user)):
    if order.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to create this order")

    order_dict = order.dict()
    order_dict["created_at"] = datetime.utcnow().isoformat()

    # تحديث المخزون
    for product in order_dict["products"]:
        product_id = product.get("product_id")
        quantity = product.get("quantity")
        db_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not db_product or db_product["stock"] < quantity:
            raise HTTPException(status_code=400, detail=f"Product {product_id} is out of stock")
        products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"stock": -quantity, "trending_score": quantity}}
        )

    # معالجة الدفع
    if order.payment_method == "Tamara":
        payment_result = await process_payment_with_tamara(order)
        order_dict["payment_id"] = payment_result["payment_id"]
    elif order.payment_method == "Tabby":
        payment_result = await process_payment_with_tabby(order)
        order_dict["payment_id"] = payment_result["payment_id"]
    elif order.payment_method == "CustomInstallment":
        order_dict["payment_id"] = "custom_installment_" + str(order_dict["created_at"])
    else:
        order_dict["payment_id"] = "cash_on_delivery"

    # معالجة التوصيل
    if order.delivery_method == "SMSA":
        shipment_result = await create_shipment_with_smsa(order)
        order_dict["tracking_number"] = shipment_result["tracking_number"]
    elif order.delivery_method == "Aramex":
        shipment_result = await create_shipment_with_aramex(order)
        order_dict["tracking_number"] = shipment_result["tracking_number"]
    else:
        order_dict["tracking_number"] = "site_pickup"

    result = orders_collection.insert_one(order_dict)
    order_dict["id"] = str(result.inserted_id)

    users_collection.update_one(
        {"id": order.user_id},
        {"$push": {"purchase_history": order_dict}}
    )
    return {"message": "Order created successfully", "order": order_dict}

# مسار لعرض طلبات المستخدم
@app.get("/orders")
async def get_orders(user: User = Depends(current_active_user)):
    orders = list(orders_collection.find({"user_id": str(user.id)}, {"_id": 0}))
    return orders

# مسار لإضافة عرض مخصص
@app.post("/offers/add")
async def add_offer(offer: Offer, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can add offers")
    offer_dict = offer.dict()
    offer_dict["created_at"] = datetime.utcnow().isoformat()
    result = offers_collection.insert_one(offer_dict)
    offer_dict["id"] = str(result.inserted_id)
    return {"message": "Offer added successfully", "offer": offer_dict}

# مسار لعرض العروض
@app.get("/offers")
async def get_offers():
    cache_key = "all_offers"
    try:
        cached_response = redis_client.get(cache_key)
        if cached_response:
            print("Cache hit for offers")
            return json.loads(cached_response)
    except redis.RedisError as e:
        print(f"Redis error: {e}, falling back to database")

    offers = list(offers_collection.find({}, {"_id": 0}))
    try:
        redis_client.setex(cache_key, 3600, json.dumps(offers))
    except redis.RedisError as e:
        print(f"Redis error while setting cache: {e}")
    return offers

# مسار للدردشة الذكية
class QARequest(BaseModel):
    question: str
    context: Optional[str] = None
    user_id: Optional[str] = None

@app.post("/chat/inquiry")
async def answer_question(request: QARequest, current_user: User = Depends(current_active_user)):
    if request.user_id and request.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DeepSeek API key not found")

    cache_key = f"qa:{request.question}:{request.context or 'default'}"
    cached_response = redis_client.get(cache_key)
    if cached_response:
        print("Cache hit:", cache_key)
        return json.loads(cached_response)

    try:
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant specialized in heavy machinery maintenance and spare parts."},
                {"role": "user", "content": f"Context: {request.context or 'Heavy machinery maintenance and spare parts'}\nQuestion: {request.question}"}
            ],
            "max_tokens": 1000,
            "stream": False
        }

        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        if "choices" not in result or not result["choices"]:
            raise HTTPException(status_code=500, detail=f"Invalid response from DeepSeek: 'choices' not found. Response: {result}")
        if "message" not in result["choices"][0] or "content" not in result["choices"][0]["message"]:
            raise HTTPException(status_code=500, detail=f"Invalid response from DeepSeek: 'message' or 'content' not found. Response: {result}")

        answer = result["choices"][0]["message"]["content"]
        response_data = {"answer": answer, "score": 0.9}

        redis_client.setex(cache_key, 86400, json.dumps(response_data))

        chat_entry = {
            "user_id": request.user_id or str(current_user.id),
            "question": request.question,
            "answer": answer,
            "context": request.context or "Heavy machinery maintenance and spare parts",
            "timestamp": datetime.utcnow().isoformat()
        }
        result = chat_history_collection.insert_one(chat_entry)
        chat_entry["id"] = str(result.inserted_id)

        return response_data

    except requests.exceptions.RequestException as e:
        error_detail = f"DeepSeek API error: {str(e)}. Status Code: {e.response.status_code if e.response else 'N/A'}"
        if e.response:
            error_detail += f" Response: {e.response.text}"
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

# مسار لعرض الأسئلة الشائعة
@app.get("/faqs")
async def get_faqs():
    faqs = list(faqs_collection.find({}, {"_id": 0}))
    return faqs

# مسار لإضافة سؤال وجواب
@app.post("/faqs")
async def add_faq(faq: FAQ, current_user: User = Depends(current_active_user)):
    faq_dict = faq.dict()
    faq_dict["added_by"] = "company" if current_user.is_superuser else "user"
    result = faqs_collection.insert_one(faq_dict)
    faq_dict["id"] = str(result.inserted_id)
    return {"message": "FAQ added successfully", "faq": faq_dict}

# مسار لحساب المبيعات الشهرية
@app.get("/stats/monthly-sales")
async def get_monthly_sales(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view stats")
    
    current_month = datetime.utcnow().strftime("%Y-%m")
    orders = list(orders_collection.find({"created_at": {"$regex": f"^{current_month}"}}, {"_id": 0}))
    total_sales = sum(order["total_price"] for order in orders)
    return {"month": current_month, "total_sales": total_sales, "orders_count": len(orders)}

# مسار لعرض عدد المنتجات في المستودع
@app.get("/stats/inventory")
async def get_inventory(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view stats")
    
    products = list(products_collection.find({}, {"_id": 0, "name": 1, "stock": 1}))
    return products