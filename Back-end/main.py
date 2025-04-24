from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File, Response
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
from fastapi.responses import JSONResponse

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
installment_plans_collection = db["installment_plans"]
maintenance_articles_collection = db["maintenance_articles"]

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
    is_superuser: bool = False

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
    created_at: Optional[str] = None  # إضافة حقل created_at

    class Config:
        extra = "ignore"  # تجاهل الحقول الإضافية غير المُعرفة

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
            user_data = {
                "id": str(user["_id"]),
                "email": user.get("email", ""),
                "hashed_password": user.get("hashed_password", ""),
                "is_active": user.get("is_active", True),
                "is_superuser": user.get("is_superuser", False),
                "subscription": user.get("subscription", False),
                "purchase_history": user.get("purchase_history", []),
                "username": user.get("username", ""),
                "phoneNumber": user.get("phoneNumber", ""),
                "created_at": user.get("created_at", None),
            }
            try:
                return User(**user_data)
            except Exception as e:
                print(f"Error converting user to User model: {str(e)}")
                return {"id": user_data["id"], **user_data}
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
        user_dict["is_superuser"] = user_dict["is_superuser"]
        user_dict["purchase_history"] = []
        user_dict["cart"] = []
        user_dict["favorites"] = []
        user_dict["preferred_products"] = []
        user_dict["created_at"] = datetime.utcnow().isoformat()
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

# إضافة مسارات المصادقة الافتراضية لـ fastapi-users
auth_router = fastapi_users.get_auth_router(auth_backend)
app.include_router(auth_router, prefix="/auth")

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

class MaintenanceArticle(BaseModel):
    title: str
    content: str
    customer_type: str  # "عادي" أو "دائم"

class Feedback(BaseModel):
    product_id: str
    user_id: str
    rating: int
    comment: str
    created_at: str

class InstallmentPlan(BaseModel):
    down_payment: float
    months: int
    auto_approve: bool

class Brand(BaseModel):
    id: str
    name: str
    image: Optional[str] = None

class CartItem(BaseModel):
    id: str
    name: str
    price: float
    image: str
    quantity: int
    brand: str

class FavoriteItem(BaseModel):
    productId: str
    name: str
    price: float
    image: str

class Subscription(BaseModel):
    id: str
    userId: str
    status: str  # "active", "paused", "canceled"
    lastOrderDate: Optional[str] = None
    preferredProducts: List[str] = []

class SubscriptionStats(BaseModel):
    active: int
    paused: int
    canceled: int

class OrderSummary(BaseModel):
    orderId: str
    date: str
    amount: float
    products: List[dict]

class CouponResponse(BaseModel):
    discount: Optional[float] = None
    error: Optional[str] = None

class CheckoutResponse(BaseModel):
    orderId: str
    installmentAmount: Optional[dict] = None

# مسار تسجيل الدخول (النسخة المُحدثة)
@app.post("/auth/manual-login")
async def manual_login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        # جلب المستخدم من قاعدة البيانات
        print(f"Fetching user with username: {form_data.username}")
        db_user = users_collection.find_one({"username": form_data.username})
        if not db_user:
            print("User not found")
            raise HTTPException(status_code=400, detail="Incorrect username or password")

        # التحقق من كلمة المرور
        print("Verifying password")
        if not pwd_context.verify(form_data.password, db_user["hashed_password"]):
            print("Password verification failed")
            raise HTTPException(status_code=400, detail="Incorrect username or password")

        # التحقق من حالة المستخدم
        print("Checking user active status")
        if not db_user.get("is_active", True):
            print("User is inactive")
            raise HTTPException(status_code=400, detail="Inactive user")

        # استخراج معرف المستخدم
        print("Extracting user ID")
        user_id = str(db_user["_id"])
        print(f"User ID: {user_id}")

        # إنشاء الـ Token
        print("Creating JWT token")
        jwt_strategy = get_jwt_strategy()
        print(f"JWT Strategy: {jwt_strategy}")
        access_token = await jwt_strategy.write_token({"sub": user_id})
        print(f"Access Token: {access_token}")
        if not access_token:
            print("Failed to generate access token")
            raise HTTPException(status_code=500, detail="Failed to generate access token")

        return JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    except HTTPException as he:
        print(f"HTTP Exception: {he.detail}")
        raise he
    except Exception as e:
        print(f"Error in manual_login: {str(e)}")
        error_detail = str(e) if str(e) else "Unknown error occurred"
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {error_detail}")

# مسار تسجيل مستخدم جديد (إزالة التكرار)
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
    user_data["is_superuser"] = user_data.get("is_superuser", False)
    user_data["subscription"] = user_data.get("subscription", False)
    user_data["purchase_history"] = []
    user_data["cart"] = []
    user_data["favorites"] = []
    user_data["preferred_products"] = []
    user_data["created_at"] = datetime.utcnow().isoformat()

    result = users_collection.insert_one(user_data)
    user_data["id"] = str(result.inserted_id)
    return {"message": "تم إنشاء الحساب بنجاح", "user_id": str(result.inserted_id)}

# مسار مخصص لتسجيل مسؤول
@app.post("/auth/register/admin")
async def register_admin(user_data: dict):
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
    user_data["is_superuser"] = True
    user_data["subscription"] = user_data.get("subscription", False)
    user_data["purchase_history"] = []
    user_data["cart"] = []
    user_data["favorites"] = []
    user_data["preferred_products"] = []
    user_data["created_at"] = datetime.utcnow().isoformat()

    result = users_collection.insert_one(user_data)
    user_data["id"] = str(result.inserted_id)
    return {"message": "تم إنشاء حساب المسؤول بنجاح", "user_id": str(result.inserted_id)}

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
        "created_at": datetime.utcnow().isoformat(),
        "is_hidden": False
    }
    result = products_collection.insert_one(product_dict)
    product_dict["id"] = str(result.inserted_id)
    return {"message": "Product added successfully", "product": product_dict}

# مسار لتعديل منتج
@app.put("/products/{product_id}")
async def update_product(
    product_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    price: Optional[float] = None,
    stock: Optional[int] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    specifications: Optional[str] = None,
    image: UploadFile = File(None),
    current_user: User = Depends(current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can update products")

    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {}
    if name: update_data["name"] = name
    if description: update_data["description"] = description
    if price: update_data["price"] = price
    if stock is not None: update_data["stock"] = stock
    if category: update_data["category"] = category
    if brand: update_data["brand"] = brand
    if specifications:
        try:
            update_data["specifications"] = json.loads(specifications)
        except json.JSONDecodeError:
            raise HTTPException(status_code=422, detail="Invalid specifications format. It should be a valid JSON string.")
    if image:
        file_extension = image.filename.split('.')[-1]
        file_name = f"{datetime.utcnow().timestamp()}.{file_extension}"
        file_path = UPLOAD_DIR / file_name
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        update_data["image_url"] = f"/uploads/{file_name}"

    if update_data:
        products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})

    updated_product = products_collection.find_one({"_id": ObjectId(product_id)}, {"_id": 0})
    return {"message": "Product updated successfully", "product": updated_product}

# مسار لحذف منتج
@app.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can delete products")

    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    products_collection.delete_one({"_id": ObjectId(product_id)})
    return {"message": "Product deleted successfully"}

# مسار لإخفاء منتج
@app.put("/products/{product_id}/hide")
async def hide_product(product_id: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can hide products")

    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": {"is_hidden": True}})
    return {"message": "Product hidden successfully"}

# مسار لإظهار منتج مخفي
@app.put("/products/{product_id}/show")
async def show_product(product_id: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can show products")

    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": {"is_hidden": False}})
    return {"message": "Product shown successfully"}

# مسار لعرض جميع المنتجات مع فلترة متقدمة
@app.get("/products")
async def get_products(
    brand: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_stock: Optional[int] = None,
    start_date: Optional[str] = None,
    include_hidden: bool = False
):
    query = {}
    if not include_hidden:
        query["is_hidden"] = False
    if brand:
        query["brand"] = brand
    if category:
        query["category"] = category
    if min_price:
        query["price"] = {"$gte": min_price}
    if max_price:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    if min_stock:
        query["stock"] = {"$gte": min_stock}
    if start_date:
        query["created_at"] = {"$gte": start_date}

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

# مسار لتحديد المنتجات ذات المخزون المنخفض
@app.get("/products/low-stock")
async def get_low_stock_products(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view low stock products")

    low_stock_products = list(products_collection.find({"stock": {"$lte": 5}}, {"_id": 0}))
    return low_stock_products

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

# مسار لعرض جميع الطلبات (للمسؤول)
@app.get("/admin/orders")
async def get_all_orders(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view all orders")

    query = {}
    if status:
        query["status"] = status
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}

    orders = list(orders_collection.find(query, {"_id": 0}))
    return orders

# مسار لتغيير حالة الطلب
@app.put("/orders/{order_id}/status")
async def change_order_status(order_id: str, status: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can change order status")

    order = orders_collection.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    orders_collection.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": status}})
    return {"message": "Order status updated successfully"}

# مسار لجلب الطلبات الجديدة (للمسؤول)
@app.get("/orders/new")
async def get_new_orders(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view new orders")

    new_orders = list(orders_collection.find({"status": "Pending"}, {"_id": 0}))
    return new_orders

# مسار لتصدير الطلبات (للمسؤول)
@app.get("/orders/export")
async def export_orders(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can export orders")

    orders = list(orders_collection.find({}, {"_id": 0}))
    if not orders:
        raise HTTPException(status_code=404, detail="No orders found")

    csv_data = "Order ID,User ID,Total Price,Status,Created At\n"
    for order in orders:
        csv_data += f"{order['id']},{order['user_id']},{order['total_price']},{order['status']},{order['created_at']}\n"

    return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=orders.csv"})

# مسار لإضافة طلب يدوي (للمسؤول)
@app.post("/orders/create/manual")
async def create_manual_order(order: Order, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can create manual orders")

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

# مسار لعرض تفاصيل طلب معين (للمسؤول)
@app.get("/orders/{order_id}")
async def get_order_details(order_id: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view order details")

    order = orders_collection.find_one({"_id": ObjectId(order_id)}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    user = users_collection.find_one({"id": order["user_id"]}, {"_id": 0, "hashed_password": 0})
    order["customer"] = user if user else {"error": "Customer not found"}
    return order

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

# مسار لجلب قائمة العملاء (للمسؤول)
@app.get("/customers")
async def get_customers(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view customers")

    customers = list(users_collection.find({}, {"_id": 0, "hashed_password": 0}))
    for customer in customers:
        customer["orders_count"] = len(customer["purchase_history"])
        customer["last_order"] = customer["purchase_history"][-1]["created_at"] if customer["purchase_history"] else None
        total_spent = sum(order["total_price"] for order in customer["purchase_history"])
        customer["customer_type"] = "دائم" if customer["orders_count"] > 5 or total_spent > 1000 else "عادي"
    return customers

# مسار لإرسال عروض خاصة للعملاء (للمسؤول)
@app.post("/customers/{customer_id}/send-offer")
async def send_offer(customer_id: str, offer_description: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can send offers")

    customer = users_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {"message": f"Offer sent to {customer['email']}: {offer_description}"}

# مسار لإدارة خطط التقسيط (للمسؤول)
@app.post("/payments/installment-plan")
async def create_installment_plan(down_payment: float, months: int, auto_approve: bool, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can create installment plans")

    plan = {
        "down_payment": down_payment,
        "months": months,
        "auto_approve": auto_approve,
        "created_at": datetime.utcnow().isoformat()
    }
    installment_plans_collection.insert_one(plan)
    return {"message": "Installment plan created successfully", "plan": plan}

# مسار لجلب تقارير المدفوعات (للمسؤول)
@app.get("/payments/report")
async def get_payments_report(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view payments report")

    orders = list(orders_collection.find({}, {"_id": 0}))
    successful = sum(1 for order in orders if order["status"] == "Completed")
    failed = sum(1 for order in orders if order["status"] == "Failed")
    pending = sum(1 for order in orders if order["status"] == "Pending")

    return {
        "successful": successful,
        "failed": failed,
        "pending": pending,
        "total_orders": len(orders)
    }

# مسار لإدارة الاشتراكات (للمسؤول)
@app.put("/subscriptions/{customer_id}")
async def manage_subscription(customer_id: str, action: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can manage subscriptions")

    customer = users_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if action not in ["activate", "pause", "cancel"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    subscription_status = {"activate": True, "pause": False, "cancel": False}
    users_collection.update_one({"id": customer_id}, {"$set": {"subscription": subscription_status[action]}})
    return {"message": f"Subscription {action}d successfully"}

# مسار لجلب إحصائيات التفاعل مع الاشتراكات (للمسؤول)
@app.get("/subscriptions/engagement")
async def get_subscription_engagement(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view subscription engagement")

    subscribers = list(users_collection.find({"subscription": True}, {"_id": 0}))
    engagement = []
    for subscriber in subscribers:
        orders = subscriber["purchase_history"]
        monthly_engagement = len([order for order in orders if order["created_at"].startswith("2025-04")])
        engagement.append({
            "customer_id": subscriber["id"],
            "username": subscriber["username"],
            "monthly_orders": monthly_engagement
        })
    return engagement

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

# مسار لإضافة مقال صيانة (للمسؤول)
@app.post("/maintenance/articles")
async def add_maintenance_article(title: str, content: str, customer_type: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can add maintenance articles")

    article = {
        "title": title,
        "content": content,
        "customer_type": customer_type,
        "created_at": datetime.utcnow().isoformat()
    }
    maintenance_articles_collection.insert_one(article)
    return {"message": "Article added successfully", "article": article}

# مسار لجلب مقالات الصيانة
@app.get("/maintenance/articles")
async def get_maintenance_articles(customer_type: Optional[str] = None):
    query = {}
    if customer_type:
        query["customer_type"] = customer_type
    articles = list(maintenance_articles_collection.find(query, {"_id": 0}))
    return articles

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

# مسار لإضافة رأي عميل
@app.post("/feedback")
async def add_feedback(product_id: str, rating: int, comment: str, current_user: User = Depends(current_active_user)):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    feedback = {
        "product_id": product_id,
        "user_id": current_user.id,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.utcnow().isoformat()
    }
    feedback_collection.insert_one(feedback)
    return {"message": "Feedback added successfully", "feedback": feedback}

# مسار لجلب الآراء مع تصفية حسب التقييم
@app.get("/feedback")
async def get_feedback(min_rating: Optional[int] = None, max_rating: Optional[int] = None):
    query = {}
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if max_rating:
        if "rating" in query:
            query["rating"]["$lte"] = max_rating
        else:
            query["rating"] = {"$lte": max_rating}

    feedbacks = list(feedback_collection.find(query, {"_id": 0}))
    return feedbacks

# مسار لحساب المبيعات (يومي/أسبوعي/شهري)
@app.get("/stats/sales")
async def get_sales_report(period: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view sales report")

    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(status_code=400, detail="Invalid period. Use 'daily', 'weekly', or 'monthly'")

    if period == "daily":
        date_pattern = datetime.utcnow().strftime("%Y-%m-%d")
    elif period == "weekly":
        date_pattern = datetime.utcnow().strftime("%Y-%W")
    else:
        date_pattern = datetime.utcnow().strftime("%Y-%m")

    orders = list(orders_collection.find({"created_at": {"$regex": f"^{date_pattern}"}}, {"_id": 0}))
    total_sales = sum(order["total_price"] for order in orders)
    top_products = {}
    for order in orders:
        for product in order["products"]:
            product_id = product["product_id"]
            top_products[product_id] = top_products.get(product_id, 0) + product["quantity"]
    top_products = [{"product_id": k, "quantity_sold": v} for k, v in top_products.items()]
    top_products.sort(key=lambda x: x["quantity_sold"], reverse=True)

    return {
        "period": period,
        "total_sales": total_sales,
        "orders_count": len(orders),
        "top_products": top_products[:5]
    }

# مسار لتحليل سلوك العملاء (للمسؤول)
@app.get("/stats/customer-behavior")
async def get_customer_behavior(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view customer behavior")

    customers = list(users_collection.find({}, {"_id": 0}))
    behavior = []
    for customer in customers:
        orders = customer["purchase_history"]
        most_viewed_category = {}
        for order in orders:
            for product in order["products"]:
                product_info = products_collection.find_one({"_id": ObjectId(product["product_id"])})
                if product_info:
                    category = product_info["category"]
                    most_viewed_category[category] = most_viewed_category.get(category, 0) + product["quantity"]
        most_viewed = max(most_viewed_category.items(), key=lambda x: x[1], default=("Unknown", 0))[0]
        purchase_times = [order["created_at"].split("T")[1][:2] for order in orders]
        most_common_hour = max(set(purchase_times), key=purchase_times.count, default="Unknown")
        behavior.append({
            "customer_id": customer["id"],
            "username": customer["username"],
            "most_viewed_category": most_viewed,
            "most_common_purchase_hour": most_common_hour
        })
    return behavior

# مسار لعرض عدد المنتجات في المستودع
@app.get("/stats/inventory")
async def get_inventory(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view stats")

    products = list(products_collection.find({}, {"_id": 0, "name": 1, "stock": 1}))
    return products

# إدارة العلامات التجارية (Brands)
@app.get("/api/brands")
async def get_brands():
    brands = products_collection.distinct("brand")
    brands_list = [
        {"id": str(i), "name": brand, "image": f"/brands/{brand.lower()}.png"}
        for i, brand in enumerate(brands)
    ]
    return brands_list

# إدارة المنتجات (Products)
@app.get("/api/products")
async def get_products(
    brand: Optional[str] = None,
    car: Optional[str] = None,
    part: Optional[str] = None
):
    query = {}
    if brand:
        query["brand"] = brand
    if car:
        query["specifications.car"] = car
    if part:
        query["specifications.part"] = part

    products = list(products_collection.find(query, {"_id": 0}))
    for product in products:
        product["id"] = product.get("id", str(products_collection.find_one({"name": product["name"]})["_id"]))
        product["offer"] = product.get("offer", 0)
        product["topSeller"] = product.get("trending_score", 0) > 10
        product["new"] = product.get("created_at", "").startswith("2025")
        product["car"] = product.get("specifications", {}).get("car", "")
        product["part"] = product.get("specifications", {}).get("part", "")
    return products

@app.get("/api/suggested-products")
async def get_suggested_products(current_user: User = Depends(current_active_user)):
    products = list(products_collection.find({}, {"_id": 0}).sort("trending_score", -1).limit(5))
    for product in products:
        product["id"] = product.get("id", str(products_collection.find_one({"name": product["name"]})["_id"]))
        product["originalPrice"] = product["price"] * 1.2
        product["rating"] = 4.5
    return products

# إدارة السلة (Cart)
@app.get("/api/cart")
async def get_cart(current_user: User = Depends(current_active_user)):
    user = users_collection.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    cart_items = user.get("cart", [])
    return cart_items

@app.post("/api/cart")
async def add_to_cart(product_id: str, quantity: int, current_user: User = Depends(current_active_user)):
    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart_item = {
        "id": str(product["_id"]),
        "name": product["name"],
        "price": product["price"],
        "image": product["image_url"],
        "quantity": quantity,
        "brand": product["brand"]
    }
    
    users_collection.update_one(
        {"id": current_user.id},
        {"$push": {"cart": cart_item}},
        upsert=True
    )
    return {"message": "Product added to cart successfully"}

@app.put("/api/cart/{item_id}")
async def update_cart_item(item_id: str, quantity: int, current_user: User = Depends(current_active_user)):
    result = users_collection.update_one(
        {"id": current_user.id, "cart.id": item_id},
        {"$set": {"cart.$.quantity": quantity}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return {"message": "Cart item updated successfully"}

@app.delete("/api/cart/{item_id}")
async def remove_from_cart(item_id: str, current_user: User = Depends(current_active_user)):
    result = users_collection.update_one(
        {"id": current_user.id},
        {"$pull": {"cart": {"id": item_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return {"message": "Cart item removed successfully"}

# إدارة المفضلة (Favorites)
@app.get("/api/favorites")
async def get_favorites(current_user: User = Depends(current_active_user)):
    user = users_collection.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    favorites = user.get("favorites", [])
    return favorites

@app.post("/api/favorites")
async def add_to_favorites(product_id: str, current_user: User = Depends(current_active_user)):
    product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    favorite_item = {
        "productId": str(product["_id"]),
        "name": product["name"],
        "price": product["price"],
        "image": product["image_url"]
    }
    
    users_collection.update_one(
        {"id": current_user.id},
        {"$push": {"favorites": favorite_item}},
        upsert=True
    )
    return {"message": "Product added to favorites successfully"}

@app.delete("/api/favorites/{product_id}")
async def remove_from_favorites(product_id: str, current_user: User = Depends(current_active_user)):
    result = users_collection.update_one(
        {"id": current_user.id},
        {"$pull": {"favorites": {"productId": product_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Favorite item not found")
    return {"message": "Product removed from favorites successfully"}

# إدارة الاشتراكات (Subscriptions)
@app.get("/api/subscriptions")
async def get_subscriptions(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view subscriptions")
    subscriptions = list(users_collection.find({"subscription": {"$ne": None}}, {"_id": 0}))
    subscriptions_list = [
        {
            "id": str(i),
            "userId": user["id"],
            "status": "active" if user["subscription"] else "paused",
            "lastOrderDate": user["purchase_history"][-1]["created_at"] if user["purchase_history"] else None,
            "preferredProducts": user.get("preferred_products", [])
        }
        for i, user in enumerate(subscriptions)
    ]
    return subscriptions_list

@app.post("/api/subscriptions")
async def add_subscription(user_id: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can add subscriptions")
    user = users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_collection.update_one(
        {"id": user_id},
        {"$set": {"subscription": True, "preferred_products": []}}
    )
    subscription = {
        "id": str(user_id),
        "userId": user_id,
        "status": "active",
        "lastOrderDate": user["purchase_history"][-1]["created_at"] if user["purchase_history"] else None,
        "preferredProducts": []
    }
    return subscription

@app.put("/api/subscriptions/{id}")
async def update_subscription(id: str, status: str, last_order_date: Optional[str] = None, preferred_products: Optional[List[str]] = None, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can update subscriptions")
    user = users_collection.find_one({"id": id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if status:
        update_data["subscription"] = (status == "active")
    if last_order_date:
        update_data["last_order_date"] = last_order_date
    if preferred_products:
        update_data["preferred_products"] = preferred_products
    
    users_collection.update_one({"id": id}, {"$set": update_data})
    return {"message": "Subscription updated successfully"}

@app.delete("/api/subscriptions/{id}")
async def delete_subscription(id: str, current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can delete subscriptions")
    user = users_collection.find_one({"id": id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_collection.update_one({"id": id}, {"$set": {"subscription": False}})
    return {"message": "Subscription deleted successfully"}

@app.get("/api/subscriptions/{user_id}/preferred-products")
async def get_preferred_products(user_id: str, current_user: User = Depends(current_active_user)):
    user = users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.get("preferred_products", [])

# إدارة الكوبونات (Coupons)
@app.post("/api/coupons/apply")
async def apply_coupon(coupon_code: str):
    valid_coupons = {
        "Tabuk10": 10,
        "Discount20": 20
    }
    if coupon_code in valid_coupons:
        return CouponResponse(discount=valid_coupons[coupon_code])
    return CouponResponse(error="Invalid coupon code")

# إتمام الشراء (Checkout)
@app.post("/api/checkout")
async def checkout(cart_items: List[CartItem], total_price: float, coupon_code: Optional[str] = None, current_user: User = Depends(current_active_user)):
    order_dict = {
        "user_id": current_user.id,
        "products": [item.dict() for item in cart_items],
        "total_price": total_price,
        "payment_method": "Cash",
        "delivery_method": "SMSA",
        "status": "Pending",
        "created_at": datetime.utcnow().isoformat()
    }
    
    if coupon_code:
        coupon_response = await apply_coupon(coupon_code)
        if coupon_response.error:
            raise HTTPException(status_code=400, detail=coupon_response.error)
        order_dict["total_price"] = order_dict["total_price"] * (1 - coupon_response.discount / 100)
    
    result = orders_collection.insert_one(order_dict)
    order_dict["id"] = str(result.inserted_id)
    
    users_collection.update_one(
        {"id": current_user.id},
        {"$push": {"purchase_history": order_dict}}
    )
    
    users_collection.update_one({"id": current_user.id}, {"$set": {"cart": []}})
    
    installment_amount = {
        "Tamara": order_dict["total_price"] / 3,
        "Tabby": order_dict["total_price"] / 4
    }
    return CheckoutResponse(orderId=order_dict["id"], installmentAmount=installment_amount)

# إحصائيات الاشتراكات
@app.get("/api/subscriptions/stats")
async def get_subscription_stats(current_user: User = Depends(current_active_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view subscription stats")
    
    users = list(users_collection.find({}, {"_id": 0}))
    active = sum(1 for user in users if user.get("subscription", False))
    paused = sum(1 for user in users if user.get("subscription", False) == False and "subscription" in user)
    canceled = 0
    return SubscriptionStats(active=active, paused=paused, canceled=canceled)

# إدارة الطلبات (Orders)
@app.get("/api/orders/{user_id}")
async def get_user_orders(user_id: str, current_user: User = Depends(current_active_user)):
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to view these orders")
    
    orders = list(orders_collection.find({"user_id": user_id}, {"_id": 0}))
    orders_list = [
        {
            "orderId": order["id"],
            "date": order["created_at"],
            "amount": order["total_price"],
            "products": order["products"]
        }
        for order in orders
    ]
    return orders_list

@app.get("/api/orders/{user_id}/last")
async def get_last_order(user_id: str, current_user: User = Depends(current_active_user)):
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    orders = list(orders_collection.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(1))
    if not orders:
        return {"lastOrderDate": None}
    return {"lastOrderDate": orders[0]["created_at"]}