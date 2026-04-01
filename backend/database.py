from motor.motor_asyncio import AsyncIOMotorClient
import os

client = AsyncIOMotorClient(os.environ['MONGO_URL'], maxPoolSize=20)
db = client[os.environ.get('DB_NAME', 'property_management')]
