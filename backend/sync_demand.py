import random
from datetime import datetime, timedelta
from bson import ObjectId

from app import create_app
from db import mongo

app = create_app()

academic_levels = ['Undergraduate', 'Graduate', 'Faculty', 'Staff']


def desired_borrows(rank):
    """Target real borrow count for an item by popularity rank (1 = most demanded)."""
    if rank <= 20:
        return max(8, 50 - (rank - 1) * 1.3)
    if rank <= 38:
        return max(8, 24 - (rank - 21) * 0.75)
    return max(0, 9 - (rank - 39) * 0.5)


def add_demand_records():
    items = list(mongo.db.collectionitems.find({}, {'_id': 1, 'copies': 1, 'usageMetrics': 1}))
    items.sort(key=lambda i: -((i.get('usageMetrics') or {}).get('totalBorrows', 0)))

    existing = {}
    for r in mongo.db.usagerecords.find({}, {'collectionItem': 1}):
        iid = str(r.get('collectionItem'))
        existing[iid] = existing.get(iid, 0) + 1

    users = list(mongo.db.users.find({'role': {'$ne': 'admin'}}, {'_id': 1, 'department': 1}))

    now = datetime.utcnow()
    to_insert = []
    for rank, item in enumerate(items, start=1):
        iid = item['_id']
        cur = existing.get(str(iid), 0)
        target = round(desired_borrows(rank))
        add = max(0, target - cur)
        if add == 0:
            continue
        for _ in range(add):
            user = random.choice(users)
            borrow_date = now - timedelta(days=random.randint(0, 365))
            due_date = borrow_date + timedelta(days=14)
            renewals = random.randint(0, 3)
            return_date = due_date + timedelta(days=random.randint(0, 7))
            to_insert.append({
                'collectionItem': iid,
                'user': user['_id'],
                'borrowDate': borrow_date,
                'returnDate': return_date,
                'dueDate': due_date,
                'renewalCount': renewals,
                'dwellTime': (return_date - borrow_date).days,
                'academicLevel': random.choice(academic_levels),
                'department': user.get('department', ''),
                'isReturned': True,
                'isOverdue': random.random() < 0.08,
                'createdAt': now
            })

    if to_insert:
        mongo.db.usagerecords.insert_many(to_insert, ordered=False)
    print('Added', len(to_insert), 'demand records. Total records =',
          mongo.db.usagerecords.count_documents({}))


def sync_usage_metrics():
    pipe = [
        {'$group': {
            '_id': '$collectionItem',
            'totalBorrows': {'$sum': 1},
            'totalRenewals': {'$sum': '$renewalCount'},
            'avgDwell': {'$avg': '$dwellTime'},
            'lastUsed': {'$max': '$borrowDate'}
        }}
    ]
    stats = {str(r['_id']): r for r in mongo.db.usagerecords.aggregate(pipe)}

    updated = 0
    for item in mongo.db.collectionitems.find({}, {'_id': 1, 'usageMetrics': 1}):
        s = stats.get(str(item['_id']))
        if not s:
            continue
        total_borrows = s['totalBorrows']
        total_renewals = s.get('totalRenewals', 0)
        avg_dwell = round(s.get('avgDwell') or 0, 2)
        last_used = s.get('lastUsed')
        score = total_borrows * 0.5 + total_renewals * 0.3 + avg_dwell * 0.2
        retention = min(100, int(score * 5 + 20))
        mongo.db.collectionitems.update_one(
            {'_id': item['_id']},
            {'$set': {
                'usageMetrics.totalBorrows': total_borrows,
                'usageMetrics.totalRenewals': total_renewals,
                'usageMetrics.averageDwellTime': avg_dwell,
                'usageMetrics.lastUsed': last_used,
                'usageMetrics.usageScore': round(score, 2),
                'usageMetrics.retentionScore': retention
            }}
        )
        updated += 1
    print('Synced usageMetrics for', updated, 'items')


with app.app_context():
    add_demand_records()
    sync_usage_metrics()