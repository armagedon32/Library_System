import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/library-system')
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key_here_change_in_production')
ADMIN_KEY = os.getenv('ADMIN_KEY', 'super_secret_admin_key_123')
PORT = int(os.getenv('PORT', 5000))
