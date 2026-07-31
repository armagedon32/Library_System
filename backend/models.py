from datetime import datetime
from bson.objectid import ObjectId


def user_to_dict(user, include_password=False):
    data = {
        '_id': str(user['_id']),
        'name': user.get('name', ''),
        'email': user.get('email', ''),
        'role': user.get('role', 'user'),
        'department': user.get('department', ''),
        'createdAt': user.get('createdAt', datetime.now()).isoformat()
    }
    return data


def item_to_dict(item):
    item['_id'] = str(item['_id'])
    if 'createdAt' in item and isinstance(item['createdAt'], datetime):
        item['createdAt'] = item['createdAt'].isoformat()
    if 'usageMetrics' in item and 'lastUsed' in item['usageMetrics'] and isinstance(item['usageMetrics']['lastUsed'], datetime):
        item['usageMetrics']['lastUsed'] = item['usageMetrics']['lastUsed'].isoformat()
    if 'acquisitionDate' in item and isinstance(item['acquisitionDate'], datetime):
        item['acquisitionDate'] = item['acquisitionDate'].isoformat()
    return item


def record_to_dict(record):
    record['_id'] = str(record['_id'])
    for field in ['borrowDate', 'returnDate', 'dueDate', 'createdAt']:
        if field in record and isinstance(record[field], datetime):
            record[field] = record[field].isoformat()
    if 'collectionItem' in record and hasattr(record['collectionItem'], '__dict__'):
        record['collectionItem'] = str(record['collectionItem'])
    if 'user' in record and hasattr(record['user'], '__dict__'):
        record['user'] = str(record['user'])
    return record
