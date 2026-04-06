module.exports = {
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        message: [
          "node configure-provider-defaults.js"
        ]
      }
    },
    {
      id: "start_openclaw",
      method: "shell.run",
      params: {
        message: [
          "openclaw gateway start || openclaw gateway"
        ],
        on: [
          {
            event: "/(http:\\/\\/[0-9.:]+)/",
            done: true
          },
          {
            event: "/(listening|gateway).*(18789|ready)/i",
            done: true
          }
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        path: "app/nerve",
        message: [
          "node ..\\..\\prepare-nerve-env.js",
          "node ..\\..\\wait-openclaw-ready.js"
        ],
        on: [
          {
            event: "/OPENCLAW_READY/",
            done: true
          }
        ]
      }
    },
    {
      id: "start_nerve",
      method: "shell.run",
      params: {
        path: "app/nerve",
        message: [
          "npm run start"
        ],
        on: [
          {
            event: "/(http:\\/\\/[0-9.:]+)/",
            done: true
          }
        ]
      }
    },
    {
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}
