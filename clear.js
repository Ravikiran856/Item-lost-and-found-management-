const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound');

mongoose.connection.once('open', async () => {
  await mongoose.connection.db.dropDatabase();
  console.log('Database dropped');
  mongoose.disconnect();
});
