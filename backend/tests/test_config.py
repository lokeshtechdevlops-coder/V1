import pytest
from pydantic import ValidationError
from app.core.config import Settings


@pytest.mark.parametrize('value,expected',[('NIM','nim'),(' nim ','nim'),('DEMO','demo'),(' Demo ','demo')])
def test_ai_mode_accepts_case_and_whitespace(value,expected):
    settings=Settings(ai_mode=value,nvidia_api_key='test-configured-key')
    assert settings.ai_mode==expected


def test_invalid_mode_errors_do_not_expose_secrets():
    secret='do-not-expose-this-secret-value-0123456789'
    with pytest.raises(ValidationError) as error:
        Settings(ai_mode='unsupported',jwt_secret=secret,nvidia_api_key='private-nvidia-key')
    assert 'AI_MODE must be demo or nim' in str(error.value)
    assert secret not in str(error.value)
    assert 'private-nvidia-key' not in str(error.value)
