from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os

app = Flask(__name__)
CORS(app)

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# CREATE - Add new analysis result
@app.route('/analyse-results', methods=['POST'])
def create_analysis_result():
    
    try:
        data = request.get_json()
        app.logger.info(data)
        
        # Validate required fields
        if not data or 'file_id' not in data or 'result' not in data:
            return jsonify({"error": "file_id and result are required"}), 400
        
        # Insert analysis result
        analysis_data = {
            "file_id": data['file_id'],
            "result": data['result']  # JSON object
        }
        
        response = supabase.from_('analyse_results').insert(analysis_data).execute()
        app.logger.info(analysis_data)
        if response.data:
            return jsonify({
                "message": "Analysis result created successfully",
                "data": response.data[0]
            }), 201
        else:
            return jsonify({"error": "Failed to create analysis result"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# READ - Get all analysis results
@app.route('/analyse-results', methods=['GET'])
def get_analysis_results():
    try:
        # Optional query parameters
        file_id = request.args.get('file_id')
        limit = request.args.get('limit', 50)
        offset = request.args.get('offset', 0)
        
        query = supabase.from_('analyse_results').select('*')
        
        if file_id:
            query = query.eq('file_id', file_id)
        
        query = query.limit(limit).offset(offset).order('created_at', desc=True)
        response = query.execute()
        
        return jsonify({
            "data": response.data,
            "count": len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# READ - Get specific analysis result by ID
@app.route('/analyse-results/<result_id>', methods=['GET'])
def get_analysis_result(result_id):
    try:
        response = supabase.from_('analyse_results').select('*').eq('id', result_id).execute()
        
        if response.data:
            return jsonify({"data": response.data[0]}), 200
        else:
            return jsonify({"error": "Analysis result not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NEW FUNCTION - Get all analysis results by file ID
@app.route('/results/<file_id>', methods=['GET'])
def get_results_by_file_id(file_id):
    """
    Get all analysis results that match a specific file ID
    This endpoint is designed for the history service to retrieve analysis results by file UUID
    """
    try:
        response = (
            supabase
            .from_('analyse_results')
            .select('*')
            .eq('file_id', file_id)
            .order('created_at', desc=True)
            .execute()
        )
        
        if response.data:
            return jsonify({
                "file_id": file_id,
                "total_results": len(response.data),
                "results": response.data
            }), 200
        else:
            return jsonify({
                "file_id": file_id,
                "total_results": 0,
                "results": []
            }), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# UPDATE - Update analysis result
@app.route('/analyse-results/<result_id>', methods=['PUT'])
def update_analysis_result(result_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Check if analysis result exists
        existing = supabase.from_('analyse_results').select('id').eq('id', result_id).execute()
        if not existing.data:
            return jsonify({"error": "Analysis result not found"}), 404
        
        # Prepare update data
        update_data = {}
        if 'result' in data:
            update_data['result'] = data['result']
        if 'file_id' in data:
            update_data['file_id'] = data['file_id']
        
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        
        # Perform update
        response = supabase.from_('analyse_results').update(update_data).eq('id', result_id).execute()
        
        if response.data:
            return jsonify({
                "message": "Analysis result updated successfully",
                "data": response.data[0]
            }), 200
        else:
            return jsonify({"error": "Failed to update analysis result"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# DELETE - Delete analysis result
@app.route('/analyse-results/<result_id>', methods=['DELETE'])
def delete_analysis_result(result_id):
    try:
        # Check if analysis result exists
        existing = supabase.from_('analyse_results').select('id').eq('id', result_id).execute()
        if not existing.data:
            return jsonify({"error": "Analysis result not found"}), 404
        
        # Delete the analysis result
        response = supabase.from_('analyse_results').delete().eq('id', result_id).execute()
        
        return jsonify({"message": "Analysis result deleted successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008, debug=True)
