from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URI)

# اختيار قاعدة البيانات
db = client["NOVAweb"]

# إعداد المجموعات (Collections)
brands_collection = db["Brands"]
categories_collection = db["Categories"]
customer_support_collection = db["CustomerSupport"]
inventory_collection = db["Inventory"]
maintenance_requests_collection = db["maintenancerequests"]
models_collection = db["Models"]
offers_collection = db["Offers"]
order_details_collection = db["OrderDetails"]
orders_collection = db["Orders"]
products_collection = db["Products"]
users_collection = db["Users"]
feedback_collection = db["feedback"]

def test_connection():
    try:
        client.server_info()
        print("Connected to MongoDB Atlas successfully!")
    except Exception as e:
        print(f"Failed to connect to MongoDB Atlas: {e}")

if __name__ == "__main__":
    test_connection()