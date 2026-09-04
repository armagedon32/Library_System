import os
import json
import gzip
from datetime import datetime
from pymongo import MongoClient, DESCENDING
from bson import ObjectId

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')


def list_backups():
    if not os.path.exists(BACKUP_DIR):
        print('No backups found.')
        return []

    backups = []
    for name in os.listdir(BACKUP_DIR):
        backup_path = os.path.join(BACKUP_DIR, name)
        if os.path.isdir(backup_path):
            manifest_path = os.path.join(backup_path, 'manifest.json')
            if os.path.exists(manifest_path):
                with open(manifest_path) as f:
                    manifest = json.load(f)
                backups.append({
                    'name': name,
                    'path': backup_path,
                    'manifest': manifest
                })
        elif name.endswith('.zip'):
            backups.append({
                'name': name,
                'path': backup_path,
                'manifest': None
            })

    backups.sort(key=lambda x: x['name'], reverse=True)
    return backups


def restore(backup_name, drop=False):
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    if not os.path.exists(backup_path):
        print(f'Backup not found: {backup_name}')
        return False

    manifest_path = os.path.join(backup_path, 'manifest.json')
    if not os.path.exists(manifest_path):
        print(f'Manifest not found in backup: {backup_name}')
        return False

    with open(manifest_path) as f:
        manifest = json.load(f)

    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    print(f'Restoring from backup: {backup_name}')
    print(f'Database: {manifest["database"]}')
    print(f'Total documents: {manifest["total_documents"]}')

    total_restored = 0

    for coll_name, coll_info in manifest['collections'].items():
        file_path = os.path.join(backup_path, coll_info['file'])
        if not os.path.exists(file_path):
            print(f'  Skipping {coll_name}: file not found')
            continue

        with gzip.open(file_path, 'rt', encoding='utf-8') as f:
            documents = json.load(f)

        coll = db[coll_name]

        if drop:
            coll.drop()
            print(f'  Dropped existing {coll_name}')

        if documents:
            for doc in documents:
                if '_id' in doc and isinstance(doc['_id'], dict) and '$oid' in doc['_id']:
                    doc['_id'] = ObjectId(doc['_id']['$oid'])

                for key, value in doc.items():
                    if isinstance(value, dict) and '$date' in value:
                        doc[key] = datetime.fromisoformat(value['$date'])
                    if isinstance(value, dict) and '$binary' in value:
                        doc[key] = bytes.fromhex(value['$binary'])

            coll.insert_many(documents)
            total_restored += len(documents)
            print(f'  Restored {coll_name}: {len(documents)} documents')

    client.close()

    print(f'Restore completed: {total_restored} total documents')
    return True


def delete_backup(backup_name):
    import shutil
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    if not os.path.exists(backup_path):
        print(f'Backup not found: {backup_name}')
        return False

    if os.path.isdir(backup_path):
        shutil.rmtree(backup_path)
    else:
        os.remove(backup_path)

    print(f'Deleted backup: {backup_name}')
    return True


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print('Usage:')
        print('  python restore.py list              - List all backups')
        print('  python restore.py restore <name>    - Restore from backup')
        print('  python restore.py restore <name> --drop  - Drop existing data before restore')
        print('  python restore.py delete <name>     - Delete a backup')
        sys.exit(1)

    command = sys.argv[1]

    if command == 'list':
        backups = list_backups()
        if not backups:
            print('No backups found.')
        else:
            print(f'\nAvailable backups ({len(backups)}):')
            print('-' * 60)
            for b in backups:
                if b['manifest']:
                    m = b['manifest']
                    print(f"  {b['name']}  |  {m['total_documents']} docs  |  {', '.join(m['collections'].keys())}")
                else:
                    print(f"  {b['name']}  |  (archive)")
            print()

    elif command == 'restore':
        if len(sys.argv) < 3:
            print('Usage: python restore.py restore <backup_name>')
            sys.exit(1)
        backup_name = sys.argv[2]
        drop = '--drop' in sys.argv
        restore(backup_name, drop=drop)

    elif command == 'delete':
        if len(sys.argv) < 3:
            print('Usage: python restore.py delete <backup_name>')
            sys.exit(1)
        delete_backup(sys.argv[2])

    else:
        print(f'Unknown command: {command}')
        sys.exit(1)
