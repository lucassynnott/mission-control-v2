module.exports = {
  apps: [{
    name: 'mission-control-v2',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3006
    },
    log_file: '~/logs/mission-control-v2.log',
    out_file: '~/logs/mission-control-v2-out.log',
    error_file: '~/logs/mission-control-v2-error.log'
  }]
}
