var other = require('./other/other')();
module.exports = function () {
    return { posts: [{id:2}], others: other.other }
}
