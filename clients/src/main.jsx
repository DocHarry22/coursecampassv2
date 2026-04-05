import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import App from "./App";
import "./index.css";
import globalReducer from "state";
import { SessionProvider } from "./auth/SessionContext";

const store = configureStore({
  reducer: {
    global: globalReducer,
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </Provider>
  </React.StrictMode>
);
