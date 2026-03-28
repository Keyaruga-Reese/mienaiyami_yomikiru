import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import type { Configuration } from "webpack";
import webpack from "webpack";

import { plugins } from "./webpack.plugins";
import { rules } from "./webpack.rules";

export const preloadConfig: Configuration = {
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        plugins: [new TsconfigPathsPlugin()],
    },
    module: {
        rules,
    },
    externals: {
        electron: "commonjs2 electron",
    },
    target: "electron-main",
    // node: { __dirname: false },
    plugins: [
        ...plugins,
        new webpack.DefinePlugin({
            __BUILD_INFO__: JSON.stringify({
                commit: process.env.BUILD_COMMIT || "unknown",
                date: process.env.BUILD_DATE || "unknown",
                branch: process.env.BUILD_BRANCH || "",
            }),
        }),
    ],
};
