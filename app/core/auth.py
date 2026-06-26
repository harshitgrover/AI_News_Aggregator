from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()

def verify_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Middleware to intercept incoming requests, extract the Supabase JWT, 
    and verify it against our SUPABASE_JWT_SECRET.
    """
    token = credentials.credentials
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    
    if not secret or secret == "your_supabase_jwt_secret_here":
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET is missing in .env")
        
    try:
        header = jwt.get_unverified_header(token)
        print(f"JWT HEADER: {header}")
        
        alg = header.get("alg", "HS256")
        
        if alg == "ES256" or alg == "RS256":
            # Supabase upgraded to asymmetric keys! We must fetch the public key from their JWKS endpoint.
            db_url = os.environ.get("SUPABASE_DATABASE_URL", "")
            if "@db." in db_url:
                project_id = db_url.split("@db.")[1].split(".supabase.co")[0]
            elif "postgres." in db_url:
                project_id = db_url.split("postgres.")[1].split(":")[0]
            else:
                project_id = ""
            jwks_url = f"https://{project_id}.supabase.co/auth/v1/.well-known/jwks.json"
            
            jwks_client = jwt.PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(token, signing_key.key, algorithms=[alg], options={"verify_aud": False})
        else:
            # Fallback for old HS256 tokens
            payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        
        # payload['sub'] contains the unique user_id
        # payload['role'] contains the role (e.g., 'authenticated')
        return payload
    except jwt.ExpiredSignatureError:
        print("JWT ERROR: Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"JWT ERROR: Invalid token - {e}")
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {e}")
    except Exception as e:
        print(f"JWT ERROR: Unknown error - {e}")
        raise HTTPException(status_code=401, detail=f"Error: {e}")

def verify_admin(user = Depends(verify_user)):
    """
    RBAC Middleware: Ensures the authenticated user is an admin.
    """
    admin_email = os.environ.get("ADMIN_EMAIL", "atharvconsul45@gmail.com")
    user_email = user.get("email")
    
    if user_email != admin_email:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
        
    return user
