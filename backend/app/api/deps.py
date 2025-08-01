"""
API Dependencies
Database session and authentication dependencies for FastAPI
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import from core modules
try:
    from app.core.config import settings
    from app.db.base import Base
    from app.core.security import verify_token
    from app.models.user import User
except ImportError:
    # Fallback for testing when modules are not available
    settings = None
    Base = None
    verify_token = None
    User = None

# Database dependency
def get_database_url():
    """Get database URL from settings or use default SQLite"""
    if settings:
        return getattr(settings, 'DATABASE_URL', 'sqlite:///./itsm.db')
    return 'sqlite:///./itsm.db'

# Create database engine and session
try:
    engine = create_engine(get_database_url(), connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception:
    # Fallback for testing
    engine = None
    SessionLocal = None

def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency
    """
    if SessionLocal is None:
        # Return a mock session for testing
        yield None
        return
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security dependencies
security = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    token_data: str = Depends(security)
) -> Optional[User]:
    """
    Get current authenticated user
    """
    if not verify_token or not User or not db:
        # Return mock user for testing
        return None
    
    try:
        # Extract token from bearer format
        token = token_data.credentials if hasattr(token_data, 'credentials') else str(token_data)
        
        # Verify token and get user email/username
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user_email = payload.get("sub")
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user (additional check for user status)
    """
    if not current_user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Check if user is active (if the model has is_active field)
    if hasattr(current_user, 'is_active') and not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return current_user

def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current superuser (admin permissions required)
    """
    if not current_user:
        raise HTTPException(status_code=400, detail="User not found")
    
    if not getattr(current_user, 'is_superuser', False):
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    
    return current_user