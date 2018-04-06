const express = require('express')
const { html } = require('common-tags')

const registerTemplate = ({ siteKey }) => html`
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
      <div class="g-recaptcha" data-sitekey="${siteKey}" data-callback="verifyCallback"></div>
      <br>
      <input id="submit" type="submit" value="전송" disabled>
    </div>
  </form>
  <div id="token"></div>
  <script type="text/javascript">
    var recaptchaResponse
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
            'g-recaptcha-response': recaptchaResponse,
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
    function verifyCallback(response) {
      recaptchaResponse = response
      document.querySelector('#submit').removeAttribute('disabled')
    };
  </script>
  <script src='https://www.google.com/recaptcha/api.js'></script>
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

module.exports = (db, opts) => {
  const router = express.Router()
  router.get('/_dev/register', (req, res) => {
    res.send(registerTemplate({ siteKey: process.env.RECAPTCHA_SITE_KEY }))
  })
  router.get('/_dev/login', (req, res) => {
    res.send(loginTemplate())
  })
  return router
}
