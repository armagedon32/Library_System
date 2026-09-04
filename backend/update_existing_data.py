import os
import random
from pymongo import MongoClient

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')


def update_existing_data():
    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    print('Updating existing data...\n')

    # Update collection items with accession numbers
    items = list(db.collectionitems.find({'accessionNumber': {'$exists': False}}))
    print(f'Found {len(items)} items without accession numbers')

    for i, item in enumerate(items):
        dept_code = {'Education': 'EDU', 'BSBA': 'BSBA', 'BSHM': 'BSHM', 'Computer Science': 'CS'}
        dept = item.get('department', 'GEN')
        code = dept_code.get(dept, 'GEN')
        year = item.get('publishYear', 2024)
        accession = f'ACC-{year}-{code}-{str(i + 1).zfill(4)}'

        db.collectionitems.update_one(
            {'_id': item['_id']},
            {'$set': {'accessionNumber': accession}}
        )

    print(f'Updated {len(items)} items with accession numbers')

    # Update users with student IDs
    users = list(db.users.find({'studentId': {'$exists': False}, 'role': 'user'}))
    print(f'\nFound {len(users)} users without student IDs')

    for i, user in enumerate(users):
        year = 2024
        student_id = f'{year}-{str(i + 1).zfill(4)}'

        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'studentId': student_id}}
        )

    print(f'Updated {len(users)} users with student IDs')

    # Summary
    total_items = db.collectionitems.count_documents({})
    total_users = db.users.count_documents({})
    items_with_acc = db.collectionitems.count_documents({'accessionNumber': {'$exists': True, '$ne': ''}})
    users_with_id = db.users.count_documents({'studentId': {'$exists': True, '$ne': ''}})

    print(f'\n=== Summary ===')
    print(f'Total items: {total_items} ({items_with_acc} with accession numbers)')
    print(f'Total users: {total_users} ({users_with_id} with student IDs)')

    client.close()
    print('\nDone!')


if __name__ == '__main__':
    print(f'MongoDB URI: {MONGO_URI}')
    update_existing_data()
