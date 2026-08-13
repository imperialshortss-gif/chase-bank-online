import dotenv from "dotenv";

dotenv.config({
  path: new URL("../.env", import.meta.url),
  override: true
});

import app from "./app.js";

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}

export default app;
