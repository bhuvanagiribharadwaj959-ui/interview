import requests

def check_port(port):
    try:
        resp = requests.get(f"http://localhost:{port}/health", timeout=1)
        if resp.status_code == 200:
            print(f"FOUND:{port}")
            return True
    except:
        pass
    return False

for p in range(8080, 8090):
    if check_port(p):
        break
