import asyncio
import websockets
import json
import threading
from src.core.audio_processor import audio_processor
from src.core.translator import translator
from src.core.voice_cloner import voice_cloner
from src.utils.config import Config

class WebSocketServer:
    def __init__(self):
        self.config = Config()
        self.clients = set()
        self.is_translating = False
        self.translation_thread = None
        
    async def handle_client(self, websocket, path):
        self.clients.add(websocket)
        print(f"New client connected. Total clients: {len(self.clients)}")
        
        try:
            async for message in websocket:
                data = json.loads(message)
                await self.process_message(data, websocket)
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")
        finally:
            self.clients.remove(websocket)
    
    async def process_message(self, data, websocket):
        message_type = data.get('type')
        
        if message_type == 'start_translation':
            source_lang = data.get('source_lang', 'auto')
            target_lang = data.get('target_lang', 'en')
            voice_id = data.get('voice_id', 'rachel')
            
           
            if not self.is_translating:
                self.is_translating = True
                self.translation_thread = threading.Thread(
                    target=self.run_translation, 
                    args=(source_lang, target_lang, voice_id)
                )
                self.translation_thread.daemon = True
                self.translation_thread.start()
                
                await websocket.send(json.dumps({
                    'status': 'started',
                    'message': 'Translation started'
                }))
        
        elif message_type == 'stop_translation':
            self.is_translating = False
            if self.translation_thread:
                self.translation_thread.join(timeout=1.0)
            
            await websocket.send(json.dumps({
                'status': 'stopped',
                'message': 'Translation stopped'
            }))
        
        elif message_type == 'translation_result':
            # Forward translation results to other clients
            for client in self.clients:
                if client != websocket:
                    await client.send(message)
    
    def run_translation(self, source_lang, target_lang, voice_id):
        """Run the translation loop"""
        print(f"Starting translation from {source_lang} to {target_lang} with voice {voice_id}")
        
        while self.is_translating:
            try:
                # Record audio chunk
                audio_data = audio_processor.record_audio(duration=5.0)
                
                if audio_data is not None:
                    # Process translation
                    original_text, translated_text = translator.process_audio_translation(
                        audio_data, source_lang, target_lang
                    )
                    
                    if translated_text:
                        # Generate and play speech
                        audio_output = voice_cloner.generate_speech(translated_text, voice_id)
                        if audio_output:
                            voice_cloner.play_speech(audio_output)
                            
                        # Notify clients (for UI updates)
                        asyncio.run(self.notify_clients({
                            'type': 'translation_update',
                            'original_text': original_text,
                            'translated_text': translated_text,
                            'source_lang': source_lang,
                            'target_lang': target_lang
                        }))
                else:
                    print("No audio detected")
                    
            except Exception as e:
                print(f"Error in translation loop: {e}")
                self.is_translating = False
        
        print("Translation stopped")
    
    async def notify_clients(self, message):
        """Notify all connected clients"""
        for client in self.clients:
            try:
                await client.send(json.dumps(message))
            except:
                pass  # Client might have disconnected

# Create a function to start the server
async def start_websocket_server():
    server = WebSocketServer()
    config = Config()
    
    async with websockets.serve(server.handle_client, config.HOST, config.WEBSOCKET_PORT):
        print(f"WebSocket server started on ws://{config.HOST}:{config.WEBSOCKET_PORT}")
        await asyncio.Future()  # Run forever

# Function to run in a thread
def run_websocket_server():
    asyncio.run(start_websocket_server())