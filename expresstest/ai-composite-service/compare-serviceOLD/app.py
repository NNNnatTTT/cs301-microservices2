import os
import json
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import jwt

app = Flask(__name__)
CORS(app)

# Load compare prompt from JSON file
BASE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE, "prompts", "compare.json")) as f:
    prompt_data = json.load(f)
USER_PROMPT = prompt_data["prompt"]

# Service URLs
AI_MODEL_URL = os.getenv("AI_MODEL_URL")
SCANNER_URL = os.getenv("SCANNER_URL")

def get_current_user():
    """Extract user UUID from JWT (Kong already validated it)"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    try:
        # Skip signature verification since Kong already validated
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get('uuid') or payload.get('sub')
    except:
        return None

@app.route('/compare', methods=['POST'])
def compare_documents():
    try:
        # Get user ID for logging/tracking
        user_uuid = get_current_user()
        if not user_uuid:
            return jsonify({"error": "Unable to identify user"}), 400

        # Check if files are provided
        if 'contractA' not in request.files or 'contractB' not in request.files:
            return jsonify({"error": "Both contractA and contractB files are required"}), 400

        contract_a = request.files['contractA']
        contract_b = request.files['contractB']

        if contract_a.filename == '' or contract_b.filename == '':
            return jsonify({"error": "Both files must be selected"}), 400

        # Read and store file contents immediately
        contract_a.seek(0)
        contract_a_content = contract_a.read()
        contract_a_name = contract_a.filename
        contract_a_type = contract_a.content_type

        contract_b.seek(0)
        contract_b_content = contract_b.read()
        contract_b_name = contract_b.filename
        contract_b_type = contract_b.content_type

        # Verify both files have content
        if not contract_a_content:
            return jsonify({"error": "Contract A appears to be empty"}), 400
        
        if not contract_b_content:
            return jsonify({"error": "Contract B appears to be empty"}), 400

        app.logger.info(f"Contract A size: {len(contract_a_content)} bytes")
        app.logger.info(f"Contract B size: {len(contract_b_content)} bytes")

        # Step 1: Process Contract A through scanner service
        files_a = {'file': (contract_a_name, contract_a_content, contract_a_type)}
        scanner_resp_a = requests.post(
            f"{SCANNER_URL}/scan_document",
            files=files_a,
            timeout=60
        )
        
        if not scanner_resp_a.ok:
            app.logger.error(f"Scanner A failed: {scanner_resp_a.status_code} - {scanner_resp_a.text}")
            return jsonify({"error": f"Failed to scan Contract A: {scanner_resp_a.text}"}), 502

        # Step 2: Process Contract B through scanner service
        files_b = {'file': (contract_b_name, contract_b_content, contract_b_type)}
        scanner_resp_b = requests.post(
            f"{SCANNER_URL}/scan_document",
            files=files_b,
            timeout=60
        )
        
        if not scanner_resp_b.ok:
            app.logger.error(f"Scanner B failed: {scanner_resp_b.status_code} - {scanner_resp_b.text}")
            return jsonify({"error": f"Failed to scan Contract B: {scanner_resp_b.text}"}), 502

        # Extract text from scanner responses
        text_a = scanner_resp_a.json().get('text', '')
        text_b = scanner_resp_b.json().get('text', '')

        if not text_a:
            return jsonify({"error": "Failed to extract text from Contract A"}), 400
        
        if not text_b:
            return jsonify({"error": "Failed to extract text from Contract B"}), 400

        app.logger.info(f"Extracted text A length: {len(text_a)}")
        app.logger.info(f"Extracted text B length: {len(text_b)}")

        # Step 3: Prepare data for AI model
        pages_data = [{
            "contractA": [{"page": 1, "content": text_a}],
            "contractB": [{"page": 1, "content": text_b}]
        }]

        # Step 4: Send to AI model for comparison
        ai_resp = requests.post(
            f"{AI_MODEL_URL}/ai",
            json={
                "pages": pages_data,
                "prompt": USER_PROMPT
            },
            timeout=120
        )
        ai_resp.raise_for_status()

        print("🔍 compare-service raw response:", ai_resp.json())
        ai_payload = ai_resp.json()
        app.logger.info(f"🔍 compare-service raw response: {ai_payload}")

        # Return the AI model's response with additional metadata
        response_data = ai_resp.json()
        response_data.update({
            "contractA_filename": contract_a.filename,
            "contractB_filename": contract_b.filename,
            "user_uuid": user_uuid,
            "comparison_timestamp": datetime.now(timezone.utc).isoformat()
        })

        return jsonify(response_data), 200

    except requests.RequestException as e:
        detail = {}
        if hasattr(e, 'response') and e.response is not None:
            detail = {
                "status": e.response.status_code,
                "details": e.response.text
            }
        return jsonify(error="Service request failed", **detail), 502
    
    except Exception as e:
        app.logger.error(f"Compare service error: {str(e)}")
        return jsonify({"error": f"Comparison failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.logger.setLevel(logging.INFO)
    app.run(host='0.0.0.0', port=5010, debug=True, use_reloader=False)
