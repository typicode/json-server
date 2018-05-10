const express = require('express')
const wrap = require('express-async-wrap')
const jwt = require('jsonwebtoken')
const write = require('./write')
const bcrypt = require('bcryptjs')

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
    db
      .get('users')
      .insert({
        username,
        hashedPassword
      })
      .value()
    // 토큰 생성
    // FIXME: secret
    jwt.sign({ username }, 'FIXME', (err, token) => {
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
    const payload = {
      username: matchedUser.username,
      id: matchedUser.id
    }
    jwt.sign(payload, 'FIXME', (err, token) => {
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

  router.post('/users', wrap(createUser), w, render)
  router.post('/auth', wrap(login), render)
  return router
}
