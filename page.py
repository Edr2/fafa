import logging
import datetime
from flask import Blueprint, request, make_response, render_template, redirect, url_for, abort, jsonify
from auth import AuthError, create_session_cookie, verify_session_cookie, revoke_refresh_tokens
from firebase_admin import db
import google.auth.transport.requests
HTTP_REQUEST = google.auth.transport.requests.Request()


page = Blueprint('page', __name__, template_folder='templates/pages')


@page.route('/', methods=['GET'])
def index_page():
    try:
        cookie = request.cookies.get('session')
        if not cookie:
            raise AuthError(1, 'User not authenticated')
        decoded_claims = verify_session_cookie(cookie, check_revoked=True)

        full_name = decoded_claims.get('name', None)
        email = decoded_claims.get('email', None)
        user_info = {'username': full_name or email}

        ref = db.reference('users')
        user_record = ref.child(decoded_claims['uid']).get()

        if not user_record:
            return redirect(url_for('page.step_two'))

        return render_template('index.html', user=user_info)
    except AuthError:
        return redirect(url_for('page.login'))


@page.route('/about', methods=['GET'])
def about():
    try:
        cookie = request.cookies.get('session')
        if not cookie:
            raise AuthError(1, 'User not authenticated')
        decoded_claims = verify_session_cookie(cookie, check_revoked=True)

        full_name = decoded_claims.get('name', None)
        email = decoded_claims.get('email', None)
        username = full_name or email

        ref = db.reference('users')
        user_info = {'username': username}
        user_record = ref.child(decoded_claims['uid']).get()

        if not user_record:
            return redirect(url_for('page.step_two'))

        user_info.update(user_record)

        return render_template('about.html', user=user_info)
    except (AuthError, ValueError):
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


@page.route('/step-two', methods=['GET'])
def step_two():
    try:
        cookie = request.cookies.get('session')
        if not cookie:
            raise AuthError(1, 'User not authenticated')
        decoded_claims = verify_session_cookie(cookie)

        if not decoded_claims:
            return redirect(url_for('page.login'))

        ref = db.reference('users')
        user_record = ref.child(decoded_claims['uid']).get()

        return render_template('step_two.html', user=user_record)
    except:
        return redirect(url_for('page.login'))


@page.route('/step_two', methods=['POST'])
def save_step_two():
    try:
        decoded_claims = verify_session_cookie(request.cookies.get('session'))
        token = request.form.get('token', '')
        secret = request.form.get('secret', '')
        ref = db.reference('users')
        ref.update({
            decoded_claims['uid']: {
                'token': token,
                'secret': secret
            }
        })

        return jsonify({'status': 'success'})
    except AuthError:
        return abort(401, 'Failed to authenticate user')


@page.route('/login', methods=['GET'])
def login():
    try:
        cookie = request.cookies.get('session')
        token = verify_session_cookie(cookie, check_revoked=True)
        if token:
            return redirect(url_for('page.index_page'))

        return render_template('sign.html')
    except (ValueError, AuthError):
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
        return redirect('/login')


@page.errorhandler(500)
def server_error(e):
    # Log the error and stacktrace.
    logging.exception('An error occurred during a request.')
    return 'An internal error occurred.', 500