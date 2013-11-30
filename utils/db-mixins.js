(function(root) {

  var _ = root._ || require('underscore');

  if (!root._) {
    _.mixin(require('underscore.inflections'));
  }
  
  function get(db, table, id) {
    return _.find(db[table], function (row) {
      return row.id === id  
    });
  }

  function exist(db, table, id) {
    return !_.isUndefined(_.get(db, table, id));
  }

  function createId(db, table) {
    if (_.isEmpty(db[table])) {
      return 1;
    } else {
      return _.max(db[table], function(row) {
        return row.id;
      }).id + 1;
    }
  }

  function create(db, table, obj) {
    var clone = _.clone(obj);

    if (_.isUndefined(clone.id)) clone.id = _.createId(db, table);

    db[table].push(clone);

    return clone;
  }

  function update(db, table, id, attrs) {
    var row = get(db, table, id),
        updatedRow = _.extend(row, attrs),
        index = _.indexOf(db[table], row);
      
    db[table][index] = updatedRow;
  }

  function clean(db) {
    var toBeRemoved = [];

    _(db).each(function(table, tableName) {
      _(table).each(function(row) {
        _(row).each(function(value, key) {
          if (/Id$/.test(key)) {
            var reference = _.pluralize(key.slice(0, - 2));
            if (!_.exist(db, reference, row[key])) {
              toBeRemoved.push({
                tableName: tableName, 
                id: row.id
              });
            }
          }
        });
      });
    });

    _(toBeRemoved).each(function(row) {
      _.remove(db, row.tableName, row.id);
    });
  }

  function remove(db, table, id) {
    var newTable = _.reject(db[table], function(row) {
        return row.id === id;
    });

    db[table] = newTable;
  }

  _.get = get;
  _.exist = exist;
  _.createId = createId;
  _.create = create;
  _.update = update;
  _.clean = clean;
  _.remove = remove;
})(this);