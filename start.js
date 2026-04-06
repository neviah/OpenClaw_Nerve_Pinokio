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
          "{{platform === 'win32' ? 'openclaw gateway' : 'openclaw gateway start || openclaw gateway'}}"
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
      id: "openclaw_failed",
      when: "{{!(input.event && input.event[0] === 'OPENCLAW_READY')}}",
      method: "notify",
      params: {
        html: "<b>OpenClaw failed to start</b><br>Check the Start terminal logs for gateway errors before launching Nerve.",
        type: "warning"
      }
    },
    {
      id: "start_nerve",
      when: "{{input.event && input.event[0] === 'OPENCLAW_READY'}}",
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
      when: "{{input.event && input.event[1]}}",
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}
