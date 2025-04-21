from fastapi import FastAPI, HTTPException, Depends, status, Request, UploadFile, File
from pydantic import BaseModel, EmailStr
import requests
import os
from dotenv import load_dotenv
import redis
import json
from pymongo import MongoClient
from datetime import datetime
from typing import List, Optional
from fastapi.responses import JSONResponse
from fastapi_users import FastAPIUsers, BaseUserManager
from fastapi_users.authentication import BearerTransport, JWTStrategy, AuthenticationBackend
from fastapi_users.db import BaseUserDatabase
from fastapi_users.schemas import BaseUserCreate
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
import shutil
from pathlib import Path
from passlib.context import CryptContext

# تحميل متغيرات البيئة
load_dotenv()
print(f"Loaded SECRET_KEY: {os.getenv('SECRET_KEY')}")

app = FastAPI()

# إعداد تشفير كلمات المرور
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# إعداد Redis للتخزين المؤقت
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# إعداد مجلد لتخزين الصور
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# دالة لإنشاء MongoClient
def get_mongo_client():
    return MongoClient('mongodb://localhost:27017/')

# دالة لإنشاء user_db
def get_user_db():
    mongo_client = get_mongo_client()
    db = mongo_client['HeavyMachinery']
    users_collection = db['Users']
    # إضافة فهرسة لتحسين الأداء
    users_collection.create_index([("email", 1)])
    users_collection.create_index([("username", 1), ("phoneNumber", 1)])  # فهرسة إضافية لاسم المستخدم ورقم الهاتف
    return MongoDBUserDatabase(users_collection)

# رابط DeepSeek API
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# نموذج المستخدم لإنشاء مستخدم جديد (UserCreate)
class UserCreate(BaseUserCreate):
    subscription: bool = False
    username: str  # إضافة حقل اسم المستخدم
    phoneNumber: str  # إضافة حقل رقم الهاتف

# نموذج المستخدم لإرجاع بيانات المستخدم (User)
class User(BaseModel):
    id: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    subscription: bool = False
    purchase_history: List[dict] = []
    username: str  # إضافة حقل اسم المستخدم
    phoneNumber: str  # إضافة حقل رقم الهاتف
    class Config:
        from_attributes = True

# قاعدة بيانات المستخدمين المخصصة باستخدام pymongo
class MongoDBUserDatabase(BaseUserDatabase[User, str]):
    def __init__(self, collection):
        self.collection = collection

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

    async def create(self, user: dict) -> User:
        # التحقق من عدم تكرار اسم المستخدم
        if await self.get_by_username(user["username"]):
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")

        # تشفير كلمة المرور
        user["hashed_password"] = pwd_context.hash(user["hashed_password"])

        # التحقق من عدم تكرار كلمة المرور المشفرة
        existing_password = self.collection.find_one({"hashed_password": user["hashed_password"]})
        if existing_password:
            raise HTTPException(status_code=400, detail="كلمة المرور مستخدمة بالفعل")

        # التحقق من وجود رقم الهاتف
        if not user.get("phoneNumber"):
            raise HTTPException(status_code=400, detail="رقم الهاتف مطلوب")

        # التأكد من إضافة الحقول الافتراضية
        user.setdefault("is_active", True)
        user.setdefault("is_superuser", False)
        user.setdefault("purchase_history", [])
        user_dict = user.copy()
        result = self.collection.insert_one(user_dict)
        user_dict["id"] = str(result.inserted_id)
        self.collection.update_one({"_id": result.inserted_id}, {"$set": {"id": str(result.inserted_id)}})
        return User(**user_dict)

    async def update(self, user: User) -> User:
        user_dict = user.dict()
        if "hashed_password" in user_dict:
            user_dict["hashed_password"] = pwd_context.hash(user_dict["hashed_password"])
        self.collection.update_one({"_id": ObjectId(user.id)}, {"$set": user_dict})
        return user

    async def delete(self, user: User) -> None:
        self.collection.delete_one({"_id": ObjectId(user.id)})

# إعداد مدير المستخدمين
class UserManager(BaseUserManager[User, str]):
    reset_password_token_secret = os.getenv("SECRET_KEY", "your-secret-key")
    verification_token_secret = os.getenv("SECRET_KEY", "your-secret-key")

    def __init__(self, user_db):
        super().__init__(user_db)
        print(f"SECRET_KEY used: {self.reset_password_token_secret}")  # طباعة الـ SECRET_KEY للتأكد

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    def parse_id(self, value: str) -> str:
        return value  # بما إن الـ user_id هو str بالفعل، بنرجعه كما هو

# دالة للحصول على user_db كـ dependency
async def get_user_db_dependency():
    return get_user_db()

# دالة للحصول على user_manager
async def get_user_manager(user_db=Depends(get_user_db_dependency)):
    yield UserManager(user_db)

# إعداد المصادقة
bearer_transport = BearerTransport(tokenUrl="/auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    secret = os.getenv("SECRET_KEY", "your-secret-key")
    print(f"Using SECRET_KEY for JWT: {secret}")  # تسجيل الـ SECRET_KEY
    return JWTStrategy(secret=secret, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, str](
    get_user_manager,
    [auth_backend],
)

# إضافة مسارات المصادقة
app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
app.include_router(fastapi_users.get_register_router(User, UserCreate), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_users_router(User, User), prefix="/users", tags=["users"])

# مسار مخصص لتسجيل مستخدم جديد مع التحقق من الحقول
@app.post("/auth/register")
async def register_user(user_data: dict):
    # التحقق من وجود الحقول المطلوبة
    required_fields = ["username", "password", "phoneNumber", "email"]
    for field in required_fields:
        if field not in user_data:
            raise HTTPException(status_code=400, detail=f"الحقل {field} مطلوب")

    # التحقق من عدم تكرار اسم المستخدم
    existing_user = users_collection.find_one({"username": user_data["username"]})
    if existing_user:
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")

    # التحقق من عدم تكرار البريد الإلكتروني
    existing_email = users_collection.find_one({"email": user_data["email"]})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    # التحقق من عدم تكرار رقم الهاتف
    existing_phone = users_collection.find_one({"phoneNumber": user_data["phoneNumber"]})
    if existing_phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم بالفعل")

    # تشفير كلمة المرور
    user_data["hashed_password"] = pwd_context.hash(user_data["password"])
    user_data.pop("password")

    # التحقق من عدم تكرار كلمة المرور المشفرة
    existing_password = users_collection.find_one({"hashed_password": user_data["hashed_password"]})
    if existing_password:
        raise HTTPException(status_code=400, detail="كلمة المرور مستخدمة بالفعل")

    # حفظ المستخدم في قاعدة البيانات
    user_data["is_active"] = True
    user_data["is_superuser"] = False
    user_data["subscription"] = False
    user_data["purchase_history"] = []
    user_data["created_at"] = datetime.utcnow()

    result = users_collection.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    user_data["id"] = str(result.inserted_id)
    return {"message": "تم إنشاء الحساب بنجاح", "user_id": str(result.inserted_id)}

# مسار للتحقق من حالة تسجيل الدخول
@app.get("/auth/check")
async def check_user(current_user: User = Depends(fastapi_users.current_user(active=True))):
    return {"user_id": current_user.id, "username": current_user.username}

# إعداد MongoDB لتخزين البيانات (بدون users_collection هنا)
mongo_client = get_mongo_client()
db = mongo_client['HeavyMachinery']
products_collection = db['Products']
orders_collection = db['Orders']
chat_collection = db['ChatHistory']
feedback_collection = db['Feedback']
offers_collection = db['Offers']

# إضافة فهرسة لتحسين الأداء
products_collection.create_index([("name", 1)])
products_collection.create_index([("description", 1)])
orders_collection.create_index([("user_id", 1)])
chat_collection.create_index([("user_id", 1)])
offers_collection.create_index([("product_id", 1)])

# نماذج البيانات
class Product(BaseModel):
    name: str
    description: str
    price: float
    stock: int
    category: str
    specifications: dict
    image_url: Optional[str] = None  # حقل جديد لتخزين مسار الصورة

class Order(BaseModel):
    user_id: str
    products: List[dict]
    total_price: float
    payment_method: str  # "Tamara", "Tabby", "CustomInstallment", "Cash"
    delivery_method: str  # "SMSA", "Aramex", "SitePickup"
    status: str = "Pending"

class QARequest(BaseModel):
    question: str
    context: str = None
    user_id: str = None

class Offer(BaseModel):
    product_id: str
    discount: float
    description: str

class Feedback(BaseModel):
    user_id: str
    comment: str
    rating: int

# دوال محاكاة الدمج مع خدمات الدفع والتوصيل
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

# Endpoint لرفع الصور
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    file_extension = file.filename.split('.')[-1]
    file_name = f"{datetime.utcnow().timestamp()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_url": f"/uploads/{file_name}"}

# Endpoint لإضافة منتج جديد مع صورة
@app.post("/products/add")
async def add_product(
    name: str,
    description: str,
    price: float,
    stock: int,
    category: str,
    specifications: str,  # استقبال specifications كـ string
    image: UploadFile = File(...),
    current_user: User = Depends(fastapi_users.current_user(active=True))
):
    # تحويل specifications من string إلى dictionary
    try:
        specifications_dict = json.loads(specifications)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid specifications format. It should be a valid JSON string.")

    # رفع الصورة
    file_extension = image.filename.split('.')[-1]
    file_name = f"{datetime.utcnow().timestamp()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    # إنشاء المنتج
    product_dict = {
        "name": name,
        "description": description,
        "price": price,
        "stock": stock,
        "category": category,
        "specifications": specifications_dict,
        "image_url": f"/uploads/{file_name}",
        "trending_score": 0
    }
    result = products_collection.insert_one(product_dict)
    product_dict['_id'] = str(result.inserted_id)
    return {"message": "Product added successfully", "product": product_dict}

# Endpoint لعرض جميع المنتجات
@app.get("/products")
async def get_products():
    products = list(products_collection.find())
    for product in products:
        product['_id'] = str(product['_id'])
    return products

# Endpoint للبحث عن منتج
@app.get("/products/search")
async def search_products(query: str):
    products = list(products_collection.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    }))
    for product in products:
        product['_id'] = str(product['_id'])
    return products

# Endpoint لعرض المنتجات المتشابهة
@app.get("/products/similar/{product_id}")
async def get_similar_products(product_id: str):
    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    similar_products = list(products_collection.find({
        "category": product["category"],
        "_id": {"$ne": ObjectId(product_id)}
    }))
    for p in similar_products:
        p['_id'] = str(p['_id'])
    return similar_products

# Endpoint لتصنيف المنتجات حسب السعر
@app.get("/products/sort/price")
async def sort_products_by_price(order: str = "asc"):
    sort_order = 1 if order == "asc" else -1
    products = list(products_collection.find().sort("price", sort_order))
    for product in products:
        product['_id'] = str(product['_id'])
    return products

# Endpoint لتحديد المنتجات الأكثر طلبًا
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

    products = list(products_collection.find().sort("trending_score", -1).limit(10))
    for product in products:
        product['_id'] = str(product['_id'])
    
    try:
        redis_client.setex(cache_key, 3600, json.dumps(products))
    except redis.RedisError as e:
        print(f"Redis error while setting cache: {e}")

    return products

# Endpoint لإنشاء طلب جديد
@app.post("/orders/create")
async def create_order(order: Order, current_user: User = Depends(fastapi_users.current_user(active=True))):
    if order.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to create this order")

    order_dict = order.dict()
    order_dict['created_at'] = datetime.utcnow()
    
    # تحديث المخزون
    for product in order_dict['products']:
        product_id = product['product_id']
        quantity = product['quantity']
        db_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not db_product or db_product['stock'] < quantity:
            raise HTTPException(status_code=400, detail=f"Product {product_id} is out of stock")
        products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"stock": -quantity, "trending_score": quantity}}
        )
    
    # معالجة الدفع
    if order.payment_method == "Tamara":
        payment_result = await process_payment_with_tamara(order)
        order_dict['payment_id'] = payment_result['payment_id']
    elif order.payment_method == "Tabby":
        payment_result = await process_payment_with_tabby(order)
        order_dict['payment_id'] = payment_result['payment_id']
    elif order.payment_method == "CustomInstallment":
        order_dict['payment_id'] = "custom_installment_" + str(order_dict['created_at'])
    else:
        order_dict['payment_id'] = "cash_on_delivery"

    # معالجة التوصيل
    if order.delivery_method == "SMSA":
        shipment_result = await create_shipment_with_smsa(order)
        order_dict['tracking_number'] = shipment_result['tracking_number']
    elif order.delivery_method == "Aramex":
        shipment_result = await create_shipment_with_aramex(order)
        order_dict['tracking_number'] = shipment_result['tracking_number']
    else:
        order_dict['tracking_number'] = "site_pickup"

    result = orders_collection.insert_one(order_dict)
    order_dict['_id'] = str(result.inserted_id)
    
    # تحديث سجل المشتريات
    users_collection.update_one(
        {"id": order.user_id},
        {"$push": {"purchase_history": order_dict}}
    )
    return {"message": "Order created successfully", "order": order_dict}

# Endpoint لتحديد العملاء الدائمين
@app.get("/users/loyal")
async def get_loyal_customers(current_user: User = Depends(fastapi_users.current_user(active=True))):
    users = list(users_collection.find())
    loyal_customers = []
    for user in users:
        purchase_count = len(user.get("purchase_history", []))
        if purchase_count >= 5:
            user['_id'] = str(user['_id'])
            loyal_customers.append(user)
    return loyal_customers

# Endpoint لإضافة عرض مخصص
@app.post("/offers/add")
async def add_offer(offer: Offer, current_user: User = Depends(fastapi_users.current_user(active=True))):
    offer_dict = offer.dict()
    offer_dict['created_at'] = datetime.utcnow()
    result = offers_collection.insert_one(offer_dict)
    offer_dict['_id'] = str(result.inserted_id)
    return {"message": "Offer added successfully", "offer": offer_dict}

# Endpoint لعرض العروض
@app.get("/offers")
async def get_offers(current_user: User = Depends(fastapi_users.current_user(active=True))):
    cache_key = "all_offers"
    try:
        cached_response = redis_client.get(cache_key)
        if cached_response:
            print("Cache hit for offers")
            return json.loads(cached_response)
    except redis.RedisError as e:
        print(f"Redis error: {e}, falling back to database")

    offers = list(offers_collection.find())
    for offer in offers:
        offer['_id'] = str(offer['_id'])
    
    try:
        redis_client.setex(cache_key, 3600, json.dumps(offers))
    except redis.RedisError as e:
        print(f"Redis error while setting cache: {e}")

    return offers

# Endpoint لإبداء الرأي
@app.post("/feedback")
async def submit_feedback(feedback: Feedback, current_user: User = Depends(fastapi_users.current_user(active=True))):
    if feedback.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to submit feedback")
    
    feedback_dict = feedback.dict()
    feedback_dict['created_at'] = datetime.utcnow()
    result = feedback_collection.insert_one(feedback_dict)
    feedback_dict['_id'] = str(result.inserted_id)
    return {"message": "Feedback submitted successfully", "feedback": feedback_dict}

# Endpoint للاستفسار الذكي
@app.post("/chat/inquiry")
async def answer_question(request: QARequest, current_user: User = Depends(fastapi_users.current_user(active=True))):
    print(f"Received request: {request.dict()}")
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
            "timestamp": datetime.utcnow()
        }
        result = chat_collection.insert_one(chat_entry)
        chat_entry['_id'] = str(result.inserted_id)

        return response_data

    except requests.exceptions.RequestException as e:
        error_detail = f"DeepSeek API error: {str(e)}. Status Code: {e.response.status_code if e.response else 'N/A'}"
        if e.response:
            error_detail += f" Response: {e.response.text}"
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")