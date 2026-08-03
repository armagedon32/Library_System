from datetime import datetime
from bson import ObjectId
from db import mongo


def log_activity(user_id, action, details='', item_id=None):
    mongo.db.activities.insert_one({
        'user': ObjectId(user_id) if user_id else None,
        'action': action,
        'details': details,
        'itemId': str(item_id) if item_id else None,
        'createdAt': datetime.utcnow()
    })