from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./formcraft.db"
    admin_password: str = ""
    session_secret: str = "dev-insecure-secret"
    frontend_url: str = "http://localhost:5173"
    # True when frontend and API live on different domains: the session cookie then
    # needs SameSite=None; Secure
    cross_site_cookies: bool = False


settings = Settings()
