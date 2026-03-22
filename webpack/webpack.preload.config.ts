import type { Configuration } from "webpack";
import webpack from "webpack";

// import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

import { plugins } from "./webpack.plugins";
import { rules } from "./webpack.rules";

export const preloadConfig: Configuration = {
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        // plugins: [new TsconfigPathsPlugin()],
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
            "process.env.BUILD_COMMIT": JSON.stringify(process.env.BUILD_COMMIT || "unknown"),
            "process.env.BUILD_DATE": JSON.stringify(process.env.BUILD_DATE || "unknown"),
            "process.env.BUILD_BRANCH": JSON.stringify(process.env.BUILD_BRANCH || ""),
        }),
    ],
};
