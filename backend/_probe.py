"""Probe running services."""
import urllib.request
import json
import socket

# TCP check
for port, name in [(3000, 'Frontend'), (8001, 'Bck8001'), (8002, 'Bck8002'), (5432, 'PG'), (6379, 'Redis')]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1)
    result = s.connect_ex(('localhost', port))
    print(f'{name} (:{port}): {"OPEN" if result == 0 else "CLOSED"}')
    s.close()

# HTTP probe on 8001
for port in [8001, 8002]:
    try:
        req = urllib.request.Request(f'http://localhost:{port}/docs', method='GET', headers={'Accept': 'text/html'})
        with urllib.request.urlopen(req, timeout=3) as r:
            html = r.read().decode()
            if 'fastapi' in html.lower() or 'swagger' in html.lower():
                print(f'  -> Port {port}: FastAPI/Swagger UI detected')
            else:
                print(f'  -> Port {port}: Responded ({len(html)} bytes)')
    except urllib.request.HTTPError as e:
        print(f'  -> Port {port}: HTTP {e.code}')
    except Exception as e:
        print(f'  -> Port {port}: {type(e).__name__}')

try:
    req = urllib.request.Request('http://localhost:8001/api/v1/auth/me', method='GET',
                                  headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=3) as r:
        print(f'  -> /api/v1/auth/me on 8001: {r.status}')
except Exception as e:
    print(f'  -> /api/v1/auth/me on 8001: {type(e).__name__}')
