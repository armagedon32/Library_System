import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import MONGO_URI, PORT
from db import mongo

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config['MONGO_URI'] = MONGO_URI
    CORS(app)

    mongo.init_app(app)

    from routes.auth import auth_bp
    from routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    @app.route('/api/health')
    def health():
        return {'status': 'ok'}

    # Serve built frontend in production
    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(frontend_dist, path)):
            return send_from_directory(frontend_dist, path)
        index = os.path.join(frontend_dist, 'index.html')
        if os.path.exists(index):
            return send_from_directory(frontend_dist, 'index.html')
        return {'status': 'ok', 'message': 'API running'}

    return app


if __name__ == '__main__':
    app = create_app()
    print(f'Server running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=True)
