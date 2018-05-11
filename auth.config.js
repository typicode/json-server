// Sample auth.config.js
module.exports = {
  posts: {
    read: 'ifAuthed',
    write: 'ownerOnly'
  },
  comments: {
    read: 'ifAuthed',
    write: 'ownerOnly'
  }
}
