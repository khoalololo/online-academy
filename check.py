import requests
import sys
from urllib.parse import unquote

cookie = unquote(sys.argv[1])
session = requests.Session()
session.cookies.set('connect.sid', cookie)

# Test xem session còn sống không
check = session.get('http://localhost:3000/account/profile')
if 'Sign In' in check.text:
    print('SESSION INVALID')
else:
    print('SESSION OK')
    print(check.status_code)