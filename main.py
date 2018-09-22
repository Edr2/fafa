import requests_toolbelt.adapters.appengine
requests_toolbelt.adapters.appengine.monkeypatch()
from flask import Flask
import flask_cors
from firebase_admin import credentials
import firebase_admin
import google.auth.transport.requests
from page import page


cred = credentials.Certificate('credentials/serviceAccountKey.json')
# Initialize the app with a service account, granting admin privileges
fire_app = firebase_admin.initialize_app(cred)

# Use the App Engine Requests adapter. This makes sure that Requests uses
# URLFetch.
HTTP_REQUEST = google.auth.transport.requests.Request()

static_dir = '/static'



# @app.after_request
# def add_header(r):
#     """
#     Add headers to both force latest IE rendering engine or Chrome Frame,
#     and also to cache the rendered page for 10 minutes.
#     """
#     r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
#     r.headers["Pragma"] = "no-cache"
#     r.headers["Expires"] = "0"
#     r.headers['Cache-Control'] = 'public, max-age=0'
#     return r

app = Flask(__name__, static_url_path=static_dir)
flask_cors.CORS(app)



app.register_blueprint(page)

# app = create_app()
# app.run()
