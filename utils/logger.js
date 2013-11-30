var logan = require('logan');

logan.set({
  error: ['%', 'red'],
  success: ['%', 'green'],
  info: ['%', 'grey'],
  url: ['  http://localhost:%/'.grey + '%'.cyan, '.']
})

module.exports = logan