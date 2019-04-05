import { logger } from "./services/logger";
import { rise } from "risejs";
import { connect as dbConnect } from "mongoose";
import { OpenNodes } from "./openNodes";
import { getSnapshot } from "./helpers";

logger.log('Starting app\n#####');
process.on('SIGINT', () => {
  logger.log('Stopped app\n');
});

// Select one of the nodes that their api is enabled
// or use localhost if in production
rise.nodeAddress = '127.0.0.1:10003'; // process.env.NODE_ENV == 'production' ?
 // 'http://localhost:5555' :
 // OpenNodes.openNodes[OpenNodes.lastOpenNodes_index];

let dbConnection = dbConnect('mongodb://localhost/risehash', { useNewUrlParser: true });
dbConnection.then(res => {
  logger.log('Database connected successfully.');
  // Begin
  getSnapshot();
}).catch(err => {
  logger.error('Failed to connect to database..');
  process.exit();
})