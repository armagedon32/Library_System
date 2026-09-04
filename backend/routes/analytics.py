from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timedelta
import re
import math
from middleware import token_required, admin_required
from db import mongo
from nlp_utils import classify_category, classify_department, run_kmeans, build_document_vectors, cosine_similarity, kmeans_feature, kmeans_feature_full, silhouette_score, davies_bouldin_index
from activity import log_activity

analytics_bp = Blueprint('analytics', __name__)


def item_to_dict(item):
    item['_id'] = str(item['_id'])
    for field in ['createdAt', 'acquisitionDate']:
        if field in item and isinstance(item.get(field), datetime):
            item[field] = item[field].isoformat()
    um = item.get('usageMetrics', {})
    if 'lastUsed' in um and isinstance(um['lastUsed'], datetime):
        um['lastUsed'] = um['lastUsed'].isoformat()
    return item


@analytics_bp.route('/usage/summary', methods=['GET'])
@token_required
def usage_summary():
    user = g.current_user
    match = {}
    if user.get('role') != 'admin':
        match['user'] = ObjectId(user['_id'])

    dept = request.args.get('department')
    cat = request.args.get('category')
    if dept: match['department'] = dept
    if cat: match['category'] = {'$regex': cat, '$options': 'i'}

    # Time-range filter (7d / 30d / 90d / 1y)
    time_range = request.args.get('timeRange', '')
    if time_range:
        days_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
        days = days_map.get(time_range)
        if days:
            cutoff = datetime.utcnow() - timedelta(days=days)
            match['borrowDate'] = {'$gte': cutoff}

    usage_by_category = list(mongo.db.usagerecords.aggregate([
        {'$match': match},
        {'$lookup': {'from': 'collectionitems', 'localField': 'collectionItem', 'foreignField': '_id', 'as': 'item'}},
        {'$unwind': '$item'},
        {'$group': {'_id': '$item.category', 'totalBorrows': {'$sum': 1}, 'totalRenewals': {'$sum': '$renewalCount'},
                     'avgDwellTime': {'$avg': '$dwellTime'}, 'uniqueUsers': {'$addToSet': '$user'}}},
        {'$project': {'category': '$_id', 'totalBorrows': 1, 'totalRenewals': 1,
                       'avgDwellTime': {'$round': ['$avgDwellTime', 2]}, 'uniqueUsers': {'$size': '$uniqueUsers'}}}
    ]))

    usage_by_department = list(mongo.db.usagerecords.aggregate([
        {'$match': match},
        {'$group': {'_id': '$department', 'totalBorrows': {'$sum': 1}, 'totalRenewals': {'$sum': '$renewalCount'},
                     'avgDwellTime': {'$avg': '$dwellTime'}, 'uniqueUsers': {'$addToSet': '$user'}}},
        {'$project': {'department': '$_id', 'totalBorrows': 1, 'totalRenewals': 1,
                       'avgDwellTime': {'$round': ['$avgDwellTime', 2]}, 'uniqueUsers': {'$size': '$uniqueUsers'}}}
    ]))

    top_limit = int(request.args.get('topLimit', 10) or 0)
    top_items = list(mongo.db.usagerecords.aggregate([
        {'$match': match},
        {'$lookup': {'from': 'collectionitems', 'localField': 'collectionItem', 'foreignField': '_id', 'as': 'item'}},
        {'$unwind': '$item'},
        {'$group': {'_id': '$collectionItem', 'title': {'$first': '$item.title'}, 'author': {'$first': '$item.author'},
                     'category': {'$first': '$item.category'}, 'borrowCount': {'$sum': 1},
                     'totalRenewals': {'$sum': '$renewalCount'}, 'avgDwellTime': {'$avg': '$dwellTime'}}},
        {'$sort': {'borrowCount': -1}},
    ]))
    if top_limit > 0:
        top_items = top_items[:top_limit]
    for t in top_items:
        t['_id'] = str(t['_id'])

    return jsonify({
        'usageByCategory': usage_by_category,
        'usageByDepartment': usage_by_department,
        'topItems': top_items,
    })


@analytics_bp.route('/usage/my', methods=['GET'])
@token_required
def my_usage():
    user = g.current_user
    records = list(mongo.db.usagerecords.find({'user': ObjectId(user['_id'])}).sort('borrowDate', -1).limit(20))

    for r in records:
        r['_id'] = str(r['_id'])
        if 'collectionItem' in r and isinstance(r['collectionItem'], ObjectId):
            item = mongo.db.collectionitems.find_one({'_id': r['collectionItem']})
            if item:
                r['collectionItem'] = {'_id': str(item['_id']), 'title': item.get('title'), 'author': item.get('author')}
        for f in ['borrowDate', 'dueDate', 'returnDate']:
            if f in r and isinstance(r.get(f), datetime):
                r[f] = r[f].isoformat()

    total = mongo.db.usagerecords.count_documents({'user': ObjectId(user['_id'])})
    current = mongo.db.usagerecords.count_documents({'user': ObjectId(user['_id']), 'isReturned': False})
    overdue = mongo.db.usagerecords.count_documents({'user': ObjectId(user['_id']), 'isOverdue': True, 'isReturned': False})

    return jsonify({'records': records, 'stats': {'totalBorrowed': total, 'currentlyBorrowed': current, 'overdueCount': overdue}})


@analytics_bp.route('/transactions', methods=['GET'])
@admin_required
def all_transactions():
    """All borrow/return transactions across users (admin monitoring)."""
    status = request.args.get('status', '')  # active | returned | overdue | reserved
    q = {}
    if status == 'active':
        q['isReturned'] = False
    elif status == 'returned':
        q['isReturned'] = True
    elif status == 'overdue':
        q['isOverdue'] = True
        q['isReturned'] = False

    if status == 'reserved':
        res = list(mongo.db.reservations.find({}).sort('createdAt', -1))
        user_ids = [r['user'] for r in res if isinstance(r.get('user'), ObjectId)]
        users_map = {}
        for u in mongo.db.users.find({'_id': {'$in': user_ids}}, {'name': 1}):
            users_map[u['_id']] = u.get('name', 'Unknown')
        return jsonify({'transactions': [{
            '_id': str(r['_id']),
            'borrowerName': users_map.get(r.get('user'), 'Unknown'),
            'itemTitle': r.get('itemTitle', ''),
            'type': 'reservation',
            'status': 'ready' if r.get('status') == 'ready' else 'waiting',
            'borrowDate': r['createdAt'].isoformat() if isinstance(r.get('createdAt'), datetime) else None,
            'dueDate': None,
            'returnDate': None,
            'fineAmount': 0,
            'isDamaged': False,
        } for r in res], 'count': len(res)})

    records = list(mongo.db.usagerecords.find(q).sort('borrowDate', -1).limit(300))
    item_ids = list({r['collectionItem'] for r in records if isinstance(r.get('collectionItem'), ObjectId)})
    items_map = {}
    for it in mongo.db.collectionitems.find({'_id': {'$in': item_ids}}, {'title': 1}):
        items_map[it['_id']] = it.get('title', 'Unknown')
    user_ids = list({r['user'] for r in records if isinstance(r.get('user'), ObjectId)})
    users_map = {}
    for u in mongo.db.users.find({'_id': {'$in': user_ids}}, {'name': 1, 'department': 1}):
        users_map[u['_id']] = u

    out = []
    for r in records:
        u = users_map.get(r.get('user'), {})
        is_active = not r.get('isReturned')
        out.append({
            '_id': str(r['_id']),
            'borrowerName': r.get('borrowerName') or u.get('name', 'Unknown'),
            'department': u.get('department', ''),
            'itemTitle': items_map.get(r.get('collectionItem'), 'Unknown'),
            'type': 'borrow',
            'status': 'active' if is_active else 'returned',
            'isOverdue': bool(r.get('isOverdue')) and is_active,
            'borrowDate': r['borrowDate'].isoformat() if isinstance(r.get('borrowDate'), datetime) else None,
            'dueDate': r['dueDate'].isoformat() if isinstance(r.get('dueDate'), datetime) else None,
            'returnDate': r['returnDate'].isoformat() if isinstance(r.get('returnDate'), datetime) else None,
            'fineAmount': r.get('fineAmount', 0),
            'isDamaged': bool(r.get('isDamaged')),
            'missingCount': r.get('missingCount', 0),
        })

    counts = {
        'active': mongo.db.usagerecords.count_documents({'isReturned': False}),
        'returned': mongo.db.usagerecords.count_documents({'isReturned': True}),
        'overdue': mongo.db.usagerecords.count_documents({'isOverdue': True, 'isReturned': False}),
        'reserved': mongo.db.reservations.count_documents({}),
    }
    return jsonify({'transactions': out, 'count': len(out), 'counts': counts})


@analytics_bp.route('/items', methods=['POST'])
@admin_required
def create_item():
    data = request.get_json()
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    isbn = data.get('isbn', '').strip()
    pub_year = data.get('publishYear')

    if not title or not author or not isbn or not pub_year:
        return jsonify({'message': 'Missing required fields'}), 400
    if mongo.db.collectionitems.find_one({'isbn': isbn}):
        return jsonify({'message': 'Item with this ISBN already exists'}), 400
    dup = mongo.db.collectionitems.find_one({'title': title, 'author': author})
    if dup:
        return jsonify({'message': 'Item with this title and author already exists'}), 400

    desc = data.get('description', '')
    pub = data.get('publisher', '')
    category = classify_category(title, desc, pub)
    department = classify_department(title, desc)

    item = {
        'title': title, 'author': author, 'isbn': isbn, 'category': category,
        'department': department, 'description': desc, 'publishYear': int(pub_year),
        'publisher': pub, 'location': data.get('location', ''),
        'condition': data.get('condition', 'New'), 'cost': float(data.get('cost', 0)),
        'copies': int(data.get('copies', 1)), 'status': 'Active', 'cluster': -1,
        'accessionNumber': data.get('accessionNumber', ''),
        'usageMetrics': {'totalBorrows': 0, 'totalRenewals': 0, 'averageDwellTime': 0, 'usageScore': 0, 'retentionScore': 0},
        'createdAt': datetime.utcnow()
    }
    result = mongo.db.collectionitems.insert_one(item)
    item['_id'] = result.inserted_id
    log_activity(g.current_user.get('_id'), 'Add Item', f'Added "{title}" by {author}', result.inserted_id)
    return jsonify(item_to_dict(item)), 201


@analytics_bp.route('/items', methods=['GET'])
@token_required
def get_items():
    query = {}
    search = request.args.get('search', '').strip()
    if search:
        escaped = re.escape(search)
        query['$or'] = [
            {'title': {'$regex': escaped, '$options': 'i'}},
            {'author': {'$regex': escaped, '$options': 'i'}}
        ]
    for f in ['department', 'status']:
        v = request.args.get(f)
        if v: query[f] = v
    cat = request.args.get('category')
    if cat: query['category'] = {'$regex': cat, '$options': 'i'}
    cluster = request.args.get('cluster')
    if cluster: query['cluster'] = int(cluster)
    publish_year = request.args.get('publishYear')
    if publish_year: query['publishYear'] = int(publish_year)

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    total = mongo.db.collectionitems.count_documents(query)
    items = list(mongo.db.collectionitems.find(query).sort('usageMetrics.usageScore', -1).skip((page - 1) * limit).limit(limit))

    return jsonify({'items': [item_to_dict(i) for i in items], 'totalPages': (total + limit - 1) // limit, 'currentPage': page, 'total': total})


@analytics_bp.route('/items/download', methods=['GET'])
@admin_required
def download_items():
    import csv, io
    items = list(mongo.db.collectionitems.find({}).sort('createdAt', -1))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['AccessionNumber', 'Title', 'Author', 'ISBN', 'Category', 'Department', 'Description', 'PublishYear',
                     'Publisher', 'Location', 'Condition', 'Cost', 'Copies', 'Status',
                     'TotalBorrows', 'TotalRenewals', 'UsageScore', 'RetentionScore', 'Cluster'])
    for i in items:
        m = i.get('usageMetrics', {})
        writer.writerow([
            i.get('accessionNumber', ''), i.get('title', ''), i.get('author', ''), i.get('isbn', ''), i.get('category', ''),
            i.get('department', ''), i.get('description', ''), i.get('publishYear', ''),
            i.get('publisher', ''), i.get('location', ''), i.get('condition', ''),
            i.get('cost', 0), i.get('copies', 0), i.get('status', ''),
            m.get('totalBorrows', 0), m.get('totalRenewals', 0),
            m.get('usageScore', 0), m.get('retentionScore', 0), i.get('cluster', -1)
        ])
    csv_data = output.getvalue()
    return jsonify({'csv': csv_data, 'count': len(items)}), 200, {'Content-Type': 'application/json'}


@analytics_bp.route('/items/upload', methods=['POST'])
@admin_required
def upload_items():
    import csv, io
    file = request.files.get('file')
    if not file:
        return jsonify({'message': 'No file uploaded'}), 400
    content = file.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content))
    required = ['title', 'author']
    created = 0
    errors = []
    for row_num, row in enumerate(reader, start=2):
        title = row.get('title', '').strip()
        author = row.get('author', '').strip()
        if not title or not author:
            errors.append(f'Row {row_num}: missing title or author')
            continue
        if mongo.db.collectionitems.find_one({'title': title, 'author': author}):
            errors.append(f'Row {row_num}: duplicate "{title}" by {author}')
            continue
        if row.get('isbn', '').strip() and mongo.db.collectionitems.find_one({'isbn': row['isbn'].strip()}):
            errors.append(f'Row {row_num}: duplicate ISBN {row["isbn"].strip()}')
            continue

        description = row.get('description', '')
        category = row.get('category', '') or classify_category(title, description, row.get('publisher', ''))
        department = row.get('department', '') or classify_department(title, description)

        try:
            cost = float(row.get('cost', 0)) if row.get('cost', '') else 0
        except: cost = 0
        try:
            copies = int(row.get('copies', 1)) if row.get('copies', '') else 1
        except: copies = 1
        try:
            pub_year = int(row.get('publishYear', 2024)) if row.get('publishYear', '') else 2024
        except: pub_year = 2024

        item = {
            'title': title, 'author': author, 'isbn': row.get('isbn', '').strip(),
            'accessionNumber': row.get('accessionNumber', '').strip(),
            'category': category, 'department': department, 'description': description,
            'publishYear': pub_year, 'publisher': row.get('publisher', '').strip(),
            'location': row.get('location', '').strip(), 'condition': row.get('condition', 'New').strip(),
            'cost': cost, 'copies': copies, 'status': 'Active', 'cluster': -1,
            'usageMetrics': {'totalBorrows': 0, 'totalRenewals': 0, 'averageDwellTime': 0,
                             'usageScore': 0, 'retentionScore': 0},
            'createdAt': datetime.utcnow()
        }
        mongo.db.collectionitems.insert_one(item)
        created += 1

    log_activity(g.current_user.get('_id'), 'CSV Upload', f'Imported {created} item(s) from CSV')
    msg = f'{created} items imported successfully'
    if errors:
        msg += f' with {len(errors)} errors'
    return jsonify({'message': msg, 'created': created, 'errors': errors, 'totalErrors': len(errors)})


@analytics_bp.route('/items/<item_id>', methods=['GET'])
@token_required
def get_item(item_id):
    item = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    if not item: return jsonify({'message': 'Item not found'}), 404
    usage = list(mongo.db.usagerecords.find({'collectionItem': ObjectId(item_id)}).sort('borrowDate', -1).limit(50))
    return jsonify({'item': item_to_dict(item), 'usageHistory': [str(u.get('_id')) for u in usage]})


@analytics_bp.route('/clustering/run', methods=['POST'])
@admin_required
def run_clustering():
    all_items = list(mongo.db.collectionitems.find({'status': 'Active'}))

    # Separate items with usage data vs new items
    has_usage = []
    new_items = []
    for item in all_items:
        m = item.get('usageMetrics', {})
        if m.get('totalBorrows', 0) == 0 and m.get('totalRenewals', 0) == 0 and m.get('averageDwellTime', 0) == 0:
            new_items.append(item)
        else:
            has_usage.append(item)

    # Mark new items as -2
    for item in new_items:
        mongo.db.collectionitems.update_one(
            {'_id': ObjectId(item['_id'])},
            {'$set': {'cluster': -2}}
        )

    if len(has_usage) < 3:
        return jsonify({'message': 'Clustering completed', 'k': 0, 'clusterStats': [],
                        'newItemsCount': len(new_items)})

    k = max(2, min(5, int(len(has_usage) ** 0.5 // 3 + 1)))
    clusters = run_kmeans(has_usage, k)
    if not clusters:
        return jsonify({'message': 'Clustering failed'}), 500

    for c in clusters:
        mongo.db.collectionitems.update_one({'_id': ObjectId(c['id'])}, {'$set': {'cluster': c['cluster']}})

    stats = list(mongo.db.collectionitems.aggregate([
        {'$match': {'cluster': {'$gte': 0}}},
        {'$group': {'_id': '$cluster', 'count': {'$sum': 1}, 'avgUsageScore': {'$avg': '$usageMetrics.usageScore'},
                     'avgRetentionScore': {'$avg': '$usageMetrics.retentionScore'}, 'avgBorrows': {'$avg': '$usageMetrics.totalBorrows'}}}
    ]))
    log_activity(g.current_user.get('_id'), 'Run Clustering', f'K-Means completed with k={k}, {len(new_items)} new items')
    return jsonify({'message': 'Clustering completed', 'k': k, 'clusterStats': stats, 'newItemsCount': len(new_items)})


@analytics_bp.route('/clustering/results', methods=['GET'])
@token_required
def clustering_results():
    items = list(mongo.db.collectionitems.find({'cluster': {'$gte': -2}}).sort([('cluster', 1), ('usageMetrics.usageScore', -1)]))
    summary = list(mongo.db.collectionitems.aggregate([
        {'$match': {'cluster': {'$gte': 0}}},
        {'$group': {'_id': '$cluster', 'count': {'$sum': 1}, 'avgUsageScore': {'$avg': '$usageMetrics.usageScore'},
                     'avgRetentionScore': {'$avg': '$usageMetrics.retentionScore'},
                     'avgBorrows': {'$avg': '$usageMetrics.totalBorrows'}, 'avgDwellTime': {'$avg': '$usageMetrics.averageDwellTime'}}}
    ]))
    new_count = mongo.db.collectionitems.count_documents({'cluster': -2})
    return jsonify({'results': [item_to_dict(i) for i in items], 'summary': summary, 'newItemsCount': new_count})


@analytics_bp.route('/recommendations', methods=['GET'])
@token_required
def recommendations():
    r = list(mongo.db.collectionitems.find({'status': 'Recommend Retire'}).sort('usageMetrics.usageScore', 1))
    k = list(mongo.db.collectionitems.find({'status': 'Recommend Keep'}).sort('usageMetrics.usageScore', -1).limit(20))
    f = list(mongo.db.collectionitems.find({'status': 'Flagged for Review'}).sort('usageMetrics.usageScore', 1))
    return jsonify({'retirees': [item_to_dict(i) for i in r], 'keepers': [item_to_dict(i) for i in k], 'flagged': [item_to_dict(i) for i in f]})


@analytics_bp.route('/items/<item_id>/status', methods=['PUT'])
@admin_required
def update_item_status(item_id):
    status = request.get_json().get('status')
    item = mongo.db.collectionitems.find_one_and_update({'_id': ObjectId(item_id)}, {'$set': {'status': status}}, return_document=True)
    if not item: return jsonify({'message': 'Item not found'}), 404
    log_activity(g.current_user.get('_id'), 'Update Item Status', f'"{item.get("title")}" set to {status}', item_id)
    return jsonify(item_to_dict(item))


@analytics_bp.route('/items/<item_id>/borrow', methods=['POST'])
@token_required
def borrow_item(item_id):
    user = g.current_user
    data = request.get_json() or {}
    item = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    if not item:
        return jsonify({'message': 'Item not found'}), 404
    if item.get('copies', 0) < 1:
        return jsonify({'message': 'No available copies'}), 400

    active = mongo.db.usagerecords.count_documents({'collectionItem': ObjectId(item_id), 'isReturned': False})
    if active >= item.get('copies', 1):
        return jsonify({'message': 'No available copies'}), 400

    borrow_date = datetime.utcnow()
    if data.get('borrowDate'):
        try:
            borrow_date = datetime.fromisoformat(data['borrowDate'])
        except: pass

    policy = get_policies()
    due_date = borrow_date + timedelta(days=int(policy['borrowing']['maxDays']))
    if data.get('dueDate'):
        try:
            due_date = datetime.fromisoformat(data['dueDate'])
        except: pass

    result = mongo.db.usagerecords.insert_one({
        'collectionItem': ObjectId(item_id),
        'user': ObjectId(user['_id']),
        'borrowerName': data.get('borrowerName', user.get('name', 'Unknown')),
        'borrowDate': borrow_date,
        'dueDate': due_date,
        'returnDate': None,
        'renewalCount': 0,
        'dwellTime': 0,
        'conditionAtBorrow': data.get('condition', 'Good'),
        'notes': data.get('notes', ''),
        'academicLevel': user.get('academicLevel', ''),
        'department': user.get('department', ''),
        'isReturned': False,
        'isOverdue': False,
        'createdAt': datetime.utcnow()
    })

    rem_days = get_policies()['notifications']['dueReminderDays']
    schedule_due_reminder(user['_id'], item_id, due_date, rem_days)

    # Clear an available reservation for this item once borrowed
    if get_policies()['reservations']['enabled']:
        claimed = mongo.db.reservations.find_one_and_delete(
            {'item': ObjectId(item_id), 'user': ObjectId(user['_id']), 'status': {'$in': ['waiting', 'ready']}})
        if claimed and str(claimed.get('readyAt')):
            pass

    mongo.db.collectionitems.update_one(
        {'_id': ObjectId(item_id)},
        {'$inc': {'copies': -1, 'usageMetrics.totalBorrows': 1},
         '$set': {'usageMetrics.lastUsed': borrow_date}}
    )

    # Recalculate usage score
    item = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    m = item['usageMetrics']
    score = m['totalBorrows'] * 0.5 + m.get('totalRenewals', 0) * 0.3 + m.get('averageDwellTime', 0) * 0.2
    mongo.db.collectionitems.update_one(
        {'_id': ObjectId(item_id)},
        {'$set': {'usageMetrics.usageScore': round(score, 2)}}
    )

    log_activity(user.get('_id'), 'Borrow', f'"{item.get("title")}" borrowed', item_id)
    return jsonify({'message': 'Item borrowed successfully', 'recordId': str(result.inserted_id), 'dueDate': due_date.isoformat()}), 201

@analytics_bp.route('/items/<item_id>/return', methods=['POST'])
@token_required
def return_item(item_id):
    user = g.current_user
    data = request.get_json() or {}

    # Find the active borrow record
    record_query = {'collectionItem': ObjectId(item_id), 'isReturned': False}
    record_id = data.get('recordId')
    if record_id:
        record_query['_id'] = ObjectId(record_id)
    # Only check user match for non-admin
    if user.get('role') != 'admin':
        record_query['user'] = ObjectId(user['_id'])

    record = mongo.db.usagerecords.find_one_and_update(
        record_query,
        {'$set': {'isReturned': True, 'returnDate': datetime.utcnow()}},
        return_document=True
    )
    if not record:
        return jsonify({'message': 'No active borrow found for this item'}), 404

    dwell = (record['returnDate'] - record['borrowDate']).days

    # Compute overdue fine from policy
    policy = get_policies()
    return_date = record['returnDate']
    due_date = record.get('dueDate') or (record['borrowDate'] + timedelta(days=int(policy['borrowing']['maxDays'])))
    overdue_days = max(0, (return_date - due_date).days - int(policy['fines']['graceDays']))
    is_overdue = overdue_days > 0
    fine = 0
    if is_overdue and policy['fines']['enabled']:
        fine = min(int(policy['fines']['maxFine']), overdue_days * int(policy['fines']['finePerDay']))

    # Would-be reservation notification when an item is returned (availability)
    if policy['reservations']['enabled'] and policy['notifications']['availabilityNotice']:
        flag_reserved_item_availability(item_id)

    # Update return details
    is_damaged = data.get('isDamaged', False)
    missing_count = int(data.get('missingCount', 0))
    return_updates = {
        'dwellTime': dwell,
        'conditionAtReturn': data.get('condition', 'Good'),
        'isDamaged': is_damaged,
        'damageDescription': data.get('damageDescription', ''),
        'missingCount': missing_count,
        'returnNotes': data.get('notes', ''),
        'isOverdue': is_overdue,
        'overdueDays': overdue_days,
        'fineAmount': fine
    }
    mongo.db.usagerecords.update_one({'_id': record['_id']}, {'$set': return_updates})

    copies_to_add = 1 - missing_count
    mongo.db.collectionitems.update_one(
        {'_id': ObjectId(item_id)},
        {'$inc': {'copies': copies_to_add}}
    )

    if missing_count > 0:
        mongo.db.collectionitems.update_one(
            {'_id': ObjectId(item_id)},
            {'$push': {'missingItems': {
                'recordId': str(record['_id']),
                'borrowerName': record.get('borrowerName', 'Unknown'),
                'missingCount': missing_count,
                'dateReported': datetime.utcnow(),
                'notes': data.get('notes', '')
            }}}
        )

    # Recalculate average dwell time
    dwells = [r['dwellTime'] for r in mongo.db.usagerecords.find(
        {'collectionItem': ObjectId(item_id), 'isReturned': True},
        {'dwellTime': 1}
    )]
    avg = sum(dwells) / len(dwells) if dwells else 0
    mongo.db.collectionitems.update_one(
        {'_id': ObjectId(item_id)},
        {'$set': {'usageMetrics.averageDwellTime': round(avg, 2)}}
    )

    # Recalculate usage score
    item = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    m = item['usageMetrics']
    score = m['totalBorrows'] * 0.5 + m.get('totalRenewals', 0) * 0.3 + m.get('averageDwellTime', 0) * 0.2
    retention = min(100, int(score * 5 + 20))
    mongo.db.collectionitems.update_one(
        {'_id': ObjectId(item_id)},
        {'$set': {'usageMetrics.usageScore': round(score, 2), 'usageMetrics.retentionScore': retention}}
    )

    status = 'returned'
    if is_damaged:
        status = 'returned with damage'
    if missing_count > 0:
        status = f'returned with {missing_count} missing'
    if is_damaged and missing_count > 0:
        status = f'returned with damage and {missing_count} missing'

    log_activity(user.get('_id'), 'Return', f'"{item.get("title")}" returned (overdue {overdue_days}d, fine {fine})', item_id)
    return jsonify({'message': f'Item {status}', 'dwellTime': dwell, 'damaged': is_damaged,
                    'missingCount': missing_count, 'overdue': is_overdue, 'overdueDays': overdue_days,
                    'fineAmount': fine})


@analytics_bp.route('/usage/borrowers', methods=['GET'])
@admin_required
def borrower_analytics():
    search_q = request.args.get('search', '').strip().lower()

    pipeline = [
        {'$group': {
            '_id': '$user',
            'totalBorrows': {'$sum': 1},
            'totalReturns': {'$sum': {'$cond': ['$isReturned', 1, 0]}},
            'totalRenewals': {'$sum': '$renewalCount'},
            'avgDwellTime': {'$avg': '$dwellTime'},
            'lastBorrowDate': {'$max': '$borrowDate'},
            'borrowerNames': {'$addToSet': {'$ifNull': ['$borrowerName', '']}},
            'itemIds': {'$addToSet': '$collectionItem'}
        }},
        {'$sort': {'totalBorrows': -1}},
    ]

    borrowers = list(mongo.db.usagerecords.aggregate(pipeline))

    # Enrich names from users collection
    user_ids = [b['_id'] for b in borrowers if isinstance(b['_id'], ObjectId)]
    users_map = {}
    for u in mongo.db.users.find({'_id': {'$in': user_ids}}, {'name': 1}):
        users_map[u['_id']] = u.get('name', 'Unknown')

    # Build enriched list
    enriched = []
    for b in borrowers:
        uid = b['_id']
        name = users_map.get(uid, '') if isinstance(uid, ObjectId) else ''
        if not name:
            names = [n for n in b.get('borrowerNames', []) if n]
            name = names[0] if names else str(uid)

        # Get categories of items this user borrowed
        item_ids = [ObjectId(i) for i in b.get('itemIds', []) if isinstance(i, (str, ObjectId))]
        items = list(mongo.db.collectionitems.find(
            {'_id': {'$in': item_ids}},
            {'title': 1, 'category': 1, 'department': 1}
        )) if item_ids else []

        cat_counts = {}
        for item in items:
            cat = item.get('category', 'Unknown')
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        top_categories = sorted(cat_counts.items(), key=lambda x: -x[1])[:3]

        dept_counts = {}
        for item in items:
            d = item.get('department', '')
            if d:
                dept_counts[d] = dept_counts.get(d, 0) + 1
        top_departments = sorted(dept_counts.items(), key=lambda x: -x[1])[:3]

        enriched.append({
            'borrowerId': str(uid),
            'borrowerName': name,
            'totalBorrows': b['totalBorrows'],
            'totalReturns': b['totalReturns'],
            'totalRenewals': b['totalRenewals'],
            'avgDwellTime': round(b.get('avgDwellTime', 0) or 0, 2),
            'lastBorrowDate': b.get('lastBorrowDate').isoformat() if isinstance(b.get('lastBorrowDate'), datetime) else None,
            'topCategories': [{'name': c, 'count': n} for c, n in top_categories],
            'topDepartments': [{'name': d, 'count': n} for d, n in top_departments]
        })

    top = [b for b in enriched if not search_q or search_q in b['borrowerName'].lower()][:10]
    all_b = [b for b in enriched if not search_q or search_q in b['borrowerName'].lower()]

    return jsonify({'top': top, 'all': all_b, 'total': len(all_b)})


def segment_members(segments, cluster_id):
    """Top representative users within a cluster, for summary display."""
    members = [s for s in segments if s['cluster'] == cluster_id]
    members.sort(key=lambda s: -s['totalBorrows'])
    return [{'name': m['name'], 'totalBorrows': m['totalBorrows'], 'department': m['department']} for m in members[:5]]


@analytics_bp.route('/user-clustering', methods=['GET'])
@admin_required
def user_clustering():
    """Unsupervised segmentation of users by borrowing behavior & usage patterns."""
    users = list(mongo.db.users.find({'role': {'$ne': 'admin'}}))
    if not users:
        return jsonify({'clusters': [], 'summary': [], 'totalUsers': 0}), 200

    records_by_user = {}
    for u in users:
        records_by_user[str(u['_id'])] = []

    all_records = list(mongo.db.usagerecords.find({}))
    for r in all_records:
        uid = str(r.get('user')) if isinstance(r.get('user'), ObjectId) else str(r.get('user'))
        if uid in records_by_user:
            records_by_user[uid].append(r)

    # Category/department diversity per user
    item_info = {}
    ids = list({r['collectionItem'] for recs in records_by_user.values() for r in recs
                if isinstance(r.get('collectionItem'), ObjectId)})
    for it in mongo.db.collectionitems.find({'_id': {'$in': ids}}, {'category': 1, 'department': 1}):
        item_info[str(it['_id'])] = it

    points = []
    segments = []
    label_names = ['High Demand', 'Active', 'Causal / Light', 'Frequent Borrower', 'Big Spender']
    name_colors = {
        'High Demand': '#f59e0b', 'Active': '#10b981', 'Causal / Light': '#ec4899',
        'Frequent Borrower': '#6366f1', 'Big Spender': '#8b5cf6'
    }

    for u in users:
        uid = str(u['_id'])
        recs = records_by_user.get(uid, [])
        n = len(recs)
        total_borrows = n
        total_renewals = sum(r.get('renewalCount', 0) for r in recs)
        dwells = [r.get('dwellTime', 0) for r in recs if r.get('isReturned')]
        avg_dwell = sum(dwells) / len(dwells) if dwells else 0
        overdue = sum(1 for r in recs if r.get('isOverdue'))
        damaged = sum(1 for r in recs if r.get('isDamaged'))
        missing = sum(r.get('missingCount', 0) for r in recs)
        categories = set()
        departments = set()
        for r in recs:
            cid = r.get('collectionItem')
            if isinstance(cid, ObjectId) and str(cid) in item_info:
                info = item_info[str(cid)]
                if info.get('category'): categories.add(info['category'])
                if info.get('department'): departments.add(info['department'])

        features = [total_borrows, total_renewals, avg_dwell, overdue, damaged, missing,
                    len(categories), len(departments)]
        points.append({'id': uid, 'features': features})

        # interpret labels (for overrides)
        if total_borrows >= 25:
            seg = 'Frequent Borrower'
        elif total_borrows >= 12:
            seg = 'Active'
        elif total_borrows >= 5:
            seg = 'Causal / Light'
        else:
            seg = 'Light User'

        if overdue >= 3:
            seg = 'High Dwell / Overdue'
        if avg_dwell > 20:
            seg = 'Long Dwell / Retention'

        segments.append({
            'userId': uid, 'name': u.get('name', 'Unknown'), 'email': u.get('email', ''),
            'department': u.get('department', ''), 'academicLevel': u.get('academicLevel', ''),
            'totalBorrows': total_borrows, 'totalRenewals': total_renewals,
            'avgDwellTime': round(avg_dwell, 1), 'overdue': overdue, 'damaged': damaged,
            'missing': missing, 'categoriesBorrowed': len(categories),
            'departmentsBorrowed': len(departments), 'segment': seg
        })

    # Only cluster users with at least 1 borrow
    active_points = [p for p in points if p['features'][0] > 0]
    clusters_map = {}
    metrics = {'silhouette': None, 'daviesBouldin': None, 'k': 0}
    if len(active_points) >= 3:
        k = 2 if len(active_points) < 6 else 3
        res = kmeans_feature_full(active_points, k)
        if res:
            clusters_map = {c['id']: c['cluster'] for c in res['assignments']}
            unique = list(set(res['labels']))
            metrics['k'] = len(unique)
            sil = silhouette_score(res['normalized'], res['labels'])
            dbi = davies_bouldin_index(res['normalized'], res['labels'])
            metrics['silhouette'] = round(sil, 4) if sil is not None else None
            metrics['daviesBouldin'] = round(dbi, 4) if dbi is not None else None

    # Assign cluster + interpret as segment
    for seg in segments:
        cl = clusters_map.get(seg['userId'], -1)
        seg['cluster'] = cl
        if seg['totalBorrows'] == 0:
            seg['segment'] = 'No Borrowing Activity'
        else:
            seg['segment'] = f'Cluster {cl}'

    # Rank clusters by intensity to give meaningful labels
    label_by_cluster = {}
    cl_avg = {}
    for cl in [0, 1, 2]:
        members = [s for s in segments if s['cluster'] == cl]
        if members:
            cl_avg[cl] = sum(m['totalBorrows'] for m in members) / len(members)
    if cl_avg:
        ranked = sorted(cl_avg.items(), key=lambda x: -x[1])
        labels = ['High Demand', 'Active Borrower', 'Light User']
        for i, (cl, _) in enumerate(ranked):
            label_by_cluster[cl] = labels[i] if i < 3 else f'Cluster {cl}'
        for seg in segments:
            if seg['cluster'] in label_by_cluster:
                seg['segment'] = label_by_cluster[seg['cluster']]
    else:
        for seg in segments:
            if seg['cluster'] >= 0:
                seg['segment'] = f'Cluster {seg["cluster"]}'

    summary = []
    for cl in [-1, 0, 1, 2]:
        members = [s for s in segments if s['cluster'] == cl]
        if not members:
            continue
        label = 'No Activity' if cl == -1 else label_by_cluster.get(cl, f'Cluster {cl}')
        summary.append({
            'cluster': cl, 'label': label, 'count': len(members),
            'avgBorrows': round(sum(m['totalBorrows'] for m in members) / len(members), 1),
            'avgRenewals': round(sum(m['totalRenewals'] for m in members) / len(members), 1),
            'avgDwell': round(sum(m['avgDwellTime'] for m in members) / len(members), 1),
            'avgOverdue': round(sum(m['overdue'] for m in members) / len(members), 1),
            'overdueTotal': sum(m['overdue'] for m in members),
            'segments': segment_members(segments, cl)
        })
    summary.sort(key=lambda s: s['cluster'])

    return jsonify({'clusters': segments, 'summary': summary, 'totalUsers': len(segments), 'k': len([c for c in [0, 1, 2] if clusters_map]), 'metrics': metrics})


@analytics_bp.route('/recommend/similar/<item_id>', methods=['GET'])
@token_required
def similar_items(item_id):
    target = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    if not target: return jsonify({'message': 'Item not found'}), 404

    items = list(mongo.db.collectionitems.find({'status': 'Active', '_id': {'$ne': ObjectId(item_id)}}))
    all_items = [target] + items
    vectors, _ = build_document_vectors(all_items)
    tv = vectors.get(str(target['_id']), {})

    sims = []
    for item in items:
        iv = vectors.get(str(item['_id']), {})
        s = cosine_similarity(tv, iv)
        sims.append({'_id': str(item['_id']), 'title': item.get('title'), 'author': item.get('author'),
                     'category': item.get('category'), 'department': item.get('department'), 'similarity': round(s, 4)})
    sims.sort(key=lambda x: x['similarity'], reverse=True)
    sims = [s for s in sims if s['similarity'] > 0]
    return jsonify(sims[:10])


@analytics_bp.route('/recommend/for-me', methods=['GET'])
@token_required
def recommend_for_me():
    """Personalized recommendations based on the user's frequently-borrowed categories/clusters."""
    user = g.current_user
    # Admins may view recommendations for a specific user via ?userId=
    target_uid = request.args.get('userId')
    if target_uid and user.get('role') == 'admin':
        uid = ObjectId(target_uid)
    else:
        uid = ObjectId(user['_id'])

    # Borrow history of this user
    records = list(mongo.db.usagerecords.find({'user': uid}, {'collectionItem': 1}))
    borrowed_ids = list({r['collectionItem'] for r in records if isinstance(r.get('collectionItem'), ObjectId)})
    borrowed_items = list(mongo.db.collectionitems.find({'_id': {'$in': borrowed_ids}})) if borrowed_ids else []

    if not borrowed_items:
        # Cold start: recommend top performing books
        top = list(mongo.db.collectionitems.find({'status': 'Active'})
                   .sort('usageMetrics.usageScore', -1).limit(10))
        return jsonify({'recommendations': [{
            '_id': str(i['_id']), 'title': i.get('title'), 'author': i.get('author'),
            'category': i.get('category'), 'department': i.get('department'),
            'score': round(i.get('usageMetrics', {}).get('usageScore', 0), 2),
            'reason': 'Popular among readers'
        } for i in top], 'basedOn': 'popular'})

    # Preference profile from history
    cat_pref = {}
    dept_pref = {}
    author_pref = {}
    for it in borrowed_items:
        cat = it.get('category') or 'Other'
        dept = it.get('department') or 'Ungrouped'
        auth = it.get('author') or 'Unknown'
        cat_pref[cat] = cat_pref.get(cat, 0) + 1
        dept_pref[dept] = dept_pref.get(dept, 0) + 1
        author_pref[auth] = author_pref.get(auth, 0) + 1
    total = max(1, len(borrowed_items))

    # Content-based: cosine similarity to a centroid of their borrowed docs
    candidates = list(mongo.db.collectionitems.find({'status': 'Active', '_id': {'$nin': borrowed_ids}}))
    if not candidates:
        return jsonify({'recommendations': [], 'basedOn': 'history'})

    all_items = borrowed_items + candidates
    vectors, _ = build_document_vectors(all_items)
    borrowed_vecs = [vectors.get(str(it['_id']), {}) for it in borrowed_items]
    centroid = {}
    if borrowed_vecs:
        terms = set()
        for v in borrowed_vecs:
            terms.update(v.keys())
        for t in terms:
            centroid[t] = sum(v.get(t, 0) for v in borrowed_vecs) / len(borrowed_vecs)

    recs = []
    for item in candidates:
        iv = vectors.get(str(item['_id']), {})
        content_sim = cosine_similarity(centroid, iv)
        cat_w = cat_pref.get(item.get('category') or 'Other', 0) / total
        dept_w = dept_pref.get(item.get('department') or 'Ungrouped', 0) / total
        auth_w = author_pref.get(item.get('author') or 'Unknown', 0) / total
        score = (cat_w * 0.4 + dept_w * 0.25 + auth_w * 0.2 + content_sim * 0.15) * 100
        if score <= 0:
            continue
        reasons = []
        if cat_w > 0: reasons.append(f'Matches your frequent category ({item.get("category")})')
        if dept_w > 0: reasons.append(f'From {item.get("department")}')
        if auth_w > 0: reasons.append(f'By your favorite author ({item.get("author")})')
        if content_sim > 0.1: reasons.append('Content similar to your past reads')
        recs.append({
            '_id': str(item['_id']), 'title': item.get('title'), 'author': item.get('author'),
            'category': item.get('category'), 'department': item.get('department'),
            'copies': item.get('copies', 1),
            'score': round(score, 2),
            'reason': ' · '.join(reasons[:2]) if reasons else 'Recommended for you'
        })

    recs.sort(key=lambda r: -r['score'])
    return jsonify({'recommendations': recs[:10], 'basedOn': 'history', 'topCategories': sorted(cat_pref.items(), key=lambda x: -x[1])[:3]})


@analytics_bp.route('/collection-decisions', methods=['GET'])
@admin_required
def collection_decisions():
    """Data-Driven Collection Decision Framework."""
    items = list(mongo.db.collectionitems.find({}))
    current_year = datetime.utcnow().year

    policies = get_policies()
    keep_threshold = int(policies['thresholds'].get('keepThreshold', 8))
    service_per_copy = max(2, int(policies['thresholds'].get('servicePerCopy', 4)))

    # Real demand: borrows in the last 365 days per item (drives the 12-month forecast)
    cutoff = datetime.utcnow() - timedelta(days=365)
    recent_borrows = {}
    for r in mongo.db.usagerecords.aggregate([
        {'$match': {'borrowDate': {'$gte': cutoff}}},
        {'$group': {'_id': '$collectionItem', 'n': {'$sum': 1}}}
    ]):
        recent_borrows[str(r['_id'])] = r['n']

    def decision_for(item):
        m = item.get('usageMetrics', {}) or {}
        borrows = m.get('totalBorrows', 0)
        usage = m.get('usageScore', 0)
        copies = item.get('copies', 1)
        condition = (item.get('condition') or 'New').lower()
        pub_year = item.get('publishYear')
        age = (current_year - pub_year) if isinstance(pub_year, int) else 0
        cluster = item.get('cluster', -1)

        if condition in ('damaged', 'poor', 'Repair Needed', 'unusable'):
            return 'Repair / Replace', 'danger', f'Condition: {item.get("condition")}'
        if borrows >= keep_threshold and copies <= 2:
            return 'Add More Copies', 'info', f'{copies} copie(s) vs {borrows} borrows'
        if borrows >= keep_threshold:
            return 'Retain', 'success', 'High performing item'
        if cluster == -2 or (borrows == 0 and age < 5):
            return 'Monitor', 'secondary', 'Newly acquired — track usage'
        if borrows <= 2 and age >= 5:
            return 'Weed / Deselect', 'danger', f'Low usage, {age} yrs old'
        if borrows <= 2:
            return 'Review', 'warning', f'Low usage ({borrows} borrows)'
        return 'Retain', 'success', 'Adequate usage'

    decided = []
    stats = {}
    for item in items:
        decision, color, reason = decision_for(item)
        stats[decision] = stats.get(decision, 0) + 1
        m = item.get('usageMetrics', {})
        borrows = m.get('totalBorrows', 0)
        copies = item.get('copies', 1)
        recent = recent_borrows.get(str(item['_id']), 0)
        # 12-month demand forecast: recent-year borrows projected forward (all-time rate as fallback)
        forecast = recent if recent else round(borrows * 0.35)
        copies_to_add = max(0, math.ceil(forecast / service_per_copy) - copies) if decision == 'Add More Copies' else 0
        decided.append({
            '_id': str(item['_id']),
            'title': item.get('title'),
            'author': item.get('author'),
            'department': item.get('department'),
            'category': item.get('category'),
            'copies': copies,
            'copiesToAdd': copies_to_add,
            'forecast': forecast,
            'recentBorrows': recent,
            'condition': item.get('condition', 'New'),
            'publishYear': item.get('publishYear'),
            'cost': item.get('cost', 0),
            'cluster': item.get('cluster', -1),
            'borrows': borrows,
            'usageScore': round(m.get('usageScore', 0), 2),
            'retentionScore': m.get('retentionScore', 0),
            'decision': decision,
            'decisionTone': color,
            'reason': reason
        })

    order = ['Add More Copies', 'Retain', 'Repair / Replace', 'Review', 'Monitor', 'Weed / Deselect']
    decided.sort(key=lambda d: order.index(d['decision']) if d['decision'] in order else 99)

    # Framework evaluates the full catalog (regardless of manual status tag)
    active = items
    total_borrows = sum((i.get('usageMetrics') or {}).get('totalBorrows', 0) for i in active)
    total_cost = sum(i.get('cost', 0) for i in active)
    ages = [datetime.utcnow().year - i['publishYear'] for i in active if isinstance(i.get('publishYear'), int)]
    avg_age = round(sum(ages) / len(ages), 1) if ages else 0

    # Projected acquisition budget: copies to add per department for Add More Copies items
    add_more = [d for d in decided if d['decision'] == 'Add More Copies']
    budget_by_dept = {}
    for d in add_more:
        dept = d['department'] or 'Ungrouped'
        need = d['copiesToAdd']
        if need <= 0:
            continue
        budget_by_dept[dept] = {
            'items': budget_by_dept.get(dept, {}).get('items', 0) + 1,
            'copiesToAdd': budget_by_dept.get(dept, {}).get('copiesToAdd', 0) + need,
        }

    # Department coverage / gaps
    dept_stats = []
    dept_totals = {}
    for i in items:
        dept = i.get('department') or 'Ungategorized'
        d = dept_totals.setdefault(dept, {'items': 0, 'borrows': 0})
        d['items'] += 1
        d['borrows'] += (i.get('usageMetrics') or {}).get('totalBorrows', 0)
    avg_items = (sum(d['items'] for d in dept_totals.values()) / len(dept_totals)) if dept_totals else 0
    for dept, d in dept_totals.items():
        coverage = 'Low' if d['items'] < avg_items * 0.7 else ('Good' if d['items'] <= avg_items * 1.3 else 'High')
        budget = budget_by_dept.get(dept, {})
        dept_stats.append({
            'department': dept,
            'itemCount': d['items'],
            'totalBorrows': d['borrows'],
            'borrowRatio': round(d['borrows'] / d['items'], 1) if d['items'] else 0,
            'coverage': coverage,
            'copiesToAdd': budget.get('copiesToAdd', 0),
        })

    collection_summary = {
        'totalItems': len(items),
        'activeItems': len(active),
        'totalBorrows': total_borrows,
        'totalCost': round(total_cost, 2),
        'avgAgeYears': avg_age,
        'avgUsageScore': round(sum((i.get('usageMetrics') or {}).get('usageScore', 0) for i in active) / len(active), 2) if active else 0,
    }

    sorted_summary = [{'decision': k, 'count': v} for k, v in sorted(stats.items(), key=lambda x: -x[1])]

    return jsonify({
        'decisions': decided,
        'summary': sorted_summary,
        'collectionSummary': collection_summary,
        'departments': dept_stats,
        'forecastParams': {
            'servicePerCopy': service_per_copy,
            'keepThreshold': keep_threshold,
            'windowMonths': 12,
        },
    })


DEFAULT_SETTINGS = {
    'borrowing': {'maxDays': 14, 'maxRenewals': 2, 'renewalDays': 7, 'minDaysBeforeRenew': 2},
    'fines': {'enabled': True, 'finePerDay': 5, 'graceDays': 0, 'maxFine': 500},
    'reservations': {'enabled': True, 'maxHoldDays': 3, 'reservationsPerUser': 3},
    'notifications': {'dueReminderDays': 2, 'availabilityNotice': True, 'emailAlerts': False},
    'clustering': {'maxClusters': 5, 'minItemsForClustering': 10, 'usageWeight': 0.4, 'retentionWeight': 0.3, 'dwellTimeWeight': 0.3},
    'thresholds': {'retireThreshold': 2, 'keepThreshold': 8, 'flagThreshold': 5, 'servicePerCopy': 4}
}


def get_policies():
    """Merge stored settings with defaults."""
    stored = mongo.db.settings.find_one({'_id': 'policy'})
    if not stored:
        return DEFAULT_SETTINGS
    merged = dict(DEFAULT_SETTINGS)
    stored.pop('_id', None)
    for group, values in stored.items():
        if isinstance(values, dict) and group in merged:
            merged[group].update(values)
        else:
            merged[group] = values
    return merged


def create_notification(user_id, ntype, title, message, item_id=None):
    mongo.db.notifications.insert_one({
        'user': ObjectId(user_id),
        'type': ntype,
        'title': title,
        'message': message,
        'itemId': str(item_id) if item_id else None,
        'isRead': False,
        'createdAt': datetime.utcnow()
    })


def schedule_due_reminder(user_id, item_id, due_date, reminder_days=2):
    mongo.db.notifications.insert_one({
        'user': ObjectId(user_id),
        'type': 'due_reminder',
        'title': 'Upcoming due date',
        'message': f'You borrowed an item due on {due_date.date()}. Please return before your due date.',
        'itemId': str(item_id),
        'isRead': False,
        'notifyAt': due_date - timedelta(days=max(0, int(reminder_days))),
        'createdAt': datetime.utcnow()
    })


def flag_reserved_item_availability(item_id):
    """Notify the first waiting reservation that the item is now available."""
    item = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    if not item:
        return
    waiting = list(mongo.db.reservations.find({'item': ObjectId(item_id), 'status': 'waiting'})
                   .sort('createdAt', 1).limit(item.get('copies', 1)))
    for res in waiting:
        create_notification(
            res['user'], 'available', 'Reserved book is available',
            f'"{item.get("title")}" is now available. Please claim your reservation.',
            item_id
        )
        mongo.db.reservations.update_one(
            {'_id': ObjectId(res['_id'])},
            {'$set': {'status': 'ready', 'readyAt': datetime.utcnow()}}
        )


@analytics_bp.route('/items/<item_id>/reserve', methods=['POST'])
@token_required
def reserve_item(item_id):
    user = g.current_user
    policy = get_policies()
    if not policy['reservations']['enabled']:
        return jsonify({'message': 'Reservations are currently disabled by the library'}), 400

    item = mongo.db.collectionitems.find_one({'_id': ObjectId(item_id)})
    if not item:
        return jsonify({'message': 'Item not found'}), 404

    active = mongo.db.usagerecords.count_documents({'collectionItem': ObjectId(item_id), 'isReturned': False})
    existing = mongo.db.reservations.find_one({
        'user': ObjectId(user['_id']), 'item': ObjectId(item_id), 'status': 'waiting'})
    if existing:
        return jsonify({'message': 'You already have an active reservation for this item'}), 400

    user_reservations = mongo.db.reservations.count_documents(
        {'user': ObjectId(user['_id']), 'status': 'waiting'})
    if user_reservations >= int(policy['reservations']['reservationsPerUser']):
        return jsonify({'message': 'Reservation limit reached'}), 400

    mongo.db.reservations.insert_one({
        'user': ObjectId(user['_id']),
        'item': ObjectId(item_id),
        'itemTitle': item.get('title'),
        'status': 'waiting',
        'createdAt': datetime.utcnow()
    })
    log_activity(user.get('_id'), 'Reserve', f'Reserved "{item.get("title")}"', item_id)
    return jsonify({'message': f'"{item.get("title")}" added to reservation list'}), 201


@analytics_bp.route('/reservations', methods=['GET'])
@token_required
def my_reservations():
    user = g.current_user
    res = list(mongo.db.reservations.find({'user': ObjectId(user['_id'])}).sort('createdAt', -1))
    for r in res:
        r['_id'] = str(r['_id'])
        r['item'] = str(r['item'])
    return jsonify({'reservations': res})


@analytics_bp.route('/reservations/all', methods=['GET'])
@admin_required
def all_reservations():
    res = list(mongo.db.reservations.find({}).sort('createdAt', -1))
    user_ids = [r['user'] for r in res if isinstance(r.get('user'), ObjectId)]
    users_map = {}
    for u in mongo.db.users.find({'_id': {'$in': user_ids}}, {'name': 1, 'email': 1, 'department': 1}):
        users_map[u['_id']] = u
    out = []
    for r in res:
        u = users_map.get(r.get('user'), {})
        out.append({
            '_id': str(r['_id']),
            'userName': u.get('name', 'Unknown'),
            'userEmail': u.get('email', ''),
            'department': u.get('department', ''),
            'itemTitle': r.get('itemTitle', ''),
            'status': r.get('status', 'waiting'),
            'createdAt': r.get('createdAt').isoformat() if isinstance(r.get('createdAt'), datetime) else None,
            'readyAt': r.get('readyAt').isoformat() if isinstance(r.get('readyAt'), datetime) else None,
        })
    return jsonify({'reservations': out})


@analytics_bp.route('/reservations/<res_id>/cancel', methods=['DELETE'])
@token_required
def cancel_reservation(res_id):
    mongo.db.reservations.delete_one({'_id': ObjectId(res_id), 'user': ObjectId(g.current_user['_id'])})
    log_activity(g.current_user.get('_id'), 'Cancel Reservation', f'Cancelled reservation {res_id}')
    return jsonify({'message': 'Reservation cancelled'})


@analytics_bp.route('/notifications', methods=['GET'])
@token_required
def my_notifications():
    user = g.current_user
    unread = mongo.db.notifications.count_documents({'user': ObjectId(user['_id']), 'isRead': False})
    nots = list(mongo.db.notifications.find({'user': ObjectId(user['_id'])}).sort('createdAt', -1).limit(30))
    for n in nots:
        n['_id'] = str(n['_id'])
        if 'createdAt' in n and isinstance(n['createdAt'], datetime):
            n['createdAt'] = n['createdAt'].isoformat()
    return jsonify({'notifications': nots, 'unread': unread})


@analytics_bp.route('/notifications/read', methods=['POST'])
@token_required
def mark_notifications_read():
    mongo.db.notifications.update_many({'user': ObjectId(g.current_user['_id']), 'isRead': False}, {'$set': {'isRead': True}})
    return jsonify({'message': 'All notifications marked as read'})


@analytics_bp.route('/activities', methods=['GET'])
@admin_required
def get_activities():
    action = request.args.get('action')
    q = {}
    if action:
        q['action'] = action
    acts = list(mongo.db.activities.find(q).sort('createdAt', -1).limit(200))
    user_ids = [a['user'] for a in acts if isinstance(a.get('user'), ObjectId)]
    users_map = {}
    for u in mongo.db.users.find({'_id': {'$in': user_ids}}, {'name': 1}):
        users_map[u['_id']] = u.get('name', 'Unknown')
    out = []
    for a in acts:
        out.append({
            '_id': str(a['_id']),
            'userName': users_map.get(a.get('user'), 'System'),
            'action': a.get('action'),
            'details': a.get('details', ''),
            'createdAt': a['createdAt'].isoformat() if isinstance(a.get('createdAt'), datetime) else None,
        })
    actions = [a for a in mongo.db.activities.distinct('action') if a]
    return jsonify({'activities': out, 'actions': sorted(actions)})


@analytics_bp.route('/settings', methods=['GET'])
@admin_required
def get_settings():
    return jsonify(get_policies())


@analytics_bp.route('/settings', methods=['PUT'])
@admin_required
def update_settings():
    data = request.get_json() or {}
    doc = dict(data)
    doc['_id'] = 'policy'
    mongo.db.settings.replace_one({'_id': 'policy'}, doc, upsert=True)
    changed = [f'{k}: {v}' for k, v in data.items() if isinstance(v, dict)]
    log_activity(g.current_user.get('_id'), 'Update Settings', f'Updated settings: {", ".join(changed) if changed else "policy"}')
    return jsonify({'message': 'Settings updated', 'settings': get_policies()})
