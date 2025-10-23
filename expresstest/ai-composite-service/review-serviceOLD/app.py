import os, json
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import requests
import logging
import uuid

app = Flask(__name__)
CORS(app)
# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
AI_MODEL_URL = os.getenv("AI_MODEL_URL")



# Load your one-off prompt template
BASE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE, "prompts", "review-prompt.json")) as f:
    prompt_data = json.load(f)
USER_PROMPT = prompt_data["prompt"]

AI_MODEL_URL = os.getenv("AI_MODEL_URL")
ANALYZE_RESULTS_URL = os.getenv("ANALYZE_RESULTS_URL")

app.logger.setLevel(logging.INFO)

@app.route('/review-service', methods=['POST'])
def review_document():
    payload = request.get_json(force=True) or {}
    pages = payload.get("pages")
    document_id = payload.get("file_id")  # Get document ID from upload service

    if not isinstance(pages, list) or not pages:
        return jsonify(error="No pages provided"), 400

    # 1) Call the AI-model service
    try:
        ai_resp = requests.post(
            f"{AI_MODEL_URL}/ai",
            json={"pages": pages, "prompt": USER_PROMPT},
            timeout=90
        )
        ai_resp.raise_for_status()
    except requests.RequestException as e:
        detail = {}
        if e.response is not None:
            detail = {"status": e.response.status_code, "details": e.response.text}
        return jsonify(error="AI-model failed", **detail), 502

    ai_payload = ai_resp.json()
    app.logger.info("📝 AI raw response: %s", ai_payload)

    # 2) Use provided document_id or generate new one
    file_id = document_id 
    app.logger.info("🆕 Using file_id=%s", file_id)

    # 3) Persist to analyse-results
    try:
        save_payload = {
            "file_id": file_id,
            "result": ai_payload
        }
        
        save_resp = requests.post(
            f"{ANALYZE_RESULTS_URL}/analyse-results",
            json=save_payload,
            
        )
        save_resp.raise_for_status()
        
        save_data = save_resp.json()
        analysis_result_id = save_data.get('data', {}).get('id')
        
        app.logger.info("✅ analyse-results saved: ID=%s", analysis_result_id)
        
        enhanced_response = ai_resp.json()
        enhanced_response.update({
            "analysis_result_id": analysis_result_id,
            "file_id": file_id,
            "document_id": document_id,  # Include original document ID
            "saved_to_database": True
        })
        
        return jsonify(enhanced_response), 200
        
    except Exception as e:
        app.logger.exception("❌ Failed to save analysis results: %s", str(e))
        
        fallback_response = ai_resp.json()
        fallback_response.update({
            "file_id": file_id,
            "document_id": document_id,
            "saved_to_database": False,
            "save_error": str(e)
        })
        
        return jsonify(fallback_response), 200




if __name__ == '__main__':
    app.logger.setLevel(logging.INFO)
    app.run(host='0.0.0.0', port=5003, debug=True, use_reloader=False)
    # app.run(host='0.0.0.0', port=5003, debug=True)




