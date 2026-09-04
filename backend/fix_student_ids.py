from pymongo import MongoClient
import os

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')

client = MongoClient(MONGO_URI)
db = client.get_default_database()

# Update all users without studentId (except admin)
users = list(db.users.find({
    '$or': [
        {'studentId': {'$exists': False}},
        {'studentId': 'NOT_SET'},
        {'studentId': ''}
    ],
    'role': {'$ne': 'admin'}
}))

print(f"Found {len(users)} users without studentId")

for i, user in enumerate(users):
    year = 2024
    student_id = f'{year}-{str(i + 1).zfill(4)}'
    
    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'studentId': student_id, 'role': 'user'}}
    )
    print(f'Updated: {user.get("name")} -> {student_id}')

print("\nDone!")

client.close()