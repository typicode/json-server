// Small database to be used during tests
module.exports = function() {
	var db = {};

	db.posts = [
	  {id: 1, body: 'foo'},
	  {id: 2, body: 'bar'}
	]

	db.comments = [
	  {id: 1, published: true,  postId: 1},
	  {id: 2, published: false, postId: 1},
	  {id: 3, published: false, postId: 2},
	  {id: 4, published: false, postId: 2},
	]

	return db;
}