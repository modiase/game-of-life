const path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");

const src = (...args) => path.join(path.resolve(__dirname), "src", ...args);

module.exports = {
  mode: "production",
  entry: src("index.ts"),
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/i,
        use: ["babel-loader", "ts-loader"],
      },
      {
        test: /\.s[ac]ss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: src("index.html"),
    }),
  ],
};
