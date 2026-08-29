import BetterSqlite3 from 'better-sqlite3';

declare module 'better-sqlite3' {
  interface Database extends BetterSqlite3.Database {}
  const Database: BetterSqlite3.DatabaseConstructor;
  export default Database;
}
