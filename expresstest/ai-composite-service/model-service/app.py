import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_wrapper import OpenRouterWrapper
import requests

app = Flask(__name__)
CORS(app)

# initialize once
ai_client = OpenRouterWrapper()

@app.route("/ai", methods=["POST"])
def ai():
    # Enhanced request body handling
    try:
        body = request.get_json()
    except Exception as e:
        app.logger.error(f"JSON parsing error: {e}")
        return jsonify(error="Invalid JSON in request body"), 400
    
    if not body:
        app.logger.warning("Empty request body received")
        return jsonify(error="Request body is required"), 400
    
    # Log the received request for debugging
    app.logger.info(f"Received request body: {body}")
    
    pages = body.get("pages")
    prompt = body.get("prompt")

    # Enhanced validation
    if not isinstance(pages, list) or not pages:
        app.logger.error(f"Invalid pages parameter: {pages}")
        return jsonify(error="Missing or invalid 'pages' - must be a non-empty list"), 400
    
    if not prompt or not isinstance(prompt, str):
        app.logger.error(f"Invalid prompt parameter: {prompt}")
        return jsonify(error="Missing or invalid 'prompt' - must be a non-empty string"), 400

    # Enhanced AI client call with better error handling
    try:
        app.logger.info(f"Calling AI client with {len(pages)} pages and prompt length: {len(prompt)}")
        result = ai_client.generate(pages=pages, system_prompt=prompt)
        app.logger.info("AI client call successful")
        return jsonify(result), 200
        
    except requests.RequestException as e:
        app.logger.error(f"AI request failed: {e}")
        detail = {}
        if hasattr(e, 'response') and e.response is not None:
            detail = {
                "status": e.response.status_code,
                "details": e.response.text
            }
        return jsonify(error="AI request failed", **detail), 502
        
    except RuntimeError as e:
        app.logger.error(f"Runtime error: {e}")
        return jsonify(error=str(e)), 500
        
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        return jsonify(error="Internal server error"), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "ai-analysis"}), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5020))
    app.run(host="0.0.0.0", port=port, debug=True)
