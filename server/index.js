import express from 'express';
import bodyParser from 'body-parser';
import { resolveSrv } from 'dns/promises';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import clientRoutes from "./routes/client.js";
import generalRoutes from "./routes/general.js";
import managementRoutes from "./routes/management.js";
import salesRoutes from "./routes/sales.js";

/* CONFIGURATION */
dotenv.config();
const app = express();
app.locals.startedAt = new Date().toISOString();
app.locals.dbStatus = process.env.MONGO_URL ? "connecting" : "disabled";
app.use(express.json())
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin"}));
app.use(morgan("common"))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get("/", (_req, res) => {
    res.status(200).json({
        name: "CourseCompass API",
        status: "ok",
        startedAt: app.locals.startedAt,
        dbStatus: app.locals.dbStatus,
    });
});

/* ROUTES */ 
app.use("/client", clientRoutes);
app.use("/general", generalRoutes);
app.use("/management", managementRoutes);
app.use("/sales", salesRoutes);

/* MONGOOSE SETUP */
const PORT = process.env.PORT || 9000;

const startServer = () => {
    const server = app.listen(PORT, () => console.log(`Server Port: ${PORT}`));

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.warn(`Port ${PORT} is already in use. Reusing the existing server process.`);
            return;
        }

        console.error("Server failed to start", error);
    });
};

const validateMongoUrl = async (mongoUrl) => {
    try {
        if (mongoUrl.startsWith("mongodb+srv://")) {
            const hostMatch = mongoUrl.match(/^mongodb\+srv:\/\/[^@]+@([^/?]+)/);

            if (!hostMatch?.[1]) {
                throw new Error("Invalid MongoDB SRV connection string.");
            }

            await resolveSrv(`_mongodb._tcp.${hostMatch[1]}`);
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            reason:
                error.code === "ENOTFOUND" || error.code === "ENODATA"
                    ? `MongoDB host could not be resolved. Update MONGO_URL with a fresh Atlas connection string or use a local MongoDB URL.`
                    : error.message,
        };
    }
};

if (!process.env.MONGO_URL) {
    app.locals.dbStatus = "disabled";
    console.warn("MONGO_URL is not set. Starting server without database connection.");
    startServer();
} else {
    validateMongoUrl(process.env.MONGO_URL).then((validation) => {
        if (!validation.valid) {
            app.locals.dbStatus = "disconnected";
            console.error(validation.reason);
            console.warn("Starting server without database connection.");
            startServer();
            return;
        }

        mongoose
            .connect(process.env.MONGO_URL, {
                serverSelectionTimeoutMS: 10000,
            })
            .then(() => {
                app.locals.dbStatus = "connected";
                console.log("Connected to MongoDB");
                startServer();
            })
            .catch((error) => {
                app.locals.dbStatus = "disconnected";
                console.error(`${error} did not connect`);
                console.warn("Starting server without database connection.");
                startServer();
            });
    });
}