from pymongo import MongoClient

class Config:
    MONGO_URI = "mongodb://localhost:27017/badge_management"
    client = MongoClient(MONGO_URI)
    db = client.get_database()