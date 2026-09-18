from fastapi import FastAPI

app = FastAPI(title="Four Horsemen API")


@app.get("/health")
async def health():
    return {"status": "ok"}
