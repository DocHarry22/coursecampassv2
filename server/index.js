import express from 'express';
import bodyParser from 'body-parser';
import { resolveSrv } from 'dns/promises';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from "cookie-parser";
import clientRoutes from "./routes/client.js";
import generalRoutes from "./routes/general.js";
import managementRoutes from "./routes/management.js";
import salesRoutes from "./routes/sales.js";
import authRoutes from "./routes/auth.js";
import coursesRoutes from "./routes/courses.js";
import schoolsRoutes from "./routes/schools.js";
import financialAidRoutes from "./routes/financialAid.js";
import todosRoutes from "./routes/todos.js";
import calendarRoutes from "./routes/calendar.js";
import accountRoutes from "./routes/account.js";
import adminRoutes from "./routes/admin.js";
import { requestContext } from "./middleware/requestContext.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRateLimiter, apiRateLimiter } from "./middleware/rateLimit.js";
import { buildCorsOptions, configureExpressSecurity, getHelmetOptions } from "./middleware/security.js";
import { initializeObservability, observabilityMiddleware, registerProcessHooks } from "./middleware/observability.js";
import { sendApiResponse } from "./utils/response.js";

/* CONFIGURATION */
dotenv.config();
const app = express();
app.locals.startedAt = new Date().toISOString();
app.locals.dbStatus = process.env.MONGO_URL ? "connecting" : "disabled";
configureExpressSecurity(app);
initializeObservability(app);

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "1mb";
const corsOptions = buildCorsOptions();

app.use(express.json({ limit: jsonBodyLimit }));
app.use(requestContext);
app.use(observabilityMiddleware);
app.use(helmet(getHelmetOptions()));
morgan.token("request-id", (req) => req.requestId || "-");
app.use(
    morgan(
        '{"level":"info","requestId":":request-id","method":":method","url":":url","status":":status","responseTimeMs":":response-time","contentLength":":res[content-length]"}'
    )
);
app.use(bodyParser.json({ limit: jsonBodyLimit }));
app.use(bodyParser.urlencoded({ extended: false, limit: jsonBodyLimit }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(apiRateLimiter);

app.get("/", (_req, res) => {
    sendApiResponse(
        res,
        200,
        {
        name: "CourseCompass API",
        status: "ok",
        startedAt: app.locals.startedAt,
        dbStatus: app.locals.dbStatus,
        },
        { source: "system" }
    );
});

/* ROUTES */ 
app.use("/auth", authRateLimiter, authRoutes);
app.use("/general", generalRoutes);
app.use("/client", clientRoutes);
app.use("/management", managementRoutes);
app.use("/sales", salesRoutes);
app.use("/courses", coursesRoutes);
app.use("/schools", schoolsRoutes);
app.use("/financial-aid", financialAidRoutes);
app.use("/todos", todosRoutes);
app.use("/calendar", calendarRoutes);
app.use("/account", accountRoutes);
app.use("/admin", adminRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

/* MONGOOSE SETUP */
const PORT = process.env.PORT || 9000;

const startServer = () => {
    const server = app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
    registerProcessHooks({ app, server });

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