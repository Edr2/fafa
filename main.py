# Copyright 2016 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# """`appengine_config` gets loaded when starting a new application instance."""
# import sys
# import os.path
# # add `lib` subdirectory to `sys.path`, so our `main` module can load
# # third-party libraries.
# sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))


import logging

from flask import Flask, jsonify, request, session, render_template, redirect
import flask_cors
from google.appengine.ext import ndb
import google.auth.transport.requests
import google.oauth2.id_token
import requests_toolbelt.adapters.appengine

# Use the App Engine Requests adapter. This makes sure that Requests uses
# URLFetch.
requests_toolbelt.adapters.appengine.monkeypatch()
HTTP_REQUEST = google.auth.transport.requests.Request()

static_dir = '/static'

app = Flask(__name__, static_url_path=static_dir)
flask_cors.CORS(app)


@app.after_request
def add_header(r):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r


@app.route('/', methods=['GET'])
def main_page():
    """Returns a list of notes added by the current Firebase user."""
    # return "DAA"
    # Verify Firebase auth.
    # [START gae_python_verify_token]
    if 'Authorization' not in request.headers:
        # return 'fuck the police'
        return render_template('sign.html')
    id_token = request.headers['Authorization'].split(' ').pop()
    claims = google.oauth2.id_token.verify_firebase_token(
        id_token, HTTP_REQUEST)
    if not claims:
        return 'Unauthorized', 401
    # [END gae_python_verify_token]

    notes = query_database(claims['sub'])

    return jsonify(notes)


@app.route('/login', methods=['GET'])
def main_pages():
    """Returns a list of notes added by the current Firebase user."""
    # return "DAA"
    # Verify Firebase auth.
    # [START gae_python_verify_token]
    if 'Authorization' not in request.headers:
        return 'fuck the police'
    id_token = request.headers['Authorization'].split(' ').pop()
    claims = google.oauth2.id_token.verify_firebase_token(
        id_token, HTTP_REQUEST)
    if not claims:
        return 'Unauthorized', 401
    # [END gae_python_verify_token]

    notes = query_database(claims['sub'])

    return jsonify(notes)



class Note(ndb.Model):
    """NDB model class for a user's note.

    Key is user id from decrypted token.
    """
    friendly_id = ndb.StringProperty()
    message = ndb.TextProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)


# [START gae_python_query_database]
def query_database(user_id):
    """Fetches all notes associated with user_id.

    Notes are ordered them by date created, with most recent note added
    first.
    """
    ancestor_key = ndb.Key(Note, user_id)
    query = Note.query(ancestor=ancestor_key).order(-Note.created)
    notes = query.fetch()

    note_messages = []

    for note in notes:
        note_messages.append({
            'friendly_id': note.friendly_id,
            'message': note.message,
            'created': note.created
        })

    return note_messages
# [END gae_python_query_database]


@app.route('/notes', methods=['GET'])
def list_notes():
    """Returns a list of notes added by the current Firebase user."""

    # Verify Firebase auth.
    # [START gae_python_verify_token]
    id_token = request.headers['Authorization'].split(' ').pop()
    claims = google.oauth2.id_token.verify_firebase_token(
        id_token, HTTP_REQUEST)
    if not claims:
        return 'Unauthorized', 401
    # [END gae_python_verify_token]

    notes = query_database(claims['sub'])

    return jsonify(notes)


@app.route('/notes', methods=['POST', 'PUT'])
def add_note():
    """
    Adds a note to the user's notebook. The request should be in this format:

        {
            "message": "note message."
        }
    """

    # Verify Firebase auth.
    id_token = request.headers['Authorization'].split(' ').pop()
    claims = google.oauth2.id_token.verify_firebase_token(
        id_token, HTTP_REQUEST)
    if not claims:
        return 'Unauthorized', 401

    # [START gae_python_create_entity]
    data = request.get_json()

    # Populates note properties according to the model,
    # with the user ID as the key name.
    note = Note(
        parent=ndb.Key(Note, claims['sub']),
        message=data['message'])

    # Some providers do not provide one of these so either can be used.
    note.friendly_id = claims.get('name', claims.get('email', 'Unknown'))
    # [END gae_python_create_entity]

    # Stores note in database.
    note.put()

    return 'OK', 200


@app.errorhandler(500)
def server_error(e):
    # Log the error and stacktrace.
    logging.exception('An error occurred during a request.')
    return 'An internal error occurred.', 500


if __name__ == '__main__':
    app.run()