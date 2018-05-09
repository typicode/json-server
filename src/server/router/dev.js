const express = require('express')
const { html } = require('common-tags')
const bcrypt = require('bcryptjs')

const registerTemplate = () => html`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>회원 가입</title>
</head>
<body>
  <form id="form">
    <h1>회원 가입</h1>
    <div>
      <label>
        <span>사용자 이름</span>
        <input type="text" name="username" required>
      </label>
      <label>
        <span>비밀번호</span>
        <input type="password" name="password" required>
      </label>
      <br>
      <input id="submit" type="submit" value="전송">
    </div>
  </form>
  <div id="token"></div>
  <script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function() {
      var form = document.querySelector('#form')
      form.addEventListener('submit', function(e) {
        e.preventDefault()
        var formData = new FormData(form)
        var username = formData.get('username')
        var password = formData.get('password')
        fetch('/users', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(function(res) {
          return res.json()
        }).then(function(data) {
          if (data.err) {
            alert(data.err)
            location.reload()
          } else {
            form.style.display = 'none'
            document.querySelector('#token').textContent = '토큰: ' + data.token
          }
        })
      })
    })
  </script>
</body>
</html>
`

const loginTemplate = () => html`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>로그인</title>
</head>
<body>
  <form id="form">
    <h1>로그인</h1>
    <div>
      <label>
        <span>사용자 이름</span>
        <input type="text" name="username" required>
      </label>
      <label>
        <span>비밀번호</span>
        <input type="password" name="password" required>
      </label>
      <br>
      <input id="submit" type="submit" value="전송">
    </div>
  </form>
  <div id="token"></div>
  <script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function() {
      var form = document.querySelector('#form')
      form.addEventListener('submit', function(e) {
        e.preventDefault()
        var formData = new FormData(form)
        var username = formData.get('username')
        var password = formData.get('password')
        fetch('/auth', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(function(res) {
          return res.json()
        }).then(function(data) {
          if (data.err) {
            alert(data.err)
            location.reload()
          } else {
            form.style.display = 'none'
            document.querySelector('#token').textContent = '토큰: ' + data.token
          }
        })
      })
    })
  </script>
</body>
</html>
`

const resetTemplate = () => html`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>패스워드 초기화</title>
</head>
<body>
  <form id="form" method="POST" action="/_dev/reset">
    <h1>패스워드 초기화</h1>
    <div>
      <label>
        <span>사용자 이름</span>
        <input type="text" name="username" required>
      </label>
      <label>
        <span>비밀번호</span>
        <input type="password" name="password" required>
      </label>
      <br>
      <input id="submit" type="submit" value="전송">
    </div>
  </form>
</body>
</html>
`

module.exports = (db, opts) => {
  const router = express.Router()
  router.get('/_dev/register', (req, res) => {
    res.send(registerTemplate())
  })
  router.get('/_dev/login', (req, res) => {
    res.send(loginTemplate())
  })
  router.get('/_dev/reset', (req, res) => {
    res.send(resetTemplate())
  })
  router.post('/_dev/reset', async (req, res) => {
    const { username, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    await db
      .get('users')
      .find({ username })
      .assign({ hashedPassword })
      .write()
    res.redirect('/_dev/login')
  })
  return router
}
