import argparse
import threading
import asyncio
from src.api.server import app
from src.api.websocket_server import run_websocket_server
from src.utils.config import Config

def run_flask_server():
    config = Config()
    print(f"Starting Flask server on http://{config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, debug=False, use_reloader=False)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='LingoLive Real-time Translation System')
    parser.add_argument('--mode', choices=['api', 'websocket', 'both'], default='both',
                      help='Run mode: api server, websocket server, or both')
    args = parser.parse_args()
    
    config = Config()
    print("LingoLive Real-time Translation System")
    print("=" * 50)
    print(f"Host: {config.HOST}")
    print(f"API Port: {config.PORT}")
    print(f"WebSocket Port: {config.WEBSOCKET_PORT}")
    print(f"Whisper Model: {config.WHISPER_MODEL}")
    print("=" * 50)
    
    if args.mode in ['api', 'both']:
        flask_thread = threading.Thread(target=run_flask_server)
        flask_thread.daemon = True
        flask_thread.start()
    
    if args.mode in ['websocket', 'both']:
        websocket_thread = threading.Thread(target=run_websocket_server)
        websocket_thread.daemon = True
        websocket_thread.start()
    
    # Keep main thread alive
    try:
        while True:
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down LingoLive...")