"""Run verification in disposable schemas; existing hospital tables are untouched."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app.core.config import get_settings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true', help='Also call NVIDIA using fictional data only.')
    args = parser.parse_args()
    settings = get_settings()
    url = make_url(settings.database_url)
    if url.get_backend_name() != 'postgresql':
        print('Configure PostgreSQL before running integration verification.')
        return 1
    name = 'hospital_verify_' + uuid4().hex
    assert re.fullmatch(r'hospital_verify_[0-9a-f]{32}', name)
    report_dir = BACKEND.parent / 'storage' / 'verification' / ('run_'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'_'+uuid4().hex[:8])
    report_dir.mkdir(parents=True, exist_ok=True)
    control = create_engine(url, connect_args={'connect_timeout':5})
    created = False
    result = {'started_at':datetime.now(timezone.utc).isoformat(), 'live_nvidia':args.live,
              'isolated_schema':name, 'steps':[], 'cleaned_up':False}
    code = 1
    try:
        with control.begin() as connection:
            assert connection.scalar(text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector')")), 'Enable pgvector before verification.'
            connection.execute(text(f'CREATE SCHEMA "{name}"'))
            created = True
        test_url = url.update_query_dict({'options':f'-csearch_path={name},public'}).render_as_string(hide_password=False)
        environment = os.environ.copy()
        environment.update(DATABASE_URL=test_url, TEST_POSTGRES_URL=test_url, AI_MODE='demo',
                           RUN_LIVE_NVIDIA='1' if args.live else '0', PYTHONIOENCODING='utf-8',
                           VERIFY_POSTGRES_WORKFLOWS='1')
        steps = [('migrations',[sys.executable,'-m','alembic','upgrade','head']),
                 ('schema-check',[sys.executable,'-m','alembic','check']),
                 ('backend',[sys.executable,'-m','pytest','tests','-rA',
                             '--junitxml='+str(report_dir/'postgres-tests.xml')])]
        for label, command in steps:
            print('Running '+label+' in isolated PostgreSQL schemas.', flush=True)
            completed = subprocess.run(command, cwd=BACKEND, env=environment, capture_output=True, text=True, encoding='utf-8')
            output = completed.stdout + completed.stderr
            # Never persist/expose credentials even if a dependency includes them in errors.
            for secret in (settings.nvidia_api_key, url.password):
                if secret:
                    output = output.replace(secret, '[REDACTED]')
            (report_dir/(label+'.log')).write_text(output,encoding='utf-8')
            print(output, flush=True)
            result['steps'].append({'name':label,'exit_code':completed.returncode})
            if completed.returncode:
                break
        else:
            code = 0
    except Exception as error:
        result['error_type'] = type(error).__name__
        print('Verification setup failed: '+type(error).__name__+'. Check PostgreSQL schema permissions and pgvector.')
    finally:
        if created:
            try:
                with control.begin() as connection:
                    # Only the exact temporary schema created above can be removed.
                    connection.execute(text(f'DROP SCHEMA "{name}" CASCADE'))
                result['cleaned_up'] = True
            except Exception as error:
                code = 1
                result['cleanup_error_type'] = type(error).__name__
                print('Cleanup failed for temporary schema '+name+'.')
        control.dispose()
        result['finished_at'] = datetime.now(timezone.utc).isoformat()
        result['exit_code'] = code
        (report_dir/'summary.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
        print('Verification results: '+str(report_dir), flush=True)
    return code


if __name__ == '__main__':
    raise SystemExit(main())
