import requests_toolbelt.adapters.appengine
requests_toolbelt.adapters.appengine.monkeypatch()
from flask import Flask
import flask_cors
import firebase_admin
from firebase_admin import credentials
from config import current_config
from page import page

cred = credentials.Certificate(current_config.CREDENTIALS_PATH)
fire_app = firebase_admin.initialize_app(cred, {
    'databaseURL': current_config.FIREBASE_REALTIME_DB_URL
})

static_dir = '/static'

app = Flask(__name__, static_url_path=static_dir)
flask_cors.CORS(app)

app.register_blueprint(page)
