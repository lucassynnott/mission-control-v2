module.exports = {
  apps: [{
    name: 'mission-control-v2',
    script: 'npm',
    args: 'start',
    cwd: '/home/seed/clawd/mission-control-v2',
    env: {
      NODE_ENV: 'production',
      PORT: 3006
    }
  }]
}
