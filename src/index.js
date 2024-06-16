import dotenv from "dotenv";

import connectDB from "./db/index.js";

// dotenv configuration
dotenv.config({
  path: "./env",
});

// connect to the database
connectDB()
  .then(() => {
    // listening to the server if sucessfully connected to the database
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    // log the error
    console.log("MongoDb connection failed...", err);
  });
