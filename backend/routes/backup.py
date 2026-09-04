import os
import json
import gzip
import shutil
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file
from pymongo import MongoClient
from bson import ObjectId
from middleware import admin_required
from db import mongo

backup_bp = Blueprint('backup', __name__)

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backups')

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


def ensure_backup_dir():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)


@backup_bp.route('/backup', methods=['POST'])
@admin_required
def create_backup():
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(BACKUP_DIR, timestamp)

        ensure_backup_dir()
        os.makedirs(backup_path)

        client = MongoClient(MONGO_URI)
        db = client.get_default_database()

        manifest = {
            'timestamp': timestamp,
            'database': db.name,
            'collections': {},
            'total_documents': 0
        }

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

        manifest_path = os.path.join(backup_path, 'manifest.json')
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)

        client.close()

        archive_path = f'{backup_path}.zip'
        shutil.make_archive(backup_path, 'zip', BACKUP_DIR, timestamp)

        return jsonify({
            'message': 'Backup created successfully',
            'backup': timestamp,
            'totalDocuments': manifest['total_documents'],
            'collections': manifest['collections']
        })

    except Exception as e:
        return jsonify({'message': f'Backup failed: {str(e)}'}), 500


@backup_bp.route('/backup/list', methods=['GET'])
@admin_required
def list_backups():
    ensure_backup_dir()

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
                    'totalDocuments': manifest.get('total_documents', 0),
                    'collections': manifest.get('collections', {}),
                    'hasArchive': os.path.exists(f'{backup_path}.zip')
                })
        elif name.endswith('.zip'):
            backups.append({
                'name': name.replace('.zip', ''),
                'totalDocuments': 0,
                'collections': {},
                'hasArchive': True
            })

    backups.sort(key=lambda x: x['name'], reverse=True)
    return jsonify({'backups': backups})


@backup_bp.route('/backup/<backup_name>/download', methods=['GET'])
@admin_required
def download_backup(backup_name):
    archive_path = os.path.join(BACKUP_DIR, f'{backup_name}.zip')

    if not os.path.exists(archive_path):
        return jsonify({'message': 'Backup not found'}), 404

    return send_file(archive_path, as_attachment=True, download_name=f'backup_{backup_name}.zip')


@backup_bp.route('/backup/<backup_name>/restore', methods=['POST'])
@admin_required
def restore_backup(backup_name):
    try:
        backup_path = os.path.join(BACKUP_DIR, backup_name)

        if not os.path.exists(backup_path):
            return jsonify({'message': 'Backup not found'}), 404

        manifest_path = os.path.join(backup_path, 'manifest.json')
        if not os.path.exists(manifest_path):
            return jsonify({'message': 'Manifest not found'}), 404

        with open(manifest_path) as f:
            manifest = json.load(f)

        drop = request.json.get('drop', False) if request.is_json else False

        client = MongoClient(MONGO_URI)
        db = client.get_default_database()

        total_restored = 0

        for coll_name, coll_info in manifest['collections'].items():
            file_path = os.path.join(backup_path, coll_info['file'])
            if not os.path.exists(file_path):
                continue

            with gzip.open(file_path, 'rt', encoding='utf-8') as f:
                documents = json.load(f)

            coll = db[coll_name]

            if drop:
                coll.drop()

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

        client.close()

        return jsonify({
            'message': 'Restore completed successfully',
            'totalDocuments': total_restored
        })

    except Exception as e:
        return jsonify({'message': f'Restore failed: {str(e)}'}), 500


@backup_bp.route('/backup/<backup_name>', methods=['DELETE'])
@admin_required
def delete_backup(backup_name):
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    archive_path = f'{backup_path}.zip'

    if os.path.isdir(backup_path):
        shutil.rmtree(backup_path)

    if os.path.exists(archive_path):
        os.remove(archive_path)

    return jsonify({'message': 'Backup deleted successfully'})
