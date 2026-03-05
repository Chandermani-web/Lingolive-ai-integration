import asyncio, websockets, json

async def test():
    try:
        async with websockets.connect('ws://localhost:5001/ws/voice') as ws:
            await ws.send(json.dumps({'type': 'config', 'source_lang': 'english', 'target_lang': 'hindi'}))
            resp = await asyncio.wait_for(ws.recv(), timeout=5)
            print('WS OK:', resp)
    except Exception as e:
        print(f'WS FAIL: {e}')

asyncio.run(test())
