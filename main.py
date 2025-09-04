from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers import seal_routes
from routers import doc_routes
import seal_wrapper

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seal_routes.router, prefix="/he", tags=["homomorphic_encryption"])
app.include_router(doc_routes.doc_router, prefix="/doc", tags=["document_processing"])

@app.on_event("startup")
async def startup_event():
    try:
        seal_wrapper.init_seal()
        print("SEAL has been initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize SEAL: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize SEAL")