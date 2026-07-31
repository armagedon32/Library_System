from functools import wraps
from flask import request, jsonify, g
import jwt
from bson import ObjectId
from config import JWT_SECRET


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Not authorized, no token'}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            from app import mongo
            user = mongo.db.users.find_one({'_id': ObjectId(data['id'])})
            if not user:
                return jsonify({'message': 'User not found'}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        user = g.get('current_user')
        if not user or user.get('role') != 'admin':
            return jsonify({'message': 'Not authorized as admin'}), 403
        return f(*args, **kwargs)
    return decorated
