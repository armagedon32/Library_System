from flask import Blueprint, request, jsonify, g
import jwt
import bcrypt
from datetime import datetime, timedelta
from bson import ObjectId
from db import mongo
from config import JWT_SECRET, ADMIN_KEY
from middleware import token_required
from activity import log_activity

auth_bp = Blueprint('auth', __name__)


def generate_token(user_id):
    payload = {
        'id': str(user_id),
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def user_to_dict(user, include_token=False):
    data = {
        '_id': str(user['_id']),
        'name': user.get('name', ''),
        'email': user.get('email', ''),
        'role': user.get('role', 'user'),
        'department': user.get('department', ''),
    }
    return data


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    department = data.get('department', '')

    if not name or not email or not password:
        return jsonify({'message': 'Please provide all required fields'}), 400

    if mongo.db.users.find_one({'email': email}):
        return jsonify({'message': 'User already exists'}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12))
    result = mongo.db.users.insert_one({
        'name': name,
        'email': email,
        'password': hashed,
        'role': 'user',
        'department': department,
        'createdAt': datetime.utcnow()
    })

    token = generate_token(result.inserted_id)
    user_data = user_to_dict({'email': email, 'name': name, 'department': department, 'role': 'user', '_id': result.inserted_id})
    user_data['token'] = token
    log_activity(None, 'User Registered', f'New user "{name}" registered ({email})')
    return jsonify(user_data), 201


@auth_bp.route('/register/admin', methods=['POST'])
def register_admin():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    department = data.get('department', '')
    admin_key = data.get('adminKey', '')

    if not name or not email or not password:
        return jsonify({'message': 'Please provide all required fields'}), 400
    if admin_key != ADMIN_KEY:
        return jsonify({'message': 'Invalid admin key'}), 403
    if mongo.db.users.find_one({'email': email}):
        return jsonify({'message': 'User already exists'}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12))
    result = mongo.db.users.insert_one({
        'name': name, 'email': email, 'password': hashed,
        'role': 'admin', 'department': department, 'createdAt': datetime.utcnow()
    })

    token = generate_token(result.inserted_id)
    user_data = user_to_dict({'email': email, 'name': name, 'department': department, 'role': 'admin', '_id': result.inserted_id})
    user_data['token'] = token
    log_activity(None, 'Admin Registered', f'New admin "{name}" created ({email})')
    return jsonify(user_data), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = mongo.db.users.find_one({'email': email})
    if not user:
        return jsonify({'message': 'Invalid email or password'}), 401

    stored = user['password']
    if isinstance(stored, str):
        stored = stored.encode('utf-8')

    if not bcrypt.checkpw(password.encode('utf-8'), stored):
        return jsonify({'message': 'Invalid email or password'}), 401

    token = generate_token(user['_id'])
    user_data = user_to_dict(user)
    user_data['token'] = token
    return jsonify(user_data)


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    user = g.current_user
    return jsonify(user_to_dict(user))
