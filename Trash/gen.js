var other = require('./other/other')();
module.exports = function () {
    return { posts: [], others: other.other }
}
