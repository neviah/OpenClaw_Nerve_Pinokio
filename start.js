module.exports = {
  daemon: true,
  run: [
    {
      id: "start_openclaw",
      method: "shell.run",
      params: {
        message: [
          "openclaw gateway start"
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
          "node -e \"const fs=require('fs');const os=require('os');const path=require('path');const http=require('http');const cfg=path.join(os.homedir(),'.openclaw','openclaw.json');let text='';let port='18789';let token='';try{text=fs.readFileSync(cfg,'utf8')}catch{};const pm=text.match(/port\\s*[:=]\\s*([0-9]+)/i);if(pm)port=pm[1];const tm=text.match(/token\\s*[:=]\\s*['\\\"]?([^'\\\"\\s,}]+)/i);if(tm)token=tm[1];const env=['GATEWAY_URL=http://127.0.0.1:'+port,'GATEWAY_TOKEN='+token,'PORT=3080'].join('\\n')+'\\n';fs.writeFileSync('.env',env);const url='http://127.0.0.1:'+port+'/health';let attempts=0;const max=120;const timer=setInterval(()=>{attempts+=1;http.get(url,(res)=>{if(res.statusCode&&res.statusCode<500){clearInterval(timer);console.log('OPENCLAW_READY');process.exit(0);}}).on('error',()=>{});if(attempts>=max){clearInterval(timer);console.error('OPENCLAW_HEALTH_TIMEOUT');process.exit(1);} },1000);\""
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
