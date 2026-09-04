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
        'studentId': user.get('studentId', ''),
        'role': user.get('role', 'user'),
        'department': user.get('department', ''),
        'academicLevel': user.get('academicLevel', ''),
        'contactNumber': user.get('contactNumber', ''),
        'createdAt': user.get('createdAt').isoformat() if isinstance(user.get('createdAt'), datetime) else None,
    }
    return data


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    department = data.get('department', '')
    student_id = data.get('studentId', '').strip()

    if not name or not email or not password:
        return jsonify({'message': 'Please provide all required fields'}), 400

    if mongo.db.users.find_one({'email': email}):
        return jsonify({'message': 'User already exists'}), 400

    if student_id and mongo.db.users.find_one({'studentId': student_id}):
        return jsonify({'message': 'Student ID already exists'}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12))
    result = mongo.db.users.insert_one({
        'name': name,
        'email': email,
        'password': hashed,
        'studentId': student_id,
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


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    user = g.current_user
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    student_id = (data.get('studentId') or '').strip()
    department = (data.get('department') or '').strip()
    academic_level = (data.get('academicLevel') or '').strip()
    contact = (data.get('contactNumber') or '').strip()

    if not name:
        return jsonify({'message': 'Name is required'}), 400

    if student_id and student_id != user.get('studentId', ''):
        if mongo.db.users.find_one({'studentId': student_id, '_id': {'$ne': ObjectId(user['_id'])}}):
            return jsonify({'message': 'Student ID already exists'}), 400

    update = {'name': name, 'studentId': student_id, 'department': department,
              'academicLevel': academic_level, 'contactNumber': contact}
    mongo.db.users.update_one({'_id': ObjectId(user['_id'])}, {'$set': update})
    log_activity(user['_id'], 'Update Profile', f'Profile updated for "{name}"')
    updated = mongo.db.users.find_one({'_id': ObjectId(user['_id'])})
    return jsonify(user_to_dict(updated))


@auth_bp.route('/password', methods=['PUT'])
@token_required
def change_password():
    user = g.current_user
    data = request.get_json() or {}
    current = data.get('currentPassword', '')
    new_password = data.get('newPassword', '')

    if not current or not new_password:
        return jsonify({'message': 'Please provide current and new password'}), 400
    if len(new_password) < 6:
        return jsonify({'message': 'New password must be at least 6 characters'}), 400

    stored = user['password']
    if isinstance(stored, str):
        stored = stored.encode('utf-8')
    if not bcrypt.checkpw(current.encode('utf-8'), stored):
        return jsonify({'message': 'Current password is incorrect'}), 400

    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(12))
    mongo.db.users.update_one({'_id': ObjectId(user['_id'])}, {'$set': {'password': hashed}})
    log_activity(user['_id'], 'Change Password', 'Password changed')
    return jsonify({'message': 'Password updated successfully'})
