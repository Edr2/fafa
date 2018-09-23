import logging
import requests
from flask import Blueprint, request, make_response, render_template, redirect, url_for, abort, jsonify
import datetime
from google.appengine.ext import ndb
from auth import AuthError, verify_id_token, create_session_cookie, verify_session_cookie, revoke_refresh_tokens
# from firebase_admin import auth

page = Blueprint('page', __name__, template_folder='templates')


@page.route('/', methods=['GET'])
def info_page():
    """Returns a list of notes added by the current Firebase user."""
    try:
        cookie = request.cookies.get('session')
        decoded_claims = verify_session_cookie(cookie)

        username = decoded_claims['name'] or decoded_claims['email']

        if decoded_claims:
            return render_template('index.html', username=username)

    except ValueError:
        return redirect(url_for('page.login'))


@page.route('/auth', methods=['POST'])
def auth():
    token = request.form.get('token', None)
    remember = request.form.get('remember', None)
    days = 14 if remember else 1
    expires_in = datetime.timedelta(days=days)
    try:
        session_cookie = create_session_cookie(token, expires_in=expires_in)
        response = jsonify({'status': 'success'})
        expires = datetime.datetime.now() + expires_in
        response.set_cookie('session', session_cookie, expires=expires, httponly=True)
        return response
    except AuthError:
        return abort(401, 'Failed to create a session cookie')


@page.route('/step_two', methods=['GET'])
def step_two():
    try:
        cookie = request.cookies.get('session')
        token = verify_session_cookie(cookie)
        if token:
            return render_template('step_two.html')
    except:
        return 'Error'
    return False


    if 'Authorization' not in request.headers:
        # return 'fuck the police'
        return ''#render_template('sign.html')
    id_token = request.headers['Authorization'].split(' ').pop()
    claims = google.oauth2.id_token.verify_firebase_token(
        id_token, HTTP_REQUEST)
    if not claims:
        return 'Unauthorized', 401
    # [END gae_python_verify_token]

    notes = query_database(claims['sub'])

    return jsonify(notes)


@page.route('/login', methods=['GET'])
def login():
    try:
        cookie = request.cookies.get('session')
        token = verify_session_cookie(cookie)
        if token:
            return redirect(url_for('page.info_page'))

        return render_template('sign.html')
    except ValueError:
        return render_template('sign.html')


@page.route('/logout', methods=['GET'])
def logout():
    session_cookie = request.cookies.get('session')
    try:
        decoded_claims = verify_session_cookie(session_cookie)
        revoke_refresh_tokens(decoded_claims['sub'])
        response = make_response(redirect('/login'))
        response.set_cookie('session', expires=0)
        return response
    except ValueError:
        return flask.redirect('/login')
    #
    # response = make_response(redirect('/'))
    # response.set_cookie('session', expires=0)
    # return response


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


@page.route('/notes', methods=['GET'])
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

@page.route('/notes', methods=['POST', 'PUT'])
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


@page.errorhandler(500)
def server_error(e):
    # Log the error and stacktrace.
    logging.exception('An error occurred during a request.')
    return 'An internal error occurred.', 500