from fastapi import APIRouter

from app.api.v1 import applications, auth, jobs, resumes

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(jobs.router)
api_router.include_router(resumes.router)
api_router.include_router(resumes.download_router)
api_router.include_router(applications.router)

