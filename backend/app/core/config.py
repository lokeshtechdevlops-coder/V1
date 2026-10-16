from pathlib import Path
from functools import lru_cache
from pydantic import Field, model_validator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / '.env', extra='ignore', hide_input_in_errors=True)
    database_url: str = 'postgresql+psycopg://hospital:hospital_local@localhost:5432/hospital'
    jwt_secret: str = Field(min_length=32)
    cookie_secure: bool = False
    frontend_origin: str = 'http://localhost:3000'
    storage_dir: str = str(BACKEND_DIR.parent / 'storage')
    nvidia_api_key: str = ''
    nvidia_base_url: str = 'https://integrate.api.nvidia.com/v1'
    nvidia_chat_model: str = 'nvidia/nemotron-3-super-120b-a12b'
    nvidia_embedding_model: str = 'nvidia/nemotron-3-embed-1b'
    embedding_dimensions: int = Field(default=2048, ge=1, le=16000)
    retrieval_max_cosine_distance: float = Field(default=0.5, ge=0, le=2)
    ai_mode: str = 'demo'
    upload_limit_bytes: int = 10 * 1024 * 1024
    session_minutes: int = 120

    @field_validator('ai_mode', mode='before')
    @classmethod
    def normalise_ai_mode(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

    @model_validator(mode='after')
    def valid_ai(self):
        if self.ai_mode not in {'demo', 'nim'}:
            raise ValueError('AI_MODE must be demo or nim')
        if self.ai_mode == 'nim' and not self.nvidia_api_key:
            raise ValueError('NVIDIA_API_KEY is required for AI_MODE=nim')
        return self

    @property
    def storage_path(self):
        path = Path(self.storage_dir)
        return (BACKEND_DIR / path).resolve() if not path.is_absolute() else path.resolve()


@lru_cache
def get_settings():
    return Settings()
