import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url), override: true });

const { default: app } = await import("./app.js");

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
