from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import os
import logging

from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse, JSONResponse
from pathlib import Path
from dotenv import load_dotenv
import httpx
from urllib.parse import urlparse

SECRET_KEY = "supersecret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(title="Central Auth Service")

# Load env from backend/.env (so GOOGLE_CLIENT_ID/SECRET are available in dev)
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auth-service")

# CORS so frontends can call /userinfo with credentials
env_origins = [
    os.getenv("APP1_ORIGIN", "http://localhost:3000"),
    os.getenv("APP2_ORIGIN", "http://localhost:3001"),
    os.getenv("APP3_ORIGIN", "http://localhost:3002"),
]
alt_origins = []
for o in env_origins:
    try:
        scheme, rest = o.split("://", 1)
        host_port = rest
        if host_port.startswith("localhost:"):
            alt_origins.append(f"{scheme}://127.0.0.1:{host_port.split(':')[1]}")
        elif host_port.startswith("127.0.0.1:"):
            alt_origins.append(f"{scheme}://localhost:{host_port.split(':')[1]}")
    except Exception:
        pass
allowed_origins = list(dict.fromkeys(env_origins + alt_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session for OAuth login state
SESSION_SECRET = os.getenv("SESSION_SECRET", "supersecret_session_key")
# In local HTTP dev, use SameSite=Lax so the cookie is sent on top-level redirects
# from Google back to our callback. Chrome may drop SameSite=None without Secure.
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax")

# OAuth (Google)
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

fake_users_db = {
    "alice": {"username": "alice", "password": "password123"},
    "bob": {"username": "bob", "password": "password456"},
}

class Token(BaseModel): 
    access_token: str
    token_type: str

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["username"]}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me")
def get_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"user": payload["sub"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/auth/logout")
def logout(token: Optional[str] = None):
    # In this simple demo, access tokens are stateless JWTs, so there's nothing to revoke server-side.
    # In a real system, you would invalidate a refresh token in your DB/Redis here.
    return {"success": True}

# --- Google OAuth SSO flow ---

@app.get("/authorize")
async def authorize(request: Request, redirect_uri: Optional[str] = None):
    """Kick off Google OAuth login. Optionally accept a redirect_uri to return to the initiating app."""
    if redirect_uri:
        request.session["post_login_redirect"] = redirect_uri
    callback_url = request.url_for("auth_callback")
    # Keep callback as 127.0.0.1 to match Google Console registration
    # Session cookie will be set for 127.0.0.1, so frontend must also use 127.0.0.1
    logger.info(f"/authorize redirect_uri=%s callback_url=%s", redirect_uri, str(callback_url))
    return await oauth.google.authorize_redirect(request, callback_url)


@app.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        # Try to parse id_token first; if missing, fall back to UserInfo endpoint
        try:
            user = await oauth.google.parse_id_token(request, token)
        except Exception as e:
            logger.warning("parse_id_token failed: %s; falling back to userinfo", str(e))
            access_token = token.get("access_token")
            if not access_token:
                raise RuntimeError("No access_token in token response")
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://openidconnect.googleapis.com/v1/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                r.raise_for_status()
                user = r.json()
        request.session["user"] = dict(user)
    except Exception as e:
        logger.exception("OAuth callback failed: %s", str(e))
        return RedirectResponse(url=(request.session.pop("post_login_redirect", None) or allowed_origins[0]) + "/login?error=oauth_failed")

    redirect_to = request.session.pop("post_login_redirect", None) or allowed_origins[0] + "/dashboard"
    # Replace localhost with 127.0.0.1 in redirect to match backend host for cookie consistency
    if redirect_to and "localhost:" in redirect_to:
        redirect_to = redirect_to.replace("localhost:", "127.0.0.1:")
    return RedirectResponse(url=redirect_to)


@app.get("/userinfo")
async def userinfo(request: Request):
    user = request.session.get("user")
    if not user:
        return JSONResponse({"detail": "Not authenticated"}, status_code=401)
    return {"user": user}
