export const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host : '172.30.20.10',
    port : 3306,
    user : 'root',
    password : 'root',
    database : 'buy_list'
  }
});