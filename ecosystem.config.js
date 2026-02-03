module.exports = {
  apps: [
    {
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
    },
    {
      name: 'notification-daemon',
      script: 'node_modules/.bin/ts-node',
      args: 'scripts/notification-daemon.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3006',
        SERVICE_CLIENT_ID: 'b3d10235afaf5f66d48fd95857261125.access',
        SERVICE_CLIENT_SECRET: '1c49e8bd150d8c60b845891e90ef52261db6593db91a8324a06f3f78d47d6c27'
      },
      log_file: '~/logs/notification-daemon.log',
      out_file: '~/logs/notification-daemon-out.log',
      error_file: '~/logs/notification-daemon-error.log'
    }
  ]
}
