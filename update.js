// Bootstrap only — pulls latest launcher code then updates upstream components.
module.exports = {
  run: [
    {
      method: "shell.run",
      params: {
        message: "git pull"
      }
    },
    {
      method: "shell.run",
      params: {
        message: [
          "npm install -g openclaw@latest"
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        path: "app/nerve",
        message: [
          "git pull",
          "npm ci",
          "npm run build"
        ]
      }
    }
  ]
}
