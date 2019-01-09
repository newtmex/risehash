import { logger } from "./services/logger";
import { rise } from "risejs";
import { connect as dbConnect } from "mongoose";
import { OpenNodes } from "./openNodes";
import { getSnapshot } from "./helpers";

logger.log('Starting app\n\n');

dbConnect('mongodb://localhost/risehash', { useNewUrlParser: true });

// Select one of the nodes that their api is enabled
// or use localhost if in production
rise.nodeAddress = process.env.NODE_ENV == 'production' ?
  'http://localhost:5555' :
  OpenNodes.openNodes[OpenNodes.lastOpenNodes_index];

  // Begin
  getSnapshot();