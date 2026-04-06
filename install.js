module.exports = {
  run: [
    {
      method: "shell.run",
      params: {
        message: [
          "mkdir -p app",
          "npm install -g openclaw@latest"
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        message: [
          "mkdir -p ~/.openclaw",
          "if [ ! -f ~/.openclaw/openclaw.json ]; then printf '{}\\n' > ~/.openclaw/openclaw.json; fi"
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
