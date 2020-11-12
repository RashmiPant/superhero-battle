const express = require("express");
const app = express();

app.use(express.json());
app.use("/app", require("./app"));

app.listen(8080, () => console.log("Server started at 8080"));