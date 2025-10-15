# ============================================
# FILE: app.py - Main Flask Application
# ============================================

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://Naman2705:qS0xYtbCbghQD3gK@cluster0.68otw.mongodb.net/')
DB_NAME = os.getenv('DB_NAME', 'livestream_db')

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    overlays_collection = db['overlays']
    streams_collection = db['streams']
    print("✓ Connected to MongoDB")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")

# ============================================
# VALIDATION FUNCTIONS
# ============================================

def validate_overlay_data(data):
    """Validate overlay data structure"""
    required_fields = ['name', 'type', 'content', 'position', 'size']
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate type (matching frontend: 'text' or 'shape')
    if data['type'] not in ['text', 'shape']:
        return False, "Invalid type. Must be 'text' or 'shape'"
    
    # Validate position and size objects
    if not isinstance(data['position'], dict) or 'x' not in data['position'] or 'y' not in data['position']:
        return False, "Position must have x and y coordinates"
    
    if not isinstance(data['size'], dict) or 'width' not in data['size'] or 'height' not in data['size']:
        return False, "Size must have width and height"
    
    # Validate name length
    if len(data['name']) > 100:
        return False, "Name must be 100 characters or less"
    
    # Validate opacity if provided
    if 'opacity' in data:
        if not isinstance(data['opacity'], (int, float)) or not (0 <= data['opacity'] <= 1):
            return False, "Opacity must be a number between 0 and 1"
    
    return True, None

def prepare_overlay_response(overlay):
    """Convert MongoDB document to JSON-serializable format"""
    if overlay and '_id' in overlay:
        overlay['_id'] = str(overlay['_id'])
    return overlay

def validate_stream_url(url):
    """Validate stream URL format"""
    if not url or not isinstance(url, str):
        return False, "URL is required"
    
    url = url.strip()
    if not url.startswith(('http://', 'https://', 'rtsp://')):
        return False, "Invalid URL format. Must start with http://, https://, or rtsp://"
    
    return True, None

# ============================================
# OVERLAY API ROUTES
# ============================================

# CREATE: Add new overlay
@app.route('/api/overlays', methods=['POST'])
def create_overlay():
    """Create a new overlay configuration"""
    try:
        data = request.json
        
        # Validate data
        is_valid, error_msg = validate_overlay_data(data)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Prepare overlay document (matching frontend structure)
        overlay = {
            'name': data['name'].strip(),
            'type': data['type'],  # 'text' or 'shape'
            'content': data['content'].strip(),
            'position': {
                'x': int(data['position']['x']),
                'y': int(data['position']['y'])
            },
            'size': {
                'width': int(data['size']['width']),
                'height': int(data['size']['height'])
            },
            'zIndex': int(data.get('zIndex', 1)),
            'opacity': float(data.get('opacity', 1)),
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        # Insert into MongoDB
        result = overlays_collection.insert_one(overlay)
        overlay['_id'] = str(result.inserted_id)
        
        return jsonify(prepare_overlay_response(overlay)), 201
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# READ: Get all overlays
@app.route('/api/overlays', methods=['GET'])
def get_all_overlays():
    """Retrieve all saved overlays"""
    try:
        overlays = list(overlays_collection.find().sort('createdAt', -1))
        overlays = [prepare_overlay_response(o) for o in overlays]
        return jsonify({'overlays': overlays}), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# READ: Get single overlay by ID
@app.route('/api/overlays/<overlay_id>', methods=['GET'])
def get_overlay(overlay_id):
    """Retrieve a specific overlay by ID"""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(overlay_id):
            return jsonify({'error': 'Invalid overlay ID format'}), 400
        
        overlay = overlays_collection.find_one({'_id': ObjectId(overlay_id)})
        
        if not overlay:
            return jsonify({'error': 'Overlay not found'}), 404
        
        return jsonify(prepare_overlay_response(overlay)), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# UPDATE: Modify existing overlay
@app.route('/api/overlays/<overlay_id>', methods=['PUT'])
def update_overlay(overlay_id):
    """Update an existing overlay configuration"""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(overlay_id):
            return jsonify({'error': 'Invalid overlay ID format'}), 400
        
        data = request.json
        overlay = overlays_collection.find_one({'_id': ObjectId(overlay_id)})
        
        if not overlay:
            return jsonify({'error': 'Overlay not found'}), 404
        
        # Prepare update data
        update_data = {}
        
        if 'name' in data:
            if len(data['name']) > 100:
                return jsonify({'error': 'Name must be 100 characters or less'}), 400
            update_data['name'] = data['name'].strip()
        
        if 'type' in data:
            if data['type'] not in ['text', 'shape']:
                return jsonify({'error': "Invalid type. Must be 'text' or 'shape'"}), 400
            update_data['type'] = data['type']
        
        if 'content' in data:
            update_data['content'] = data['content'].strip()
        
        if 'position' in data:
            if 'x' in data['position'] and 'y' in data['position']:
                update_data['position'] = {
                    'x': int(data['position']['x']),
                    'y': int(data['position']['y'])
                }
        
        if 'size' in data:
            if 'width' in data['size'] and 'height' in data['size']:
                update_data['size'] = {
                    'width': int(data['size']['width']),
                    'height': int(data['size']['height'])
                }
        
        if 'zIndex' in data:
            update_data['zIndex'] = int(data['zIndex'])
        
        if 'opacity' in data:
            opacity = float(data['opacity'])
            if not (0 <= opacity <= 1):
                return jsonify({'error': 'Opacity must be between 0 and 1'}), 400
            update_data['opacity'] = opacity
        
        update_data['updatedAt'] = datetime.utcnow()
        
        # Update document
        overlays_collection.update_one(
            {'_id': ObjectId(overlay_id)},
            {'$set': update_data}
        )
        
        # Fetch and return updated document
        updated_overlay = overlays_collection.find_one({'_id': ObjectId(overlay_id)})
        return jsonify(prepare_overlay_response(updated_overlay)), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# DELETE: Remove overlay
@app.route('/api/overlays/<overlay_id>', methods=['DELETE'])
def delete_overlay(overlay_id):
    """Delete an overlay configuration"""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(overlay_id):
            return jsonify({'error': 'Invalid overlay ID format'}), 400
        
        result = overlays_collection.delete_one({'_id': ObjectId(overlay_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Overlay not found'}), 404
        
        return jsonify({'message': 'Overlay deleted successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# ============================================
# STREAM API ROUTES
# ============================================

# POST: Start/Save stream configuration
@app.route('/api/stream/start', methods=['POST'])
def start_stream():
    """Start or save a stream configuration"""
    try:
        data = request.json
        
        if 'url' not in data:
            return jsonify({'error': 'Stream URL is required'}), 400
        
        is_valid, error_msg = validate_stream_url(data['url'])
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Prepare stream document
        stream = {
            'url': data['url'].strip(),
            'title': data.get('title', 'Untitled Stream').strip(),
            'description': data.get('description', '').strip(),
            'isLive': True,
            'startTime': datetime.utcnow(),
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        # Insert into MongoDB
        result = streams_collection.insert_one(stream)
        stream['_id'] = str(result.inserted_id)
        
        return jsonify({
            'message': 'Stream started successfully',
            'stream': stream
        }), 201
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# POST: Stop stream
@app.route('/api/stream/stop', methods=['POST'])
def stop_stream():
    """Stop the current live stream"""
    try:
        # Update all live streams to not live
        result = streams_collection.update_many(
            {'isLive': True},
            {'$set': {
                'isLive': False,
                'endTime': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }}
        )
        
        return jsonify({
            'message': 'Stream stopped successfully',
            'stoppedCount': result.modified_count
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# GET: Get current stream status
@app.route('/api/stream/status', methods=['GET'])
def get_stream_status():
    """Get the current active stream"""
    try:
        stream = streams_collection.find_one({'isLive': True})
        
        if not stream:
            return jsonify({
                'isLive': False,
                'stream': None
            }), 200
        
        stream['_id'] = str(stream['_id'])
        
        return jsonify({
            'isLive': True,
            'stream': stream
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# GET: Get stream history
@app.route('/api/stream/history', methods=['GET'])
def get_stream_history():
    """Get all past streams"""
    try:
        limit = int(request.args.get('limit', 50))
        streams = list(streams_collection.find().sort('createdAt', -1).limit(limit))
        
        for stream in streams:
            stream['_id'] = str(stream['_id'])
        
        return jsonify({
            'streams': streams,
            'count': len(streams)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# DELETE: Delete a stream record
@app.route('/api/stream/<stream_id>', methods=['DELETE'])
def delete_stream(stream_id):
    """Delete a stream record"""
    try:
        if not ObjectId.is_valid(stream_id):
            return jsonify({'error': 'Invalid stream ID format'}), 400
        
        result = streams_collection.delete_one({'_id': ObjectId(stream_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Stream not found'}), 404
        
        return jsonify({'message': 'Stream deleted successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# ============================================
# UTILITY ROUTES
# ============================================

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test MongoDB connection
        client.admin.command('ping')
        
        return jsonify({
            'status': 'ok',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'disconnected',
            'error': str(e)
        }), 500

# Get statistics
@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get application statistics"""
    try:
        overlay_count = overlays_collection.count_documents({})
        stream_count = streams_collection.count_documents({})
        active_streams = streams_collection.count_documents({'isLive': True})
        
        return jsonify({
            'overlays': overlay_count,
            'totalStreams': stream_count,
            'activeStreams': active_streams
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

# ============================================
# RUN APPLICATION
# ============================================

if __name__ == '__main__':
    app.run(
        debug=True, 
        host='0.0.0.0', 
        port=5000,
        use_reloader=True,
        reloader_type='stat'
    )