module.exports = {
  run: [
    {
      method: "shell.run",
      params: {
        message: [
          "node -e \"require('fs').mkdirSync('app',{recursive:true})\"",
          "npm install -g openclaw@latest"
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        message: [
          "node configure-provider-defaults.js"
        ]
      }
    },
    {
      when: "{{!exists('app/nerve/.git')}}",
      method: "shell.run",
      params: {
        message: "git clone https://github.com/daggerhashimoto/openclaw-nerve.git app/nerve"
      }
    },
    {
      method: "shell.run",
      params: {
        path: "app/nerve",
        message: [
          "npm ci",
          "npm run build"
        ]
      }
    }
  ]
}
