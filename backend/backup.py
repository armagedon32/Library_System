import os
import json
import gzip
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId, json_util

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')

COLLECTIONS = ['users', 'collectionitems', 'usagerecords', 'reservations', 'notifications', 'activities', 'settings']


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return {'$oid': str(obj)}
        if isinstance(obj, datetime):
            return {'$date': obj.isoformat()}
        if isinstance(obj, bytes):
            return {'$binary': obj.hex()}
        return super().default(obj)


def backup(archive=False):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(BACKUP_DIR, timestamp)

    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    os.makedirs(backup_path)

    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    manifest = {
        'timestamp': timestamp,
        'database': db.name,
        'collections': {},
        'total_documents': 0
    }

    print(f'Starting backup to: {backup_path}')

    for coll_name in COLLECTIONS:
        coll = db[coll_name]
        documents = list(coll.find())

        if documents:
            file_path = os.path.join(backup_path, f'{coll_name}.json.gz')
            with gzip.open(file_path, 'wt', encoding='utf-8') as f:
                json.dump(documents, f, cls=JSONEncoder, indent=2)

            manifest['collections'][coll_name] = {
                'count': len(documents),
                'file': f'{coll_name}.json.gz'
            }
            manifest['total_documents'] += len(documents)
            print(f'  Backed up {coll_name}: {len(documents)} documents')

    manifest_path = os.path.join(backup_path, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    client.close()

    print(f'Backup completed: {manifest["total_documents"]} total documents')

    if archive:
        import shutil
        archive_path = f'{backup_path}.zip'
        shutil.make_archive(backup_path, 'zip', BACKUP_DIR, timestamp)
        print(f'Archive created: {archive_path}')
        return archive_path

    return backup_path


if __name__ == '__main__':
    import sys
    create_archive = '--archive' in sys.argv
    print(f'MongoDB URI: {MONGO_URI}')
    backup(archive=create_archive)
