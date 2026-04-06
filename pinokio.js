module.exports = {
  version: "1.0",
  title: "OpenClaw + Nerve",
  description: "One-click launcher for OpenClaw gateway and Nerve web UI with no onboarding prompts.",
  icon: "icon.png",
  menu: async (kernel, info) => {
    let installed = info.exists("app/nerve")
    let running = {
      install: info.running("install.js"),
      start: info.running("start.js"),
      update: info.running("update.js"),
      reset: info.running("reset.js"),
      providerSetup: info.running("provider-setup.js")
    }

    if (running.install) {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Installing",
        href: "install.js"
      }]
    } else if (installed) {
      if (running.start) {
        let local = info.local("start.js")
        let providerLocal = info.local("provider-setup.js")
        if (local && local.url) {
          const items = [{
            default: true,
            icon: "fa-solid fa-rocket",
            text: "Open Nerve",
            href: local.url + "?ts=" + Date.now()
          }, {
            icon: "fa-solid fa-diagram-project",
            text: "Open OpenClaw Control UI",
            href: "http://127.0.0.1:18789/openclaw"
          }, {
            icon: "fa-solid fa-terminal",
            text: "Terminal",
            href: "start.js"
          }]

          if (providerLocal && providerLocal.url) {
            items.push({
              icon: "fa-solid fa-sliders",
              text: "Provider Setup",
              href: providerLocal.url
            })
            items.push({
              icon: "fa-solid fa-cloud",
              text: "Provider Setup (OpenRouter preset)",
              href: providerLocal.url + "?provider=openrouter"
            })
          } else {
            items.push({
              icon: "fa-solid fa-sliders",
              text: "Provider Setup",
              href: "provider-setup.js?ts=" + Date.now()
            })
          }

          return items
        }
        return [{
          default: true,
          icon: "fa-solid fa-terminal",
          text: "Terminal",
          href: "start.js"
        }, {
          icon: "fa-solid fa-sliders",
          text: "Provider Setup",
          href: "provider-setup.js?ts=" + Date.now()
        }]
      } else if (running.providerSetup) {
        let providerLocal = info.local("provider-setup.js")
        if (providerLocal && providerLocal.url) {
          return [{
            default: true,
            icon: "fa-solid fa-sliders",
            text: "Open Provider Setup",
            href: providerLocal.url
          }, {
            icon: "fa-solid fa-cloud",
            text: "OpenRouter Preset",
            href: providerLocal.url + "?provider=openrouter"
          }, {
            icon: "fa-solid fa-terminal",
            text: "Provider Setup Terminal",
            href: "provider-setup.js"
          }]
        }
        return [{
          default: true,
          icon: "fa-solid fa-terminal",
          text: "Provider Setup Terminal",
          href: "provider-setup.js"
        }]
      } else if (running.update) {
        return [{
          default: true,
          icon: "fa-solid fa-terminal",
          text: "Updating",
          href: "update.js"
        }]
      } else if (running.reset) {
        return [{
          default: true,
          icon: "fa-solid fa-terminal",
          text: "Resetting",
          href: "reset.js"
        }]
      }

      return [{
        default: true,
        icon: "fa-solid fa-power-off",
        text: "Start",
        href: "start.js?ts=" + Date.now()
      }, {
        icon: "fa-solid fa-plug",
        text: "Update",
        href: "update.js"
      }, {
        icon: "fa-solid fa-sliders",
        text: "Provider Setup",
        href: "provider-setup.js?ts=" + Date.now()
      }, {
        icon: "fa-solid fa-plug",
        text: "Install",
        href: "install.js"
      }, {
        icon: "fa-regular fa-circle-xmark",
        text: "Reset",
        href: "reset.js",
        confirm: "Are you sure you wish to reset the app?"
      }]
    }

    return [{
      default: true,
      icon: "fa-solid fa-plug",
      text: "Install",
      href: "install.js"
    }]
  }
}
