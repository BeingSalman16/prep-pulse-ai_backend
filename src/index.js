import "dotenv/config";
import dns from "dns"
import connectDB from "./db/index.js";
import {app} from './app.js'
// dotenv.config({
//     path: './.env'
// })

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);



connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})
