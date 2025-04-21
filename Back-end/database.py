from pymongo import MongoClient

# سلسلة الاتصال (افترضت أنكِ تستخدمين MongoDB محليًا)
MONGO_URI = "mongodb://localhost:27017"

# إعداد العميل
client = MongoClient(MONGO_URI)

# اختيار قاعدة البيانات
db = client["HeavyMachinery"]

# إعداد المجموعات (Collections) بناءً على الصورة
brands_collection = db["Brands"]
categories_collection = db["Categories"]
customer_support_collection = db["CustomerSupport"]
inventory_collection = db["Inventory"]
maintenance_requests_collection = db["maintenancerequests"]  # تغيير إلى أحرف صغيرة
models_collection = db["Models"]
offers_collection = db["Offers"]
order_details_collection = db["OrderDetails"]
orders_collection = db["Orders"]
products_collection = db["Products"]
users_collection = db["Users"]
feedback_collection = db["feedback"]

# اختبار الاتصال
def test_connection():
    try:
        client.server_info()
        print("Connected to MongoDB successfully!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

if __name__ == "__main__":
    test_connection()