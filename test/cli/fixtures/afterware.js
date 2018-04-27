module.exports = res => {
  res.locals.data.forEach(d => (d.after = true))
}
