from flask import Flask, request, jsonify, session, make_response
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

# Session configuration
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=False,  # Set to True in production with HTTPS
    SESSION_PERMANENT=False,
    PERMANENT_SESSION_LIFETIME=timedelta(days=1)
)

# CORS configuration
CORS(app,
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept"],
     expose_headers=["Set-Cookie"])

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['badge_management']

# Collections
users = db.users
permanent_badges = db.permanent_badges
temporary_badges = db.temporary_badges
recovered_badges = db.recovered_badges
resolved_notifications = db.resolved_notifications
badge_additions = db.badge_additions

def create_default_users():
    admin_exists = users.count_documents({'username': 'admin'}) > 0
    service_exists = users.count_documents({'username': 'service'}) > 0

    if not admin_exists:
        users.insert_one({
            'username': 'doufik@AdminEmail.com',
            'password': 'AdminPass2025@@',
            'role': 'admin',
            'created_at': datetime.now()
        })
        print("Admin user created")

    if not service_exists:
        users.insert_one({
            'username': 'services@AdminEmail.com',
            'password': 'ServicesPass2025@@',
            'role': 'service',
            'created_at': datetime.now()
        })
        print("Service user created")
    

create_default_users()

# Authentication middleware
def require_auth(func):
    def wrapper(*args, **kwargs):
        if 'user' not in session or not session['user'].get('logged_in'):
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

# Authentication routes
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data received'}), 400

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password are required'}), 400

        user = users.find_one({'username': username})
        
        if user and user.get('password') == password:
            session.clear()
            session['user'] = {
                'username': user['username'],
                'role': user.get('role', 'user'),
                'logged_in': True
            }
            session.permanent = True
            
            response = make_response(jsonify({
                'success': True, 
                'user': session['user']
            }))
            return response
            
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
        
    except Exception as e:
        app.logger.error(f'Login error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error during login'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        session.clear()
        response = make_response(jsonify({'success': True}))
        return response
    except Exception as e:
        app.logger.error(f'Logout error: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error during logout'}), 500

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    try:
        user_data = session.get('user')
        if user_data and user_data.get('logged_in'):
            return jsonify({'authenticated': True, 'user': user_data})
        return jsonify({'authenticated': False})
    except Exception as e:
        app.logger.error(f'Auth check error: {str(e)}')
        return jsonify({'authenticated': False, 'message': 'Server error during auth check'}), 500

# Helper for notifications
def is_notification_resolved(badge_num, notification_type):
    return resolved_notifications.count_documents({
        'badge_num': badge_num,
        'type': notification_type,
        'resolved_at': {'$exists': True}
    }) > 0

# Stats route
@app.route('/api/stats', methods=['GET'])
@require_auth
def get_stats():
    try:
        # Helper to filter valid dates (convert strings if needed) and aggregate
        def aggregate_by_date(collection, date_field, format_string):
            pipeline = [
                # Handle both string and date types more robustly
                {
                    "$addFields": {
                        f"{date_field}_converted": {
                            "$cond": {
                                "if": {"$eq": [{"$type": f"${date_field}"}, "string"]},
                                "then": {
                                    "$dateFromString": {
                                        "dateString": f"${date_field}",
                                        "onError": None
                                    }
                                },
                                "else": f"${date_field}"
                            }
                        }
                    }
                },
                {
                    "$match": {
                        f"{date_field}_converted": {"$ne": None, "$type": "date"}
                    }
                },
                {
                    "$group": {
                        "_id": {"$dateToString": {"format": format_string, "date": f"${date_field}_converted"}},
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"_id": 1}}
            ]
            try:
                result = list(collection.aggregate(pipeline))
                app.logger.debug(f'Aggregation result for {date_field} ({format_string}): {result}')
                # Filter out invalid results
                return [
                    item for item in result
                    if item.get('_id') and item.get('_id') != 'null' and isinstance(item.get('count'), (int, float)) and item.get('count') > 0
                ]
            except Exception as e:
                app.logger.warning(f'Aggregation failed for {date_field} with format {format_string}: {str(e)}')
                return []

        # Aggregate stats by month
        permanent_by_month = aggregate_by_date(permanent_badges, "request_date", "%Y-%m")
        temporary_by_month = aggregate_by_date(temporary_badges, "request_date", "%Y-%m")
        recovered_by_month = aggregate_by_date(recovered_badges, "recovery_date", "%Y-%m")

        # Aggregate stats by year
        permanent_by_year = aggregate_by_date(permanent_badges, "request_date", "%Y")
        temporary_by_year = aggregate_by_date(temporary_badges, "request_date", "%Y")
        recovered_by_year = aggregate_by_date(recovered_badges, "recovery_date", "%Y")

        # Summary stats
        total_permanent = permanent_badges.count_documents({})
        total_temporary = temporary_badges.count_documents({})
        total_recovered = recovered_badges.count_documents({})
        active_badges = permanent_badges.count_documents({"status": "active"}) + temporary_badges.count_documents({"status": "active"})
        expired_badges = temporary_badges.count_documents({"status": "expired"})
        pending_badges = permanent_badges.count_documents({"status": "pending"}) + temporary_badges.count_documents({"status": "pending"})
        companies = len(set(permanent_badges.distinct("company") + temporary_badges.distinct("company")))

        # Calculate average processing time with better error handling
        def calculate_processing_times(collection):
            processing_times = []
            try:
                for doc in collection.find({
                    "issue_date": {"$exists": True, "$ne": None},
                    "request_date": {"$exists": True, "$ne": None}
                }):
                    issue_date = doc.get("issue_date")
                    request_date = doc.get("request_date")
                    
                    # Convert string dates to datetime if needed
                    if isinstance(issue_date, str):
                        try:
                            issue_date = datetime.fromisoformat(issue_date.replace('Z', '+00:00'))
                        except:
                            continue
                    if isinstance(request_date, str):
                        try:
                            request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
                        except:
                            continue
                    
                    # Calculate difference if both are datetime objects
                    if isinstance(issue_date, datetime) and isinstance(request_date, datetime):
                        days_diff = (issue_date - request_date).days
                        if days_diff >= 0:  # Only positive processing times
                            processing_times.append(days_diff)
            except Exception as e:
                app.logger.warning(f'Error calculating processing times: {str(e)}')
            
            return processing_times

        perm_processing_times = calculate_processing_times(permanent_badges)
        temp_processing_times = calculate_processing_times(temporary_badges)
        processing_times = perm_processing_times + temp_processing_times
        avg_processing_time = round(sum(processing_times) / len(processing_times), 1) if processing_times else 0

        # Notification stats with better date handling
        today = datetime.now()
        delay_cutoff = today - timedelta(days=6)
        expiry_cutoff = today + timedelta(days=30)

        # Count delayed badges
        delayed_perm = 0
        delayed_temp = 0
        try:
            delayed_perm = permanent_badges.count_documents({
                "$and": [
                    {"request_date": {"$exists": True, "$ne": None}},
                    {"dgsn_sent": {"$exists": False}},
                    {
                        "$expr": {
                            "$lte": [
                                {
                                    "$cond": {
                                        "if": {"$eq": [{"$type": "$request_date"}, "string"]},
                                        "then": {"$dateFromString": {"dateString": "$request_date", "onError": today}},
                                        "else": "$request_date"
                                    }
                                },
                                delay_cutoff
                            ]
                        }
                    }
                ]
            })
            
            delayed_temp = temporary_badges.count_documents({
                "$and": [
                    {"request_date": {"$exists": True, "$ne": None}},
                    {"dgsn_sent": {"$exists": False}},
                    {
                        "$expr": {
                            "$lte": [
                                {
                                    "$cond": {
                                        "if": {"$eq": [{"$type": "$request_date"}, "string"]},
                                        "then": {"$dateFromString": {"dateString": "$request_date", "onError": today}},
                                        "else": "$request_date"
                                    }
                                },
                                delay_cutoff
                            ]
                        }
                    }
                ]
            })
        except Exception as e:
            app.logger.warning(f'Error counting delayed badges: {str(e)}')

        delayed = delayed_perm + delayed_temp

        # Count expiring badges
        expiring = 0
        try:
            expiring = temporary_badges.count_documents({
                "$and": [
                    {"expiry_date": {"$exists": True, "$ne": None}},
                    {
                        "$expr": {
                            "$and": [
                                {
                                    "$lte": [
                                        {
                                            "$cond": {
                                                "if": {"$eq": [{"$type": "$expiry_date"}, "string"]},
                                                "then": {"$dateFromString": {"dateString": "$expiry_date", "onError": today}},
                                                "else": "$expiry_date"
                                            }
                                        },
                                        expiry_cutoff
                                    ]
                                },
                                {
                                    "$gte": [
                                        {
                                            "$cond": {
                                                "if": {"$eq": [{"$type": "$expiry_date"}, "string"]},
                                                "then": {"$dateFromString": {"dateString": "$expiry_date", "onError": today}},
                                                "else": "$expiry_date"
                                            }
                                        },
                                        today
                                    ]
                                }
                            ]
                        }
                    }
                ]
            })
        except Exception as e:
            app.logger.warning(f'Error counting expiring badges: {str(e)}')

        # Count new badges
        new_badges = 0
        try:
            new_cutoff = today - timedelta(hours=24)
            new_badges = badge_additions.count_documents({
                "$and": [
                    {"added_at": {"$exists": True, "$ne": None}},
                    {"status": "new"},
                    {
                        "$expr": {
                            "$gte": [
                                {
                                    "$cond": {
                                        "if": {"$eq": [{"$type": "$added_at"}, "string"]},
                                        "then": {"$dateFromString": {"dateString": "$added_at", "onError": today}},
                                        "else": "$added_at"
                                    }
                                },
                                new_cutoff
                            ]
                        }
                    }
                ]
            })
        except Exception as e:
            app.logger.warning(f'Error counting new badges: {str(e)}')

        response = {
            'success': True,
            'stats': {
                'permanent_by_month': permanent_by_month or [],
                'temporary_by_month': temporary_by_month or [],
                'recovered_by_month': recovered_by_month or [],
                'permanent_by_year': permanent_by_year or [],
                'temporary_by_year': temporary_by_year or [],
                'recovered_by_year': recovered_by_year or []
            },
            'summary': {
                'total_permanent': total_permanent,
                'total_temporary': total_temporary,
                'total_recovered': total_recovered,
                'active_badges': active_badges,
                'expired_badges': expired_badges,
                'pending_badges': pending_badges,
                'companies': companies,
                'avg_processing_time': avg_processing_time
            },
            'notifications': {
                'delayed': delayed,
                'expiring': expiring,
                'new_badges': new_badges,
                'total': delayed + expiring + new_badges
            }
        }

        app.logger.debug(f'Stats response: {response}')
        return jsonify(response)
    except Exception as e:
        app.logger.error(f'Stats error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch stats'}), 500


@app.route('/api/search', methods=['GET'])
@require_auth
def search_badges():
    try:
        query = request.args.get('query', '').lower()
        if not query:
            return jsonify({'success': False, 'message': 'Query required'}), 400

        results = []

        # Search permanent badges
        for badge in permanent_badges.find({
            '$or': [
                {'badge_num': {'$regex': query, '$options': 'i'}},
                {'full_name': {'$regex': query, '$options': 'i'}},
                {'company': {'$regex': query, '$options': 'i'}},
                {'cin': {'$regex': query, '$options': 'i'}}
            ]
        }, {'_id': 0}):
            badge['type'] = 'permanent'
            results.append(badge)

        # Search temporary badges
        for badge in temporary_badges.find({
            '$or': [
                {'badge_num': {'$regex': query, '$options': 'i'}},
                {'full_name': {'$regex': query, '$options': 'i'}},
                {'company': {'$regex': query, '$options': 'i'}},
                {'cin': {'$regex': query, '$options': 'i'}}
            ]
        }, {'_id': 0}):
            badge['type'] = 'temporary'
            results.append(badge)

        # Search recovered badges
        for badge in recovered_badges.find({
            '$or': [
                {'badge_num': {'$regex': query, '$options': 'i'}},
                {'full_name': {'$regex': query, '$options': 'i'}},
                {'company': {'$regex': query, '$options': 'i'}},
                {'cin': {'$regex': query, '$options': 'i'}}
            ]
        }, {'_id': 0}):
            badge['type'] = 'recovered'
            results.append(badge)

        return jsonify({'success': True, 'results': results})
    except Exception as e:
        app.logger.error(f'Search error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to search badges'}), 500

# Notification routes
@app.route('/api/notifications', methods=['GET'])
@require_auth
def get_notifications():
    try:
        notifications = []
        today = datetime.now()

        # Delayed badges (6+ days since request, no DGSN sent)
        delay_cutoff = today - timedelta(days=6)
        for badge in permanent_badges.find({
            "request_date": {"$lte": delay_cutoff, "$type": "date"},
            "dgsn_sent": {"$exists": False}
        }, {'_id': 0}):
            if not is_notification_resolved(badge['badge_num'], 'delay'):
                request_date = badge.get('request_date')
                notifications.append({
                    'type': 'delay',
                    'badge_num': badge['badge_num'],
                    'message': f"Badge {badge['badge_num']} processing delayed",
                    'full_name': badge.get('full_name'),
                    'company': badge.get('company'),
                    'severity': 'high',
                    'details': {
                        'processing_stage': badge.get('processing_stage', 'N/A'),
                        'days_delayed': (today - request_date).days if request_date else 0,
                        'dgsn_sent': badge.get('dgsn_sent', 'N/A'),
                        'dgsn_returned': badge.get('dgsn_returned', 'N/A'),
                        'gr_sent': badge.get('gr_sent', 'N/A'),
                        'gr_returned': badge.get('gr_returned', 'N/A')
                    }
                })

        for badge in temporary_badges.find({
            "request_date": {"$lte": delay_cutoff, "$type": "date"},
            "dgsn_sent": {"$exists": False}
        }, {'_id': 0}):
            if not is_notification_resolved(badge['badge_num'], 'delay'):
                request_date = badge.get('request_date')
                notifications.append({
                    'type': 'delay',
                    'badge_num': badge['badge_num'],
                    'message': f"Badge {badge['badge_num']} processing delayed",
                    'full_name': badge.get('full_name'),
                    'company': badge.get('company'),
                    'severity': 'high',
                    'details': {
                        'processing_stage': badge.get('processing_stage', 'N/A'),
                        'days_delayed': (today - request_date).days if request_date else 0,
                        'dgsn_sent': badge.get('dgsn_sent', 'N/A'),
                        'dgsn_returned': badge.get('dgsn_returned', 'N/A'),
                        'gr_sent': badge.get('gr_sent', 'N/A'),
                        'gr_returned': badge.get('gr_returned', 'N/A')
                    }
                })

        # Expiring badges (within 30 days)
        expiry_cutoff = today + timedelta(days=30)
        for badge in temporary_badges.find({
            "expiry_date": {"$lte": expiry_cutoff, "$gte": today, "$type": "date"}
        }, {'_id': 0}):
            if not is_notification_resolved(badge['badge_num'], 'expiry'):
                expiry_date = badge.get('expiry_date')
                notifications.append({
                    'type': 'expiry',
                    'badge_num': badge['badge_num'],
                    'message': f"Badge {badge['badge_num']} nearing expiry",
                    'full_name': badge.get('full_name'),
                    'company': badge.get('company'),
                    'severity': 'medium',
                    'details': {
                        'days_remaining': (expiry_date - today).days if expiry_date else 0,
                        'expiry_date': expiry_date.isoformat() if expiry_date else 'N/A',
                        'issue_date': badge.get('issue_date', 'N/A').isoformat() if badge.get('issue_date') and isinstance(badge.get('issue_date'), datetime) else badge.get('issue_date', 'N/A'),
                        'last_activity': badge.get('last_activity', 'N/A').isoformat() if badge.get('last_activity') and isinstance(badge.get('last_activity'), datetime) else badge.get('last_activity', 'N/A')
                    }
                })

        # New badges (last 24 hours)
        new_cutoff = datetime.now() - timedelta(hours=24)
        for badge in badge_additions.find({
            "added_at": {"$gte": new_cutoff, "$type": "date"},
            "status": "new"
        }):
            notifications.append({
                'type': 'new_badge',
                'badge_num': badge['badge_num'],
                'badge_type': badge['type'],
                'message': f"New {badge['type']} badge added: {badge['badge_num']}",
                'added_by': badge['added_by'],
                'added_at': badge['added_at'].isoformat() if badge.get('added_at') else 'N/A',
                'severity': 'info'
            })

        response = {
            'success': True,
            'notifications': notifications,
            'summary': {
                'new_badges': len([n for n in notifications if n['type'] == 'new_badge']),
                'delayed': len([n for n in notifications if n['type'] == 'delay']),
                'expiring': len([n for n in notifications if n['type'] == 'expiry']),
                'recovered': len([n for n in notifications if n['type'] == 'recovery'])
            },
            'last_updated': datetime.now().isoformat()
        }
        
        app.logger.debug(f'Notifications response: {response}')
        return jsonify(response)
    except Exception as e:
        app.logger.error(f'Notifications error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch notifications'}), 500

@app.route('/api/notifications/resolve', methods=['POST'])
@require_auth
def resolve_notification():
    try:
        data = request.get_json()
        badge_num = data.get('badge_num')
        notification_type = data.get('type')
        
        if not badge_num or not notification_type:
            return jsonify({'success': False, 'message': 'Badge number and type required'}), 400
        
        resolved_notifications.insert_one({
            'badge_num': badge_num,
            'type': notification_type,
            'resolved_at': datetime.now(),
            'resolved_by': session['user']['username']
        })
        
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Resolve notification error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to resolve notification'}), 500

@app.route('/api/notifications/acknowledge-new', methods=['POST'])
@require_auth
def acknowledge_new_badge():
    try:
        data = request.get_json()
        badge_num = data.get('badge_num')
        if not badge_num:
            return jsonify({'success': False, 'message': 'Badge number required'}), 400
        
        result = badge_additions.update_one(
            {'badge_num': badge_num},
            {'$set': {'status': 'acknowledged'}}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404
        
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Acknowledge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to acknowledge badge'}), 500

# Badge routes
@app.route('/api/badges/permanent', methods=['GET'])
@require_auth
def get_permanent_badges():
    try:
        badges = list(permanent_badges.find({}, {'_id': 0}))
        return jsonify({'success': True, 'badges': badges})
    except Exception as e:
        app.logger.error(f'Get permanent badges error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch permanent badges'}), 500

@app.route('/api/badges/permanent/<badge_num>', methods=['GET'])
@require_auth
def get_permanent_badge(badge_num):
    try:
        badge = permanent_badges.find_one({'badge_num': badge_num}, {'_id': 0})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        return jsonify({'success': True, **badge})
    except Exception as e:
        app.logger.error(f'Get permanent badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badge'}), 500

@app.route('/api/badges/permanent', methods=['POST'])
@require_auth
def create_permanent_badge():
    try:
        data = request.get_json()
        required_fields = ['badge_num', 'full_name', 'company', 'validity_duration', 'request_date', 'cin']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields including CIN'}), 400
        
        if permanent_badges.find_one({'badge_num': data['badge_num']}):
            return jsonify({'success': False, 'message': 'Badge number already exists'}), 400
        
        data['request_date'] = datetime.fromisoformat(data['request_date'])
        permanent_badges.insert_one(data)
        
        badge_additions.insert_one({
            'badge_num': data['badge_num'],
            'type': 'permanent',
            'added_at': datetime.now(),
            'added_by': session['user']['username'],
            'status': 'new'
        })
        
        return jsonify({'success': True, 'message': 'Permanent badge added'})
    except Exception as e:
        app.logger.error(f'Create permanent badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to add permanent badge'}), 500

@app.route('/api/badges/permanent/<badge_num>', methods=['PUT'])
@require_auth
def update_permanent_badge(badge_num):
    try:
        if 'contract' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
            
        file = request.files['contract']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file'}), 400
            
        if file and file.filename.endswith('.pdf'):
            filename = f"contract_{badge_num}.pdf"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            permanent_badges.update_one(
                {'badge_num': badge_num},
                {'$set': {'contract_path': filepath}}
            )
            
            return jsonify({'success': True, 'message': 'Contract uploaded successfully'})
            
        return jsonify({'success': False, 'message': 'Invalid file type'}), 400
        
    except Exception as e:
        app.logger.error(f'Update error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to update badge'}), 500
    
@app.route('/api/badges/contract/<badge_num>', methods=['GET'])
@require_auth
def download_contract(badge_num):
    try:
        badge = permanent_badges.find_one({'badge_num': badge_num})
        if not badge or not badge.get('contract_path'):
            return jsonify({'success': False, 'message': 'Contract not found'}), 404
            
        return send_from_directory(
            directory=os.path.dirname(badge['contract_path']),
            path=os.path.basename(badge['contract_path']),
            as_attachment=True
        )
        
    except Exception as e:
        app.logger.error(f'Download error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to download contract'}), 500
    

@app.route('/api/badges/permanent/<badge_num>', methods=['DELETE'])
@require_auth
def delete_permanent_badge(badge_num):
    try:
        result = permanent_badges.delete_one({'badge_num': badge_num})
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        badge_additions.delete_one({'badge_num': badge_num})
        resolved_notifications.delete_many({'badge_num': badge_num})
        
        return jsonify({'success': True, 'message': 'Permanent badge deleted'})
    except Exception as e:
        app.logger.error(f'Delete permanent badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to delete permanent badge'}), 500

@app.route('/api/badges/temporary', methods=['GET'])
@require_auth
def get_temporary_badges():
    try:
        badges = list(temporary_badges.find({}, {'_id': 0}))
        return jsonify({'success': True, 'badges': badges})
    except Exception as e:
        app.logger.error(f'Get temporary badges error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch temporary badges'}), 500

@app.route('/api/badges/temporary/<badge_num>', methods=['GET'])
@require_auth
def get_temporary_badge(badge_num):
    try:
        badge = temporary_badges.find_one({'badge_num': badge_num}, {'_id': 0})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        return jsonify({'success': True, **badge})
    except Exception as e:
        app.logger.error(f'Get temporary badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badge'}), 500

@app.route('/api/badges/temporary', methods=['POST'])
@require_auth
def create_temporary_badge():
    try:
        data = request.get_json()
        required_fields = ['badge_num', 'full_name', 'company', 'validity_start', 'validity_end', 'request_date', 'cin']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields including CIN'}), 400
        
        if temporary_badges.find_one({'badge_num': data['badge_num']}):
            return jsonify({'success': False, 'message': 'Badge number already exists'}), 400
        
        data['validity_start'] = datetime.fromisoformat(data['validity_start'])
        data['validity_end'] = datetime.fromisoformat(data['validity_end'])
        data['request_date'] = datetime.fromisoformat(data['request_date'])
        temporary_badges.insert_one(data)
        
        badge_additions.insert_one({
            'badge_num': data['badge_num'],
            'type': 'temporary',
            'added_at': datetime.now(),
            'added_by': session['user']['username'],
            'status': 'new'
        })
        
        return jsonify({'success': True, 'message': 'Temporary badge added'})
    except Exception as e:
        app.logger.error(f'Create temporary badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to add temporary badge'}), 500

@app.route('/api/badges/temporary/<badge_num>', methods=['PUT'])
@require_auth
def update_temporary_badge(badge_num):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        data.pop('badge_num', None)
        if 'request_date' in data:
            data['request_date'] = datetime.fromisoformat(data['request_date'])
        if 'validity_start' in data:
            data['validity_start'] = datetime.fromisoformat(data['validity_start'])
        if 'validity_end' in data:
            data['validity_end'] = datetime.fromisoformat(data['validity_end'])
        
        result = temporary_badges.update_one(
            {'badge_num': badge_num},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        return jsonify({'success': True, 'message': 'Temporary badge updated'})
    except Exception as e:
        app.logger.error(f'Update temporary badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to update temporary badge'}), 500

@app.route('/api/badges/temporary/<badge_num>', methods=['DELETE'])
@require_auth
def delete_temporary_badge(badge_num):
    try:
        result = temporary_badges.delete_one({'badge_num': badge_num})
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        badge_additions.delete_one({'badge_num': badge_num})
        resolved_notifications.delete_many({'badge_num': badge_num})
        
        return jsonify({'success': True, 'message': 'Temporary badge deleted'})
    except Exception as e:
        app.logger.error(f'Delete temporary badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to delete temporary badge'}), 500

@app.route('/api/badges/recovered', methods=['GET'])
@require_auth
def get_recovered_badges():
    try:
        badges = list(recovered_badges.find({}))
        for badge in badges:
            badge['_id'] = str(badge['_id'])  # convert ObjectId
            for field in ['recovery_date', 'validity_start', 'validity_end', 'request_date']:
                if field in badge and isinstance(badge[field], datetime):
                    badge[field] = badge[field].isoformat()
        return jsonify({'success': True, 'badges': badges})
    except Exception as e:
        app.logger.error(f'Get recovered badges error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch recovered badges'}), 500



@app.route('/api/badges/recovered/count', methods=['GET'])
@require_auth
def get_recovered_count():
    try:
        count = recovered_badges.count_documents({})
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        app.logger.error(f'Get recovered count error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch count'}), 500

@app.route('/api/badges/recovered/<badge_num>', methods=['GET'])
@require_auth
def get_recovered_badge(badge_num):
    try:
        badge = recovered_badges.find_one({'badge_num': badge_num})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        badge['_id'] = str(badge['_id'])
        for key in ['recovery_date', 'validity_start', 'validity_end']:
            if badge.get(key):
                badge[key] = badge[key].isoformat()
        return jsonify({'success': True, 'badge': badge})
    except Exception as e:
        app.logger.error(f'Get recovered badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badge'}), 500

@app.route('/api/badges/recovered', methods=['POST'])
@require_auth
def create_recovered_badge():
    try:
        data = request.get_json()
        required_fields = ['badge_num', 'full_name', 'company', 'recovery_date', 'recovery_type', 'cin']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields including CIN'}), 400
        
        data['recovery_date'] = datetime.fromisoformat(data['recovery_date'])
        
        recovered_badges.insert_one(data)
        
        badge_additions.insert_one({
            'badge_num': data['badge_num'],
            'type': 'recovered',
            'added_at': datetime.now(),
            'added_by': session['user']['username'],
            'status': 'new'
        })
        
        return jsonify({'success': True, 'message': 'Recovered badge added'})
    except Exception as e:
        app.logger.error(f'Create recovered badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to add recovered badge'}), 500

@app.route('/api/badges/recovered/<badge_num>', methods=['PUT'])
@require_auth
def update_recovered_badge(badge_num):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        data.pop('badge_num', None)
        if 'recovery_date' in data:
            data['recovery_date'] = datetime.fromisoformat(data['recovery_date'])
        if 'validity_start' in data:
            data['validity_start'] = datetime.fromisoformat(data['validity_start'])
        if 'validity_end' in data:
            data['validity_end'] = datetime.fromisoformat(data['validity_end'])
        
        result = recovered_badges.update_one(
            {'badge_num': badge_num},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        return jsonify({'success': True, 'message': 'Recovered badge updated'})
    except Exception as e:
        app.logger.error(f'Update recovered badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to update recovered badge'}), 500

@app.route('/api/badges/recovered/<badge_num>', methods=['DELETE'])
@require_auth
def delete_recovered_badge(badge_num):
    try:
        result = recovered_badges.delete_one({'badge_num': badge_num})
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        badge_additions.delete_one({'badge_num': badge_num})
        resolved_notifications.delete_many({'badge_num': badge_num})
        
        return jsonify({'success': True, 'message': 'Recovered badge deleted'})
    except Exception as e:
        app.logger.error(f'Delete recovered badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to delete recovered badge'}), 500
    


@app.route('/api/badges/permanent/count', methods=['GET'])
def get_permanent_count():
    count = permanent_badges.count_documents({})
    return jsonify({'count': count})

@app.route('/api/badges/temporary/count', methods=['GET'])
def get_temporary_count():
    count = temporary_badges.count_documents({})
    return jsonify({'count': count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)