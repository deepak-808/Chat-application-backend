import { format } from 'date-fns';
import { v4 } from 'uuid';

import fs from 'fs';
import fsPromise from 'fs/promises';
import path from 'path';

const logEvents = async(event, data) => {
  const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`;
  const logItem = `${dateTime}\t${v4()}\t${event}\n`;
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  try {
    if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
        await fsPromise.mkdir(path.join(__dirname, '..', 'logs'));
    }

    await fsPromise.appendFile(path.join(__dirname, '..', 'logs', data), logItem);
} catch (err) {
    console.log(err);
}
  
}
const logger = (req, res, next) => {
  logEvents(`${req.method}\t${req.headers.origin}\t${req.url}`, 'reqLog.txt');
  console.log(`${req.method} ${req.path}`);
  next();
}
export { logger, logEvents };
