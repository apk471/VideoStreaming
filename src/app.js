import express from express;
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Express app
const app = express();

// CORS for cross-origin requests
app.use(cors({
    // Allow all the origins
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// Express.json for parsing the request body
app.use(express.json({ limit: '16kb' }));
// Express.urlencoded for parsing the request body
app.use(express.urlencoded({ extended: true , limit: '16kb'}));
// Express.static to serve the static files
app.use(express.static('public'));
// Cookie parser for parsing the cookies
app.use(cookieParser());

// Export the app
export { app };