import asyncio
import websockets
import json

PORT = 8080


async def handle_message(websocket):
    async for message in websocket:
        try:
            data = json.loads(message)
            operator = data.get("operator")
            params = data.get("params")
            response = {"status": "success"}
            if operator == "create_object":
                print(f"creating object with params: {params}")
            elif operator == "import_usd":
                print(f"importing usd with params: {params}")
            elif operator == "export_usd":
                print(f"exporting usd with params: {params}")
            else:
                response = {"status": "error", "message": "Unknown operator"}
            await websocket.send(json.dumps(response))
        except Exception as e:
            error_response = {"status": "error", "message": str(e)}
            await websocket.send(json.dumps(error_response))


async def main():
    print(f"WebSocket server listening on port {PORT}")
    async with websockets.serve(handle_message, "0.0.0.0", PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
