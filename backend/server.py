from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import requests as http_requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
SESSION_TTL_DAYS = 7

app = FastAPI(title="GoldMine API")
api_router = APIRouter(prefix="/api")


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(days=SESSION_TTL_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def detect_platform(url: str) -> str:
    if not url:
        return "Other"
    u = url.lower()
    mapping = [
        ("instagram.com", "Instagram"),
        ("twitter.com", "X"),
        ("x.com", "X"),
        ("youtube.com", "YouTube"),
        ("youtu.be", "YouTube"),
        ("linkedin.com", "LinkedIn"),
        ("reddit.com", "Reddit"),
        ("substack.com", "Substack"),
        ("news.ycombinator.com", "Hacker News"),
        ("ycombinator.com", "Hacker News"),
        ("producthunt.com", "Product Hunt"),
        ("tiktok.com", "TikTok"),
        ("medium.com", "Medium"),
        ("github.com", "GitHub"),
    ]
    for needle, name in mapping:
        if needle in u:
            return name
    return "Other"


# ---------- Auth Models ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class User(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "email"


# ---------- Auth dependency ----------
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try DB session first (Google flow)
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if sess:
        expires_at = sess.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < now_utc():
            raise HTTPException(status_code=401, detail="Session expired")
        user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user_doc)

    # Fallback to JWT (email/password flow)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_doc = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_TTL_DAYS * 24 * 60 * 60,
    )


# ---------- Auth Routes ----------
@api_router.post("/auth/signup")
async def signup(payload: SignupRequest, response: Response):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": payload.email.lower(),
        "name": payload.name or payload.email.split("@")[0],
        "picture": None,
        "auth_provider": "email",
        "password_hash": hash_password(payload.password),
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id)
    set_session_cookie(response, token)
    return {
        "user": {"user_id": user_id, "email": user_doc["email"], "name": user_doc["name"], "picture": None, "auth_provider": "email"},
        "token": token,
    }


@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    user_doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user_doc["user_id"])
    set_session_cookie(response, token)
    return {
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc.get("name"),
            "picture": user_doc.get("picture"),
            "auth_provider": user_doc.get("auth_provider", "email"),
        },
        "token": token,
    }


@api_router.post("/auth/google-session")
async def google_session(payload: GoogleSessionRequest, response: Response):
    """Exchange Emergent session_id for our session_token."""
    try:
        r = http_requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
            timeout=10,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Auth provider unreachable: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email missing from auth payload")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data.get("name") or existing.get("name"),
                "picture": data.get("picture") or existing.get("picture"),
            }},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "auth_provider": "google",
            "created_at": now_utc().isoformat(),
        })

    session_token = data.get("session_token") or f"sess_{uuid.uuid4().hex}"
    expires_at = now_utc() + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })
    set_session_cookie(response, session_token)
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc.get("name"),
            "picture": user_doc.get("picture"),
            "auth_provider": user_doc.get("auth_provider"),
        },
        "token": session_token,
    }


@api_router.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Generic CRUD Models ----------
class CategoryIn(BaseModel):
    name: str
    color: Optional[str] = None


class CategoryOut(CategoryIn):
    id: str
    created_at: str


class CreatorPlatformLink(BaseModel):
    platform: str  # Instagram, X, YouTube, LinkedIn, Reddit, Substack, Hacker News, Product Hunt, Newsletter
    url: str


class CreatorIn(BaseModel):
    name: str
    bio: Optional[str] = ""
    category_id: Optional[str] = None
    links: List[CreatorPlatformLink] = []


class CreatorOut(CreatorIn):
    id: str
    created_at: str


class VaultItemIn(BaseModel):
    title: str
    url: str
    notes: Optional[str] = ""
    category_id: Optional[str] = None
    platform: Optional[str] = None  # auto-detected if omitted


class VaultItemOut(VaultItemIn):
    id: str
    platform: str
    created_at: str
    moved_to_action: bool = False


class PromptIn(BaseModel):
    title: str
    prompt_text: str
    category_id: Optional[str] = None


class PromptOut(PromptIn):
    id: str
    created_at: str


class ActionCardIn(BaseModel):
    vault_item_id: Optional[str] = None
    title: str
    source_url: Optional[str] = None
    action_type: Literal["Learn", "Build", "Try", "Share"]
    deadline: Optional[str] = None  # ISO date string
    status: Literal["Not Started", "In Progress", "Done"] = "Not Started"
    notes: Optional[str] = ""


class ActionCardOut(ActionCardIn):
    id: str
    created_at: str
    completed_at: Optional[str] = None


class NoteIn(BaseModel):
    title: str
    content: str = ""
    category_id: Optional[str] = None
    source_platform: Optional[str] = None
    source_link: Optional[str] = None


class NoteOut(NoteIn):
    id: str
    created_at: str
    updated_at: str


# ---------- Categories ----------
@api_router.get("/categories", response_model=List[CategoryOut])
async def list_categories(user: User = Depends(get_current_user)):
    docs = await db.categories.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [CategoryOut(**{k: v for k, v in d.items() if k != "user_id"}) for d in docs]


@api_router.post("/categories", response_model=CategoryOut)
async def create_category(payload: CategoryIn, user: User = Depends(get_current_user)):
    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "name": payload.name,
        "color": payload.color,
        "created_at": now_utc().isoformat(),
    }
    await db.categories.insert_one(doc)
    return CategoryOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.put("/categories/{cat_id}", response_model=CategoryOut)
async def update_category(cat_id: str, payload: CategoryIn, user: User = Depends(get_current_user)):
    res = await db.categories.update_one(
        {"id": cat_id, "user_id": user.user_id},
        {"$set": {"name": payload.name, "color": payload.color}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Category not found")
    doc = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    return CategoryOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: User = Depends(get_current_user)):
    res = await db.categories.delete_one({"id": cat_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Category not found")
    return {"ok": True}


# ---------- Creators ----------
@api_router.get("/creators", response_model=List[CreatorOut])
async def list_creators(user: User = Depends(get_current_user)):
    docs = await db.creators.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [CreatorOut(**{k: v for k, v in d.items() if k != "user_id"}) for d in docs]


@api_router.post("/creators", response_model=CreatorOut)
async def create_creator(payload: CreatorIn, user: User = Depends(get_current_user)):
    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "name": payload.name,
        "bio": payload.bio or "",
        "category_id": payload.category_id,
        "links": [link.model_dump() for link in payload.links],
        "created_at": now_utc().isoformat(),
    }
    await db.creators.insert_one(doc)
    return CreatorOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.put("/creators/{creator_id}", response_model=CreatorOut)
async def update_creator(creator_id: str, payload: CreatorIn, user: User = Depends(get_current_user)):
    res = await db.creators.update_one(
        {"id": creator_id, "user_id": user.user_id},
        {"$set": {
            "name": payload.name,
            "bio": payload.bio or "",
            "category_id": payload.category_id,
            "links": [link.model_dump() for link in payload.links],
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Creator not found")
    doc = await db.creators.find_one({"id": creator_id}, {"_id": 0})
    return CreatorOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.delete("/creators/{creator_id}")
async def delete_creator(creator_id: str, user: User = Depends(get_current_user)):
    res = await db.creators.delete_one({"id": creator_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Creator not found")
    return {"ok": True}


# ---------- Vault ----------
@api_router.get("/vault", response_model=List[VaultItemOut])
async def list_vault(user: User = Depends(get_current_user)):
    docs = await db.vault.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [VaultItemOut(**{k: v for k, v in d.items() if k != "user_id"}) for d in docs]


@api_router.post("/vault", response_model=VaultItemOut)
async def create_vault(payload: VaultItemIn, user: User = Depends(get_current_user)):
    platform = payload.platform or detect_platform(payload.url)
    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "title": payload.title,
        "url": payload.url,
        "notes": payload.notes or "",
        "category_id": payload.category_id,
        "platform": platform,
        "moved_to_action": False,
        "created_at": now_utc().isoformat(),
    }
    await db.vault.insert_one(doc)
    return VaultItemOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.put("/vault/{item_id}", response_model=VaultItemOut)
async def update_vault(item_id: str, payload: VaultItemIn, user: User = Depends(get_current_user)):
    platform = payload.platform or detect_platform(payload.url)
    res = await db.vault.update_one(
        {"id": item_id, "user_id": user.user_id},
        {"$set": {
            "title": payload.title,
            "url": payload.url,
            "notes": payload.notes or "",
            "category_id": payload.category_id,
            "platform": platform,
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Vault item not found")
    doc = await db.vault.find_one({"id": item_id}, {"_id": 0})
    return VaultItemOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.delete("/vault/{item_id}")
async def delete_vault(item_id: str, user: User = Depends(get_current_user)):
    res = await db.vault.delete_one({"id": item_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Vault item not found")
    return {"ok": True}


class MoveToActionPayload(BaseModel):
    action_type: Literal["Learn", "Build", "Try", "Share"] = "Learn"
    deadline: Optional[str] = None
    notes: Optional[str] = ""


@api_router.post("/vault/{item_id}/move-to-action", response_model=ActionCardOut)
async def move_vault_to_action(item_id: str, payload: MoveToActionPayload, user: User = Depends(get_current_user)):
    item = await db.vault.find_one({"id": item_id, "user_id": user.user_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Vault item not found")
    action_doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "vault_item_id": item_id,
        "title": item["title"],
        "source_url": item.get("url"),
        "action_type": payload.action_type,
        "deadline": payload.deadline,
        "status": "Not Started",
        "notes": payload.notes or "",
        "created_at": now_utc().isoformat(),
        "completed_at": None,
    }
    await db.actions.insert_one(action_doc)
    await db.vault.update_one({"id": item_id, "user_id": user.user_id}, {"$set": {"moved_to_action": True}})
    return ActionCardOut(**{k: v for k, v in action_doc.items() if k != "user_id"})


# ---------- Prompts ----------
@api_router.get("/prompts", response_model=List[PromptOut])
async def list_prompts(user: User = Depends(get_current_user)):
    docs = await db.prompts.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [PromptOut(**{k: v for k, v in d.items() if k != "user_id"}) for d in docs]


@api_router.post("/prompts", response_model=PromptOut)
async def create_prompt(payload: PromptIn, user: User = Depends(get_current_user)):
    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "title": payload.title,
        "prompt_text": payload.prompt_text,
        "category_id": payload.category_id,
        "created_at": now_utc().isoformat(),
    }
    await db.prompts.insert_one(doc)
    return PromptOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.put("/prompts/{prompt_id}", response_model=PromptOut)
async def update_prompt(prompt_id: str, payload: PromptIn, user: User = Depends(get_current_user)):
    res = await db.prompts.update_one(
        {"id": prompt_id, "user_id": user.user_id},
        {"$set": {"title": payload.title, "prompt_text": payload.prompt_text, "category_id": payload.category_id}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Prompt not found")
    doc = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    return PromptOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, user: User = Depends(get_current_user)):
    res = await db.prompts.delete_one({"id": prompt_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Prompt not found")
    return {"ok": True}


# ---------- Action Cards ----------
@api_router.get("/actions", response_model=List[ActionCardOut])
async def list_actions(user: User = Depends(get_current_user)):
    docs = await db.actions.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [ActionCardOut(**{k: v for k, v in d.items() if k != "user_id"}) for d in docs]


@api_router.post("/actions", response_model=ActionCardOut)
async def create_action(payload: ActionCardIn, user: User = Depends(get_current_user)):
    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
        "completed_at": None,
    }
    await db.actions.insert_one(doc)
    return ActionCardOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.put("/actions/{action_id}", response_model=ActionCardOut)
async def update_action(action_id: str, payload: ActionCardIn, user: User = Depends(get_current_user)):
    update = payload.model_dump()
    if update.get("status") == "Done":
        update["completed_at"] = now_utc().isoformat()
    else:
        update["completed_at"] = None
    res = await db.actions.update_one(
        {"id": action_id, "user_id": user.user_id},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Action not found")
    doc = await db.actions.find_one({"id": action_id}, {"_id": 0})
    return ActionCardOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.delete("/actions/{action_id}")
async def delete_action(action_id: str, user: User = Depends(get_current_user)):
    res = await db.actions.delete_one({"id": action_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Action not found")
    return {"ok": True}


# ---------- Notes ----------
@api_router.get("/notes", response_model=List[NoteOut])
async def list_notes(user: User = Depends(get_current_user)):
    docs = await db.notes.find({"user_id": user.user_id}, {"_id": 0}).sort("updated_at", -1).to_list(2000)
    return [NoteOut(**{k: v for k, v in d.items() if k != "user_id"}) for d in docs]


@api_router.post("/notes", response_model=NoteOut)
async def create_note(payload: NoteIn, user: User = Depends(get_current_user)):
    now = now_utc().isoformat()
    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user.user_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    await db.notes.insert_one(doc)
    return NoteOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.put("/notes/{note_id}", response_model=NoteOut)
async def update_note(note_id: str, payload: NoteIn, user: User = Depends(get_current_user)):
    res = await db.notes.update_one(
        {"id": note_id, "user_id": user.user_id},
        {"$set": {**payload.model_dump(), "updated_at": now_utc().isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Note not found")
    doc = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return NoteOut(**{k: v for k, v in doc.items() if k != "user_id"})


@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: User = Depends(get_current_user)):
    res = await db.notes.delete_one({"id": note_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


# ---------- Dashboard ----------
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: User = Depends(get_current_user)):
    uid = user.user_id
    total_saved = await db.vault.count_documents({"user_id": uid})
    total_actions = await db.actions.count_documents({"user_id": uid})
    done_actions = await db.actions.count_documents({"user_id": uid, "status": "Done"})
    in_progress = await db.actions.count_documents({"user_id": uid, "status": "In Progress"})
    not_started = await db.actions.count_documents({"user_id": uid, "status": "Not Started"})

    save_to_action_ratio = (total_actions / total_saved) if total_saved else 0.0
    accountability_score = int(round((done_actions / total_saved) * 100)) if total_saved else 0

    # weekly: last 7 days saved vs completed
    week_ago = (now_utc() - timedelta(days=7)).isoformat()
    saved_this_week = await db.vault.count_documents({"user_id": uid, "created_at": {"$gte": week_ago}})
    completed_this_week = await db.actions.count_documents({"user_id": uid, "status": "Done", "completed_at": {"$gte": week_ago}})

    # Overdue: deadline before now and status != Done
    today_iso = now_utc().date().isoformat()
    overdue_docs = await db.actions.find(
        {"user_id": uid, "status": {"$ne": "Done"}, "deadline": {"$ne": None, "$lt": today_iso}},
        {"_id": 0, "user_id": 0},
    ).to_list(100)

    # Counts by action type
    by_type = {}
    for t in ["Learn", "Build", "Try", "Share"]:
        by_type[t] = await db.actions.count_documents({"user_id": uid, "action_type": t})

    return {
        "total_saved": total_saved,
        "total_actions": total_actions,
        "done_actions": done_actions,
        "in_progress": in_progress,
        "not_started": not_started,
        "save_to_action_ratio": round(save_to_action_ratio, 2),
        "accountability_score": accountability_score,
        "saved_this_week": saved_this_week,
        "completed_this_week": completed_this_week,
        "overdue": overdue_docs,
        "by_type": by_type,
    }


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"message": "GoldMine API", "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
