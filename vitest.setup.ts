// Set in-memory DB before any module is loaded so db.ts never touches the real file
process.env.DB_PATH = ':memory:'
