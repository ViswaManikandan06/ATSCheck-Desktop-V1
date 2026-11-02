import argparse

import uvicorn


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", choices=["127.0.0.1"], default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    arguments = parser.parse_args()

    uvicorn.run(
        "app.main:app",
        host=arguments.host,
        port=arguments.port,
        log_level="warning",
    )
