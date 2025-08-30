import asyncio
import websockets
import json
import bpy
import threading

websocket_server = None


class WebSocketServer:
    def __init__(self, port=8080):
        self.port = port
        self.server = None
        self.loop = None
        self.thread = None

    async def handler(self, websocket):
        print("Client connected.")
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    operator = data.get("operator")
                    params = data.get("params", {})

                    if not operator:
                        await websocket.send(
                            json.dumps(
                                {
                                    "status": "error",
                                    "message": "'operator' field missing.",
                                }
                            )
                        )
                        continue

                    def timer_callback():
                        self.execute_in_main_thread(operator, params)
                        return None

                    bpy.app.timers.register(timer_callback, first_interval=0.01)

                    response = {
                        "status": "success",
                        "message": f"Scheduled '{operator}' for execution.",
                    }
                    await websocket.send(json.dumps(response))
                except json.JSONDecodeError:
                    await websocket.send(
                        json.dumps({"status": "error", "message": "Invalid JSON."})
                    )
                except Exception as e:
                    await websocket.send(
                        json.dumps({"status": "error", "message": str(e)})
                    )
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected.")

    def execute_in_main_thread(self, operator_name, params):
        try:
            op_path = operator_name.split(".")
            operator_func = bpy.ops
            for part in op_path:
                operator_func = getattr(operator_func, part)
            if not callable(operator_func):
                raise TypeError(f"Operator '{operator_name}' is not callable.")
            operator_func(**params)
            print(f"Executed: {operator_name} with params {params}")
        except Exception as e:
            print(f"Error executing operator '{operator_name}': {e}")

    async def start_async(self):
        self.server = await websockets.serve(self.handler, "0.0.0.0", self.port)
        print(f"WebSocket server started on ws://0.0.0.0:{self.port}")
        await asyncio.Future()  # Run forever

    def start(self):
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _run_loop(self):
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self.start_async())
        except RuntimeError as e:
            if "Event loop stopped before Future completed" not in str(e):
                raise

    def stop(self):
        print("Stopping WebSocket server...")
        if self.server:
            # Schedule server close in the event loop
            async def shutdown():
                self.server.close()
                await self.server.wait_closed()

            if self.loop and self.loop.is_running():
                fut = asyncio.run_coroutine_threadsafe(shutdown(), self.loop)
                try:
                    fut.result(timeout=2)
                except Exception as e:
                    print(f"Error waiting for server to close: {e}")
        if self.loop and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.loop.stop)
        if self.thread:
            self.thread.join(timeout=2)
        print("WebSocket server stopped.")


def register():
    global websocket_server
    websocket_server = WebSocketServer(port=8080)
    websocket_server.start()
    print("WebSocket server started on ws://localhost:8080")


def unregister():
    global websocket_server
    if websocket_server:
        print("Stopping WebSocket server...")
        websocket_server.stop()
        websocket_server = None
    print("WebSocket addon unregistered.")


if __name__ == "__main__":
    register()
