const express = require('express')
const wrap = require('express-async-wrap')
const jwt = require('jsonwebtoken')
const write = require('./write')
const bcrypt = require('bcryptjs')
const { html } = require('common-tags')

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
        fetch('/users/register', {
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
            if (window.opener) {
              window.opener.postMessage(data.token, '*')
              window.close()
            }
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
        fetch('/users/login', {
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
            if (window.opener) {
              window.opener.postMessage(data.token, '*')
              window.close()
            }
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
  <form id="form" method="POST" action="/users/reset">
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

  async function createUser(req, res, next) {
    await db.defaults({ users: [] }).write()
    const { username, password } = req.body
    // username, password 검증
    if (!username || !password) {
      res.status(400)
      res.locals.data = { err: '사용자 이름과 비밀번호를 입력하셔야 합니다.' }
      next()
      return
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      res.status(400)
      res.locals.data = { err: '사용자 이름에는 영문 대소문자 및 숫자만 허용됩니다.' }
      next()
      return
    }
    // username 중복 체크
    const isDuplicate = !db
      .get('users')
      .filter({ username })
      .isEmpty()
      .value()
    console.log(`username: ${username}`)
    console.log(`isDuplicate: ${isDuplicate}`)
    if (isDuplicate) {
      res.status(400)
      res.locals.data = { err: '사용자 이름이 중복되었습니다.' }
      next()
      return
    }
    // password bcrypt 변환
    const hashedPassword = await bcrypt.hash(password, 10)
    // username, password 저장
    const user = db
      .get('users')
      .insert({
        username,
        hashedPassword
      })
      .value()
    // 토큰 생성
    jwt.sign({ id: user.id }, opts.jwtSecret, (err, token) => {
      if (err) {
        next(err)
      } else {
        res.locals.data = { token }
        next()
      }
    })
  }

  async function login(req, res, next) {
    const matchedUser = db
      .get('users')
      .filter({ username: req.body.username })
      .head()
      .value()
    if (!matchedUser) {
      res.status(400)
      res.locals.data = { err: '일치하는 사용자 이름이 없습니다.' }
      next()
      return
    }
    const passwordMatched = await bcrypt.compare(
      req.body.password,
      matchedUser.hashedPassword
    )
    if (!passwordMatched) {
      res.status(400)
      res.locals.data = { err: '비밀번호가 일치하지 않습니다.' }
      next()
      return
    }
    jwt.sign({ id: matchedUser.id }, opts.jwtSecret, (err, token) => {
      if (err) {
        next(err)
      } else {
        res.locals.data = { token }
        next()
      }
    })
  }

  const w = write(db)
  const render = (req, res) => {
    res.jsonp(res.locals.data)
  }

  router.get('/users/register', (req, res) => {
    res.send(registerTemplate())
  })
  router.get('/users/login', (req, res) => {
    res.send(loginTemplate())
  })
  router.get('/users/reset', (req, res) => {
    res.send(resetTemplate())
  })
  router.post('/users/register', wrap(createUser), w, render)
  router.post('/users/login', wrap(login), render)
  router.post('/users/reset', async (req, res) => {
    const { username, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    await db
      .get('users')
      .find({ username })
      .assign({ hashedPassword })
      .write()
    res.redirect('/users/login')
  })
  return router
}
