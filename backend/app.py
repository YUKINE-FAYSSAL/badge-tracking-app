from flask import Flask, request, jsonify, session, make_response
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import os
from flask import send_from_directory
import functools
import re
from admin_credentials import ADMIN_EMAIL, ADMIN_PASSWORD, SERVICE_EMAIL, SERVICE_PASSWORD
import traceback
from werkzeug.utils import secure_filename


app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'


# Session configuration
CORS(app, 
     origins=["http://localhost:3000","http://127.0.0.1:3000", "http://localhost:5454"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

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
    admin_exists = users.count_documents({'username': ADMIN_EMAIL}) > 0
    service_exists = users.count_documents({'username': SERVICE_EMAIL}) > 0

    if not admin_exists:
        users.insert_one({
            'username': ADMIN_EMAIL,
            'password': ADMIN_PASSWORD,
            'role': 'admin',
            'created_at': datetime.now()
        })
        print("Admin user created")

    if not service_exists:
        users.insert_one({
            'username': SERVICE_EMAIL,
            'password': SERVICE_PASSWORD,
            'role': 'service',
            'created_at': datetime.now()
        })
        print("Service user created")


create_default_users()


def sanitize_filename(filename):
    """Sanitize filename to remove special characters"""
    # Replace spaces with underscores and remove special characters
    filename = re.sub(r'[^\w\s-]', '', filename)
    filename = re.sub(r'[-\s]+', '_', filename)
    return filename

def get_upload_path(badge_type, badge_data):
    """Get the appropriate upload folder and filename based on badge type"""
    base_upload_folder = app.config.get('UPLOAD_FOLDER', './uploads')
    
    # Sanitize the full name for filename
    full_name = sanitize_filename(badge_data.get('full_name', 'unknown'))
    filename = f"{full_name}.pdf"
    
    if badge_type == 'permanent':
        folder = os.path.join(base_upload_folder, 'permanent')
    elif badge_type == 'temporary':
        folder = os.path.join(base_upload_folder, 'temporary')
    elif badge_type == 'recovered':
        recovery_type = badge_data.get('recovery_type', 'renouvellement')
        if recovery_type.lower() in ['décharge', 'decharge']:
            folder = os.path.join(base_upload_folder, 'recover', 'decharge')
        else:  # renouvellement
            badge_subtype = badge_data.get('badge_type', 'unknown')
            if badge_subtype == 'temporary':
                folder = os.path.join(base_upload_folder, 'recover', 'renouvellement', 'temporary')
            elif badge_subtype == 'permanent':
                folder = os.path.join(base_upload_folder, 'recover', 'renouvellement', 'permanent')
            else:
                folder = os.path.join(base_upload_folder, 'recover', 'renouvellement')
    else:
        # Fallback folder
        folder = os.path.join(base_upload_folder, 'other')
    
    return folder, filename

def update_badge_status(badge):
    today = datetime.now()

    # تحويل التواريخ إذا كانت string
    verification_date = badge.get("verification_date")
    validity_end = badge.get("validity_end")

    # تحويل التواريخ إلى datetime إذا كانوا string
    if isinstance(verification_date, str):
        verification_date = datetime.fromisoformat(verification_date)

    if isinstance(validity_end, str):
        validity_end = datetime.fromisoformat(validity_end)

    # تحديد الحالة إذا كان البادج قد تم التحقق منه أو لا
    if verification_date:
        days_since_verification = (today - verification_date).days
        if days_since_verification > 10:
            return "Expired"  # الحالة إذا مر 10 أيام من تاريخ التحقق

    # إذا كانت الـ badge في مرحلة التحقق ولم تنتهِ المدة
    if validity_end and today < validity_end:
        return "Processing"  # إذا كانت المدة لم تنتهي بعد

    # إذا كانت الـ badge قد تمت الموافقة عليها خلال فترة صلاحيتها
    if verification_date and today <= validity_end:
        return "Active"  # البادج صالحة

    # إذا انتهت المدة ولم يتم التحقق
    if validity_end and today > validity_end:
        return "Expired"  # البادج منتهية الصلاحية
    
    return "Unknown"  # في حالة ما إذا كانت هناك مشكلة أو لا توجد معلومات كافية

def require_auth(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if 'user' not in session or not session['user'].get('logged_in'):
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return func(*args, **kwargs)
    return wrapper


def require_service_admin(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Check if user is logged in
        if 'user' not in session or not session['user'].get('logged_in'):
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        # Ensure only service admins can modify badges
        if session['user'].get('role') != 'service':
            return jsonify({'success': False, 'message': 'Only service admins can modify badge data'}), 403
        
        return func(*args, **kwargs)
    return wrapper


def fix_encoding_comprehensive(data):
    """Fix all encoding issues comprehensively"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, str):
                data[key] = value.replace('dÃ©charge', 'décharge').replace('Ã©', 'é').replace('Ã¨', 'è').replace('Ã ', 'à').replace('Ã´', 'ô').replace('Ã§', 'ç')
            elif isinstance(value, dict):
                data[key] = fix_encoding_comprehensive(value)
            elif isinstance(value, list):
                data[key] = [fix_encoding_comprehensive(item) if isinstance(item, dict) else item.replace('dÃ©charge', 'décharge').replace('Ã©', 'é') if isinstance(item, str) else item for item in value]
    elif isinstance(data, str):
        data = data.replace('dÃ©charge', 'décharge').replace('Ã©', 'é').replace('Ã¨', 'è').replace('Ã ', 'à').replace('Ã´', 'ô').replace('Ã§', 'ç')
    return data
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
# Fix is_notification_resolved function
def is_notification_resolved(badge_num, notification_type):
    """Check if notification is resolved - fix the query"""
    try:
        count = resolved_notifications.count_documents({
            'badge_num': badge_num,
            'type': notification_type
        })
        print(f"Checking resolved: {badge_num}, {notification_type} = {count > 0}")  # Debug
        return count > 0
    except Exception as e:
        print(f"Error checking resolved notification: {e}")
        return False

@app.route('/api/stats', methods=['GET'])
@require_auth
def get_stats():
    try:
        def safe_aggregate_by_date(collection, date_field, format_string):
            """Safely aggregate data by date with better error handling"""
            try:
                documents = list(collection.find({date_field: {"$exists": True, "$ne": None}}))
                date_counts = {}
                
                for doc in documents:
                    date_value = doc.get(date_field)
                    if not date_value:
                        continue
                    
                    if isinstance(date_value, str):
                        try:
                            if 'T' in date_value:
                                date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                            else:
                                date_value = datetime.strptime(date_value, '%Y-%m-%d')
                        except:
                            continue
                    
                    if isinstance(date_value, datetime):
                        if format_string == "%Y-%m":
                            key = date_value.strftime("%Y-%m")
                        elif format_string == "%Y":
                            key = date_value.strftime("%Y")
                        else:
                            key = date_value.strftime(format_string)
                        
                        date_counts[key] = date_counts.get(key, 0) + 1
                
                result = [{"_id": key, "count": count} for key, count in sorted(date_counts.items())]
                return result
                
            except Exception as e:
                app.logger.warning(f'Safe aggregation failed for {date_field}: {str(e)}')
                return []

        # Get aggregated stats
        permanent_by_month = safe_aggregate_by_date(permanent_badges, "request_date", "%Y-%m")
        temporary_by_month = safe_aggregate_by_date(temporary_badges, "request_date", "%Y-%m")
        recovered_by_month = safe_aggregate_by_date(recovered_badges, "recovery_date", "%Y-%m")

        permanent_by_year = safe_aggregate_by_date(permanent_badges, "request_date", "%Y")
        temporary_by_year = safe_aggregate_by_date(temporary_badges, "request_date", "%Y")
        recovered_by_year = safe_aggregate_by_date(recovered_badges, "recovery_date", "%Y")

        # Calculate summary stats
        total_permanent = permanent_badges.count_documents({})
        total_temporary = temporary_badges.count_documents({})
        total_recovered = recovered_badges.count_documents({})
        total_all = total_permanent + total_temporary + total_recovered
        
        # Calculate real status counts from ALL badges - FIXED: Don't count recovered badges as valid
        today = datetime.now()
        
        # Count valid badges (active and not expired) - ONLY permanent and temporary
        valid_count = 0
        expired_count = 0
        processing_count = 0
        delayed_count = 0
        
        # Check permanent badges
        for badge in permanent_badges.find({}):
            gr_return_date = badge.get('gr_return_date')
            request_date = badge.get('request_date')
            
            # Convert dates
            if isinstance(gr_return_date, str):
                try:
                    gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
                except:
                    gr_return_date = None
            
            if isinstance(request_date, str):
                try:
                    request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
                except:
                    request_date = None
            
            if gr_return_date:
                # Badge completed - check if still valid
                validity_duration = badge.get('validity_duration', '1 year')
                if validity_duration == '1 year':
                    validity_end = gr_return_date + timedelta(days=365)
                elif validity_duration == '3 years':
                    validity_end = gr_return_date + timedelta(days=365*3)
                elif validity_duration == '5 years':
                    validity_end = gr_return_date + timedelta(days=365*5)
                else:
                    validity_end = gr_return_date + timedelta(days=365)
                
                if today <= validity_end:
                    valid_count += 1
                else:
                    expired_count += 1
            else:
                # Badge in processing
                if request_date:
                    days_since_request = (today - request_date).days
                    if days_since_request >= 6:
                        delayed_count += 1
                    processing_count += 1
                else:
                    processing_count += 1

        # Check temporary badges
        for badge in temporary_badges.find({}):
            validity_end = badge.get('validity_end')
            request_date = badge.get('request_date')
            gr_return_date = badge.get('gr_return_date')
            
            # Convert dates
            if isinstance(validity_end, str):
                try:
                    validity_end = datetime.fromisoformat(validity_end.replace('Z', '+00:00'))
                except:
                    validity_end = None
            
            if isinstance(request_date, str):
                try:
                    request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
                except:
                    request_date = None
            
            if isinstance(gr_return_date, str):
                try:
                    gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
                except:
                    gr_return_date = None
            
            if gr_return_date and validity_end:
                # Badge completed - check validity
                if today <= validity_end:
                    valid_count += 1
                else:
                    expired_count += 1
            else:
                # Badge in processing
                if request_date:
                    days_since_request = (today - request_date).days
                    if days_since_request >= 6:
                        delayed_count += 1
                    processing_count += 1
                else:
                    processing_count += 1

        # RECOVERED BADGES ARE NOT COUNTED AS VALID - THEY HAVE THEIR OWN CATEGORY
        # They are only included in total_recovered count
        
        # Count unique companies from all collections
        perm_companies = set(permanent_badges.distinct("company"))
        temp_companies = set(temporary_badges.distinct("company"))
        rec_companies = set(recovered_badges.distinct("company"))
        total_companies = len(perm_companies.union(temp_companies).union(rec_companies))

        # Calculate processing time from completed badges
        def calculate_processing_times():
            processing_times = []
            
            # Check permanent badges
            for badge in permanent_badges.find({"gr_return_date": {"$exists": True, "$ne": None, "$ne": ""}}):
                request_date = badge.get("request_date")
                gr_return_date = badge.get("gr_return_date")
                
                if request_date and gr_return_date:
                    try:
                        if isinstance(request_date, str):
                            request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
                        if isinstance(gr_return_date, str):
                            gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
                        
                        if isinstance(request_date, datetime) and isinstance(gr_return_date, datetime):
                            days_diff = (gr_return_date - request_date).days
                            if 0 <= days_diff <= 365:
                                processing_times.append(days_diff)
                    except:
                        continue
            
            # Check temporary badges
            for badge in temporary_badges.find({"gr_return_date": {"$exists": True, "$ne": None, "$ne": ""}}):
                request_date = badge.get("request_date")
                gr_return_date = badge.get("gr_return_date")
                
                if request_date and gr_return_date:
                    try:
                        if isinstance(request_date, str):
                            request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
                        if isinstance(gr_return_date, str):
                            gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
                        
                        if isinstance(request_date, datetime) and isinstance(gr_return_date, datetime):
                            days_diff = (gr_return_date - request_date).days
                            if 0 <= days_diff <= 365:
                                processing_times.append(days_diff)
                    except:
                        continue
            
            return processing_times

        processing_times = calculate_processing_times()
        avg_processing_time = round(sum(processing_times) / len(processing_times), 1) if processing_times else 7.2

        # Calculate real expiring badges (next 30 days) - only permanent and temporary
        expiry_cutoff = today + timedelta(days=30)
        expiring_soon = 0
        
        # Check permanent badges expiring soon
        for badge in permanent_badges.find({"gr_return_date": {"$exists": True, "$ne": None}}):
            gr_return_date = badge.get('gr_return_date')
            if isinstance(gr_return_date, str):
                try:
                    gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
                except:
                    continue
            
            if isinstance(gr_return_date, datetime):
                validity_duration = badge.get('validity_duration', '1 year')
                if validity_duration == '1 year':
                    validity_end = gr_return_date + timedelta(days=365)
                elif validity_duration == '3 years':
                    validity_end = gr_return_date + timedelta(days=365*3)
                elif validity_duration == '5 years':
                    validity_end = gr_return_date + timedelta(days=365*5)
                else:
                    validity_end = gr_return_date + timedelta(days=365)
                
                if today < validity_end <= expiry_cutoff:
                    expiring_soon += 1
        
        # Check temporary badges expiring soon
        for badge in temporary_badges.find({}):
            validity_end = badge.get('validity_end')
            if isinstance(validity_end, str):
                try:
                    validity_end = datetime.fromisoformat(validity_end.replace('Z', '+00:00'))
                except:
                    continue
            
            if isinstance(validity_end, datetime) and today < validity_end <= expiry_cutoff:
                expiring_soon += 1

        # Calculate data quality metrics
        total_records = total_all
        complete_records = 0
        accurate_dates = 0
        matched_companies = 0
        updated_statuses = 0

        # Check data completeness
        for collection in [permanent_badges, temporary_badges, recovered_badges]:
            for badge in collection.find({}):
                required_fields = ['badge_num', 'full_name', 'company', 'cin']
                if all(badge.get(field) for field in required_fields):
                    complete_records += 1
                
                # Check date accuracy
                date_fields = ['request_date', 'recovery_date']
                for field in date_fields:
                    if badge.get(field):
                        accurate_dates += 1
                        break
                
                # Check company matching (assume 92% have proper company data)
                if badge.get('company') and len(badge.get('company', '')) > 2:
                    matched_companies += 1
                
                # Check status updates (assume 88% have recent updates)
                if badge.get('gr_return_date') or badge.get('dgsn_sent'):
                    updated_statuses += 1

        # Calculate percentages
        complete_percentage = round((complete_records / total_records * 100), 1) if total_records > 0 else 100
        date_accuracy = round((accurate_dates / total_records * 100), 1) if total_records > 0 else 100
        company_matching = round((matched_companies / total_records * 100), 1) if total_records > 0 else 100
        status_updates = round((updated_statuses / total_records * 100), 1) if total_records > 0 else 100

        response = {
            'success': True,
            'stats': {
                'permanent_by_month': permanent_by_month,
                'temporary_by_month': temporary_by_month,
                'recovered_by_month': recovered_by_month,
                'permanent_by_year': permanent_by_year,
                'temporary_by_year': temporary_by_year,
                'recovered_by_year': recovered_by_year
            },
            'summary': {
                'total_all': total_all,
                'total_permanent': total_permanent,
                'total_temporary': total_temporary,
                'total_recovered': total_recovered,
                'valid_badges': valid_count,  # Now only permanent + temporary valid badges
                'expired_badges': expired_count,
                'processing_badges': processing_count,
                'delayed_badges': delayed_count,
                'expiring_soon': expiring_soon,
                'companies': total_companies,
                'avg_processing_time': avg_processing_time,
                'data_quality': {
                    'complete_records': complete_percentage,
                    'date_accuracy': date_accuracy,
                    'company_matching': company_matching,
                    'status_updates': status_updates
                }
            }
        }

        app.logger.info(f'Real stats calculated: Total={total_all}, Valid={valid_count}, Expired={expired_count}, Processing={processing_count}, Delayed={delayed_count}')
        return jsonify(response)

    except Exception as e:
        app.logger.error(f'Stats error: {str(e)}')
        return jsonify({'success': False, 'message': f'Failed to fetch stats: {str(e)}'}), 500
# Also add this route to get all badges for the dashboard
@app.route('/api/badges', methods=['GET'])
@require_auth
def get_all_badges():
    try:
        all_badges = []
        
        # Get permanent badges
        for badge in permanent_badges.find({}, {'_id': 0}):
            badge = fix_encoding_comprehensive(badge)
            badge['badgeType'] = 'permanent'
            badge['badgeNumber'] = badge.get('badge_num')
            badge['fullName'] = badge.get('full_name')
            badge['requestDate'] = badge.get('request_date')
            badge['validityDuration'] = badge.get('validity_duration', 'Permanent')
            badge['status'] = 'active'
            all_badges.append(badge)
        
        # Get temporary badges
        for badge in temporary_badges.find({}, {'_id': 0}):
            badge = fix_encoding_comprehensive(badge)
            badge['badgeType'] = 'temporary'
            badge['badgeNumber'] = badge.get('badge_num')
            badge['fullName'] = badge.get('full_name')
            badge['requestDate'] = badge.get('request_date')
            
            # Calculate validity duration
            validity_start = badge.get('validity_start')
            validity_end = badge.get('validity_end')
            if validity_start and validity_end:
                try:
                    if isinstance(validity_start, str):
                        validity_start = datetime.fromisoformat(validity_start.replace('Z', '+00:00'))
                    if isinstance(validity_end, str):
                        validity_end = datetime.fromisoformat(validity_end.replace('Z', '+00:00'))
                    
                    if isinstance(validity_start, datetime) and isinstance(validity_end, datetime):
                        duration = (validity_end - validity_start).days
                        badge['validityDuration'] = f"{duration} days"
                    else:
                        badge['validityDuration'] = 'Unknown'
                except:
                    badge['validityDuration'] = 'Unknown'
            else:
                badge['validityDuration'] = 'Unknown'
            
            # Determine status
            today = datetime.now()
            if validity_end:
                if isinstance(validity_end, str):
                    try:
                        validity_end = datetime.fromisoformat(validity_end.replace('Z', '+00:00'))
                    except:
                        validity_end = None
                
                if isinstance(validity_end, datetime):
                    if validity_end > today:
                        badge['status'] = 'active'
                    else:
                        badge['status'] = 'expired'
                else:
                    badge['status'] = 'unknown'
            else:
                badge['status'] = 'unknown'
                
            all_badges.append(badge)
        
        # Get recovered badges - COMPLETELY FIXED
        for badge in recovered_badges.find({}, {'_id': 0}):
            badge = fix_encoding_comprehensive(badge)
            badge['badgeType'] = 'recovered'
            badge['badgeNumber'] = badge.get('badge_num')
            badge['fullName'] = badge.get('full_name')
            badge['requestDate'] = badge.get('recovery_date')
            
            # Fix recovery type display - this ensures ALL are counted
            recovery_type = badge.get('recovery_type', 'Unknown')
            
            if recovery_type == 'décharge':
                badge['validityDuration'] = 'décharge'
                badge['recovery_display'] = 'décharge'
            elif recovery_type == 'renouvellement':
                sub_type = badge.get('badge_type', '')
                if sub_type:
                    badge['validityDuration'] = f'renouvellement ({sub_type})'
                    badge['recovery_display'] = f'renouvellement ({sub_type})'
                else:
                    badge['validityDuration'] = 'renouvellement'
                    badge['recovery_display'] = 'renouvellement'
            else:
                badge['validityDuration'] = recovery_type
                badge['recovery_display'] = recovery_type
            
            badge['status'] = 'recovered'
            badge['badge_type'] = badge.get('badge_type')
            badge['recovery_type'] = recovery_type
            all_badges.append(badge)
        
        return jsonify({'success': True, 'badges': all_badges})
        
    except Exception as e:
        app.logger.error(f'Get all badges error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badges'}), 500

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


# Replace the existing notifications routes in app.py with this:

@app.route('/api/notifications', methods=['GET'])
@require_auth
def get_notifications():
    try:
        if session['user'].get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Accès administrateur requis'}), 403

        notifications = []
        today = datetime.now()

        def calculate_days_delayed(request_date):
            if isinstance(request_date, str):
                try:
                    request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
                except:
                    return 0
            if isinstance(request_date, datetime):
                return (today - request_date).days
            return 0

        def safe_datetime_convert(date_value):
            if isinstance(date_value, str):
                try:
                    return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                except:
                    return None
            elif isinstance(date_value, datetime):
                return date_value
            return None

        # Vérifier les badges permanents en retard (6+ jours)
        for badge in permanent_badges.find({"dgsn_sent": {"$exists": False}}, {'_id': 0}):
            request_date = badge.get('request_date')
            days_delayed = calculate_days_delayed(request_date)
            
            if days_delayed < 6:
                continue
                
            request_date_dt = safe_datetime_convert(request_date)

            if days_delayed >= 10:
                severity = 'critique'
                message = f"RETARD CRITIQUE: Badge {badge['badge_num']} dépasse 10 jours de traitement ({days_delayed} jours)"
            elif days_delayed >= 6:
                severity = 'attention'
                message = f"ATTENTION: Badge {badge['badge_num']} approche échéance ({days_delayed} jours)"
            else:
                continue

            notifications.append({
                'id': f"perm_{badge['badge_num']}_{severity}",
                'type': 'retard',
                'badge_num': badge['badge_num'],
                'message': message,
                'full_name': badge.get('full_name'),
                'company': badge.get('company'),
                'severity': severity,
                'days_delayed': days_delayed,
                'request_date': request_date_dt.isoformat() if request_date_dt else None
            })

        # Vérifier les badges temporaires en retard
        for badge in temporary_badges.find({"dgsn_sent": {"$exists": False}}, {'_id': 0}):
            request_date = badge.get('request_date')
            days_delayed = calculate_days_delayed(request_date)
            
            if days_delayed < 6:
                continue
                
            request_date_dt = safe_datetime_convert(request_date)

            if days_delayed >= 10:
                severity = 'critique'
                message = f"RETARD CRITIQUE: Badge {badge['badge_num']} dépasse 10 jours ({days_delayed} jours)"
            elif days_delayed >= 6:
                severity = 'attention'
                message = f"ATTENTION: Badge {badge['badge_num']} approche échéance ({days_delayed} jours)"
            else:
                continue

            notifications.append({
                'id': f"temp_{badge['badge_num']}_{severity}",
                'type': 'retard',
                'badge_num': badge['badge_num'],
                'message': message,
                'full_name': badge.get('full_name'),
                'company': badge.get('company'),
                'severity': severity,
                'days_delayed': days_delayed,
                'request_date': request_date_dt.isoformat() if request_date_dt else None
            })

        # Badges expirant bientôt (dans 30 jours)
        # Badges expirant bientôt (dans 30 jours) - ONLY if not resolved
        expiry_cutoff = today + timedelta(days=30)
        for badge in temporary_badges.find({}, {'_id': 0}):
            badge_num = badge['badge_num']
            
            # Check if expiry notification is already resolved - MORE ROBUST CHECK
            resolved_expiry = resolved_notifications.find_one({
                'badge_num': badge_num,
                'notification_type': 'expiry'
            })
            
            # Also check if acknowledged in the badge itself (backward compatibility)
            expiry_acknowledged = badge.get('expiry_acknowledged')
            
            if resolved_expiry or expiry_acknowledged:
                print(f"Skipping expired badge {badge_num} - already resolved/acknowledged")
                continue  # Skip if already resolved
                
            validity_end = badge.get('validity_end')
            validity_end_dt = safe_datetime_convert(validity_end)
            
            if not validity_end_dt:
                continue
                
            # Skip if already expired or too far in future
            if validity_end_dt <= today or validity_end_dt > expiry_cutoff:
                continue
                
            days_remaining = (validity_end_dt - today).days
            
            # Double-check: don't create notification if it's already resolved
            notification_id = f"exp_{badge_num}"
            
            notifications.append({
                'id': notification_id,
                'type': 'expiration',
                'badge_num': badge_num,
                'message': f"Badge {badge_num} expire dans {days_remaining} jours",
                'full_name': badge.get('full_name'),
                'company': badge.get('company'),
                'severity': 'info',
                'days_remaining': days_remaining,
                'expiry_date': validity_end_dt.isoformat()
            })
            
            print(f"Created expiry notification for badge {badge_num}, {days_remaining} days remaining")

        # Nouveaux badges (dernières 24 heures)
        new_cutoff = today - timedelta(hours=24)
        for badge in badge_additions.find({"added_at": {"$gte": new_cutoff}}, {'_id': 0}):
            notifications.append({
                'id': f"new_{badge['badge_num']}",
                'type': 'nouveau',
                'badge_num': badge['badge_num'],
                'badge_type': badge['type'],
                'message': f"Nouveau badge {badge['type']} ajouté: {badge['badge_num']}",
                'full_name': badge.get('full_name', 'Inconnu'),
                'company': badge.get('company', 'Inconnu'),
                'added_by': badge['added_by'],
                'added_at': badge['added_at'].isoformat() if badge.get('added_at') else 'N/A',
                'severity': 'info'
            })

        # Trier par sévérité (critique en premier)
        severity_order = {'critique': 3, 'attention': 2, 'info': 1}
        notifications.sort(key=lambda x: severity_order.get(x['severity'], 0), reverse=True)

        response = {
            'success': True,
            'notifications': notifications,
            'total': len(notifications),
            'last_updated': today.isoformat()
        }

        return jsonify(response)
        
    except Exception as e:
        app.logger.error(f'Notifications error: {str(e)}')
        return jsonify({'success': False, 'message': 'Échec de récupération des notifications'}), 500

@app.route('/api/debug/resolved-notifications', methods=['GET'])
@require_auth
def debug_resolved_notifications():
    try:
        if session['user'].get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
            
        resolved = list(resolved_notifications.find({}, {'_id': 0}))
        return jsonify({'success': True, 'resolved_notifications': resolved})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/notifications/<notification_id>', methods=['DELETE'])
@require_auth
def delete_notification(notification_id):
    try:
        print(f"Deleting notification: {notification_id}")  # DEBUG
        
        if session['user'].get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Accès administrateur requis'}), 403

        parts = notification_id.split('_')
        if len(parts) < 2:
            return jsonify({'success': False, 'message': 'ID de notification invalide'}), 400

        notification_type = parts[0]
        badge_num = parts[1]
        
        print(f"Notification type: {notification_type}, Badge num: {badge_num}")  # DEBUG

        if notification_type == 'new':
            result = badge_additions.delete_one({'badge_num': badge_num})
            print(f"Deleted new badge notification: {result.deleted_count}")  # DEBUG
        
        elif notification_type in ['perm', 'temp']:
            collection = permanent_badges if notification_type == 'perm' else temporary_badges
            result = collection.update_one(
                {'badge_num': badge_num},
                {'$set': {'dgsn_sent': datetime.now()}}
            )
            print(f"Marked badge as sent: {result.matched_count}")  # DEBUG
        
        elif notification_type == 'exp':
            # For expiry notifications - more robust resolution
            resolution_data = {
                'badge_num': badge_num,
                'notification_type': 'expiry',
                'resolved_at': datetime.now(),
                'resolved_by': session['user']['username'],
                'original_notification_id': notification_id
            }
            
            result = resolved_notifications.insert_one(resolution_data)
            print(f"Inserted expiry resolution: {result.inserted_id}")  # DEBUG
            
            # Also mark in temporary_badges
            temp_result = temporary_badges.update_one(
                {'badge_num': badge_num},
                {'$set': {'expiry_acknowledged': datetime.now()}}
            )
            print(f"Updated temporary badge: {temp_result.matched_count}")  # DEBUG

        return jsonify({'success': True, 'message': 'Notification supprimée'})
        
    except Exception as e:
        print(f"Error deleting notification: {e}")  # DEBUG
        app.logger.error(f'Delete notification error: {str(e)}')
        return jsonify({'success': False, 'message': 'Échec de suppression de la notification'}), 500

@app.route('/api/notifications/clear-all', methods=['DELETE'])
@require_auth
def clear_all_notifications():
    try:
        if session['user'].get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Accès administrateur requis'}), 403

        # Clear new badge notifications
        badge_additions.delete_many({})
        
        # Mark all delayed badges as sent
        now = datetime.now()
        permanent_badges.update_many(
            {"dgsn_sent": {"$exists": False}},
            {"$set": {"dgsn_sent": now}}
        )
        temporary_badges.update_many(
            {"dgsn_sent": {"$exists": False}},
            {"$set": {"dgsn_sent": now}}
        )
        
        # Mark all expiry notifications as acknowledged
        temporary_badges.update_many(
            {},
            {"$set": {"expiry_acknowledged": now}}
        )

        return jsonify({'success': True, 'message': 'Toutes les notifications supprimées'})
        
    except Exception as e:
        app.logger.error(f'Clear all notifications error: {str(e)}')
        return jsonify({'success': False, 'message': 'Échec de suppression des notifications'}), 500
# Remove the resolve notification endpoint since we're not storing resolved notifications anymore
@app.route('/api/notifications/clear', methods=['POST'])
@require_auth
def clear_notifications():
    try:
        # Simply return success - notifications are now transient
        return jsonify({'success': True, 'message': 'Notifications cleared'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to clear notifications'}), 500
@app.route('/api/notifications/resolve', methods=['POST'])
@require_auth
def resolve_notification():
    try:
        data = request.get_json()
        
        # Validate input data
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        badge_num = data.get('badge_num')
        notification_type = data.get('type')
        
        # Validate required fields
        if not badge_num:
            return jsonify({'success': False, 'message': 'Badge number is required'}), 400
            
        if not notification_type:
            return jsonify({'success': False, 'message': 'Notification type is required'}), 400
        
        # Check if notification is already resolved to prevent duplicates
        existing_resolution = resolved_notifications.find_one({
            'badge_num': badge_num,
            'type': notification_type
        })
        
        if existing_resolution:
            return jsonify({
                'success': True, 
                'message': 'Notification already resolved',
                'already_resolved': True
            })
        
        # Insert the resolved notification
        resolved_notifications.insert_one({
            'badge_num': badge_num,
            'type': notification_type,
            'resolved_at': datetime.now(),
            'resolved_by': session['user']['username']
        })
        
        app.logger.info(f"Notification resolved - Badge: {badge_num}, Type: {notification_type}, By: {session['user']['username']}")
        
        return jsonify({
            'success': True, 
            'message': 'Notification resolved successfully'
        })
        
    except Exception as e:
        app.logger.error(f'Resolve notification error: {str(e)}')
        return jsonify({
            'success': False, 
            'message': 'Failed to resolve notification'
        }), 500


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

@app.route('/api/badges/permanent', methods=['GET'])
@require_auth
def get_permanent_badges():
    try:
        badges = list(permanent_badges.find({}, {'_id': 0}))
        
        # Add enhanced processing status and validity status to each badge
        for badge in badges:
            badge['processing_status'] = get_permanent_processing_status(badge)
            badge['validity_status'] = get_permanent_validity_status(badge)
            
            # Convert dates to ISO format for frontend
            for field in ['request_date', 'dgsn_sent_date', 'dgsn_return_date', 'gr_sent_date', 'gr_return_date']:
                if field in badge and isinstance(badge[field], datetime):
                    badge[field] = badge[field].isoformat()
                    
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
        
        # Add enhanced processing status and validity status
        badge['processing_status'] = get_permanent_processing_status(badge)
        badge['validity_status'] = get_permanent_validity_status(badge)
        
        # Convert dates to ISO format for frontend
        for field in ['request_date', 'dgsn_sent_date', 'dgsn_return_date', 'gr_sent_date', 'gr_return_date']:
            if field in badge and isinstance(badge[field], datetime):
                badge[field] = badge[field].isoformat()
                
        return jsonify({'success': True, **badge})
    except Exception as e:
        app.logger.error(f'Get permanent badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badge'}), 500

def get_permanent_processing_status(badge):
    """Calculate processing status for permanent badges with proper days count"""
    today = datetime.now()
    
    if not badge.get('request_date'):
        return { 'days': 0, 'status': 'no-date', 'message': 'N/A' }
    
    # Handle string dates
    request_date = badge.get('request_date')
    if isinstance(request_date, str):
        try:
            request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
        except:
            return { 'days': 0, 'status': 'no-date', 'message': 'N/A' }
    
    # Check if badge is completed (has gr_return_date)
    if badge.get('gr_return_date'):
        gr_return_date = badge.get('gr_return_date')
        if isinstance(gr_return_date, str):
            try:
                gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
            except:
                gr_return_date = None
        
        if gr_return_date:
            processing_days = (gr_return_date - request_date).days
            return { 
                'days': processing_days, 
                'status': 'completed', 
                'message': f'{processing_days}j'
            }
    
    # Active processing status based on days since request
    diff_days = (today - request_date).days
    
    return { 
        'days': diff_days, 
        'status': 'processing', 
        'message': f'{diff_days}j'
    }


def get_permanent_validity_status(badge):
    """Calculate validity status for permanent badges based on GR return date"""
    today = datetime.now()
    
    if not badge.get('gr_return_date'):
        return { 'status': 'pending', 'message': 'En attente', 'valid': False }
    
    # Handle GR return date
    gr_return_date = badge.get('gr_return_date')
    if isinstance(gr_return_date, str):
        try:
            gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
        except:
            return { 'status': 'unknown', 'message': 'Date invalide', 'valid': False }
    
    if not isinstance(gr_return_date, datetime):
        return { 'status': 'unknown', 'message': 'Date invalide', 'valid': False }
    
    # Calculate validity end date based on validity_duration
    validity_duration = badge.get('validity_duration', '1 year')
    
    if validity_duration == '1 year':
        validity_end = gr_return_date + timedelta(days=365)
    elif validity_duration == '3 years':
        validity_end = gr_return_date + timedelta(days=365*3)
    elif validity_duration == '5 years':
        validity_end = gr_return_date + timedelta(days=365*5)
    else:
        validity_end = gr_return_date + timedelta(days=365)  # Default to 1 year
    
    # Check validity status
    if today > validity_end:
        days_expired = (today - validity_end).days
        return { 
            'status': 'expired', 
            'message': f'Expiré ({days_expired}j)', 
            'valid': False,
            'validity_end': validity_end
        }
    else:
        days_remaining = (validity_end - today).days
        return { 
            'status': 'valid', 
            'message': f'Valide ({days_remaining}j restants)', 
            'valid': True,
            'validity_end': validity_end
        }
    


@app.route('/api/badges/<badge_type>/<badge_num>/contract/exists', methods=['GET'])
@require_auth
def contract_exists(badge_type, badge_num):
    try:
        if badge_type == "permanent":
            badge = permanent_badges.find_one({'badge_num': badge_num})
        elif badge_type == "temporary":
            badge = temporary_badges.find_one({'badge_num': badge_num})
        elif badge_type == "recovered":
            badge = recovered_badges.find_one({'badge_num': badge_num})
        else:
            return jsonify({"exists": False}), 404

        if not badge:
            return jsonify({"exists": False}), 404

        folder, filename = get_upload_path(badge_type, badge)
        file_path = os.path.join(folder, filename)

        return jsonify({"exists": os.path.exists(file_path)})
    except Exception as e:
        return jsonify({"exists": False, "error": str(e)}), 500

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
        
        # حساب تاريخ الصلاحية (validity_end) بناءً على المدة
        request_date = datetime.fromisoformat(data['request_date'])
        validity_duration = data.get('validity_duration', '1 year')

        if validity_duration == '1 year':
            validity_end = request_date + timedelta(days=365)
        elif validity_duration == '3 years':
            validity_end = request_date + timedelta(days=365*3)
        elif validity_duration == '5 years':
            validity_end = request_date + timedelta(days=365*5)
        else:
            validity_end = request_date + timedelta(days=365)  # Default to 1 year if not provided

        data['validity_end'] = validity_end.isoformat()  # إضافة تاريخ الصلاحية (validity_end)

        # تخزين البادج في قاعدة البيانات
        data['request_date'] = request_date
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

@app.route('/api/badges/permanent/<old_badge_num>', methods=['PUT'])
@require_service_admin
def update_permanent_badge(old_badge_num):
    try:
        data = request.get_json()
        
        # Check if badge exists
        existing_badge = permanent_badges.find_one({'badge_num': old_badge_num})
        if not existing_badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        # If badge number is being changed, check for uniqueness
        new_badge_num = data.get('badge_num')
        if new_badge_num and new_badge_num != old_badge_num:
            # Check if new badge number already exists
            if permanent_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà'}), 400
            
            # Also check in temporary and recovered badges for uniqueness across all types
            if temporary_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà dans les badges temporaires'}), 400
                
            if recovered_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà dans les badges récupérés'}), 400
        
        # Update the badge
        permanent_badges.update_one({'badge_num': old_badge_num}, {'$set': data})
        
        # If badge number was changed, update related records
        if new_badge_num and new_badge_num != old_badge_num:
            # Update badge additions
            badge_additions.update_one(
                {'badge_num': old_badge_num}, 
                {'$set': {'badge_num': new_badge_num}}
            )
            
            # Update resolved notifications
            resolved_notifications.update_many(
                {'badge_num': old_badge_num}, 
                {'$set': {'badge_num': new_badge_num}}
            )
        
        return jsonify({'success': True, 'message': 'Badge permanent mis à jour avec succès'})
    except Exception as e:
        app.logger.error(f"Error updating permanent badge: {str(e)}")
        return jsonify({'success': False, 'message': 'Échec de la mise à jour du badge permanent'}), 500

# In app.py - Update the upload_contract function
@app.route('/api/badges/<badge_type>/<badge_num>/contract', methods=['POST'])
@require_auth
def upload_contract(badge_type, badge_num):
    # Check if the logged-in user is an admin
    if session['user'].get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Only admins can upload contracts'}), 403

    try:
        # Determine the collection based on the badge type
        if badge_type == 'permanent':
            collection = permanent_badges
        elif badge_type == 'temporary':
            collection = temporary_badges
        elif badge_type == 'recovered':
            collection = recovered_badges
        else:
            return jsonify({'success': False, 'message': 'Invalid badge type'}), 400
        
        # Find the badge by its badge number
        badge = collection.find_one({'badge_num': badge_num})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404

        # Check if the file is provided in the request
        if 'contract' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        
        file = request.files['contract']
        
        # Ensure a valid file is selected
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file'}), 400
        
        # Validate file type (only allow PDF files)
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'success': False, 'message': 'Only PDF files are allowed'}), 400
        
        # Validate file size (max 10MB)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > 10 * 1024 * 1024:  # 10MB max size
            return jsonify({'success': False, 'message': 'File size must be less than 10MB'}), 400
        
        # Get the upload folder path
        upload_folder, filename = get_upload_path(badge_type, badge)
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        
        # Save the file to the server
        file.save(filepath)
        
        # Update the badge with the contract file path
        collection.update_one({'badge_num': badge_num}, {'$set': {'contract_path': filepath}})
        
        return jsonify({'success': True, 'message': 'Contract uploaded successfully'})

    except Exception as e:
        app.logger.error(f"Error uploading contract for badge {badge_num}: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to upload contract'}), 500


# Add this route to your app.py file

@app.route('/api/badges/<badge_type>/<badge_num>/contract', methods=['DELETE'])
@require_auth  # Only authenticated users can delete contracts
def delete_contract(badge_type, badge_num):
    # Check if the logged-in user is an admin (same restriction as upload)
    if session['user'].get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Only admins can delete contracts'}), 403

    try:
        # Determine the collection based on the badge type
        if badge_type == 'permanent':
            collection = permanent_badges
        elif badge_type == 'temporary':
            collection = temporary_badges
        elif badge_type == 'recovered':
            collection = recovered_badges
        else:
            return jsonify({'success': False, 'message': 'Invalid badge type'}), 400
        
        # Find the badge by its badge number
        badge = collection.find_one({'badge_num': badge_num})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404

        # Check if contract exists
        if not badge.get('contract_path'):
            return jsonify({'success': False, 'message': 'No contract found for this badge'}), 404
        
        contract_path = badge['contract_path']
        
        # Delete the physical file if it exists
        if os.path.exists(contract_path):
            try:
                os.remove(contract_path)
                app.logger.info(f"Physical contract file deleted: {contract_path}")
            except OSError as e:
                app.logger.error(f"Error deleting physical file {contract_path}: {str(e)}")
                return jsonify({'success': False, 'message': 'Failed to delete contract file from server'}), 500
        
        # Remove contract information from database
        collection.update_one(
            {'badge_num': badge_num}, 
            {'$unset': {
                'contract_path': '',
                'contract_filename': '',
                'contract_uploaded_at': ''
            }}
        )
        
        app.logger.info(f"Contract deleted for badge {badge_num} by {session['user']['username']}")
        
        return jsonify({
            'success': True, 
            'message': 'Contract deleted successfully'
        })

    except Exception as e:
        app.logger.error(f"Error deleting contract for badge {badge_num}: {str(e)}")
        return jsonify({
            'success': False, 
            'message': 'Failed to delete contract'
        }), 500
        

@app.route('/api/badges/contract/<badge_num>', methods=['GET'])
@require_auth
def download_contract_legacy(badge_num):
    try:
        # Try to find the badge in all collections
        collections_and_types = [
            (permanent_badges, 'permanent'),
            (temporary_badges, 'temporary'),
            (recovered_badges, 'recovered')
        ]
        
        badge = None
        badge_type = None
        
        for collection, btype in collections_and_types:
            found_badge = collection.find_one({'badge_num': badge_num})
            if found_badge:
                badge = found_badge
                badge_type = btype
                break
        
        if not badge or not badge.get('contract_path'):
            return jsonify({'success': False, 'message': 'Contract not found'}), 404
            
        # Check if file exists
        if not os.path.exists(badge['contract_path']):
            return jsonify({'success': False, 'message': 'Contract file not found on server'}), 404
            
        return send_from_directory(
            directory=os.path.dirname(badge['contract_path']),
            path=os.path.basename(badge['contract_path']),
            as_attachment=True,
            download_name=badge.get('contract_filename', f"contract_{badge_num}.pdf")
        )
        
    except Exception as e:
        app.logger.error(f'Download contract error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to download contract'}), 500

# Helper function to check if contract exists
def has_contract(badge_type, badge_num):
    """Check if a badge has a contract uploaded"""
    try:
        if badge_type == 'permanent':
            collection = permanent_badges
        elif badge_type == 'temporary':
            collection = temporary_badges
        elif badge_type == 'recovered':
            collection = recovered_badges
        else:
            return False
            
        badge = collection.find_one({'badge_num': badge_num})
        if not badge or not badge.get('contract_path'):
            return False
            
        return os.path.exists(badge['contract_path'])
    except:
        return False
    
# In app.py - Update the download_contract function
# Updated download contract route for all badge types
@app.route('/api/badges/<badge_type>/<badge_num>/contract', methods=['GET'])
@require_auth
def download_contract_universal(badge_type, badge_num):
    try:
        # Get the appropriate collection based on badge type
        if badge_type == 'permanent':
            collection = permanent_badges
        elif badge_type == 'temporary':
            collection = temporary_badges
        elif badge_type == 'recovered':
            collection = recovered_badges
        else:
            return jsonify({'success': False, 'message': 'Invalid badge type'}), 400
            
        badge = collection.find_one({'badge_num': badge_num})
        if not badge or not badge.get('contract_path'):
            return jsonify({'success': False, 'message': 'Contract not found'}), 404
            
        # Check if file exists
        if not os.path.exists(badge['contract_path']):
            return jsonify({'success': False, 'message': 'Contract file not found on server'}), 404
            
        return send_from_directory(
            directory=os.path.dirname(badge['contract_path']),
            path=os.path.basename(badge['contract_path']),
            as_attachment=True,
            download_name=badge.get('contract_filename', f"contract_{badge_num}.pdf")
        )
        
    except Exception as e:
        app.logger.error(f'Download contract error: {str(e)}')
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
    
def get_temporary_badge_status(badge):
    """Enhanced status calculation for temporary badges similar to permanent badges"""
    today = datetime.now()
    
    if not badge.get('request_date'):
        return { 'days': 0, 'status': 'no-date', 'color': 'text-gray-600', 'bg': 'bg-gray-100' }

    # Handle string dates
    request_date = badge.get('request_date')
    if isinstance(request_date, str):
        try:
            request_date = datetime.fromisoformat(request_date.replace('Z', '+00:00'))
        except:
            return { 'days': 0, 'status': 'no-date', 'color': 'text-gray-600', 'bg': 'bg-gray-100' }
    
    # Calculate days since request
    diffDays = (today - request_date).days

    # Check if badge is completed (has gr_return_date)
    if badge.get('gr_return_date'):
        gr_return_date = badge.get('gr_return_date')
        if isinstance(gr_return_date, str):
            try:
                gr_return_date = datetime.fromisoformat(gr_return_date.replace('Z', '+00:00'))
            except:
                gr_return_date = None
        
        if gr_return_date:
            processing_days = (gr_return_date - request_date).days
            if processing_days > 10:
                return { 
                    'days': processing_days, 
                    'status': 'completed-invalid', 
                    'color': 'text-red-600', 
                    'bg': 'bg-red-100',
                    'message': f'Invalid ({processing_days} days)'
                }
            return { 
                'days': processing_days, 
                'status': 'completed', 
                'color': 'text-green-600', 
                'bg': 'bg-green-100',
                'message': f'Complete ({processing_days} days)'
            }

    # Active processing status based on days since request
    if diffDays >= 10:
        return { 
            'days': diffDays, 
            'status': 'expired', 
            'color': 'text-red-700', 
            'bg': 'bg-red-200',
            'message': f'🚨 EXPIRED ({diffDays} days)'
        }
    elif diffDays >= 9:
        return { 
            'days': diffDays, 
            'status': 'critical', 
            'color': 'text-red-600', 
            'bg': 'bg-red-100',
            'message': f'🚨 CRITICAL ({diffDays} days)'
        }
    elif diffDays >= 6:
        return { 
            'days': diffDays, 
            'status': 'warning', 
            'color': 'text-orange-600', 
            'bg': 'bg-orange-100',
            'message': f'⚠️ WARNING ({diffDays} days)'
        }
    else:
        return { 
            'days': diffDays, 
            'status': 'normal', 
            'color': 'text-blue-600', 
            'bg': 'bg-blue-100',
            'message': f'{diffDays} days'
        }


@app.route('/api/badges/temporary', methods=['GET'])
@require_auth
def get_temporary_badges():
    try:
        badges = list(temporary_badges.find({}, {'_id': 0}))
        
        # Add enhanced status to each badge
        for badge in badges:
            badge['status'] = update_badge_status(badge)
            badge['processing_status'] = get_temporary_badge_status(badge)
            
            # Convert dates to ISO format for frontend
            for field in ['request_date', 'dgsn_sent_date', 'dgsn_return_date', 'gr_sent_date', 'gr_return_date', 'validity_start', 'validity_end']:
                if field in badge and isinstance(badge[field], datetime):
                    badge[field] = badge[field].isoformat()
                    
        return jsonify({'success': True, 'badges': badges})
    except Exception as e:
        app.logger.error(f'Get temporary badges error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch temporary badges'}), 500


@app.route('/api/badges/temporary/<badge_num>', methods=['GET'])
@require_auth
def get_temporary_badge_details(badge_num):
    try:
        badge = temporary_badges.find_one({'badge_num': badge_num}, {'_id': 0})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
            
        badge['status'] = update_badge_status(badge)
        badge['processing_status'] = get_temporary_badge_status(badge)
        
        # Convert dates to ISO format for frontend
        for field in ['request_date', 'dgsn_sent_date', 'dgsn_return_date', 'gr_sent_date', 'gr_return_date', 'validity_start', 'validity_end']:
            if field in badge and isinstance(badge[field], datetime):
                badge[field] = badge[field].isoformat()
                
        return jsonify({'success': True, 'badge': badge})
    except Exception as e:
        app.logger.error(f'Error fetching temporary badge details: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badge details'}), 500


@app.route('/api/badges/temporary', methods=['POST'])
@require_auth
def create_temporary_badge():
    try:
        data = request.get_json()
        required_fields = ['badge_num', 'full_name', 'company', 'cin', 'validity_start', 'validity_end', 'request_date']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Set verification_date
        if data.get('gr_return_date'):
            data['verification_date'] = data['gr_return_date']
        else:
            request_date = datetime.fromisoformat(data['request_date'].replace('Z', '+00:00'))
            data['verification_date'] = (request_date + timedelta(days=10)).isoformat()

        data['status'] = update_badge_status(data)
        temporary_badges.insert_one(data)
        return jsonify({'success': True, 'message': 'Temporary badge created'}), 201
    except Exception as e:
        app.logger.error(f'Error creating temporary badge: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to create temporary badge'}), 500


@app.route('/api/badges/temporary/<old_badge_num>', methods=['PUT'])
@require_service_admin
def update_temporary_badge(old_badge_num):
    try:
        data = request.get_json()
        
        # Check if badge exists
        existing_badge = temporary_badges.find_one({'badge_num': old_badge_num})
        if not existing_badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        # If badge number is being changed, check for uniqueness
        new_badge_num = data.get('badge_num')
        if new_badge_num and new_badge_num != old_badge_num:
            # Check if new badge number already exists
            if temporary_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà'}), 400
            
            # Check across all badge types
            if permanent_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà dans les badges permanents'}), 400
                
            if recovered_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà dans les badges récupérés'}), 400
        
        # Update the badge
        temporary_badges.update_one({'badge_num': old_badge_num}, {'$set': data})
        
        # If badge number was changed, update related records
        if new_badge_num and new_badge_num != old_badge_num:
            badge_additions.update_one(
                {'badge_num': old_badge_num}, 
                {'$set': {'badge_num': new_badge_num}}
            )
            
            resolved_notifications.update_many(
                {'badge_num': old_badge_num}, 
                {'$set': {'badge_num': new_badge_num}}
            )
        
        return jsonify({'success': True, 'message': 'Badge temporaire mis à jour avec succès'})
    except Exception as e:
        app.logger.error(f"Error updating temporary badge: {str(e)}")
        return jsonify({'success': False, 'message': 'Échec de la mise à jour du badge temporaire'}), 500

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
        # Fetch all recovered badges
        badges = list(recovered_badges.find({}))

        # Process badges to convert dates and fix encoding
        for badge in badges:
            badge['_id'] = str(badge['_id'])
            badge = fix_encoding_comprehensive(badge)
            
            for field in ['recovery_date', 'validity_start', 'validity_end', 'request_date']:
                if field in badge and isinstance(badge[field], datetime):
                    badge[field] = badge[field].isoformat()

        return jsonify({'success': True, 'badges': badges})

    except Exception as e:
        app.logger.error(f'Get recovered badges error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch recovered badges'}), 500

@app.route('/api/badges/recovered', methods=['POST'])
@require_auth
def create_recovered_badge():
    try:
        data = request.get_json()
        data = fix_encoding_comprehensive(data)

        # Basic required fields validation
        required_fields = ['badge_num', 'full_name', 'company', 'recovery_date', 'recovery_type', 'cin']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Specific validation for 'renouvellement'
        if data.get('recovery_type') == 'renouvellement':
            if not data.get('badge_type'):
                return jsonify({'success': False, 'message': 'Badge type (temporary/permanent) is required for renouvellement'}), 400
            
            # Validate temporary badge requirements
            if data.get('badge_type') == 'temporary':
                if not data.get('validity_start') or not data.get('validity_end'):
                    return jsonify({'success': False, 'message': 'Validity start and end dates are required for temporary badge renewal'}), 400
                
                # Validate date format and logic
                try:
                    start_date = datetime.fromisoformat(data['validity_start'].replace('Z', '+00:00'))
                    end_date = datetime.fromisoformat(data['validity_end'].replace('Z', '+00:00'))
                    
                    if start_date >= end_date:
                        return jsonify({'success': False, 'message': 'Validity end date must be after start date'}), 400
                        
                except ValueError:
                    return jsonify({'success': False, 'message': 'Invalid date format'}), 400
            
            # Validate permanent badge requirements
            elif data.get('badge_type') == 'permanent':
                if not data.get('validity_duration'):
                    return jsonify({'success': False, 'message': 'Validity duration is required for permanent badge renewal'}), 400
                
                if data.get('validity_duration') not in ['1 year', '3 years', '5 years']:
                    return jsonify({'success': False, 'message': 'Invalid validity duration. Must be 1 year, 3 years, or 5 years'}), 400
                
                # Clear temporary-specific fields for permanent badges
                data['validity_start'] = None
                data['validity_end'] = None
            
            else:
                return jsonify({'success': False, 'message': 'Invalid badge type. Must be temporary or permanent'}), 400

        # For décharge type, clear renewal-specific fields
        elif data.get('recovery_type') == 'décharge':
            data['badge_type'] = None
            data['validity_start'] = None
            data['validity_end'] = None
            data['validity_duration'] = None
        
        # Check if badge number already exists
        if recovered_badges.find_one({'badge_num': data['badge_num']}):
            return jsonify({'success': False, 'message': 'Badge number already exists in recovered badges'}), 400

        # Convert dates to datetime objects for storage
        try:
            data['recovery_date'] = datetime.fromisoformat(data['recovery_date'].replace('Z', '+00:00'))
            
            if data.get('validity_start'):
                data['validity_start'] = datetime.fromisoformat(data['validity_start'].replace('Z', '+00:00'))
            
            if data.get('validity_end'):
                data['validity_end'] = datetime.fromisoformat(data['validity_end'].replace('Z', '+00:00'))
                
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'}), 400

        # Add metadata
        data['created_at'] = datetime.now()
        data['created_by'] = session['user']['username']

        # Insert the badge data into the database
        recovered_badges.insert_one(data)

        # Add to badge additions for notifications
        badge_additions.insert_one({
            'badge_num': data['badge_num'],
            'type': 'recovered',
            'added_at': datetime.now(),
            'added_by': session['user']['username'],
            'status': 'new'
        })

        return jsonify({'success': True, 'message': 'Recovered badge added successfully'})

    except Exception as e:
        app.logger.error(f"Error creating recovered badge: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to add recovered badge'}), 500
    

# Update recovered badge endpoint similarly
@app.route('/api/badges/recovered/<old_badge_num>', methods=['PUT'])
@require_service_admin
def update_recovered_badge(old_badge_num):
    try:
        data = request.get_json()
        data = fix_encoding_comprehensive(data)
        
        # Check if badge exists
        existing_badge = recovered_badges.find_one({'badge_num': old_badge_num})
        if not existing_badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        
        # If badge number is being changed, check for uniqueness
        new_badge_num = data.get('badge_num')
        if new_badge_num and new_badge_num != old_badge_num:
            # Check if new badge number already exists
            if recovered_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà'}), 400
            
            # Check across all badge types
            if permanent_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà dans les badges permanents'}), 400
                
            if temporary_badges.find_one({'badge_num': new_badge_num}):
                return jsonify({'success': False, 'message': 'Le numéro de badge existe déjà dans les badges temporaires'}), 400
        
        # Update the badge
        recovered_badges.update_one({'badge_num': old_badge_num}, {'$set': data})
        
        # If badge number was changed, update related records
        if new_badge_num and new_badge_num != old_badge_num:
            badge_additions.update_one(
                {'badge_num': old_badge_num}, 
                {'$set': {'badge_num': new_badge_num}}
            )
            
            resolved_notifications.update_many(
                {'badge_num': old_badge_num}, 
                {'$set': {'badge_num': new_badge_num}}
            )
        
        return jsonify({'success': True, 'message': 'Badge récupéré mis à jour avec succès'})
    except Exception as e:
        app.logger.error(f"Error updating recovered badge: {str(e)}")
        return jsonify({'success': False, 'message': 'Échec de la mise à jour du badge récupéré'}), 500


@app.route('/api/badges/recovered/count', methods=['GET'])
@require_auth
def get_recovered_count():
    try:
        # Get the count of recovered badges
        count = recovered_badges.count_documents({})
        return jsonify({'success': True, 'count': count})

    except Exception as e:
        app.logger.error(f'Get recovered count error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch count'}), 500

@app.route('/api/badges/recovered/<badge_num>', methods=['GET'])
@require_auth
def get_recovered_badge(badge_num):
    try:
        badge = recovered_badges.find_one({'badge_num': badge_num}, {'_id': 0})
        if not badge:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404
        return jsonify({'success': True, **badge})
    except Exception as e:
        app.logger.error(f'Get recovered badge error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch badge'}), 500



@app.route('/api/badges/recovered/<badge_num>', methods=['DELETE'])
@require_auth
def delete_recovered_badge(badge_num):
    try:
        # Delete the badge from the 'recovered_badges' collection
        result = recovered_badges.delete_one({'badge_num': badge_num})
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Badge not found'}), 404

        # Remove related data from other collections
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
    app.run(host="127.0.0.1",debug=True, port=5454)